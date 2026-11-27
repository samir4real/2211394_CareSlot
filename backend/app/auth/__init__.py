

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB
from app.schemas import LoginRequest, PatientRegisterRequest
from app.auth.security import (
    issue_token,
    user_payload,
    password_hasher,
    verify_password_and_upgrade,
)

router = APIRouter()


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(
        UserDB.email == req.email.lower(),
        UserDB.is_active.is_(True)
    ).first()

    if not user or not verify_password_and_upgrade(
        req.password, user.password or "", user, db
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials or deactivated account"
        )

    return {
        **user_payload(user),
        "access_token": issue_token(user),
        "token_type": "bearer"
    }


@router.post("/register")
def register_patient(
    req: PatientRegisterRequest,
    db: Session = Depends(get_db)
):
    email = req.email.lower()

    existing = db.query(UserDB).filter(
        UserDB.email == email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists"
        )

    new_patient = UserDB(
        name=req.name.strip(),
        email=email,
        password=password_hasher.hash(req.password),
        role="patient",
        is_active=True
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return {
        **user_payload(new_patient),
        "access_token": issue_token(new_patient),
        "token_type": "bearer"
    }
