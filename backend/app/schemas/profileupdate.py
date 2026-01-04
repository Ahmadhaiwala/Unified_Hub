from pydantic import BaseModel
from typing import Optional


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    fullname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None