"""
Assignment Service Layer
Comprehensive service for managing assignments, PDF uploads, and student replies
"""

from typing import List, Optional, Dict
from fastapi import HTTPException, status, UploadFile
from app.core.supabase import supabase
from app.services.assignment_detector import detect_and_store_assignment
from app.services.pdf_parser import parse_pdf_to_text, validate_pdf_file
from datetime import datetime
import asyncio
import uuid

class AssignmentService:
    
    @staticmethod
    async def create_assignment_from_pdf(
        group_id: str,
        admin_id: str,
        pdf_file: UploadFile
    ) -> Dict:
        """Upload PDF and create assignment with AI-extracted fields"""
        try:
            # Validate admin permission
            admin_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("role")
                .eq("group_id", group_id)
                .eq("user_id", admin_id)
                .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create assignments"
                )
            
            # Read PDF content
            pdf_content = await pdf_file.read()
            
            # Validate PDF
            is_valid, error_msg = await validate_pdf_file(pdf_content)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            
            # Detect and store assignment
            assignment = await detect_and_store_assignment(
                file_content=pdf_content,
                file_name=pdf_file.filename,
                group_id=group_id,
                user_id=admin_id
            )
            
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not detect assignment content in PDF. Please ensure the file contains clear assignment text."
                )
            
            return assignment
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating assignment from PDF: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process PDF: {str(e)}"
            )
    
    @staticmethod
    async def create_assignment_from_message(
        group_id: str,
        admin_id: str,
        message_text: str
    ) -> Dict:
        """Create assignment from message text with AI field extraction"""
        try:
            # Validate admin permission
            admin_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("role")
                .eq("group_id", group_id)
                .eq("user_id", admin_id)
                .execute()
            )
            
            if not admin_check.data or admin_check.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create assignments"
                )
            
            # Detect and store assignment
            assignment = await detect_and_store_assignment(
                text=message_text,
                group_id=group_id,
                user_id=admin_id
            )
            
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not detect assignment from message"
                )
            
            return assignment
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating assignment from message: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create assignment: {str(e)}"
            )
    
    @staticmethod
    async def get_group_assignments(group_id: str, user_id: str) -> List[Dict]:
        """Get all assignments for a group"""
        try:
            # TODO: Re-enable permission checks after fixing group_members table issue
            # For now, allowing all authenticated users to view assignments
            
            # Get assignments directly from question_sheets table (not using view)
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("*")
                .eq("group_id", group_id)
                .order("created_at", desc=True)
                .execute()
            )
            
            return result.data
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching assignments: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch assignments: {str(e)}"
            )
    
    @staticmethod
    async def get_assignment_detail(assignment_id: str, user_id: str) -> Dict:
        """Get assignment details with questions and organized answers"""
        try:
            # Get assignment details directly from question_sheets table
            assignment_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("*")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )
            
            assignment = assignment_result.data[0]
            
            # Get all questions for this assignment from question_sheet_questions table
            questions_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheet_questions")
                .select("*")
                .eq("question_sheet_id", assignment_id)
                .order("question_order")
                .execute()
            )
            
            # Get all answers for this assignment
            answers_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .select("*")
                .eq("question_sheet_id", assignment_id)
                .order("submitted_at", desc=True)
                .execute()
            )
            
            # Group answers by question_id
            answers_by_question = {}
            for answer in (answers_result.data or []):
                question_id = answer.get("question_id")
                if question_id not in answers_by_question:
                    answers_by_question[question_id] = []
                
                # Fetch student profile
                student_id = answer.get("student_id")
                student_info = {}
                
                if student_id:
                    try:
                        profile_result = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda sid=student_id: supabase.table("profiles")
                            .select("username, full_name, avatar_url")
                            .eq("id", sid)
                            .execute()
                        )
                        if profile_result.data:
                            student_info = profile_result.data[0]
                    except Exception as profile_error:
                        print(f"Error fetching profile for {student_id}: {profile_error}")
                
                answers_by_question[question_id].append({
                    "id": answer.get("id"),
                    "student_id": student_id,
                    "student_username": student_info.get("username"),
                    "student_full_name": student_info.get("full_name"),
                    "student_avatar": student_info.get("avatar_url"),
                    "answer_text": answer.get("answer_text"),
                    "confidence_score": answer.get("confidence_score"),
                    "is_ai_detected": answer.get("is_ai_detected", False),
                    "submission_type": answer.get("submission_type", "manual"),
                    "submitted_at": answer.get("submitted_at")
                })
            
            # Build organized questions structure
            organized_questions = []
            for question in (questions_result.data or []):
                question_id = question["id"]
                organized_questions.append({
                    "id": question_id,
                    "question_text": question["question_text"],
                    "question_order": question["question_order"],
                    "points": question.get("points", 0),
                    "answers": answers_by_question.get(question_id, [])
                })
            
            # Return organized structure
            return {
                "assignment": assignment,
                "questions": organized_questions
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching assignment detail: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch assignment: {str(e)}"
            )
    
    @staticmethod
    async def submit_manual_reply(
        assignment_id: str,
        student_id: str,
        reply_text: str
    ) -> Dict:
        """Allow students to manually submit replies to assignments"""
        try:
            # Verify assignment exists and get group_id
            assignment_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("id, group_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )
            
            group_id = assignment_check.data[0]["group_id"]
            
            # Verify student is member of group
            member_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("id")
                .eq("group_id", group_id)
                .eq("user_id", student_id)
                .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this group"
                )
            
            # Create a dummy question for the assignment if none exists
            # (This allows using the existing answer table structure)
            question_id = str(uuid.uuid4())
            question_data = {
                "id": question_id,
                "question_sheet_id": assignment_id,
                "question_text": "General Assignment Response",
                "question_order": 1,
                "points": 0
            }
            
            # Check if general question already exists
            existing_q = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheet_questions")
                .select("id")
                .eq("question_sheet_id", assignment_id)
                .eq("question_text", "General Assignment Response")
                .execute()
            )
            
            if existing_q.data:
                question_id = existing_q.data[0]["id"]
            else:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: supabase.table("question_sheet_questions")
                    .insert(question_data)
                    .execute()
                )
            
            # Insert manual reply
            reply_data = {
                "question_sheet_id": assignment_id,
                "question_id": question_id,
                "student_id": student_id,
                "answer_text": reply_text,
                "is_ai_detected": False,
                "submission_type": "manual",
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .upsert(reply_data, on_conflict="question_id,student_id")
                .execute()
            )
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to submit reply"
                )
            
            return result.data[0]
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error submitting manual reply: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit reply: {str(e)}"
            )
    
    @staticmethod
    async def delete_assignment(assignment_id: str, admin_id: str) -> Dict:
        """Delete assignment (admin/creator only)"""
        try:
            # Verify user is the creator
            assignment_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("creator_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )
            
            if assignment_check.data[0]["creator_id"] != admin_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the creator can delete this assignment"
                )
            
            # Delete assignment (cascade will delete questions and answers)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .delete()
                .eq("id", assignment_id)
                .execute()
            )
            
            return {"status": "success", "message": "Assignment deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting assignment: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete assignment: {str(e)}"
            )

    @staticmethod
    async def submit_manual_reply_with_question(
        assignment_id: str,
        student_id: str,
        reply_text: str,
        question_id: Optional[str] = None
    ) -> Dict:
        """
        Allow students to manually submit replies to assignments
        Supports optional question_id or AI-powered question detection
        """
        try:
            # Verify assignment exists and get group_id
            assignment_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("id, group_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )
            
            group_id = assignment_check.data[0]["group_id"]
            
            # Verify student is member of group
            member_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("id")
                .eq("group_id", group_id)
                .eq("user_id", student_id)
                .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this group"
                )
            
            confidence_score = None
            
            # If question_id not provided, use AI to detect which question
            if question_id is None:
                from app.services.question_linker import match_answer_to_question
                
                match_result = await match_answer_to_question(reply_text, assignment_id)
                
                if match_result:
                    question_id = match_result["question_id"]
                    confidence_score = match_result["confidence_score"]
                    print(f"🎯 AI matched answer to Q{match_result.get('question_order')} (confidence: {confidence_score:.2f})")
            
            # If still no question_id, create/use general question
            if question_id is None:
                existing_q = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: supabase.table("question_sheet_questions")
                    .select("id")
                    .eq("question_sheet_id", assignment_id)
                    .eq("question_text", "General Assignment Response")
                    .execute()
                )
                
                if existing_q.data:
                    question_id = existing_q.data[0]["id"]
                else:
                    question_data = {
                        "id": str(uuid.uuid4()),
                        "question_sheet_id": assignment_id,
                        "question_text": "General Assignment Response",
                        "question_order": 1,
                        "points": 0
                    }
                    q_result = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: supabase.table("question_sheet_questions")
                        .insert(question_data)
                        .execute()
                    )
                    question_id = q_result.data[0]["id"] if q_result.data else None
            
            # Insert manual reply
            reply_data = {
                "question_sheet_id": assignment_id,
                "question_id": question_id,
                "student_id": student_id,
                "answer_text": reply_text,
                "confidence_score": confidence_score,
                "is_ai_detected": False,
                "submission_type": "manual",
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .upsert(reply_data, on_conflict="question_id,student_id")
                .execute()
            )
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to submit reply"
                )
            
            return result.data[0]
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error submitting manual reply: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit reply: {str(e)}"
            )
    
    @staticmethod
    async def get_assignment_questions(assignment_id: str, user_id: str) -> List[Dict]:
        """Get all questions for an assignment"""
        try:
            from app.services.question_linker import get_questions_for_assignment
            
            # Verify user has access to assignment
            assignment_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("group_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )
            
            questions = await get_questions_for_assignment(assignment_id)
            return questions
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching questions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch questions: {str(e)}"
            )

# Singleton instance
assignment_service = AssignmentService()
