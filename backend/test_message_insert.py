"""
Test script to verify message insertion into group_messeges table
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client
import uuid

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ ERROR: Missing Supabase credentials in .env file")
    sys.exit(1)

print(f"✅ Supabase URL: {SUPABASE_URL}")
print(f"✅ Service key loaded: {SUPABASE_SERVICE_ROLE_KEY[:20]}...")

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
print("✅ Supabase client created")

# Test data
test_message_id = str(uuid.uuid4())
test_group_id = "39a45bbf-7d36-4bcd-9fd6-05a11bb8377b"  # Your group ID
test_user_id = "559912ed-149f-4654-8050-daca55fc4c2a"  # Your user ID
test_content = "TEST MESSAGE - If you see this, the insert is working!"

print(f"\n📝 Attempting to insert test message:")
print(f"   Message ID: {test_message_id}")
print(f"   Group ID: {test_group_id}")
print(f"   User ID: {test_user_id}")
print(f"   Content: {test_content}")

try:
    # Insert test message
    response = supabase.table("group_messeges").insert({
        "id": test_message_id,
        "group_id": test_group_id,
        "sender_id": test_user_id,
        "content": test_content
    }).execute()
    
    print(f"\n✅ Insert response: {response.data}")
    
    # Verify by fetching
    fetch_response = supabase.table("group_messeges").select("*").eq("id", test_message_id).execute()
    
    if fetch_response.data and len(fetch_response.data) > 0:
        print(f"\n✅ SUCCESS! Message found in database:")
        print(f"   {fetch_response.data[0]}")
    else:
        print(f"\n❌ FAILED! Message NOT found in database after insert")
        print(f"   This indicates a database constraint or trigger issue")
    
    # Clean up - delete test message
    print(f"\n🧹 Cleaning up test message...")
    delete_response = supabase.table("group_messeges").delete().eq("id", test_message_id).execute()
    print(f"✅ Test message deleted")
    
except Exception as e:
    print(f"\n❌ ERROR during insert: {str(e)}")
    import traceback
    traceback.print_exc()
    
print("\n" + "="*50)
print("Test complete!")
