
import asyncio
import os
import sys
from fastapi import UploadFile

# Add backend to path
sys.path.append(os.getcwd())

from app.core.supabase import supabase
from app.services.assignment_service import assignment_service

async def reproduce():
    print("🚀 Starting reproduction script...")
    
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
    try:
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        p.drawString(100, 750, "This is a test assignment.")
        p.drawString(100, 730, "Please solve: 2 + 2 = ?")
        p.showPage()
        p.save()
        buffer.seek(0)
        
        # Mock UploadFile
        class MockUploadFile:
            def __init__(self, file, filename):
                self.file = file
                self.filename = filename
            
            async def read(self):
                return self.file.read()

        mock_file = MockUploadFile(buffer, "test_assignment.pdf")
        
    except ImportError:
        print("⚠️ reportlab not installed, creating text file pretending to be PDF (might fail validation)")
        class MockUploadFile:
            def __init__(self, filename):
                self.filename = filename
            async def read(self):
                return b"%PDF-1.4 ... dummy content ..."
        mock_file = MockUploadFile("test_assignment.pdf")

    # 3. Call service
    print("⚡ Calling create_assignment_from_pdf...")
    try:
        result = await assignment_service.create_assignment_from_pdf(
            group_id=group_id,
            admin_id=user_id,
            pdf_file=mock_file
        )
        print("✅ Success! Result:", result)
    except Exception as e:
        print(f"❌ Error caught during execution: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())
