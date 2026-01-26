"""
Document Intelligence Service API Routes

Provides REST endpoints for document processing
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..extractors.iep_extractor import IEPExtractor, IEPDocument
from ..extractors.pdf_processor import PDFProcessor
from ..extractors.curriculum_parser import CurriculumParser

logger = logging.getLogger(__name__)

router = APIRouter()


# Response Models
class IEPGoalResponse(BaseModel):
    goal_number: str
    category: str
    domain: str
    baseline: str
    target: str
    measurement: str
    timeline: str
    accommodations: List[str]
    benchmarks: List[str]
    confidence: float


class IEPStudentResponse(BaseModel):
    name: str
    student_id: Optional[str]
    date_of_birth: Optional[str]
    grade_level: Optional[str]
    school: Optional[str]
    disability_categories: List[str]


class IEPAccommodationResponse(BaseModel):
    name: str
    category: str
    description: str
    applies_to: List[str]


class IEPServiceResponse(BaseModel):
    service_type: str
    provider: str
    minutes_per_week: int
    location: str
    frequency: str


class IEPExtractionResponse(BaseModel):
    success: bool
    student: IEPStudentResponse
    iep_date: Optional[str]
    goals: List[IEPGoalResponse]
    accommodations: List[IEPAccommodationResponse]
    services: List[IEPServiceResponse]
    placement: Optional[str]
    present_levels: dict
    extraction_confidence: float
    extraction_warnings: List[str]
    page_count: int


class CurriculumStandardResponse(BaseModel):
    code: str
    description: str
    grade_level: str
    subject: str
    domain: str


class CurriculumUnitResponse(BaseModel):
    title: str
    unit_number: int
    grade_level: str
    subject: str
    standards: List[str]
    objectives: List[str]
    essential_questions: List[str]
    vocabulary: List[str]


class CurriculumParseResponse(BaseModel):
    success: bool
    title: str
    subject: str
    grade_levels: List[str]
    standards: List[CurriculumStandardResponse]
    units: List[CurriculumUnitResponse]
    scope_sequence: dict


class PDFExtractResponse(BaseModel):
    success: bool
    text: str
    page_count: int
    has_images: bool
    ocr_pages: List[int]
    metadata: dict


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None


# IEP Extraction Endpoints
@router.post("/extract/iep", response_model=IEPExtractionResponse)
async def extract_iep(
    request: Request,
    file: UploadFile = File(..., description="IEP PDF file to process"),
    validate: bool = Query(True, description="Whether to validate extracted data"),
):
    """
    Extract structured data from an IEP PDF document
    
    Extracts:
    - Student information (name, grade, disability category)
    - IEP goals with baselines, targets, and measurements
    - Accommodations and modifications
    - Related services
    - Present levels of performance
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Check file size (max 50MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    try:
        # Get extractor from app state or create new one
        extractor = getattr(request.app.state, 'iep_extractor', None)
        if extractor is None:
            extractor = IEPExtractor()
        
        # Extract IEP data
        iep_doc = extractor.extract_from_bytes(content, validate=validate)
        
        # Convert to response model
        return IEPExtractionResponse(
            success=True,
            student=IEPStudentResponse(
                name=iep_doc.student.name,
                student_id=iep_doc.student.student_id,
                date_of_birth=iep_doc.student.date_of_birth.isoformat() if iep_doc.student.date_of_birth else None,
                grade_level=iep_doc.student.grade_level,
                school=iep_doc.student.school,
                disability_categories=iep_doc.student.disability_categories,
            ),
            iep_date=iep_doc.iep_date.isoformat() if iep_doc.iep_date else None,
            goals=[
                IEPGoalResponse(
                    goal_number=g.goal_number,
                    category=g.category,
                    domain=g.domain,
                    baseline=g.baseline,
                    target=g.target,
                    measurement=g.measurement,
                    timeline=g.timeline,
                    accommodations=g.accommodations,
                    benchmarks=g.benchmarks,
                    confidence=g.confidence,
                )
                for g in iep_doc.goals
            ],
            accommodations=[
                IEPAccommodationResponse(
                    name=a.name,
                    category=a.category,
                    description=a.description,
                    applies_to=a.applies_to,
                )
                for a in iep_doc.accommodations
            ],
            services=[
                IEPServiceResponse(
                    service_type=s.service_type,
                    provider=s.provider,
                    minutes_per_week=s.minutes_per_week,
                    location=s.location,
                    frequency=s.frequency,
                )
                for s in iep_doc.services
            ],
            placement=iep_doc.placement,
            present_levels=iep_doc.present_levels,
            extraction_confidence=iep_doc.extraction_confidence,
            extraction_warnings=iep_doc.extraction_warnings,
            page_count=iep_doc.page_count,
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"IEP extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


# Curriculum Parsing Endpoints
@router.post("/extract/curriculum", response_model=CurriculumParseResponse)
async def extract_curriculum(
    file: UploadFile = File(..., description="Curriculum document (PDF or text)"),
    document_type: str = Query("auto", description="Document type (standards, scope_sequence, framework, auto)"),
):
    """
    Parse curriculum document into structured format
    
    Extracts:
    - Learning standards (CCSS, state standards)
    - Curriculum units with objectives
    - Scope and sequence
    - Vocabulary and essential questions
    """
    # Read file content
    content = await file.read()
    
    try:
        # If PDF, extract text first
        if file.filename.lower().endswith('.pdf'):
            processor = PDFProcessor()
            pdf_content = processor.process_bytes(content)
            text = pdf_content.text
        else:
            # Assume text file
            text = content.decode('utf-8', errors='ignore')
        
        # Parse curriculum
        parser = CurriculumParser()
        doc = parser.parse(text, document_type)
        
        return CurriculumParseResponse(
            success=True,
            title=doc.title,
            subject=doc.subject,
            grade_levels=doc.grade_levels,
            standards=[
                CurriculumStandardResponse(
                    code=s.code,
                    description=s.description,
                    grade_level=s.grade_level,
                    subject=s.subject,
                    domain=s.domain,
                )
                for s in doc.standards
            ],
            units=[
                CurriculumUnitResponse(
                    title=u.title,
                    unit_number=u.unit_number,
                    grade_level=u.grade_level,
                    subject=u.subject,
                    standards=u.standards,
                    objectives=u.objectives,
                    essential_questions=u.essential_questions,
                    vocabulary=u.vocabulary,
                )
                for u in doc.units
            ],
            scope_sequence=doc.scope_sequence,
        )
        
    except Exception as e:
        logger.exception(f"Curriculum parsing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


# PDF Text Extraction Endpoint
@router.post("/extract/pdf", response_model=PDFExtractResponse)
async def extract_pdf_text(
    file: UploadFile = File(..., description="PDF file to extract text from"),
):
    """
    Extract raw text from PDF document
    
    Uses OCR if native text extraction yields insufficient content
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    content = await file.read()
    
    try:
        processor = PDFProcessor()
        pdf_content = processor.process_bytes(content)
        
        return PDFExtractResponse(
            success=True,
            text=pdf_content.text,
            page_count=pdf_content.page_count,
            has_images=pdf_content.has_images,
            ocr_pages=pdf_content.ocr_pages,
            metadata=pdf_content.metadata,
        )
        
    except Exception as e:
        logger.exception(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


# Document Classification Endpoint
class ClassificationRequest(BaseModel):
    text: str = Field(..., description="Text content to classify")


class ClassificationResponse(BaseModel):
    document_type: str
    confidence: float
    categories: List[str]


@router.post("/classify", response_model=ClassificationResponse)
async def classify_document(request: ClassificationRequest):
    """
    Classify document type based on text content
    
    Categories:
    - IEP (Individualized Education Program)
    - Curriculum (curriculum documents, standards)
    - Assessment (test, quiz, evaluation)
    - Progress Report
    - Other
    """
    text = request.text.lower()
    
    # Simple keyword-based classification
    classifications = {
        'iep': ['individualized education program', 'iep', 'special education', 'accommodations', 'present levels'],
        'curriculum': ['curriculum', 'standards', 'scope and sequence', 'learning objectives', 'ccss'],
        'assessment': ['assessment', 'test', 'quiz', 'evaluation', 'rubric', 'score'],
        'progress_report': ['progress report', 'grade report', 'report card', 'academic progress'],
    }
    
    scores = {}
    for doc_type, keywords in classifications.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[doc_type] = score
    
    if scores:
        best_type = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_type] / total_score if total_score > 0 else 0
    else:
        best_type = 'other'
        confidence = 0.5
    
    return ClassificationResponse(
        document_type=best_type,
        confidence=confidence,
        categories=list(scores.keys()) if scores else ['other'],
    )


# Batch Processing Endpoint
class BatchExtractionRequest(BaseModel):
    document_type: str = Field("iep", description="Type of documents to process")


@router.post("/extract/batch")
async def extract_batch(
    request: Request,
    files: List[UploadFile] = File(..., description="List of PDF files to process"),
    document_type: str = Query("iep", description="Document type (iep, curriculum)"),
):
    """
    Process multiple documents in batch
    
    Returns results for each file with success/failure status
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")
    
    results = []
    
    for file in files:
        try:
            content = await file.read()
            
            if document_type == "iep":
                extractor = getattr(request.app.state, 'iep_extractor', None) or IEPExtractor()
                doc = extractor.extract_from_bytes(content, validate=True)
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "student_name": doc.student.name,
                    "goals_count": len(doc.goals),
                    "confidence": doc.extraction_confidence,
                })
            else:
                processor = PDFProcessor()
                parser = CurriculumParser()
                pdf_content = processor.process_bytes(content)
                doc = parser.parse(pdf_content.text)
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "title": doc.title,
                    "standards_count": len(doc.standards),
                })
                
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
            })
    
    return {
        "total": len(files),
        "successful": sum(1 for r in results if r.get("success")),
        "failed": sum(1 for r in results if not r.get("success")),
        "results": results,
    }
