
print("🚀 Script start (pre-imports)")
import sys
import os
from unittest.mock import MagicMock
import unittest.mock

# Mock lancedb to avoid file lock issues with running server
print("🔒 Mocking lancedb...")
mock_db = MagicMock()
sys.modules["lancedb"] = MagicMock()
sys.modules["lancedb"].connect.return_value = mock_db

# Add backend to path
sys.path.append(os.getcwd())

print("📦 Importing dependencies...")
try:
    from app.services.assignment_service import assignment_service
    print("✅ Imported assignment_service")
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

import asyncio
from fastapi import UploadFile

from app.core.supabase import supabase

async def reproduce():
    print("🚀 Starting reproduction logic...")
    
    # target group_id from user report
    group_id = "39a45bbf-7d36-4bcd-9fd6-05a11bb8377b"
    
    # 1. Find an admin for this group
    print(f"🔍 Looking for admin in group {group_id}...")
    try:
        response = supabase.table("group_members").select("user_id").eq("group_id", group_id).eq("role", "admin").limit(1).execute()
        if not response.data:
            print(f"❌ No admin found for group {group_id}. Trying to find ANY group with admin...")
            # Fallback: find any group with an admin
            response = supabase.table("group_members").select("group_id, user_id").eq("role", "admin").limit(1).execute()
            if not response.data:
                print("❌ No groups with admins found in database.")
                return
            group_id = response.data[0]["group_id"]
            user_id = response.data[0]["user_id"]
            print(f"⚠️ Switched to group {group_id} (admin: {user_id})")
        else:
            user_id = response.data[0]["user_id"]
            print(f"✅ Found admin: {user_id}")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return

    # 2. Create a dummy PDF
    print("📝 Creating dummy PDF...")
    class MockUploadFile:
        def __init__(self, filename):
            self.filename = filename
        async def read(self):
            # A longer valid PDF content simulation
            # We'll just return enough unique text to trigger > 50 chars check
            # The PDF parser extracts text between (...) in BT...ET blocks
            # Let's make the text longer
            content = "This is a longer assignment text that should pass the fallback detection mechanism. " * 5
            return f"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length {len(content)}\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n({content}) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000256 00000 n \n0000000343 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n437\n%%EOF".encode()

    mock_file = MockUploadFile("test_assignment.pdf")

    # 3. Call service
    print("⚡ Calling create_assignment_from_pdf...")
    try:
        # Mock AI failure to force fallback
        with unittest.mock.patch('app.services.assignment_detector.requests.post') as mock_post:
            mock_post.side_effect = Exception("AI Service Down")
            
            result = await assignment_service.create_assignment_from_pdf(
                group_id=group_id,
                admin_id=user_id,
                pdf_file=mock_file
            )
            print("✅ Success! Result:", result)
            
    except Exception as e:
        print(f"ℹ️ Result: {type(e).__name__}: {e}")
        # import traceback
        # traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())
