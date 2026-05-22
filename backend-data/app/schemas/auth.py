from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    organization_name: Optional[str] = None


class TokenData(BaseModel):
    user_id: int
    email: str
    organization_id: int
    roles: List[str]


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    organization_id: int
    organization_name: Optional[str]
    roles: List[str]
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True


# Actualizar forward references
LoginResponse.model_rebuild()




