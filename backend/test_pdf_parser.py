"""
Test PDF Parser
Quick test to verify PDF parsing functionality
"""

import asyncio
import sys
sys.path.insert(0, 'C:\\Users\\haiwa\\fsd1\\project1\\backend')

from app.services.pdf_parser import parse_pdf_to_text, validate_pdf_file

async def test_pdf_parser():
    """Test PDF parser with a sample file"""
    
    # Test with a sample PDF file
    test_file = "Clone_Question_Sheet-1.pdf"
    
    try:
        # Read the file
        with open(test_file, 'rb') as f:
            pdf_content = f.read()
        
        print(f"📁 Testing PDF: {test_file}")
        print(f"📊 File size: {len(pdf_content)} bytes\n")
        
        # Validate PDF
        is_valid, error = await validate_pdf_file(pdf_content)
        print(f"✅ Validation: {is_valid}")
        if error:
            print(f"❌ Error: {error}")
            return
        
        # Parse PDF
        print("\n🔍 Parsing PDF...")
        text = await parse_pdf_to_text(pdf_content, test_file)
        
        if text:
            print(f"\n✅ SUCCESS! Extracted {len(text)} characters")
            print(f"\n📝 First 500 characters:")
            print("-" * 60)
            print(text[:500])
            print("-" * 60)
        else:
            print("\n❌ FAILED to extract text")
            
    except FileNotFoundError:
        print(f"❌ Test file not found: {test_file}")
        print("Please place a test PDF in the backend directory")
    except Exception as e:
        print(f"❌ Test error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_pdf_parser())
