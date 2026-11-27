
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.models import UserDB, AppointmentDB
from app.services.auth_service import hash_password

from app.auth import router as auth_router
from app.doctors import router as doctors_router
from app.staff import router as staff_router
from app.admin import router as admin_router
from app.appointments import router as appointments_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Initialize FastAPI application
app = FastAPI(title="CareSlot Production-Ready API")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://2211394.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Register API routers
app.include_router(auth_router, prefix="/api")
app.include_router(doctors_router, prefix="/api")
app.include_router(staff_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")


# Seed initial system accounts
@app.on_event("startup")
def seed_users():
    db = SessionLocal()

    try:
        if db.query(UserDB).count() == 0:
            initial_users = [
                UserDB(
                    name="Clinic Admin",
                    email="admin@careslot.com",
                    password=hash_password("12345678"),
                    role="admin"
                ),
                UserDB(
                    name="Reception Desk 01",
                    email="reception01@careslot.com",
                    password=hash_password("12345678"),
                    role="receptionist"
                ),
                UserDB(
                    name="Dr. Sarah Ahmed",
                    email="doctor01@careslot.com",
                    password=hash_password("12345678"),
                    role="doctor",
                    specialty="General Medicine"
                ),
                UserDB(
                    name="Dr. Tariq Hasan",
                    email="doctor02@careslot.com",
                    password=hash_password("12345678"),
                    role="doctor",
                    specialty="Cardiology"
                ),
                UserDB(
                    name="Samir Hossain",
                    email="patient01@careslot.com",
                    password=hash_password("12345678"),
                    role="patient"
                ),
            ]

            db.add_all(initial_users)
            db.commit()

    finally:
        db.close()
