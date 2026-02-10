"""
Assignment Schemas
Pydantic models for assignment API requests and responses
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None  # Free-form text
    due_date: Optional[datetime] = None

class AssignmentResponse(BaseModel):
    id: str
    group_id: str
    creator_id: str
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[datetime] = None
    source_type: str  # 'manual', 'pdf', 'message'
    source_file_path: Optional[str] = None
    ai_confidence: Optional[float] = None
    total_points: int
    total_questions: Optional[int] = 0  # Made optional since views may not exist
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LinkedReplyResponse(BaseModel):
    id: str
    student_id: str
    student_username: Optional[str] = None
    student_full_name: Optional[str] = None
    student_avatar: Optional[str] = None
    answer_text: str
    message_id: Optional[str] = None
    confidence_score: Optional[float] = None
    submission_type: str  # 'manual' or 'auto_detected'
    is_ai_detected: bool
    submitted_at: datetime

    class Config:
        from_attributes = True

class QuestionResponse(BaseModel):
    """Response model for individual questions with their answers"""
    id: str
    question_text: str
    question_order: int
    points: int = 0
    answers: List[LinkedReplyResponse] = []

    class Config:
        from_attributes = True

class AssignmentDetailResponse(BaseModel):
    """Response model for assignment detail with organized questions"""
    assignment: AssignmentResponse
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True

class ManualReplySubmit(BaseModel):
    reply_text: str

class AssignmentFromMessage(BaseModel):
    message_text: str
