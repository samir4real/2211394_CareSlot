import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
import hashlib

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# --- DATABASE MODELS ---
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)  # 'admin', 'doctor', 'receptionist', 'patient'
    specialty = Column(String, default="") # For doctors (e.g., Cardiology)
    is_active = Column(Boolean, default=True)

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

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CareSlot Production-Ready API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://2211394.vercel.app"],
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

# --- SEED INITIAL SYSTEM ACCOUNTS ---
@app.on_event("startup")
def seed_users():
    db = SessionLocal()
    if db.query(UserDB).count() == 0:
        initial_users = [
            UserDB(name="Clinic Admin", email="admin@careslot.com", password=hash_password("12345678"), role="admin"),
            UserDB(name="Reception Desk 01", email="reception01@careslot.com", password=hash_password("12345678"), role="receptionist"),
            UserDB(name="Dr. Sarah Ahmed", email="doctor01@careslot.com", password=hash_password("12345678"), role="doctor", specialty="General Medicine"),
            UserDB(name="Dr. Tariq Hasan", email="doctor02@careslot.com", password=hash_password("12345678"), role="doctor", specialty="Cardiology"),
            UserDB(name="Samir Hossain", email="patient01@careslot.com", password=hash_password("12345678"), role="patient"),
        ]
        db.add_all(initial_users)
        db.commit()
    db.close()

# --- SCHEMAS ---
class LoginRequest(BaseModel):
    email: str
    password: str

class PatientRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class StaffCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'doctor' or 'receptionist'
    specialty: Optional[str] = ""

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

# --- AUTH & USER ROUTES ---
@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(
        UserDB.email == req.email,
        UserDB.password == hash_password(req.password),
        UserDB.is_active == True
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials or deactivated account")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "specialty": user.specialty}

@app.post("/api/register")
def register_patient(req: PatientRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    new_patient = UserDB(
        name=req.name,
        email=req.email,
        password=hash_password(req.password),
        role="patient",
        is_active=True
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return {"id": new_patient.id, "name": new_patient.name, "email": new_patient.email, "role": new_patient.role}

@app.get("/api/doctors")
def get_active_doctors(db: Session = Depends(get_db)):
    doctors = db.query(UserDB).filter(UserDB.role == "doctor", UserDB.is_active == True).all()
    return [{"id": d.id, "name": d.name, "email": d.email, "specialty": d.specialty} for d in doctors]

@app.get("/api/admin/staff")
def get_all_staff(db: Session = Depends(get_db)):
    staff = db.query(UserDB).filter(UserDB.role.in_(["doctor", "receptionist"]), UserDB.is_active == True).all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, "specialty": s.specialty} for s in staff]

@app.post("/api/admin/staff")
def add_staff(req: StaffCreateRequest, db: Session = Depends(get_db)):
    if req.role not in ["doctor", "receptionist"]:
        raise HTTPException(status_code=400, detail="Role must be doctor or receptionist")
    existing = db.query(UserDB).filter(UserDB.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
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
    return {"id": new_staff.id, "name": new_staff.name, "email": new_staff.email, "role": new_staff.role, "specialty": new_staff.specialty}

@app.delete("/api/admin/staff/{user_id}")
def remove_staff(user_id: int, db: Session = Depends(get_db)):
    staff = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    # Soft delete so past appointment history stays intact, while revoking login & booking visibility
    staff.is_active = False
    db.commit()
    return {"message": f"{staff.name} has been offboarded"}

# --- APPOINTMENT ROUTES ---
@app.get("/api/appointments")
def get_appointments(db: Session = Depends(get_db)):
    return db.query(AppointmentDB).all()

@app.post("/api/appointments")
def create_appointment(appt: AppointmentCreate, db: Session = Depends(get_db)):
    new_appt = AppointmentDB(**appt.dict(), status="Booked")
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@app.put("/api/appointments/{appt_id}")
def update_appointment(appt_id: int, updates: AppointmentUpdate, db: Session = Depends(get_db)):
    appt = db.query(AppointmentDB).filter(AppointmentDB.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(appt, key, value)
    db.commit()
    db.refresh(appt)
    return appt

@app.delete("/api/appointments/{appt_id}")
def delete_appointment(appt_id: int, db: Session = Depends(get_db)):
    appt = db.query(AppointmentDB).filter(AppointmentDB.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"message": "Deleted"}