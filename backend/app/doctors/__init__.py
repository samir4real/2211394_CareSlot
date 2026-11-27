
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB


router = APIRouter()


@router.get("/doctors")
def get_active_doctors(db: Session = Depends(get_db)):
    doctors = db.query(UserDB).filter(
        UserDB.role == "doctor",
        UserDB.is_active == True
    ).all()

    return [
        {
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "specialty": doctor.specialty
        }
        for doctor in doctors
    ]
