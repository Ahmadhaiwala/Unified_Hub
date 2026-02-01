from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ChatGroupCreate(BaseModel):
    name: str
    description: str
    
class ChatGroupOut(BaseModel):
    id: UUID
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
class GroupMessegeCreate(BaseModel):
    content: str
    
class GroupMessegeOut(BaseModel):
    id: UUID
    group_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime
class MemeberOut(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
class ChatGroupListOut(BaseModel):
    count: int
    groups: List[ChatGroupOut]
class GroupMemberAdd(BaseModel):
    user_ids: List[UUID]

class ChatGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
class GroupMesegeListOut(BaseModel):
    count: int
    messages: List[GroupMessegeOut]