"""
Question Linker Service
Handles question extraction from assignments and answer-to-question matching using AI
"""

from typing import List, Dict, Optional
from app.core.ai_memory import store_embedding, search_similar
from app.core.supabase import supabase
import uuid
import json
import os
import requests
import re
import asyncio


# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


async def extract_questions_from_assignment(assignment_text: str) -> List[Dict]:
    """
    Extract individual questions from assignment text using AI
    
    Args:
        assignment_text: Full assignment text
        
    Returns:
        List of questions with format: [{"question_text": "...", "question_order": 1}, ...]
    """
    try:
        prompt = f"""
Extract all individual questions from the following assignment text. Return ONLY a JSON array of questions.
Each question should have:
- question_text: The full question text
- question_order: The order number (1, 2, 3, etc.)

Look for patterns like:
- "1. What is..."
- "Q1:"
- "Question 1:"
- Numbered or lettered lists

Assignment text:
{assignment_text[:3000]}

Return ONLY a valid JSON array, no other text. Example format:
[
  {{"question_text": "What is an animal?", "question_order": 1}},
  {{"question_text": "Define photosynthesis", "question_order": 2}}
]
"""
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "google/gemini-2.0-flash-exp:free",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        result_text = result['choices'][0]['message']['content'].strip()
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        questions = json.loads(result_text)
        
        print(f"🤖 AI extracted {len(questions)} questions")
        return questions
        
    except Exception as e:
        print(f"⚠️ AI question extraction error: {e}")
        # Fallback: regex-based extraction
        return _fallback_question_extraction(assignment_text)


def _fallback_question_extraction(text: str) -> List[Dict]:
    """
    Fallback question extraction using regex patterns
    """
    questions = []
    
    # Pattern 1: "1. Question text" or "1) Question text"
    pattern1 = r'(\d+)[\.\)]\s+([^\n]+)'
    matches1 = re.findall(pattern1, text)
    
    # Pattern 2: "Q1: Question text" or "Question 1: Question text"
    pattern2 = r'(?:Q|Question)\s*(\d+):\s*([^\n]+)'
    matches2 = re.findall(pattern2, text, re.IGNORECASE)
    
    all_matches = matches1 + matches2
    
    for order, question_text in all_matches:
        questions.append({
            "question_text": question_text.strip(),
            "question_order": int(order)
        })
    
    # Sort by order
    questions.sort(key=lambda x: x["question_order"])
    
    print(f"📝 Fallback extracted {len(questions)} questions")
    return questions


async def store_questions_for_assignment(assignment_id: str, questions: List[Dict]) -> List[str]:
    """
    Store extracted questions in database and create embeddings
    
    Args:
        assignment_id: ID of the assignment
        questions: List of question dictionaries
        
    Returns:
        List of created question IDs
    """
    question_ids = []
    
    try:
        for question in questions:
            question_id = str(uuid.uuid4())
            
            # Store in database
            question_data = {
                "id": question_id,
                "question_sheet_id": assignment_id,
                "question_text": question["question_text"],
                "question_order": question["question_order"],
                "points": 0
            }
            
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: supabase.table("question_sheet_questions")
                .insert(question_data)
                .execute()
            )
            
            if result.data:
                question_ids.append(question_id)
                
                # Store embedding for question matching (non-blocking)
                asyncio.create_task(
                    store_embedding(
                        text=question["question_text"],
                        metadata={
                            "type": "question",
                            "question_id": question_id,
                            "assignment_id": assignment_id,
                            "question_order": question["question_order"]
                        }
                    )
                )
                
                print(f"✅ Stored Q{question['question_order']}: {question['question_text'][:50]}...")
        
        return question_ids
        
    except Exception as e:
        print(f"Error storing questions: {e}")
        import traceback
        traceback.print_exc()
        return question_ids


async def match_answer_to_question(answer_text: str, assignment_id: str) -> Optional[Dict]:
    """
    Match an answer to the most relevant question using vector similarity
    
    Args:
        answer_text: The student's answer text
        assignment_id: ID of the assignment
        
    Returns:
        Dict with {question_id, confidence_score, question_text} or None
    """
    try:
        # Search for similar questions
        results = await search_similar(answer_text, limit=5)
        
        # Filter to questions from this assignment
        question_matches = [
            r for r in results
            if r.get("metadata", {}).get("type") == "question"
            and r.get("metadata", {}).get("assignment_id") == assignment_id
        ]
        
        if not question_matches:
            print(f"🔍 No question matches found for assignment {assignment_id}")
            return None
        
        best_match = question_matches[0]
        confidence = 1 - best_match.get("score", 1.0)  # Convert distance to similarity
        
        result = {
            "question_id": best_match.get("metadata", {}).get("question_id"),
            "confidence_score": confidence,
            "question_text": best_match.get("text"),
            "question_order": best_match.get("metadata", {}).get("question_order")
        }
        
        print(f"🎯 Matched to Q{result['question_order']} with confidence {confidence:.2f}")
        return result
        
    except Exception as e:
        print(f"Error matching answer to question: {e}")
        return None


async def get_questions_for_assignment(assignment_id: str) -> List[Dict]:
    """
    Get all questions for an assignment
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        List of questions ordered by question_order
    """
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: supabase.table("question_sheet_questions")
            .select("*")
            .eq("question_sheet_id", assignment_id)
            .order("question_order")
            .execute()
        )
        
        return result.data or []
        
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return []
