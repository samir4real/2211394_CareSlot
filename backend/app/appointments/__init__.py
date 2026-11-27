
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppointmentDB, UserDB
from app.schemas import AppointmentCreate, AppointmentUpdate
from app.auth.security import get_current_user, effective_role


router = APIRouter()

ALLOWED_STATUSES = {
    "Booked",
    "Checked-In",
    "Completed",
    "Cancelled"
}


@router.get("/appointments")
def get_appointments(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    query = db.query(AppointmentDB)
    role = effective_role(current_user)

    if role == "patient":
        query = query.filter(
            AppointmentDB.patient_email == current_user.email
        )
    elif role == "doctor":
        query = query.filter(
            AppointmentDB.doctor_name == current_user.name
        )

    return query.all()


@router.post("/appointments")
def create_appointment(
    appt: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    role = effective_role(current_user)

    if role not in ["patient", "receptionist", "admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create appointments"
        )

    doctor = db.query(UserDB).filter(
        UserDB.name == appt.doctor_name,
        UserDB.role == "doctor",
        UserDB.is_active.is_(True)
    ).first()

    if not doctor:
        raise HTTPException(
            status_code=400,
            detail="Selected doctor is unavailable"
        )

    appointment_data = appt.dict()

    if role == "patient":
        appointment_data["patient_name"] = current_user.name
        appointment_data["patient_email"] = current_user.email

    new_appt = AppointmentDB(
        **appointment_data,
        status="Booked"
    )

    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return new_appt


@router.put("/appointments/{appt_id}")
def update_appointment(
    appt_id: int,
    updates: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    appt = db.query(AppointmentDB).filter(
        AppointmentDB.id == appt_id
    ).first()

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    role = effective_role(current_user)
    update_data = updates.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update data provided"
        )

    if "status" in update_data:
        if update_data["status"] not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid appointment status"
            )

    if role == "patient":
        if (
            appt.patient_email != current_user.email
            or appt.status != "Booked"
            or update_data.get("status") != "Cancelled"
            or set(update_data.keys()) != {"status"}
        ):
            raise HTTPException(
                status_code=403,
                detail="Patients can only cancel their own booked appointments"
            )

    elif role == "doctor":
        if appt.doctor_name != current_user.name:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own appointments"
            )

        if (
            set(update_data.keys()) - {"status", "notes"}
            or update_data.get("status") not in (None, "Completed")
        ):
            raise HTTPException(
                status_code=403,
                detail="Doctors can only mark their appointments completed or update notes"
            )

    elif role == "receptionist":
        if (
            set(update_data.keys()) != {"status"}
            or update_data["status"] not in ["Checked-In", "Cancelled"]
        ):
            raise HTTPException(
                status_code=403,
                detail="Receptionists can only check in or cancel appointments"
            )

    elif role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update appointments"
        )

    for key, value in update_data.items():
        setattr(appt, key, value)

    db.commit()
    db.refresh(appt)

    return appt


@router.delete("/appointments/{appt_id}")
def delete_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    if effective_role(current_user) not in [
        "receptionist", "admin", "super_admin"
    ]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete appointments"
        )

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

