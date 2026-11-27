
from typing import Optional

from pydantic import BaseModel


class StaffCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    specialty: Optional[str] = ""
