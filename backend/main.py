import os
import time
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Callable

import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, Session, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "admin@careslot.com").strip().lower()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")
if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be set to a random value of at least 32 characters")

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
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)
TOKEN_TTL_HOURS = 8

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    specialty = Column(String, default="")
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
app = FastAPI(title="CareSlot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://2211394.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def effective_role(user: UserDB) -> str:
    if user.email.lower() == SUPER_ADMIN_EMAIL:
        return "super_admin"
    return user.role

def user_payload(user: UserDB) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": effective_role(user),
        "specialty": user.specialty or "",
    }

def issue_token(user: UserDB) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "iat": now, "exp": now + timedelta(hours=TOKEN_TTL_HOURS)}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

def verify_password_and_upgrade(password: str, stored: str, user: UserDB, db: Session) -> bool:
    # Upgrade legacy SHA-256 hashes after a successful login.
    legacy = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy, stored):
        user.password = password_hasher.hash(password)
        db.commit()
        return True
    try:
        return password_hasher.verify(password, stored)
    except Exception:
        return False

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserDB:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub", ""))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.query(UserDB).filter(UserDB.id == user_id, UserDB.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account is inactive or no longer exists")
    return user

def require_roles(*allowed_roles: str) -> Callable:
    def role_dependency(user: UserDB = Depends(get_current_user)) -> UserDB:
        if effective_role(user) not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        return user
    return role_dependency

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class PatientRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

class StaffCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    role: str
    specialty: Optional[str] = Field(default="", max_length=120)

class AdminCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class AppointmentCreate(BaseModel):
    patient_name: str = Field(min_length=2, max_length=120)
    patient_email: EmailStr
    doctor_name: str = Field(min_length=2, max_length=120)
    date: str
    time_slot: str
    reason: Optional[str] = Field(default="", max_length=1000)

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == req.email.lower(), UserDB.is_active.is_(True)).first()
    if not user or not verify_password_and_upgrade(req.password, user.password or "", user, db):
        raise HTTPException(status_code=401, detail="Invalid credentials or deactivated account")
    return {**user_payload(user), "access_token": issue_token(user), "token_type": "bearer"}

@app.post("/api/register")
def register_patient(req: PatientRegisterRequest, db: Session = Depends(get_db)):
    email = req.email.lower()
    if db.query(UserDB).filter(UserDB.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = UserDB(name=req.name.strip(), email=email, password=password_hasher.hash(req.password), role="patient", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {**user_payload(user), "access_token": issue_token(user), "token_type": "bearer"}

@app.get("/api/doctors")
def get_active_doctors(db: Session = Depends(get_db)):
    doctors = db.query(UserDB).filter(UserDB.role == "doctor", UserDB.is_active.is_(True)).all()
    return [{"id": d.id, "name": d.name, "email": d.email, "specialty": d.specialty or ""} for d in doctors]

@app.get("/api/admin/staff")
def get_all_staff(
    _admin: UserDB = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    staff = db.query(UserDB).filter(UserDB.role.in_(["doctor", "receptionist"]), UserDB.is_active.is_(True)).all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, "specialty": s.specialty or ""} for s in staff]

@app.post("/api/admin/staff")
def add_staff(
    req: StaffCreateRequest,
    _admin: UserDB = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    if req.role not in ["doctor", "receptionist"]:
        raise HTTPException(status_code=400, detail="Role must be doctor or receptionist")
    email = req.email.lower()
    if db.query(UserDB).filter(UserDB.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    staff = UserDB(name=req.name.strip(), email=email, password=password_hasher.hash(req.password),
                   role=req.role, specialty=req.specialty if req.role == "doctor" else "", is_active=True)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return {"id": staff.id, "name": staff.name, "email": staff.email, "role": staff.role, "specialty": staff.specialty}

@app.delete("/api/admin/staff/{user_id}")
def remove_staff(
    user_id: int,
    _admin: UserDB = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    staff = db.query(UserDB).filter(UserDB.id == user_id, UserDB.role.in_(["doctor", "receptionist"])).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.is_active = False
    db.commit()
    return {"message": f"{staff.name} has been offboarded"}

@app.get("/api/admin/admins")
def list_admins(
    _super_admin: UserDB = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    admins = db.query(UserDB).filter(UserDB.role.in_(["admin", "super_admin"]), UserDB.is_active.is_(True)).all()
    return [user_payload(a) for a in admins]

@app.post("/api/admin/admins")
def create_admin(
    req: AdminCreateRequest,
    _super_admin: UserDB = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    email = req.email.lower()
    if db.query(UserDB).filter(UserDB.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    admin = UserDB(name=req.name.strip(), email=email, password=password_hasher.hash(req.password), role="admin", is_active=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return user_payload(admin)

@app.delete("/api/admin/admins/{user_id}")
def deactivate_admin(
    user_id: int,
    super_admin: UserDB = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    target = db.query(UserDB).filter(UserDB.id == user_id, UserDB.role == "admin").first()
    if not target:
        raise HTTPException(status_code=404, detail="Secondary admin not found")
    if target.id == super_admin.id:
        raise HTTPException(status_code=403, detail="You cannot deactivate your own account")
    target.is_active = False
    db.commit()
    return {"message": "Admin account deactivated"}

@app.get("/api/appointments")
def get_appointments(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(AppointmentDB)
    role = effective_role(user)
    if role == "patient":
        query = query.filter(AppointmentDB.patient_email == user.email)
    elif role == "doctor":
        query = query.filter(AppointmentDB.doctor_name == user.name)
    return query.order_by(AppointmentDB.date, AppointmentDB.time_slot).all()

@app.post("/api/appointments")
def create_appointment(
    appt: AppointmentCreate,
    user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = effective_role(user)
    if role == "patient":
        data = appt.model_dump() if hasattr(appt, "model_dump") else appt.dict()
        data["patient_name"] = user.name
        data["patient_email"] = user.email
    elif role not in ["receptionist", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Doctors cannot create appointments")
    else:
        data = appt.model_dump() if hasattr(appt, "model_dump") else appt.dict()
    doctor = db.query(UserDB).filter(UserDB.name == data["doctor_name"], UserDB.role == "doctor", UserDB.is_active.is_(True)).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="Selected doctor is not active")
    new_appt = AppointmentDB(**data, status="Booked")
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@app.put("/api/appointments/{appt_id}")
def update_appointment(
    appt_id: int,
    updates: AppointmentUpdate,
    user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(AppointmentDB).filter(AppointmentDB.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    changes = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else updates.dict(exclude_unset=True)
    role = effective_role(user)
    if role == "patient":
        if appt.patient_email != user.email or changes.keys() != {"status"} or changes.get("status") != "Cancelled":
            raise HTTPException(status_code=403, detail="Patients may only cancel their own booked appointments")
        if appt.status != "Booked":
            raise HTTPException(status_code=400, detail="Only booked appointments can be cancelled")
    elif role == "doctor":
        if appt.doctor_name != user.name or not changes or set(changes) - {"status", "notes"}:
            raise HTTPException(status_code=403, detail="Doctors may only update their own appointments")
        if changes.get("status") not in (None, "Completed"):
            raise HTTPException(status_code=403, detail="Doctors may only mark appointments completed")
    elif role == "receptionist":
        if not changes or set(changes) != {"status"} or changes["status"] not in {"Checked-In", "Cancelled"}:
            raise HTTPException(status_code=403, detail="Receptionists may only check in or cancel appointments")
    elif role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    allowed_statuses = {"Booked", "Checked-In", "Completed", "Cancelled"}
    if "status" in changes and changes["status"] not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid appointment status")
    for key, value in changes.items():
        setattr(appt, key, value)
    db.commit()
    db.refresh(appt)
    return appt

@app.delete("/api/appointments/{appt_id}")
def delete_appointment(
    appt_id: int,
    _staff: UserDB = Depends(require_roles("receptionist", "admin", "super_admin")),
    db: Session = Depends(get_db),
):
    appt = db.query(AppointmentDB).filter(AppointmentDB.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"message": "Deleted"}
