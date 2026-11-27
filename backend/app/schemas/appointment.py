
from typing import Optional

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    patient_name: str
    patient_email: str
    doctor_name: str
    date: str
    time_slot: str
    reason: Optional[str] = ""


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
