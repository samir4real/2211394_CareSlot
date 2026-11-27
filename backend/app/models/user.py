
from sqlalchemy import Column, Integer, String, Boolean

from app.database import Base


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    specialty = Column(String, default="")
    is_active = Column(Boolean, default=True)
