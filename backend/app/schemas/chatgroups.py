from pydantic import BaseModel
from typing import Optional, List

class ChatGroupOut(BaseModel):
    id: str
    title: str
    type: Optional[str]
    created_at: Optional[str]


class ChatGroupListOut(BaseModel):
    count: int
    conversations: List[ChatGroupOut]
