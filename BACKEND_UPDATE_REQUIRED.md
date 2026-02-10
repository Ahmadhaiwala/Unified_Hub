# IMPORTANT: Backend Method Update Required

## File: `backend/app/services/assignment_service.py`

### Method to Update: `get_assignment_detail` (Lines 153-233)

The current `get_assignment_detail` method needs to be replaced with the enhanced version that returns organized questions structure.

### Steps:

1. Open `backend/app/services/assignment_service.py`
2. Locate the `get_assignment_detail` method (starts at line 153)
3. Replace the entire method with the code below:

```python
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
        
        # Get all questions for this assignment
        from app.services.question_linker import get_questions_for_assignment
        questions = await get_questions_for_assignment(assignment_id)
        
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
                        lambda sid=student_id: supabase.table("user_profiles")
                        .select("username, full_name, avatar_url")
                        .eq("user_id", sid)
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
        for question in questions:
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
```

### Why This Update Is Needed:

The frontend now expects the API to return:
```json
{
  "assignment": {...},
  "questions": [
    {
      "id": "...",
      "question_text": "...",
      "question_order": 1,
      "points": 0,
      "answers": [...]
    }
  ]
}
```

Instead of the old flat structure with `linked_replies`.

### After Update:

1. Save the file
2. The backend server should auto-reload (if running with `--reload`)
3. Test by viewing an assignment detail page in the frontend
