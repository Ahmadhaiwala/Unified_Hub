from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class ReminderPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class ReminderCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: ReminderPriority = ReminderPriority.medium

class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[ReminderPriority] = None

class ReminderResponse(BaseModel):
    id: str
    group_id: str
    creator_id: str
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    priority: str
    created_at: datetime
    updated_at: datetime
    is_read: bool = False
    read_at: Optional[datetime] = None
    creator_username: Optional[str] = None
    creator_full_name: Optional[str] = None

    class Config:
        from_attributes = True
