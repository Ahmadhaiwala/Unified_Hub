from app.core.ai_memory import search_similar
from app.core.supabase import supabase

async def detect_answer_and_link(message_text, message_id, group_id, student_id):
    try:
        print(f"🔗 Checking answer using AI similarity")

        # Search similar assignments
        results = await search_similar(message_text, limit=3)

        # Filter only assignments from same group
        assignments = [
            r for r in results
            if '"type": "assignment"' in r["metadata"]
            and f'"group_id": "{group_id}"' in r["metadata"]
        ]

        if not assignments:
            return

        best_match = assignments[0]

        confidence = best_match["_distance"]  # similarity score
        similarity = 1 - confidence  # convert distance → similarity

        if similarity > 0.75:  # threshold
            print(f"✅ Linked to assignment with similarity {similarity:.2f}")

            # Store link in DB
            supabase.table("assignment_answers").insert({
                "assignment_id": best_match["metadata"]["assignment_id"],
                "message_id": message_id,
                "student_id": student_id,
                "confidence": similarity
            }).execute()

    except Exception as e:
        print(f"Error in answer linking: {e}")
