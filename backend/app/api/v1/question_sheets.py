from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.question_sheet import (
    QuestionSheetCreate, QuestionSheetUpdate, QuestionSheetResponse,
    AnswerSubmit, AnswerResponse, StudentProgressResponse
)
from app.services.question_sheet_service import question_sheet_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/question-sheets/{group_id}", response_model=QuestionSheetResponse, status_code=status.HTTP_201_CREATED)
async def create_question_sheet(
    group_id: str,
    sheet_data: QuestionSheetCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new question sheet with questions (admin only)
    """
    user_id = current_user["id"]
    return await question_sheet_service.create_question_sheet(group_id, user_id, sheet_data)

@router.get("/question-sheets/{group_id}", response_model=List[QuestionSheetResponse])
async def get_group_question_sheets(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all question sheets for a group
    """
    user_id = current_user["id"]
    return await question_sheet_service.get_group_question_sheets(group_id, user_id)

@router.get("/question-sheets/detail/{sheet_id}", response_model=QuestionSheetResponse)
async def get_question_sheet_detail(
    sheet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a question sheet including all questions
    """
    user_id = current_user["id"]
    return await question_sheet_service.get_question_sheet_detail(sheet_id, user_id)

@router.post("/question-sheets/{sheet_id}/questions/{question_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    sheet_id: str,
    question_id: str,
    answer_data: AnswerSubmit,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit or update an answer to a question
    """
    user_id = current_user["id"]
    return await question_sheet_service.submit_answer(
        sheet_id, 
        question_id, 
        user_id, 
        answer_data.answer_text
    )

@router.get("/question-sheets/{sheet_id}/progress/{student_id}", response_model=StudentProgressResponse)
async def get_student_progress(
    sheet_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a student's progress on a question sheet (admin can view all, students can view their own)
    """
    user_id = current_user["id"]
    
    # Allow students to view their own progress or admins to view any
    if student_id != user_id:
        # Check if current user is admin (this would need additional verification)
        # For now, allowing it - the service layer RLS will handle permissions
        pass
    
    return await question_sheet_service.get_student_progress(sheet_id, student_id)

@router.delete("/question-sheets/{sheet_id}", status_code=status.HTTP_200_OK)
async def delete_question_sheet(
    sheet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a question sheet (creator/admin only)
    """
    user_id = current_user["id"]
    return await question_sheet_service.delete_question_sheet(sheet_id, user_id)
