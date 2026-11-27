
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.schemas import LoginRequest, PatientRegisterRequest
from app.services.auth_service import hash_password


router = APIRouter()


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(
        UserDB.email == req.email,
        UserDB.password == hash_password(req.password),
        UserDB.is_active == True
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials or deactivated account"
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "specialty": user.specialty
    }


@router.post("/register")
def register_patient(
    req: PatientRegisterRequest,
    db: Session = Depends(get_db)
):
    existing = db.query(UserDB).filter(
        UserDB.email == req.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists"
        )

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

    return {
        "id": new_patient.id,
        "name": new_patient.name,
        "email": new_patient.email,
        "role": new_patient.role
    }
