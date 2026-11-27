
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.schemas import AdminCreateRequest
from app.auth.security import (
    require_roles,
    password_hasher,
    effective_role,
)


router = APIRouter()


@router.get("/admin/admins")
def get_admins(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("super_admin")
    )
):
    admins = db.query(UserDB).filter(
        UserDB.role == "admin",
        UserDB.is_active.is_(True)
    ).all()

    return [
        {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "role": effective_role(admin)
        }
        for admin in admins
    ]


@router.post("/admin/admins")
def create_admin(
    req: AdminCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("super_admin")
    )
):
    email = str(req.email).lower()

    existing = db.query(UserDB).filter(
        UserDB.email == email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_admin = UserDB(
        name=req.name.strip(),
        email=email,
        password=password_hasher.hash(req.password),
        role="admin",
        specialty="",
        is_active=True
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return {
        "id": new_admin.id,
        "name": new_admin.name,
        "email": new_admin.email,
        "role": effective_role(new_admin)
    }


@router.delete("/admin/admins/{user_id}")
def deactivate_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("super_admin")
    )
):
    admin = db.query(UserDB).filter(
        UserDB.id == user_id,
        UserDB.role == "admin",
        UserDB.is_active.is_(True)
    ).first()

    if not admin:
        raise HTTPException(
            status_code=404,
            detail="Active admin account not found"
        )

    admin.is_active = False
    db.commit()

    return {
        "message": f"Admin account for {admin.name} has been deactivated"
    }
