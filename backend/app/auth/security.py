
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserDB


JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to a random value of at least 32 characters"
    )

SUPER_ADMIN_EMAIL = os.getenv(
    "SUPER_ADMIN_EMAIL", "admin@careslot.com"
).strip().lower()

TOKEN_TTL_HOURS = 8

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


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

    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_TTL_HOURS),
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


def verify_password_and_upgrade(
    password: str,
    stored: str,
    user: UserDB,
    db: Session
) -> bool:
    # Upgrade an old SHA-256 password after successful login.
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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> UserDB:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id = int(payload.get("sub", ""))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session"
        )

    user = db.query(UserDB).filter(
        UserDB.id == user_id,
        UserDB.is_active.is_(True)
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Account is inactive or no longer exists"
        )

    return user


def require_roles(*allowed_roles: str) -> Callable:
    def role_dependency(
        user: UserDB = Depends(get_current_user)
    ) -> UserDB:
        if effective_role(user) not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )
        return user

    return role_dependency
