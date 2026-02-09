from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class QuestionCreate(BaseModel):
    question_text: str
    question_order: int = 1
    points: int = 0
    expected_answer: Optional[str] = None

class QuestionResponse(BaseModel):
    id: str
    question_sheet_id: str
    question_text: str
    question_order: int
    points: int
    expected_answer: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionSheetCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    questions: List[QuestionCreate] = []

class QuestionSheetUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class AnswerSubmit(BaseModel):
    question_id: str
    answer_text: str

class AnswerResponse(BaseModel):
    id: str
    question_sheet_id: str
    question_id: str
    student_id: str
    answer_text: str
    message_id: Optional[str] = None
    confidence_score: Optional[float] = None
    is_ai_detected: bool = False
    submitted_at: datetime

    class Config:
        from_attributes = True

class QuestionSheetResponse(BaseModel):
    id: str
    group_id: str
    creator_id: str
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    total_points: int
    created_at: datetime
    updated_at: datetime
    total_questions: int = 0
    creator_username: Optional[str] = None
    creator_full_name: Optional[str] = None
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True

class StudentProgressResponse(BaseModel):
    question_sheet_id: str
    student_id: str
    total_questions: int
    answered_questions: int
    total_points: int
    earned_points: int
    completion_percentage: float
    answers: List[AnswerResponse] = []

    class Config:
        from_attributes = True
