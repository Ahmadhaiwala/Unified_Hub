from typing import List, Optional
from fastapi import HTTPException, status
from app.core.supabase import supabase
from app.schemas.question_sheet import (
    QuestionSheetCreate, QuestionSheetUpdate, QuestionSheetResponse,
    QuestionResponse, AnswerSubmit, AnswerResponse, StudentProgressResponse
)
from datetime import datetime
import asyncio
import uuid

class QuestionSheetService:
    
    @staticmethod
    async def create_question_sheet(group_id: str, admin_id: str, data: QuestionSheetCreate) -> QuestionSheetResponse:
        """Create a new question sheet with questions (admin only)"""
        try:
            # Check if user is admin of the group
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
                    detail="Only admins can create question sheets"
                )
            
            # Calculate total points from questions
            total_points = sum(q.points for q in data.questions)
            
            # Create question sheet
            sheet_data = {
                "group_id": group_id,
                "creator_id": admin_id,
                "title": data.title,
                "description": data.description,
                "due_date": data.due_date.isoformat() if data.due_date else None,
                "total_points": total_points
            }
            
            sheet_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets").insert(sheet_data).execute()
            )
            
            if not sheet_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create question sheet"
                )
            
            sheet_id = sheet_result.data[0]["id"]
            
            # Create questions
            questions_data = [
                {
                    "id": str(uuid.uuid4()),
                    "question_sheet_id": sheet_id,
                    "question_text": q.question_text,
                    "question_order": idx + 1 if q.question_order == 1 else q.question_order,
                    "points": q.points,
                    "expected_answer": q.expected_answer
                }
                for idx, q in enumerate(data.questions)
            ]
            
            if questions_data:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: supabase.table("question_sheet_questions")
                    .insert(questions_data)
                    .execute()
                )
            
            # Fetch created sheet with questions
            return await QuestionSheetService.get_question_sheet_detail(sheet_id, admin_id)
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating question sheet: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create question sheet: {str(e)}"
            )
    
    @staticmethod
    async def get_group_question_sheets(group_id: str, user_id: str) -> List[QuestionSheetResponse]:
        """Get all question sheets for a group"""
        try:
            # Check if user is member of group
            member_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("group_members")
                .select("id")
                .eq("group_id", group_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            if not member_check.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this group"
                )
            
            # Get question sheets with stats from view
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets_with_stats")
                .select("*")
                .eq("group_id", group_id)
                .order("created_at", desc=True)
                .execute()
            )
            
            sheets = [QuestionSheetResponse(**sheet) for sheet in result.data]
            return sheets
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching question sheets: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch question sheets: {str(e)}"
            )
    
    @staticmethod
    async def get_question_sheet_detail(sheet_id: str, user_id: str) -> QuestionSheetResponse:
        """Get question sheet details with questions and user's answers"""
        try:
            # Get sheet details
            sheet_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets_with_stats")
                .select("*")
                .eq("id", sheet_id)
                .execute()
            )
            
            if not sheet_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question sheet not found"
                )
            
            sheet_data = sheet_result.data[0]
            
            # Get questions
            questions_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheet_questions")
                .select("*")
                .eq("question_sheet_id", sheet_id)
                .order("question_order")
                .execute()
            )
            
            questions = [QuestionResponse(**q) for q in questions_result.data]
            sheet_data["questions"] = questions
            
            return QuestionSheetResponse(**sheet_data)
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching question sheet detail: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch question sheet: {str(e)}"
            )
    
    @staticmethod
    async def submit_answer(sheet_id: str, question_id: str, student_id: str, answer_text: str) -> AnswerResponse:
        """Submit or update an answer to a question"""
        try:
            # Verify question belongs to sheet
            question_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheet_questions")
                .select("id")
                .eq("id", question_id)
                .eq("question_sheet_id", sheet_id)
                .execute()
            )
            
            if not question_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question not found in this sheet"
                )
            
            # Insert or update answer
            answer_data = {
                "question_sheet_id": sheet_id,
                "question_id": question_id,
                "student_id": student_id,
                "answer_text": answer_text,
                "is_ai_detected": False,
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .upsert(answer_data, on_conflict="question_id,student_id")
                .execute()
            )
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to submit answer"
                )
            
            return AnswerResponse(**result.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error submitting answer: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit answer: {str(e)}"
            )
    
    @staticmethod
    async def record_ai_answer(sheet_id: str, question_id: str, student_id: str, 
                               answer_text: str, message_id: str, confidence: float) -> AnswerResponse:
        """Record an AI-detected answer"""
        try:
            answer_data = {
                "question_sheet_id": sheet_id,
                "question_id": question_id,
                "student_id": student_id,
                "answer_text": answer_text,
                "message_id": message_id,
                "confidence_score": confidence,
                "is_ai_detected": True,
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .upsert(answer_data, on_conflict="question_id,student_id")
                .execute()
            )
            
            if result.data:
                return AnswerResponse(**result.data[0])
            return None
            
        except Exception as e:
            print(f"Error recording AI answer: {str(e)}")
            return None
    
    @staticmethod
    async def get_student_progress(sheet_id: str, student_id: str) -> StudentProgressResponse:
        """Get student's progress on a question sheet"""
        try:
            # Get sheet details
            sheet = await QuestionSheetService.get_question_sheet_detail(sheet_id, student_id)
            
            # Get student's answers
            answers_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("user_question_sheet_answers")
                .select("*")
                .eq("question_sheet_id", sheet_id)
                .eq("student_id", student_id)
                .execute()
            )
            
            answers = [AnswerResponse(**a) for a in answers_result.data]
            
            # Calculate progress
            total_questions = len(sheet.questions)
            answered_questions = len(answers)
            total_points = sheet.total_points
            
            # For now, earned_points is 0 (manual grading would be needed)
            earned_points = 0
            
            completion_percentage = (answered_questions / total_questions * 100) if total_questions > 0 else 0
            
            return StudentProgressResponse(
                question_sheet_id=sheet_id,
                student_id=student_id,
                total_questions=total_questions,
                answered_questions=answered_questions,
                total_points=total_points,
                earned_points=earned_points,
                completion_percentage=round(completion_percentage, 2),
                answers=answers
            )
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error fetching student progress: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch progress: {str(e)}"
            )
    
    @staticmethod
    async def delete_question_sheet(sheet_id: str, admin_id: str) -> dict:
        """Delete a question sheet (admin/creator only)"""
        try:
            # Verify user is the creator
            sheet_check = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .select("creator_id")
                .eq("id", sheet_id)
                .execute()
            )
            
            if not sheet_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question sheet not found"
                )
            
            if sheet_check.data[0]["creator_id"] != admin_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the creator can delete this question sheet"
                )
            
            # Delete sheet (cascade will delete questions and answers)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheets")
                .delete()
                .eq("id", sheet_id)
                .execute()
            )
            
            return {"status": "success", "message": "Question sheet deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting question sheet: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete question sheet: {str(e)}"
            )

# Singleton instance
question_sheet_service = QuestionSheetService()
