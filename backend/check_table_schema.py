"""
Check the group_messeges table schema
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("Checking group_messeges table schema...\n")

# Try to get a sample message to see the structure
try:
    response = supabase.table("group_messeges").select("*").limit(1).execute()
    
    if response.data and len(response.data) > 0:
        print("✅ Sample message from database:")
        sample = response.data[0]
        for key, value in sample.items():
            print(f"   {key}: {value} (type: {type(value).__name__})")
    else:
        print("⚠️ No messages found in table")
        print("   Table exists but is empty")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Check if we can query the table at all
try:
    count_response = supabase.table("group_messeges").select("id", count="exact").execute()
    print(f"\n📊 Total messages in table: {count_response.count}")
except Exception as e:
    print(f"❌ Error counting messages: {e}")
