"""
Assignment API Endpoints
REST API for assignment management, PDF uploads, and student replies
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from app.schemas.assignment import (
    AssignmentResponse, AssignmentDetailResponse,
    LinkedReplyResponse, ManualReplySubmit, AssignmentFromMessage
)
from app.services.assignment_service import assignment_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/assignments/{group_id}/upload-pdf", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf_assignment(
    group_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Upload PDF and create assignment with AI-extracted fields (admin only)
    """
    user_id = current_user.id
    return await assignment_service.create_assignment_from_pdf(group_id, user_id, file)

@router.post("/assignments/{group_id}/from-message", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment_from_message(
    group_id: str,
    data: AssignmentFromMessage,
    current_user = Depends(get_current_user)
):
    """
    Create assignment from message text with AI field extraction (admin only)
    """
    user_id = current_user.id
    return await assignment_service.create_assignment_from_message(
        group_id, user_id, data.message_text
    )

@router.get("/assignments/{group_id}", response_model=List[AssignmentResponse])
async def get_group_assignments(
    group_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get all assignments for a group
    """
    user_id = current_user.id
    return await assignment_service.get_group_assignments(group_id, user_id)

@router.get("/assignments/detail/{assignment_id}", response_model=AssignmentDetailResponse)
async def get_assignment_detail(
    assignment_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get assignment details with linked student replies
    """
    user_id = current_user.id
    return await assignment_service.get_assignment_detail(assignment_id, user_id)

@router.get("/assignments/{assignment_id}/replies", response_model=List[LinkedReplyResponse])
async def get_assignment_replies(
    assignment_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get all linked replies for an assignment (auto + manual)
    """
    user_id = current_user.id
    assignment = await assignment_service.get_assignment_detail(assignment_id, user_id)
    return assignment.get("linked_replies", [])

@router.post("/assignments/{assignment_id}/submit-reply", response_model=LinkedReplyResponse, status_code=status.HTTP_201_CREATED)
async def submit_manual_reply(
    assignment_id: str,
    data: ManualReplySubmit,
    current_user = Depends(get_current_user)
):
    """
    Manually submit a reply to an assignment (students)
    """
    user_id = current_user.id
    return await assignment_service.submit_manual_reply(
        assignment_id, user_id, data.reply_text
    )

@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_200_OK)
async def delete_assignment(
    assignment_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete an assignment (creator/admin only)
    """
    user_id = current_user.id
    return await assignment_service.delete_assignment(assignment_id, user_id)

@router.get("/assignments/{assignment_id}/questions")
async def get_assignment_questions(
    assignment_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get all questions for an assignment
    """
    user_id = current_user.id
    return await assignment_service.get_assignment_questions(assignment_id, user_id)

@router.post("/assignments/{assignment_id}/reply-with-question", status_code=status.HTTP_201_CREATED)
async def submit_reply_with_question(
    assignment_id: str,
    reply_text: str = Form(...),
    question_id: str = Form(None),
    current_user = Depends(get_current_user)
):
    """
    Submit a reply to an assignment with optional question selection
    If question_id is not provided, AI will detect which question is being answered
    """
    user_id = current_user.id
    return await assignment_service.submit_manual_reply_with_question(
        assignment_id, user_id, reply_text, question_id
    )
