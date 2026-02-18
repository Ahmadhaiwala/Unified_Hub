"""
AI-First Assignment Detection Service
Uses AI for intelligent detection and field extraction with fallback mechanisms
"""

from app.core.ai_memory import store_embedding, search_similar
from app.core.supabase import supabase
from app.services.pdf_parser import parse_pdf_to_text
import uuid
import json
import os
import requests
from datetime import datetime
from typing import Optional, Dict, List
import asyncio
import time

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

# Cache for recent detections
_detection_cache = {}
CACHE_TTL = 300  # 5 minutes

# Global rate limiting
_last_api_call = 0
_api_lock = asyncio.Lock()


def _get_cache_key(text: str, file_name: str = None) -> str:
    """Generate cache key from text/file"""
    import hashlib
    content = f"{text[:200]}_{file_name or ''}"
    return hashlib.md5(content.encode()).hexdigest()


def _is_cached(cache_key: str) -> Optional[Dict]:
    """Check if detection is cached"""
    if cache_key in _detection_cache:
        cached_time, result = _detection_cache[cache_key]
        if (datetime.now().timestamp() - cached_time) < CACHE_TTL:
            return result
        del _detection_cache[cache_key]
    return None


def _cache_result(cache_key: str, result: Optional[Dict]):
    """Cache detection result"""
    _detection_cache[cache_key] = (datetime.now().timestamp(), result)


async def _rate_limited_api_call(url: str, headers: dict, payload: dict, timeout: int = 30, min_interval: float = 2.0) -> dict:
    """
    Make API call with global rate limiting and retry logic
    
    Args:
        url: API endpoint URL
        headers: Request headers
        payload: Request payload
        timeout: Request timeout in seconds
        min_interval: Minimum seconds between API calls
    
    Returns:
        API response JSON
    """
    global _last_api_call
    
    async with _api_lock:
        # Enforce minimum interval between calls
        elapsed = time.time() - _last_api_call
        if elapsed < min_interval:
            wait_time = min_interval - elapsed
            print(f"⏱️  Rate limiting: waiting {wait_time:.1f}s...")
            await asyncio.sleep(wait_time)
        
        # Retry logic with exponential backoff
        max_retries = 3
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                response.raise_for_status()
                
                # Update last call time on success
                _last_api_call = time.time()
                return response.json()
                
            except requests.exceptions.HTTPError as e:
                last_exception = e
                status_code = e.response.status_code if hasattr(e, 'response') and e.response else None
                
                # Retry on rate limit or server errors
                if status_code in [429, 502, 503, 500] and attempt < max_retries - 1:
                    wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                    print(f"⚠️  API error {status_code}, retry {attempt + 1}/{max_retries} in {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                else:
                    # Don't retry on other errors
                    raise
                    
            except requests.exceptions.Timeout as e:
                last_exception = e
                if attempt < max_retries - 1:
                    wait = 2 ** (attempt + 1)
                    print(f"⚠️  Timeout, retry {attempt + 1}/{max_retries} in {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                else:
                    raise
        
        # If we exhausted retries, raise the last exception
        if last_exception:
            raise last_exception


async def ai_detect_and_extract(text: str, source_type: str = "message") -> Dict:
    """
    Use AI to both detect if content is an assignment AND extract fields
    Returns: {
        "is_assignment": bool,
        "confidence": float,
        "reasoning": str,
        "fields": {title, description, subject, deadline}
    }
    """
    try:
        # Smart text sampling for API efficiency
        max_chars = 800
        if len(text) > max_chars:
            sample = text[:600] + "\n...\n" + text[-600:]
        else:
            sample = text
        
        prompt = f"""Is this an academic assignment? Analyze and return ONLY valid JSON:

CONTENT ({source_type}):
{sample}

Return format:
{{
  "is_assignment": bool,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "fields": {{
    "title": "short title or null",
    "description": "what to do or null",
    "subject": "subject area or null",
    "deadline": "YYYY-MM-DD or null",
    "question_count": int or null
  }}
}}

Rules:
- Assignment = asks reader to complete work/tasks
- High confidence (>0.8) = explicit instructions/due dates
- PDFs more likely assignments
- Use null if uncertain
- NO markdown, ONLY JSON"""
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
                "responseMimeType": "application/json"  # Force JSON response
            }
        }
        
        gemini_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        # Use centralized rate-limited API call
        result = await _rate_limited_api_call(gemini_url, headers, payload, timeout=30, min_interval=2.0)
        
        result_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
        
        # Extract and parse JSON
        analysis = _extract_and_parse_json(result_text)
        
        # Validate structure
        analysis = _validate_analysis(analysis, text)
        
        print(f"🤖 AI Analysis: {analysis['is_assignment']} (confidence: {analysis['confidence']:.2f})")
        print(f"   Reasoning: {analysis.get('reasoning', 'N/A')[:100]}")
        
        return analysis
        
    except (requests.Timeout, asyncio.TimeoutError):
        print(f"⚠️  AI analysis timeout, using fallback")
        return _fallback_detection(text, source_type)
    except Exception as e:
        print(f"⚠️  AI analysis error: {e}")
        import traceback
        traceback.print_exc()
        return _fallback_detection(text, source_type)


def _extract_and_parse_json(text: str) -> Dict | List:
    """Extract and parse JSON from AI response"""
    text = text.strip()
    
    # Remove markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    
    # Attempt 1: Direct parse
    try:
        return json.loads(text)
    except:
        pass

    # Attempt 2: Find array boundaries
    try:
        start = text.find('[')
        end = text.rfind(']') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except:
        pass

    # Attempt 3: Find object boundaries
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except:
        pass

    # Attempt 4: Fix common issues and retry
    try:
        text = text.replace("'", '"')
        text = text.replace("True", "true").replace("False", "false")
        text = text.replace("None", "null")
        import re
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        
        # Retry parse
        try:
             return json.loads(text)
        except:
             pass
             
        # Retry finding array
        start = text.find('[')
        end = text.rfind(']') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
            
        # Retry finding object
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
            
    except:
        pass

    raise Exception(f"Failed to parse AI response: {text[:200]}")


def _validate_analysis(analysis: Dict, original_text: str) -> Dict:
    """Validate and normalize AI analysis"""
    
    # Ensure required structure
    validated = {
        "is_assignment": bool(analysis.get("is_assignment", False)),
        "confidence": float(analysis.get("confidence", 0.0)),
        "reasoning": str(analysis.get("reasoning", ""))[:500],
        "fields": {}
    }
    
    # Clamp confidence to 0-1
    validated["confidence"] = max(0.0, min(1.0, validated["confidence"]))
    
    # Validate fields
    fields = analysis.get("fields", {})
    validated["fields"] = {
        "title": (fields.get("title") or "")[:200] or None,
        "description": (fields.get("description") or "")[:2000] or None,
        "subject": (fields.get("subject") or "")[:100] or None,
        "deadline": _validate_deadline(fields.get("deadline")),
        "question_count": _validate_int(fields.get("question_count"))
    }
    
    # If detected as assignment but no title, extract one
    if validated["is_assignment"] and not validated["fields"]["title"]:
        validated["fields"]["title"] = _extract_title_heuristic(original_text)
    
    return validated


def _validate_deadline(deadline: any) -> Optional[str]:
    """Validate deadline format"""
    if not deadline:
        return None
    
    try:
        # Check if valid ISO date
        dt = datetime.fromisoformat(str(deadline))
        return dt.strftime('%Y-%m-%d')
    except:
        return None


def _validate_int(value: any) -> Optional[int]:
    """Validate integer value"""
    try:
        return int(value) if value else None
    except:
        return None


def _extract_title_heuristic(text: str) -> str:
    """Extract title from text using heuristics"""
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    
    # Try first meaningful line
    for line in lines[:5]:
        if len(line) > 10 and len(line) < 200:
            # Clean common prefixes
            import re
            line = re.sub(r'^(assignment|homework|task|project)[:\s]*', '', line, flags=re.IGNORECASE)
            return line
    
    return text[:100].strip() or "Untitled Assignment"


def _fallback_detection(text: str, source_type: str) -> Dict:
    """
    Fallback detection using keyword-based approach
    Used when AI fails or times out
    """
    # High-confidence assignment keywords
    keywords = [
        'assignment', 'homework', 'due date', 'deadline', 'submit',
        'complete the following', 'answer the following', 'solve',
        'question 1', 'exercise', 'problem set', 'question sheet',
        'worksheet', 'quiz', 'exam', 'test', 'midterm', 'final',
        'instructions', 'points', 'grade', 'class', 'course'
    ]
    
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw in text_lower)
    
    # Calculate confidence
    confidence = min(matches * 0.15, 0.9)  # Each keyword adds 0.15, max 0.9
    
    # PDF files get bonus confidence
    if source_type == "pdf":
        confidence = min(confidence + 0.5, 0.95)
    
    # More lenient threshold for PDFs
    is_assignment = (
        confidence > 0.4 or 
        (source_type == "pdf" and (matches > 0 or len(text) > 50))
    )
    
    return {
        "is_assignment": is_assignment,
        "confidence": confidence,
        "reasoning": f"Fallback detection: Found {matches} assignment keywords",
        "fields": {
            "title": _extract_title_heuristic(text),
            "description": text[:500] if len(text) > 100 else None,
            "subject": None,
            "deadline": None,
            "question_count": None
        }
    }


async def detect_and_store_assignment(
    text: str = None,
    file_content: bytes = None,
    file_name: str = None,
    group_id: str = None,
    user_id: str = None
) -> Optional[Dict]:
    """
    AI-FIRST: Use AI to detect and extract assignment information
    
    Returns: Assignment object if detected, None otherwise
    """
    try:
        assignment_text = text
        source_type = "message"
        source_file_path = None
        
        # Determine content source
        if file_content and file_name:
            if file_name.lower().endswith('.pdf'):
                print(f"📎 Parsing PDF: {file_name}")
                assignment_text = await parse_pdf_to_text(file_content, file_name)
                if not assignment_text or len(assignment_text.strip()) < 50:
                    print("❌ Failed to extract meaningful text from PDF")
                    return None
                source_type = "pdf"
                source_file_path = f"group-documents/{group_id}/{file_name}"
        
        if not assignment_text or len(assignment_text.strip()) < 20:
            return None

        # Check cache for AI ANALYSIS
        cache_key = _get_cache_key(assignment_text, "ai_analysis")
        cached_analysis = _is_cached(cache_key)
        
        if cached_analysis:
            print(f"📦 Cache hit for AI analysis")
            analysis = cached_analysis
        else:
            # === AI-FIRST DETECTION ===
            analysis = await ai_detect_and_extract(assignment_text, source_type)
            _cache_result(cache_key, analysis)
        
        # Decision threshold
        is_assignment = (
            (analysis["is_assignment"] and analysis["confidence"] > 0.6) or
            (analysis["is_assignment"] and source_type == "pdf" and analysis["confidence"] > 0.4)
        )
        
        if not is_assignment:
            print(f"❌ AI says not an assignment (confidence: {analysis['confidence']:.2f})")
            print(f"   Reasoning: {analysis.get('reasoning', 'N/A')[:100]}")
            return None
        
        print(f"✅ AI confirmed assignment (confidence: {analysis['confidence']:.2f})")
        
        # Use AI-extracted fields
        fields = analysis["fields"]
        assignment_id = str(uuid.uuid4())
        
        # Store in database
        assignment_data = {
            "id": assignment_id,
            "group_id": group_id,
            "creator_id": user_id,
            "title": fields.get("title") or "Untitled Assignment",
            "description": fields.get("description"),
            "subject": fields.get("subject"),
            "due_date": fields.get("deadline"),
            "source_type": source_type,
            "source_file_path": source_file_path,
            "ai_confidence": float(analysis["confidence"]),
            "total_points": 0,
            "created_at": datetime.now().isoformat()
        }
        
        result = supabase.table("question_sheets").insert(assignment_data).execute()
        
        if result.data:
            assignment = result.data[0]
            
            # Background processing
            asyncio.create_task(_process_assignment_background(
                assignment_id,
                assignment_text,
                group_id,
                user_id
            ))
            
            print(f"✅ Assignment created: {fields.get('title', 'Untitled')[:50]}")
            return assignment
        
        return None
        
    except Exception as e:
        print(f"❌ Assignment detection error: {e}")
        import traceback
        traceback.print_exc()
        return None


async def _process_assignment_background(
    assignment_id: str,
    assignment_text: str,
    group_id: str,
    user_id: str
):
    """
    Process assignment in background: embeddings + AI question extraction
    """
    try:
        # Run sequentially to avoid rate limits (or use gather with delays)
        await _store_assignment_embeddings(assignment_id, assignment_text, group_id, user_id)
        await _ai_extract_questions(assignment_id, assignment_text)
        
    except Exception as e:
        print(f"⚠️  Background processing error: {e}")


async def _store_assignment_embeddings(
    assignment_id: str,
    assignment_text: str,
    group_id: str,
    user_id: str
):
    """Store assignment embeddings for similarity search"""
    try:
        # Chunk text intelligently
        chunks = _smart_chunk_text(assignment_text)
        
        # Store chunks in parallel
        tasks = [
            store_embedding(chunk_text, {
                "type": "assignment_chunk",
                "chunk_type": chunk_type,
                "assignment_id": assignment_id,
                "group_id": group_id,
                "creator_id": user_id
            })
            for chunk_type, chunk_text in chunks
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        print(f"📝 Stored {len(chunks)} embeddings for assignment")
        
    except Exception as e:
        print(f"⚠️  Embedding storage error: {e}")


def _smart_chunk_text(text: str, chunk_size: int = 1000) -> List[tuple]:
    """
    Intelligently chunk text preserving question boundaries
    Returns: [(chunk_type, chunk_text), ...]
    """
    chunks = []
    
    # Try to detect questions
    import re
    question_pattern = r'(?:^|\n)(?:\d+[\.\)]\s+|question\s+\d+[:\.]?\s+)'
    question_splits = re.split(question_pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    
    if len(question_splits) > 2:  # Found multiple questions
        # First chunk is instructions
        if question_splits[0].strip():
            chunks.append(("instructions", question_splits[0].strip()))
        
        # Each subsequent chunk is a question
        for i, q_text in enumerate(question_splits[1:], 1):
            if q_text.strip():
                chunks.append((f"question_{i}", q_text.strip()[:chunk_size]))
    else:
        # No clear question structure, chunk by size
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                chunks.append((f"chunk_{i//chunk_size}", chunk.strip()))
    
    return chunks[:10]  # Limit to 10 chunks


async def _ai_extract_questions(assignment_id: str, assignment_text: str):
    """
    Use AI to extract individual questions from assignment
    """
    try:
        text_sample = assignment_text[:1500]

        prompt = f"""
Extract all individual questions/problems from this assignment.

ASSIGNMENT TEXT:
{text_sample}

Return ONLY a JSON array in this exact format:

[
  {{
    "number": 1,
    "question_text": "Full question text",
    "type": "multiple_choice" | "short_answer" | "essay" | "problem" | "other"
  }}
]

No markdown.
No explanation.
Only JSON array.
"""

        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2000,
                "responseMimeType": "application/json"
            }
        }

        gemini_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"

        result = await _rate_limited_api_call(
            gemini_url,
            headers,
            payload,
            timeout=30,
            min_interval=2.0
        )

        # ✅ Defensive parsing
        candidates = result.get("candidates", [])
        if not candidates:
            print("⚠️ No candidates returned from AI")
            return

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            print("⚠️ No content parts returned from AI")
            return

        result_text = parts[0].get("text", "").strip()

        if not result_text:
            print("⚠️ Empty AI response")
            return

        questions = _extract_and_parse_json(result_text)

        if isinstance(questions, list) and len(questions) > 0:
            await _store_questions(assignment_id, questions)
            print(f"📚 AI extracted {len(questions)} questions")
        else:
            print("⚠️ AI returned invalid or empty question list")

    except Exception as e:
        print(f"⚠️ AI question extraction error: {e}")
        import traceback
        traceback.print_exc()


async def _store_questions(assignment_id: str, questions: List[Dict]):
    """Store extracted questions in database"""
    try:
        question_records = []
        
        for q in questions:
            question_records.append({
                "id": str(uuid.uuid4()),
                "question_sheet_id": assignment_id,
                "question_order": q.get("number"),
                "question_text": q.get("question_text", "")[:2000],
                "question_type": q.get("type", "general"),
                "points": 0,
                # "options": q.get("options", []) # Optional if we extract it later
            })
        
        if question_records:
            supabase.table("question_sheet_questions").insert(question_records).execute()
            print(f"✅ Stored {len(question_records)} questions in database")
            
    except Exception as e:
        print(f"⚠️  Question storage error: {e}")