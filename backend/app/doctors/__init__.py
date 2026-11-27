
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.auth.security import get_current_user


router = APIRouter()


@router.get("/doctors")
def get_active_doctors(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    doctors = db.query(UserDB).filter(
        UserDB.role == "doctor",
        UserDB.is_active.is_(True)
    ).all()

    return [
        {
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "specialty": doctor.specialty or ""
        }
        for doctor in doctors
    ]
