
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.schemas import StaffCreateRequest
from app.auth.security import (
    require_roles,
    password_hasher,
    effective_role,
)


router = APIRouter()


@router.get("/admin/staff")
def get_all_staff(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("admin", "super_admin")
    )
):
    staff = db.query(UserDB).filter(
        UserDB.role.in_(["doctor", "receptionist"]),
        UserDB.is_active.is_(True)
    ).all()

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "specialty": member.specialty or ""
        }
        for member in staff
    ]


@router.post("/admin/staff")
def add_staff(
    req: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("admin", "super_admin")
    )
):
    if req.role not in ["doctor", "receptionist"]:
        raise HTTPException(
            status_code=400,
            detail="Role must be doctor or receptionist"
        )

    email = req.email.lower()

    existing = db.query(UserDB).filter(
        UserDB.email == email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_staff = UserDB(
        name=req.name.strip(),
        email=email,
        password=password_hasher.hash(req.password),
        role=req.role,
        specialty=req.specialty if req.role == "doctor" else "",
        is_active=True
    )

    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    return {
        "id": new_staff.id,
        "name": new_staff.name,
        "email": new_staff.email,
        "role": new_staff.role,
        "specialty": new_staff.specialty or ""
    }


@router.delete("/admin/staff/{user_id}")
def remove_staff(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(
        require_roles("admin", "super_admin")
    )
):
    staff = db.query(UserDB).filter(
        UserDB.id == user_id
    ).first()

    if not staff:
        raise HTTPException(
            status_code=404,
            detail="Staff member not found"
        )

    if staff.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )

    if effective_role(staff) == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="The super admin account cannot be deactivated here"
        )

    staff.is_active = False
    db.commit()

    return {"message": f"{staff.name} has been offboarded"}
