
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppointmentDB
from app.schemas import AppointmentCreate, AppointmentUpdate


router = APIRouter()


@router.get("/appointments")
def get_appointments(db: Session = Depends(get_db)):
    return db.query(AppointmentDB).all()


@router.post("/appointments")
def create_appointment(
    appt: AppointmentCreate,
    db: Session = Depends(get_db)
):
    new_appt = AppointmentDB(**appt.dict(), status="Booked")

    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return new_appt


@router.put("/appointments/{appt_id}")
def update_appointment(
    appt_id: int,
    updates: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    appt = db.query(AppointmentDB).filter(
        AppointmentDB.id == appt_id
    ).first()

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(appt, key, value)

    db.commit()
    db.refresh(appt)

    return appt


@router.delete("/appointments/{appt_id}")
def delete_appointment(appt_id: int, db: Session = Depends(get_db)):
    appt = db.query(AppointmentDB).filter(
        AppointmentDB.id == appt_id
    ).first()

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    db.delete(appt)
    db.commit()

    return {"message": "Deleted"}
