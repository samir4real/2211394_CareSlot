
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class PatientRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
