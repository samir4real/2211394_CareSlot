from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List

# --- DATABASE SETUP (SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./careslot.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SQLALCHEMY MODEL (Database Table) ---
class DBAppointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, index=True)
    doctor_name = Column(String)
    date = Column(String)
    status = Column(String, default="Booked")

Base.metadata.create_all(bind=engine)

# --- PYDANTIC MODELS (Data Validation) ---
class AppointmentBase(BaseModel):
    patient_name: str
    doctor_name: str
    date: str
    status: str = "Booked"

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    class Config:
        orm_mode = True

# --- FASTAPI APP SETUP ---
app = FastAPI(title="CareSlot MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 5 CRUD ENDPOINTS ---

@app.post("/api/appointments", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db)):
    db_appointment = DBAppointment(**appointment.dict())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(DBAppointment).all()

@app.get("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    db_appointment = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if db_appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return db_appointment

@app.put("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, updated_appointment: AppointmentCreate, db: Session = Depends(get_db)):
    db_appointment = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if db_appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    for key, value in updated_appointment.dict().items():
        setattr(db_appointment, key, value)
        
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    db_appointment = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if db_appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(db_appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}
