"""
PDF Processor - Core PDF text extraction and preprocessing

Handles various PDF types:
- Native text PDFs
- Scanned/image PDFs (via OCR)
- Mixed documents
- Multi-column layouts
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from pathlib import Path
import io
import logging

# PDF Processing
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pytesseract
    from PIL import Image
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

logger = logging.getLogger(__name__)


@dataclass
class PageContent:
    """Content extracted from a single page"""
    page_number: int
    text: str
    text_blocks: List[Dict[str, Any]] = field(default_factory=list)
    tables: List[List[List[str]]] = field(default_factory=list)
    images: List[bytes] = field(default_factory=list)
    ocr_used: bool = False
    confidence: float = 1.0


@dataclass
class PDFContent:
    """Complete extracted PDF content"""
    text: str
    pages: List[PageContent]
    page_count: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    has_images: bool = False
    ocr_pages: List[int] = field(default_factory=list)


class PDFProcessor:
    """
    Comprehensive PDF text extraction with OCR fallback
    
    Features:
    - Native text extraction (PyMuPDF)
    - OCR for scanned documents (Tesseract)
    - Image preprocessing for better OCR (OpenCV)
    - Table detection and extraction
    - Multi-column layout handling
    """
    
    def __init__(
        self,
        ocr_dpi: int = 300,
        min_text_threshold: int = 100,
        preprocess_images: bool = True,
        extract_tables: bool = True,
    ):
        """
        Initialize PDF Processor
        
        Args:
            ocr_dpi: DPI for OCR rendering (higher = better quality but slower)
            min_text_threshold: Minimum characters before triggering OCR
            preprocess_images: Whether to preprocess images for better OCR
            extract_tables: Whether to attempt table extraction
        """
        self.ocr_dpi = ocr_dpi
        self.min_text_threshold = min_text_threshold
        self.preprocess_images = preprocess_images
        self.extract_tables = extract_tables
        
        if not HAS_PYMUPDF:
            logger.warning("PyMuPDF not installed. PDF processing will be limited.")
    
    def process(self, pdf_path: str) -> PDFContent:
        """
        Process PDF and extract all content
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            PDFContent with extracted text and metadata
        """
        if not Path(pdf_path).exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF is required for PDF processing")
        
        pages = []
        all_text = []
        ocr_pages = []
        
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            
            # Extract metadata
            metadata = {
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "creator": doc.metadata.get("creator", ""),
                "producer": doc.metadata.get("producer", ""),
                "creation_date": doc.metadata.get("creationDate", ""),
                "modification_date": doc.metadata.get("modDate", ""),
            }
            
            has_images = False
            
            for page_num in range(page_count):
                page = doc[page_num]
                page_content = self._process_page(page, page_num)
                pages.append(page_content)
                all_text.append(page_content.text)
                
                if page_content.ocr_used:
                    ocr_pages.append(page_num + 1)
                
                if page_content.images:
                    has_images = True
            
            doc.close()
            
        except Exception as e:
            logger.error(f"Failed to process PDF: {e}")
            raise
        
        return PDFContent(
            text="\n\n".join(all_text),
            pages=pages,
            page_count=page_count,
            metadata=metadata,
            has_images=has_images,
            ocr_pages=ocr_pages,
        )
    
    def process_bytes(self, pdf_bytes: bytes) -> PDFContent:
        """Process PDF from bytes"""
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        
        try:
            return self.process(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    
    def _process_page(self, page, page_num: int) -> PageContent:
        """Process a single PDF page"""
        # Try native text extraction first
        text = page.get_text("text")
        text_blocks = self._extract_text_blocks(page)
        
        ocr_used = False
        confidence = 1.0
        
        # Check if OCR is needed
        if len(text.strip()) < self.min_text_threshold:
            if HAS_TESSERACT:
                logger.debug(f"Using OCR for page {page_num + 1}")
                text, confidence = self._ocr_page(page)
                ocr_used = True
            else:
                logger.warning(f"Page {page_num + 1} has little text and OCR is not available")
        
        # Extract tables if enabled
        tables = []
        if self.extract_tables:
            tables = self._extract_tables(page)
        
        # Extract images
        images = self._extract_images(page)
        
        return PageContent(
            page_number=page_num + 1,
            text=text,
            text_blocks=text_blocks,
            tables=tables,
            images=images,
            ocr_used=ocr_used,
            confidence=confidence,
        )
    
    def _extract_text_blocks(self, page) -> List[Dict[str, Any]]:
        """Extract text blocks with position information"""
        blocks = []
        
        try:
            block_list = page.get_text("dict")["blocks"]
            
            for block in block_list:
                if block["type"] == 0:  # Text block
                    text = ""
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text += span.get("text", "") + " "
                    
                    if text.strip():
                        blocks.append({
                            "text": text.strip(),
                            "bbox": block["bbox"],
                            "type": "text",
                        })
        except Exception as e:
            logger.warning(f"Failed to extract text blocks: {e}")
        
        return blocks
    
    def _ocr_page(self, page) -> Tuple[str, float]:
        """OCR a page and return text with confidence"""
        try:
            # Render page to image
            pix = page.get_pixmap(dpi=self.ocr_dpi)
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Preprocess if enabled
            if self.preprocess_images and HAS_OPENCV:
                img = self._preprocess_image(img)
            
            # Get OCR data with confidence
            data = pytesseract.image_to_data(
                img,
                output_type=pytesseract.Output.DICT,
                config='--psm 6'
            )
            
            # Extract text and calculate confidence
            words = []
            confidences = []
            
            for i, word in enumerate(data['text']):
                if word.strip():
                    words.append(word)
                    conf = data['conf'][i]
                    if conf > 0:
                        confidences.append(conf)
            
            text = ' '.join(words)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return text, avg_confidence / 100
            
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return "", 0.0
    
    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results"""
        if not HAS_OPENCV:
            return img
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
        
        return Image.fromarray(denoised)
    
    def _extract_tables(self, page) -> List[List[List[str]]]:
        """Extract tables from page"""
        tables = []
        
        try:
            # Use PyMuPDF table detection
            table_finder = page.find_tables()
            
            for table in table_finder.tables:
                rows = []
                for row in table.extract():
                    cells = [str(cell) if cell else "" for cell in row]
                    rows.append(cells)
                if rows:
                    tables.append(rows)
        except Exception as e:
            logger.debug(f"Table extraction failed: {e}")
        
        return tables
    
    def _extract_images(self, page) -> List[bytes]:
        """Extract embedded images from page"""
        images = []
        
        try:
            image_list = page.get_images()
            
            for img_info in image_list[:5]:  # Limit to 5 images per page
                try:
                    xref = img_info[0]
                    base_image = page.parent.extract_image(xref)
                    images.append(base_image["image"])
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Image extraction failed: {e}")
        
        return images
    
    def extract_text_only(self, pdf_path: str) -> str:
        """Quick text extraction without full processing"""
        content = self.process(pdf_path)
        return content.text
    
    def get_page_count(self, pdf_path: str) -> int:
        """Get page count without full processing"""
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF is required")
        
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("PDF Processor initialized")
    print(f"  - PyMuPDF: {HAS_PYMUPDF}")
    print(f"  - Tesseract: {HAS_TESSERACT}")
    print(f"  - OpenCV: {HAS_OPENCV}")
    
    processor = PDFProcessor()
