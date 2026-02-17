
import sys
import os
import asyncio
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.getcwd())
load_dotenv()

from app.core.supabase import supabase

async def check_assignments():
    group_id = "39a45bbf-7d36-4bcd-9fd6-05a11bb8377b"
    print(f"🔍 Checking assignments for group: {group_id}")
    
    try:
        # Check raw table
        response = supabase.table("question_sheets") \
            .select("*") \
            .eq("group_id", group_id) \
            .execute()
        
        print(f"📊 Found {len(response.data)} assignments in DB:")
        for a in response.data:
            print(f" - {a.get('title')} (ID: {a.get('id')}) - Created: {a.get('created_at')}")
            
    except Exception as e:
        print(f"❌ Error checking DB: {e}")

if __name__ == "__main__":
    asyncio.run(check_assignments())
