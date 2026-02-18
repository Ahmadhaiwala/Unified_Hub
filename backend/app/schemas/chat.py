from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class MessageCreate(BaseModel):
    content: str

class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    read_at: Optional[datetime] = None

class ConversationParticipant(BaseModel):
    id: UUID
    username: str

class ConversationOut(BaseModel):
    id: UUID
    participant: ConversationParticipant
    last_message: Optional[Message] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

class ConversationListOut(BaseModel):
    conversations: List[ConversationOut]

class ConversationDetail(BaseModel):
    id: UUID
    participant1_id: UUID
    participant2_id: UUID
    created_at: datetime
    updated_at: datetime

class MessageListResponse(BaseModel):
    messages: List[Message]
    total_count: int
    limit: int
    offset: int
    has_more: bool

class ConversationTitle(BaseModel):
    conversation_id: UUID
    title: str
    type: str  # 'direct' or 'group'

class MessageUpdateRequest(BaseModel):
    content: str

