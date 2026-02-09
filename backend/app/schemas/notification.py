from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    priority: str = "medium"
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
