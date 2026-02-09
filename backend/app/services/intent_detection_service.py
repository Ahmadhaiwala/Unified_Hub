import requests
import os
import json
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from dateutil import parser as date_parser

class ReminderIntent(BaseModel):
    """Structured reminder data extracted from admin message"""
    detected: bool = Field(default=False, description="Whether reminder intent was detected")
    title: Optional[str] = Field(default=None, description="Short summary of reminder")
    description: Optional[str] = Field(default=None, description="Full context/details")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 formatted due date")
    priority: Literal["low", "medium", "high"] = Field(default="medium", description="Priority level")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence score")

class IntentDetectionService:
    """Service for detecting intents in admin messages using AI"""
    
    def __init__(self):
        # Using Open Router API (same as existing AI chat)
        self.api_key = os.getenv("OPEN_ROUTER_API_KEY")
        self.model_name = "qwen/qwen-2.5-coder-32b-instruct"
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        
        self.system_prompt = """You are an intent detection system for an educational platform.
Analyze admin messages to detect if they want to create a reminder for students.

Instructions:
1. Detect reminder intent from natural language - BE GENEROUS with detection
2. Extract key information: what, when, how urgent
3. Parse dates flexibly: "Friday", "tomorrow", "next week", "Feb 15", "5pm", etc.
4. Determine priority from urgency keywords: "urgent", "asap", "important" → high
5. Set detected=True if confidence > 0.3 (be lenient!)
6. Look for keywords: remind, reminder, don't forget, due, deadline, submit, complete

Examples:
- "Remind everyone to submit assignment by Friday 5pm" 
  → detected: true, title: "Submit assignment", due_date: (calculate Friday 5pm), priority: medium, confidence: 0.95
  
- "URGENT: Complete quiz before tomorrow 9am"
  → detected: true, title: "Complete quiz", due_date: (tomorrow 9am), priority: high, confidence: 0.9
  
- "Don't forget about the presentation next Monday"
  → detected: true, title: "Presentation", due_date: (next Monday), priority: medium, confidence: 0.85

- "set a reminder for homework"
  → detected: true, title: "Homework", due_date: null, priority: medium, confidence: 0.7

- "How's everyone doing with the assignment?"
  → detected: false, confidence: 0.1

You must respond ONLY with valid JSON in this exact format:
{
  "detected": true/false,
  "title": "string or null",
  "description": "string or null",
  "due_date": "ISO 8601 string or null",
  "priority": "low/medium/high",
  "confidence": 0.0-1.0
}"""
    
    async def detect_reminder_intent(
        self, 
        message: str, 
        current_time: Optional[datetime] = None
    ) -> ReminderIntent:
        """
        Detect if admin message contains reminder creation intent
        
        Args:
            message: The admin's message text
            current_time: Current timestamp for relative date calculation
            
        Returns:
            ReminderIntent with extracted details
        """
        if current_time is None:
            current_time = datetime.utcnow()
        
        if not self.api_key:
            print("⚠️ OPEN_ROUTER_API_KEY not configured")
            return ReminderIntent(detected=False, confidence=0.0)
        
        try:
            user_prompt = f"""Current date and time: {current_time.strftime('%A, %B %d, %Y %H:%M UTC')}

Admin message: "{message}"

Analyze this message and extract reminder details if it's a reminder creation intent.
For due_date, return ISO 8601 format string (e.g., "2026-02-14T17:00:00Z").
Calculate relative dates from the current time provided above.

Respond with JSON only."""

            # Call OpenRouter API
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                },
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"❌ OpenRouter API error: {response.status_code}")
                return ReminderIntent(detected=False, confidence=0.0)
            
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Parse JSON response
            # Try to extract JSON from markdown code blocks if present
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0].strip()
            
            intent_data = json.loads(ai_response)
            
            # Validate and create ReminderIntent
            intent = ReminderIntent(**intent_data)
            
            # Additional date parsing/validation
            if intent.detected and intent.due_date:
                try:
                    # Validate ISO format
                    parsed_date = datetime.fromisoformat(intent.due_date.replace('Z', '+00:00'))
                    intent.due_date = parsed_date.isoformat()
                except Exception as e:
                    print(f"⚠️ Date parsing error: {e}")
                    # Try dateutil parser as fallback
                    try:
                        parsed_date = date_parser.parse(intent.due_date, fuzzy=True)
                        intent.due_date = parsed_date.isoformat()
                    except:
                        intent.due_date = None
            
            print(f"📊 Intent detection: detected={intent.detected}, confidence={intent.confidence}")
            return intent
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse AI response as JSON: {e}")
            print(f"Response was: {ai_response[:200]}")
            return ReminderIntent(detected=False, confidence=0.0)
        except Exception as e:
            print(f"❌ Error in intent detection: {str(e)}")
            import traceback
            traceback.print_exc()
            return ReminderIntent(detected=False, confidence=0.0)

# Singleton instance  
intent_detection_service = IntentDetectionService()
