"""
Answer Linking Service
Automatically links student messages to assignments using AI similarity
Now with question-level matching support
"""

from app.core.ai_memory import search_similar
from app.core.supabase import supabase
import uuid

async def detect_answer_and_link(message_text, message_id, group_id, student_id):
    """
    Detect if a message is an answer to an assignment and link it automatically
    Now with question-level matching support
    """
    try:
        print(f"🔗 Checking answer using AI similarity")

        # Search similar content (both questions and assignments)
        results = await search_similar(message_text, limit=5)

        # First, try to match to specific questions
        question_matches = [
            r for r in results
            if r.get("metadata", {}).get("type") == "question"
            and r.get("metadata", {}).get("group_id") == group_id
        ]
        
        if question_matches:
            best_question = question_matches[0]
            confidence = 1 - best_question.get("score", 1.0)
            
            if confidence > 0.75:  # High confidence question match
                question_id = best_question.get("metadata", {}).get("question_id")
                assignment_id = best_question.get("metadata", {}).get("assignment_id")
                
                print(f"✅ Linked to Q{best_question.get('metadata', {}).get('question_order')} with confidence {confidence:.2f}")
                
                # Store answer linked to specific question
                supabase.table("user_question_sheet_answers").insert({
                    "question_sheet_id": assignment_id,
                    "question_id": question_id,
                    "student_id": student_id,
                    "answer_text": message_text,
                    "message_id": message_id,
                    "confidence_score": confidence,
                    "is_ai_detected": True,
                    "submission_type": "auto_detected"
                }).execute()
                
                return

        # Fallback: Try assignment-level matching
        assignment_matches = [
            r for r in results
            if r.get("metadata", {}).get("type") == "assignment"
            and r.get("metadata", {}).get("group_id") == group_id
        ]

        if not assignment_matches:
            return

        best_match = assignment_matches[0]
        confidence = 1 - best_match.get("score", 1.0)

        if confidence > 0.75:  # threshold
            print(f"✅ Linked to assignment with similarity {confidence:.2f}")
            
            assignment_id = best_match.get("metadata", {}).get("assignment_id")
            
            # Create or get general question for this assignment
            question_check = await supabase.table("question_sheet_questions").select("id").eq("question_sheet_id", assignment_id).eq("question_text", "General Assignment Response").execute()
            
            if question_check.data:
                question_id = question_check.data[0]["id"]
            else:
                # Create general question
                question_data = {
                    "id": str(uuid.uuid4()),
                    "question_sheet_id": assignment_id,
                    "question_text": "General Assignment Response",
                    "question_order": 1,
                    "points": 0
                }
                q_result = supabase.table("question_sheet_questions").insert(question_data).execute()
                question_id = q_result.data[0]["id"] if q_result.data else None
            
            if question_id:
                # Store link in user_question_sheet_answers table
                supabase.table("user_question_sheet_answers").insert({
                    "question_sheet_id": assignment_id,
                    "question_id": question_id,
                    "student_id": student_id,
                    "answer_text": message_text,
                    "message_id": message_id,
                    "confidence_score": confidence,
                    "is_ai_detected": True,
                    "submission_type": "auto_detected"
                }).execute()

    except Exception as e:
        print(f"Error in answer linking: {e}")
