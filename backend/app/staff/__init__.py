
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.schemas import StaffCreateRequest
from app.services.auth_service import hash_password


router = APIRouter()


@router.get("/admin/staff")
def get_all_staff(db: Session = Depends(get_db)):
    staff = db.query(UserDB).filter(
        UserDB.role.in_(["doctor", "receptionist"]),
        UserDB.is_active == True
    ).all()

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "specialty": member.specialty
        }
        for member in staff
    ]


@router.post("/admin/staff")
def add_staff(req: StaffCreateRequest, db: Session = Depends(get_db)):
    if req.role not in ["doctor", "receptionist"]:
        raise HTTPException(
            status_code=400,
            detail="Role must be doctor or receptionist"
        )

    existing = db.query(UserDB).filter(
        UserDB.email == req.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_staff = UserDB(
        name=req.name,
        email=req.email,
        password=hash_password(req.password),
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
        "specialty": new_staff.specialty
    }



@router.delete("/admin/staff/{user_id}")
def remove_staff(user_id: int, db: Session = Depends(get_db)):
    staff = db.query(UserDB).filter(
        UserDB.id == user_id
    ).first()

    if not staff:
        raise HTTPException(
            status_code=404,
            detail="Staff member not found"
        )

    # Soft delete: preserve historical appointment records
    staff.is_active = False
    db.commit()

    return {"message": f"{staff.name} has been offboarded"}
