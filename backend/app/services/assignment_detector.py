"""
Assignment Detection Service with AI Field Extraction
Detects assignments from text/PDFs and extracts structured fields using OpenRouter AI
"""

from app.core.ai_memory import store_embedding, search_similar
from app.core.supabase import supabase
from app.services.pdf_parser import parse_pdf_to_text
import uuid
import json
import os
import requests
from datetime import datetime
from typing import Optional, Dict
import re

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

async def extract_assignment_fields(text: str) -> Dict:
    """
    Use OpenRouter AI to extract structured fields from assignment text
    
    Returns: {title, description, subject, deadline}
    """
    try:
        prompt = f"""
Extract assignment information from the following text. Return ONLY a JSON object with these fields:
- title: Brief assignment title (required)
- description: Detailed description of what needs to be done (optional)
- subject: Subject/topic area (e.g., "Mathematics", "Physics", "English Literature") (optional)
- deadline: Deadline in ISO format YYYY-MM-DD if mentioned (optional)

Text:
{text[:2000]}

Return ONLY valid JSON, no other text.
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
        fields = json.loads(result_text)
        
        print(f"🤖 AI extracted fields: {fields}")
        return fields
        
    except Exception as e:
        print(f"⚠️ AI extraction error: {e}")
        # Fallback: basic extraction
        return {
            "title": text[:100].strip(),
            "description": text[:500].strip() if len(text) > 100 else None,
            "subject": None,
            "deadline": None
        }


async def detect_and_store_assignment(
    text: str = None,
    file_content: bytes = None,
    file_name: str = None,
    group_id: str = None,
    user_id: str = None
) -> Optional[Dict]:
    """
    Detect assignment from text or PDF and store with extracted fields
    
    Returns: Assignment object if detected, None otherwise
    """
    try:
        assignment_text = text
        source_type = "message"
        source_file_path = None
        
        # Handle PDF files
        if file_content and file_name:
            if file_name.lower().endswith('.pdf'):
                print(f"📎 Parsing PDF: {file_name}")
                assignment_text = await parse_pdf_to_text(file_content, file_name)
                if not assignment_text:
                    print("❌ Failed to extract text from PDF")
                    return None
                source_type = "pdf"
                source_file_path = f"group-documents/{group_id}/{file_name}"
        
        if not assignment_text:
            return None
        
        
        # Search for similar assignment patterns
        results = await search_similar(assignment_text, limit=3)
        
        patterns = [
            r for r in results
            if r.get("metadata", {}).get("type") == "assignment_pattern"
        ]
        
        confidence = 0.0
        if patterns:
            confidence = 1 - patterns[0].get("score", 1.0)
        
        # Keyword-based detection (more flexible)
        assignment_keywords = [
            'assignment', 'homework', 'task', 'project', 'submit', 
            'due date', 'deadline', 'complete', 'solve', 'answer',
            'question', 'exercise', 'practice', 'write', 'prepare'
        ]
        
        text_lower = assignment_text.lower()
        keyword_matches = sum(1 for keyword in assignment_keywords if keyword in text_lower)
        has_keywords = keyword_matches >= 2  # At least 2 keywords
        
        # Detect if this is an assignment (lowered threshold to 50% OR keyword match OR PDF)
        is_assignment = confidence > 0.50 or has_keywords or source_type == "pdf"
        
        if is_assignment:
            print(f"🧠 AI detected assignment (confidence {confidence:.2f}, keywords: {keyword_matches}, source: {source_type})")
            
            # Extract structured fields using AI
            fields = await extract_assignment_fields(assignment_text)
            
            assignment_id = str(uuid.uuid4())
            
            # Store in question_sheets table (extended for assignments)
            assignment_data = {
                "id": assignment_id,
                "group_id": group_id,
                "creator_id": user_id,
                "title": fields.get("title", "Untitled Assignment"),
                "description": fields.get("description"),
                "subject": fields.get("subject"),
                "due_date": fields.get("deadline"),
                "source_type": source_type,
                "source_file_path": source_file_path,
                "ai_confidence": float(confidence),
                "total_points": 0
            }
            
            result = supabase.table("question_sheets").insert(assignment_data).execute()
            
            if result.data:
                # Store assignment as embedding for answer linking later (non-blocking)
                import asyncio
                asyncio.create_task(
                    store_embedding(assignment_text, {
                        "type": "assignment",
                        "assignment_id": assignment_id,
                        "group_id": group_id
                    })
                )
                
                # Extract and store individual questions (non-blocking)
                from app.services.question_linker import extract_questions_from_assignment, store_questions_for_assignment
                asyncio.create_task(
                    _extract_and_store_questions(assignment_id, assignment_text)
                )
                
                print(f"✅ Assignment created: {fields.get('title')}")
                return result.data[0]
        
        return None
        
    except Exception as e:
        print(f"Assignment detection error: {e}")
        import traceback
        traceback.print_exc()
        return None


async def _extract_and_store_questions(assignment_id: str, assignment_text: str):
    """
    Helper function to extract and store questions (runs in background)
    """
    try:
        from app.services.question_linker import extract_questions_from_assignment, store_questions_for_assignment
        
        questions = await extract_questions_from_assignment(assignment_text)
        if questions:
            await store_questions_for_assignment(assignment_id, questions)
            print(f"📚 Stored {len(questions)} questions for assignment {assignment_id}")
    except Exception as e:
        print(f"Error in background question extraction: {e}")
