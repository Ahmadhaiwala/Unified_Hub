# app/schemas/profile.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfileBase(BaseModel):
    username: Optional[str] = None
    fullname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email:Optional[str] = None


class ProfileResponse(ProfileBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
