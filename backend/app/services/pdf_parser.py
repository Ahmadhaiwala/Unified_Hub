"""
PDF Parsing Service
Extracts text content from PDF files for assignment detection
"""

import PyPDF2
from typing import Optional
import io

async def parse_pdf_to_text(file_content: bytes, file_name: str) -> Optional[str]:
    """
    Extract text content from PDF file
    
    Args:
        file_content: PDF file bytes
        file_name: Name of the PDF file
        
    Returns:
        Extracted text content or None if parsing fails
    """
    try:
        # Create PDF reader from bytes
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract text from all pages
        text_content = []
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            if text:
                text_content.append(text)
        
        # Combine all pages
        full_text = "\n\n".join(text_content)
        
        if not full_text.strip():
            print(f"⚠️ No text extracted from PDF: {file_name}")
            return None
            
        print(f"✅ Extracted {len(full_text)} characters from PDF: {file_name}")
        return full_text
        
    except Exception as e:
        print(f"❌ Error parsing PDF {file_name}: {str(e)}")
        return None


async def validate_pdf_file(file_content: bytes, max_size_mb: int = 10) -> tuple[bool, Optional[str]]:
    """
    Validate PDF file size and format
    
    Args:
        file_content: PDF file bytes
        max_size_mb: Maximum file size in MB
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Check file size
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            return False, f"File size ({file_size_mb:.2f}MB) exceeds maximum ({max_size_mb}MB)"
        
        # Try to open as PDF
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Check if PDF has pages
        if len(pdf_reader.pages) == 0:
            return False, "PDF file has no pages"
        
        return True, None
        
    except Exception as e:
        return False, f"Invalid PDF file: {str(e)}"
