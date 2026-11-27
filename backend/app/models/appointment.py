
from sqlalchemy import Column, Integer, String

from app.database import Base


class AppointmentDB(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String)
    patient_email = Column(String)
    doctor_name = Column(String)
    date = Column(String)
    time_slot = Column(String)
    reason = Column(String, default="")
    notes = Column(String, default="")
    status = Column(String, default="Booked")
