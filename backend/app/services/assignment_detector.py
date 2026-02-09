from app.core.ai_memory import store_embedding, search_similar
from app.core.supabase import supabase
import uuid

async def detect_and_store_assignment(text=None, file_content=None, file_name=None, group_id=None, user_id=None):
    try:
        if text:
            results = await search_similar(text, limit=3)

            patterns = [
                r for r in results
                if '"assignment_pattern"' in r["metadata"]
            ]

            if patterns:
                similarity = 1 - patterns[0]["_distance"]

                if similarity > 0.70:
                    print(f"🧠 AI detected assignment (confidence {similarity:.2f})")

                    assignment_id = str(uuid.uuid4())

                    supabase.table("assignments").insert({
                        "id": assignment_id,
                        "group_id": group_id,
                        "created_by": user_id,
                        "content": text,
                        "confidence": similarity
                    }).execute()

                    # store assignment as embedding for answer linking later (non-blocking)
                    import asyncio
                    asyncio.create_task(
                        store_embedding(text, {
                            "type": "assignment",
                            "assignment_id": assignment_id,
                            "group_id": group_id
                        })
                    )

        # FILE CASE (still rule-based)
        if file_content and file_name:
            if file_name.lower().endswith(('.pdf', '.docx', '.doc', '.txt')):
                print("📎 File assignment detected")
                # you can OCR / parse text later

    except Exception as e:
        print(f"Assignment detection error: {e}")
