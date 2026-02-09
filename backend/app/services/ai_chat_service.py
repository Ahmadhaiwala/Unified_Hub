import requests
import os
from typing import List, Dict
from datetime import datetime
from app.core.supabase import supabase
from app.services.intent_detection_service import intent_detection_service

OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY")

SYSTEM_RULES = """
You are an AI assistant inside a chat application.

CORE RULES:
-strictly follow the group conversation answer check if that conversation he said is correct or not and interpret and give the correct answer nothing should be said without group context
- Give precise and direct answers.
- Use minimal words.
- Avoid long explanations unless user explicitly asks.
- Focus on correctness over creativity.
- Do not repeat the question.
- Do not add greetings or filler text.
- Prefer bullet points over paragraphs when possible.

TOKEN EFFICIENCY:
- Keep responses under 120 words unless necessary.
- Do not include examples unless requested.
- No storytelling.

GROUP CHAT BEHAVIOR:
- If message is from group context, assume multiple readers.
- Avoid personal assumptions.
- Be neutral and informative.
- If question is unclear, ask ONE short clarification question.
"""

class AIChatService:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.model_name = "qwen/qwen-2.5-coder-32b-instruct"
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    async def chat(self, user_id: str, message: str, group_id: str = None) -> Dict:
        if not self.api_key:
            return {
                "response": "AI service not configured.",
                "timestamp": datetime.now().isoformat(),
                "error": True
            }

        try:
            # Get conversation history filtered by group_id
            history = await self._get_conversation_history(user_id, limit=10, group_id=group_id)
            print(f"📜 Loaded {len(history)} history messages for group_id={group_id}")
            
            # Convert history into OpenAI/OpenRouter format
            messages = [{"role": "system", "content": SYSTEM_RULES}]
            
            # Add group context if this is a group chat
            if group_id:
                print(f"🔍 Fetching group context for group_id={group_id}")
                group_context = await self._get_group_context(group_id)
                if group_context:
                    context_msg = f"Context: This chat is in group '{group_context['name']}'. {group_context.get('description', '')}"
                    messages.append({"role": "system", "content": context_msg})
                    print(f"✅ Added group context: {group_context['name']}")
                    
                    # IMPORTANT: Add recent group messages as context
                    group_messages = await self._get_recent_group_messages(group_id, limit=15)
                    if group_messages:
                        context_text = "Recent group conversation (remember who said what):\n"
                        for msg in group_messages[-10:]:  # Last 10 messages
                            context_text += f"{msg['sender_name']} said: \"{msg['content']}\"\n"
                        messages.append({"role": "system", "content": context_text})
                        print(f"✅ Added {len(group_messages)} recent group messages to context")
                    
                    # NEW: Add PDF/document attachments as context
                    attachments = await self._get_group_attachments(group_id, limit=10)
                    if attachments:
                        attachment_context = "Available documents in this group:\n"
                        for att in attachments:
                            attachment_context += f"- {att['filename']} (uploaded by {att['uploader']})\n"
                            if att.get('extracted_text'):
                                # Include first 500 chars of extracted text
                                attachment_context += f"  Content preview: {att['extracted_text'][:500]}...\n"
                        messages.append({"role": "system", "content": attachment_context})
                        print(f"✅ Added {len(attachments)} attachments to context")
                else:
                    print(f"⚠️ No group context found for group_id={group_id}")
            
            # Add conversation history
            for msg in reversed(history):
                role = "user" if msg["sender"] == "user" else "assistant"
                messages.append({"role": role, "content": msg["content"]})

            # Add current user message
            messages.append({"role": "user", "content": message})

            print(f"🤖 Sending {len(messages)} messages to OpenRouter API")

            # Call OpenRouter API
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": messages
                }
            )

            if response.status_code != 200:
                raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")

            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]

            print(f"💾 Storing message (group_id={group_id})")
            await self._store_message(user_id, message, ai_response, group_id)
            print(f"✅ Message stored successfully")

            # Detect admin intents (reminders, etc.) if in group chat
            suggested_action = None
            if group_id:
                try:
                    is_admin = await self._check_if_admin(user_id, group_id)
                    if is_admin:
                        print(f"🤖 Checking for reminder intent...")
                        intent = await intent_detection_service.detect_reminder_intent(message)
                        
                        if intent.detected and intent.confidence > 0.3:
                            print(f"✅ Reminder intent detected! Confidence: {intent.confidence}")
                            suggested_action = {
                                "type": "create_reminder",
                                "data": {
                                    "title": intent.title,
                                    "description": intent.description,
                                    "due_date": intent.due_date,
                                    "priority": intent.priority,
                                    "confidence": intent.confidence
                                }
                            }
                        else:
                            print(f"ℹ️ No strong reminder intent (confidence: {intent.confidence})")
                except Exception as e:
                    print(f"⚠️ Intent detection error: {str(e)}")

            return {
                "response": ai_response,
                "timestamp": datetime.now().isoformat(),
                "error": False,
                "suggested_action": suggested_action
            }

        except Exception as e:
            print(f"AI Chat Error: {str(e)}")
            return {
                "response": f"AI error: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "error": True
            }

    async def _get_conversation_history(self, user_id: str, limit: int = 10, group_id: str = None) -> List[Dict]:
        """Get recent conversation history for a user, optionally filtered by group"""
        try:
            query = supabase.table("ai_chat_history") \
                .select("user_message, ai_response, created_at") \
                .eq("user_id", user_id)
            
            # Filter by group_id if provided
            if group_id:
                query = query.eq("group_id", group_id)
            else:
                # If no group_id, get only global chats (where group_id is null)
                query = query.is_("group_id", "null")
            
            response = query.order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            if not response.data:
                return []
            
            history = []
            for chat in response.data:
                history.append({
                    "sender": "user",
                    "content": chat["user_message"],
                    "timestamp": chat["created_at"]
                })
                history.append({
                    "sender": "ai",
                    "content": chat["ai_response"],
                    "timestamp": chat["created_at"]
                })
            
            return history
            
        except Exception as e:
            print(f"Error fetching history: {str(e)}")
            return []
    
    async def _get_group_context(self, group_id: str) -> Dict:
        """Get group information for context"""
        try:
            response = supabase.table("chat_groups") \
                .select("name, description") \
                .eq("id", group_id) \
                .execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except Exception as e:
            print(f"Error fetching group context: {str(e)}")
            return None
    
    async def _get_recent_group_messages(self, group_id: str, limit: int = 15) -> List[Dict]:
        """Get recent group chat messages for AI context"""
        try:
            response = supabase.table("group_messeges") \
                .select("content, sender_id, created_at, profiles:sender_id(full_name)") \
                .eq("group_id", group_id) \
                .order("created_at", desc=False) \
                .limit(limit) \
                .execute()
            
            if not response.data:
                return []
            
            messages = []
            for msg in response.data:
                sender_name = msg.get("profiles", {}).get("full_name", "User") if msg.get("profiles") else "User"
                messages.append({
                    "sender_name": sender_name,
                    "content": msg["content"],
                    "timestamp": msg["created_at"]
                })
            
            return messages
            
        except Exception as e:
            print(f"Error fetching group messages: {str(e)}")
            return []
    
    async def _get_group_attachments(self, group_id: str, limit: int = 10) -> List[Dict]:
        """Get recent group attachments (PDFs, documents) for AI context"""
        try:
            response = supabase.table("group_attachments") \
                .select("file_name, file_type, file_path, uploader_id, created_at, profiles!uploader_id(full_name)") \
                .eq("group_id", group_id) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            if not response.data:
                return []
            
            attachments = []
            for att in response.data:
                uploader = att.get("profiles", {}).get("full_name", "Unknown") if att.get("profiles") else "Unknown"
                
                # Extract content from documents (PDFs and text files)
                extracted_text = None
                file_type = att.get("file_type", "").lower()
                file_name = att.get("file_name", "").lower()
                file_path = att.get("file_path")
                
                # Extract from PDF files
                if "pdf" in file_type or file_name.endswith('.pdf'):
                    extracted_text = await self._extract_pdf_text(file_path, att.get("file_name"))
                
                # Extract from text-based files
                elif any(file_name.endswith(ext) for ext in ['.txt', '.md', '.py', '.js', '.json', '.csv', '.xml', '.html', '.css', '.java', '.cpp', '.c', '.sh']):
                    extracted_text = await self._extract_text_file(file_path, att.get("file_name"))
                
                # Store in attachments list
                attachments.append({
                    "filename": att["file_name"],
                    "type": att.get("file_type", "unknown"),
                    "uploader": uploader,
                    "timestamp": att["created_at"],
                    "extracted_text": extracted_text
                })
            
            return attachments
            
        except Exception as e:
            print(f"Error fetching group attachments: {str(e)}")
            return []
    
    async def _extract_pdf_text(self, file_path: str, file_name: str) -> str:
        """Extract text content from PDF file"""
        try:
            import PyPDF2
            import requests as req
            from io import BytesIO
            import os
            
            if not file_path:
                print(f"⚠️ No file_path provided for {file_name}")
                return None
            
            print(f"📄 Attempting to extract text from PDF: {file_name}")
            print(f"   File path: {file_path}")
            
            # Convert Supabase storage path to public URL if needed
            if not file_path.startswith("http"):
                # Path format: group_id/user_id/filename
                # Convert to Supabase public URL
                supabase_url = os.getenv("SUPABASE_URL", "")
                if supabase_url:
                    file_path = f"{supabase_url}/storage/v1/object/public/message/{file_path}"
                    print(f"   Converted to public URL: {file_path}")
            
            # Download PDF
            print(f"   Downloading PDF from URL...")
            pdf_response = req.get(file_path, timeout=15)
            
            if pdf_response.status_code != 200:
                print(f"❌ Failed to download PDF: HTTP {pdf_response.status_code}")
                print(f"   Response: {pdf_response.text[:200]}")
                return None
            
            print(f"   ✅ Downloaded {len(pdf_response.content)} bytes")
            pdf_file = BytesIO(pdf_response.content)
            
            # Extract text from PDF
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            num_pages = len(pdf_reader.pages)
            print(f"   PDF has {num_pages} pages")
            
            text_content = ""
            
            # Extract from first 5 pages max (to avoid huge context)
            max_pages = min(5, num_pages)
            for page_num in range(max_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                text_content += page_text + "\n"
                print(f"   Extracted {len(page_text)} chars from page {page_num + 1}")
            
            # Limit to first 2000 characters
            text_content = text_content.strip()[:2000]
            print(f"✅ Successfully extracted {len(text_content)} characters from {file_name}")
            
            if text_content:
                print(f"   Preview: {text_content[:100]}...")
            
            return text_content if text_content else None
            
        except Exception as e:
            print(f"❌ Error extracting PDF text from {file_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _extract_text_file(self, file_path: str, file_name: str) -> str:
        """Extract text content from text-based files (.txt, .md, .py, etc.)"""
        try:
            import requests as req
            import os
            
            if not file_path:
                print(f"⚠️ No file_path provided for {file_name}")
                return None
            
            print(f"📄 Attempting to extract text from file: {file_name}")
            print(f"   File path: {file_path}")
            
            # Convert Supabase storage path to public URL if needed
            if not file_path.startswith("http"):
                supabase_url = os.getenv("SUPABASE_URL", "")
                if supabase_url:
                    file_path = f"{supabase_url}/storage/v1/object/public/message/{file_path}"
                    print(f"   Converted to public URL: {file_path}")
            
            # Download file
            print(f"   Downloading file from URL...")
            file_response = req.get(file_path, timeout=15)
            
            if file_response.status_code != 200:
                print(f"❌ Failed to download file: HTTP {file_response.status_code}")
                print(f"   Response: {file_response.text[:200]}")
                return None
            
            print(f"   ✅ Downloaded {len(file_response.content)} bytes")
            
            # Try different encodings for text extraction
            text_content = None
            encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    text_content = file_response.content.decode(encoding)
                    print(f"   ✅ Successfully decoded with {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if not text_content:
                print(f"❌ Failed to decode file with any encoding")
                return None
            
            # Limit to first 3000 characters (more than PDF since it's already text)
            text_content = text_content.strip()[:3000]
            print(f"✅ Successfully extracted {len(text_content)} characters from {file_name}")
            
            if text_content:
                print(f"   Preview: {text_content[:100]}...")
            
            return text_content if text_content else None
            
        except Exception as e:
            print(f"❌ Error extracting text from {file_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _store_message(self, user_id: str, user_message: str, ai_response: str, group_id: str = None):
        """Store chat history in database"""
        try:
            import uuid
            message_id = str(uuid.uuid4())
            
            data = {
                "id": message_id,
                "user_id": user_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "group_id": group_id
            }
            
            print(f"💾 Inserting into ai_chat_history: user_id={user_id[:8]}, group_id={group_id}")
            result = supabase.table("ai_chat_history").insert(data).execute()
            print(f"✅ Stored successfully: {len(result.data)} record(s)")
            
        except Exception as e:
            print(f"❌ Error storing message: {str(e)}")
            import traceback
            traceback.print_exc()
            pass
    
    async def _check_if_admin(self, user_id: str, group_id: str) -> bool:
        """Check if user is an admin of the specified group"""
        try:
            response = supabase.table("group_members") \
                .select("role") \
                .eq("group_id", group_id) \
                .eq("user_id", user_id) \
                .execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0].get("role") == "admin"
            return False
        except Exception as e:
            print(f"Error checking admin status: {str(e)}")
            return False
    
    async def search_similar(query: str, limit: int = 5) -> List[Dict]:
        try:
            query_vector = model.encode(query).tolist()

            results = (
                table.search(query_vector)
                .limit(limit)
                .to_list()
            )

            print(f"🔍 Found {len(results)} memories")
            return results

        except Exception as e:
            print(f"Memory search error: {e}")
            return []

# Singleton instance
ai_chat_service = AIChatService()
