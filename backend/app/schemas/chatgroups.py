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
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
class GroupMessegeCreate(BaseModel):
    content: str
    
class GroupMessegeOut(BaseModel):
    id: UUID
    group_id: UUID
    sender_id: UUID
    sender_username: Optional[str] = None  # Added for displaying sender name
    content: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    attachment: Optional[dict] = None  # Added to support attachment data
class MemberOut(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: Optional[str] = "member"
    joined_at: Optional[datetime] = None

class MemberWithUserInfo(BaseModel):
    """Member with user profile information"""
    id: UUID
    group_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
class ChatGroupListOut(BaseModel):
    count: int
    groups: List[ChatGroupOut]
class GroupMemberAdd(BaseModel):
    user_ids: List[UUID]

class ChatGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
class GroupMesegeListOut(BaseModel):
    count: int
    messages: List[GroupMessegeOut]

# Document/Attachment Schemas
class GroupAttachmentOut(BaseModel):
    """Schema for file attachment in group chat"""
    id: UUID
    group_id: UUID
    message_id: Optional[UUID] = None
    uploader_id: UUID
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    created_at: datetime
    uploader_username: Optional[str] = None
    uploader_avatar: Optional[str] = None

class GroupAttachmentUpload(BaseModel):
    """Schema for uploading attachment"""
    group_id: UUID
    message_id: Optional[UUID] = None

class GroupAttachmentListOut(BaseModel):
    count: int
    attachments: List[GroupAttachmentOut]

class GroupMessageWithAttachment(BaseModel):
    """Extended message schema with attachment data"""
    id: UUID
    group_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime
    attachment: Optional[GroupAttachmentOut] = None

# Member Management Schemas
class AvailableUserOut(BaseModel):
    """User that can be added to a group"""
    user_id: UUID
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class AvailableUsersListOut(BaseModel):
    count: int
    users: List[AvailableUserOut]

class MemberListOut(BaseModel):
    count: int
    members: List[MemberWithUserInfo]