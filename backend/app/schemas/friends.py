from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class Friend(BaseModel):
    name: str
    user_id: Optional[UUID] = None
    friend_id: Optional[UUID] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
