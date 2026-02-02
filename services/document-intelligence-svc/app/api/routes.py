"""
Document Intelligence Service API Routes

Provides REST endpoints for document processing
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Request, Body
from pydantic import BaseModel, Field

from ..extractors.iep_extractor import IEPExtractor, IEPDocument
from ..extractors.pdf_processor import PDFProcessor
from ..extractors.curriculum_parser import CurriculumParser

# Import new AI-powered IEP extraction module
from ..iep import (
    IEPExtractionService,
    IEPExtractor as AIIEPExtractor,
    SMARTValidator,
    ExtractedGoal,
    SMARTValidationResult,
    IEPExtractionResult,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Error Constants
ERROR_FILE_MUST_BE_PDF = "File must be a PDF document"


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
        raise HTTPException(status_code=400, detail=ERROR_FILE_MUST_BE_PDF)
    
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
        raise HTTPException(status_code=400, detail=ERROR_FILE_MUST_BE_PDF)
    
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


# =============================================================================
# AI-Powered IEP Extraction Endpoints (New)
# =============================================================================

# Response models for AI-powered extraction
class AIExtractedGoalResponse(BaseModel):
    """Goal extracted with AI assistance."""
    goal_number: str
    domain: str
    goal_text: str
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_method: Optional[str] = None
    measurement_frequency: Optional[str] = None
    page_reference: int
    confidence_score: float
    objectives: List[str] = []


class AIExtractedServiceResponse(BaseModel):
    """Service extracted with AI assistance."""
    service_type: str
    service_description: str
    minutes_per_session: Optional[int] = None
    sessions_per_week: Optional[float] = None
    total_minutes_per_week: Optional[int] = None
    provider_type: Optional[str] = None
    location: Optional[str] = None
    page_reference: int
    confidence_score: float


class AIExtractedAccommodationResponse(BaseModel):
    """Accommodation extracted with AI assistance."""
    category: str
    description: str
    applies_to: List[str] = []
    page_reference: int
    confidence_score: float
    is_modification: bool = False


class AIPresentLevelResponse(BaseModel):
    """Present level extracted with AI assistance."""
    domain: str
    description: str
    strengths: List[str] = []
    needs: List[str] = []
    assessment_data: Dict[str, str] = {}
    page_reference: int
    confidence_score: float


class SMARTValidationResponse(BaseModel):
    """SMART goal validation result."""
    goal_number: str
    goal_text: str
    specific_score: float
    specific_explanation: str
    specific_suggestion: Optional[str] = None
    measurable_score: float
    measurable_explanation: str
    measurable_suggestion: Optional[str] = None
    achievable_score: float
    achievable_explanation: str
    achievable_suggestion: Optional[str] = None
    relevant_score: float
    relevant_explanation: str
    relevant_suggestion: Optional[str] = None
    timebound_score: float
    timebound_explanation: str
    timebound_suggestion: Optional[str] = None
    overall_score: float
    is_smart: bool
    recommendations: List[str] = []


class QualityAnalysisResponse(BaseModel):
    """Quality analysis for all goals."""
    total_goals: int
    smart_goals: int
    non_smart_goals: int
    average_scores: Dict[str, float]
    weakest_criterion: Optional[str]
    summary_recommendations: List[str]


class AIIEPExtractionResponse(BaseModel):
    """Complete AI-powered IEP extraction response."""
    success: bool
    document_id: str

    # Extracted content
    goals: List[AIExtractedGoalResponse]
    services: List[AIExtractedServiceResponse]
    accommodations: List[AIExtractedAccommodationResponse]
    present_levels: List[AIPresentLevelResponse]

    # Metadata
    iep_date: Optional[str] = None
    annual_review_date: Optional[str] = None
    eligibility_category: Optional[str] = None
    placement: Optional[str] = None
    total_pages: int
    overall_confidence: float
    extraction_warnings: List[str] = []

    # Validation (optional)
    goal_validations: List[SMARTValidationResponse] = []
    quality_analysis: Optional[QualityAnalysisResponse] = None

    # Processing info
    processing_time_ms: int


class GoalValidationRequest(BaseModel):
    """Request for validating a single goal."""
    goal_text: str = Field(..., description="The goal text to validate")
    baseline: Optional[str] = Field(None, description="Current performance level")
    target: Optional[str] = Field(None, description="Expected outcome")
    measurement_method: Optional[str] = Field(None, description="How progress will be measured")


class GoalComparisonRequest(BaseModel):
    """Request for comparing goal versions."""
    original_goal_text: str = Field(..., description="Original goal text")
    revised_goal_text: str = Field(..., description="Revised goal text")


@router.post("/extract/iep/ai", response_model=AIIEPExtractionResponse)
async def extract_iep_ai(
    request: Request,
    file: UploadFile = File(..., description="IEP PDF file to process"),
    validate_goals: bool = Query(True, description="Whether to validate goals against SMART criteria"),
    use_llm: bool = Query(True, description="Whether to use LLM for enhanced extraction"),
):
    """
    Extract structured data from IEP using AI-powered extraction.

    This endpoint uses LLM-based extraction for higher accuracy on varied document formats.

    Features:
    - AI-powered goal, service, and accommodation extraction
    - SMART goal validation with actionable feedback
    - Page reference tracking for source verification
    - Confidence scoring for extraction quality assessment

    Extracts:
    - Goals with domain classification and measurement details
    - Services with minutes and provider information
    - Accommodations with category classification
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
        # Get LLM client from app state if available
        llm_client = getattr(request.app.state, 'llm_client', None)

        # Create service
        service = IEPExtractionService(llm_client=llm_client)

        # Extract and validate
        result = await service.extract_and_validate(
            document_bytes=content,
            use_llm=use_llm,
            validate_goals=validate_goals,
        )

        extraction = result["extraction"]

        # Build response
        response = AIIEPExtractionResponse(
            success=True,
            document_id=extraction.document_id,
            goals=[
                AIExtractedGoalResponse(
                    goal_number=g.goal_number,
                    domain=g.domain.value if hasattr(g.domain, 'value') else str(g.domain),
                    goal_text=g.goal_text,
                    baseline=g.baseline,
                    target=g.target,
                    measurement_method=g.measurement_method,
                    measurement_frequency=g.measurement_frequency,
                    page_reference=g.page_reference,
                    confidence_score=g.confidence_score,
                    objectives=g.objectives,
                )
                for g in extraction.goals
            ],
            services=[
                AIExtractedServiceResponse(
                    service_type=s.service_type.value if hasattr(s.service_type, 'value') else str(s.service_type),
                    service_description=s.service_description,
                    minutes_per_session=s.minutes_per_session,
                    sessions_per_week=s.sessions_per_week,
                    total_minutes_per_week=s.total_minutes_per_week,
                    provider_type=s.provider_type,
                    location=s.location,
                    page_reference=s.page_reference,
                    confidence_score=s.confidence_score,
                )
                for s in extraction.services
            ],
            accommodations=[
                AIExtractedAccommodationResponse(
                    category=a.category.value if hasattr(a.category, 'value') else str(a.category),
                    description=a.description,
                    applies_to=a.applies_to,
                    page_reference=a.page_reference,
                    confidence_score=a.confidence_score,
                    is_modification=a.is_modification,
                )
                for a in extraction.accommodations
            ],
            present_levels=[
                AIPresentLevelResponse(
                    domain=p.domain.value if hasattr(p.domain, 'value') else str(p.domain),
                    description=p.description,
                    strengths=p.strengths,
                    needs=p.needs,
                    assessment_data=p.assessment_data,
                    page_reference=p.page_reference,
                    confidence_score=p.confidence_score,
                )
                for p in extraction.present_levels
            ],
            iep_date=extraction.iep_date.isoformat() if extraction.iep_date else None,
            annual_review_date=extraction.annual_review_date.isoformat() if extraction.annual_review_date else None,
            eligibility_category=extraction.eligibility_category,
            placement=extraction.placement,
            total_pages=extraction.total_pages,
            overall_confidence=extraction.overall_confidence,
            extraction_warnings=extraction.extraction_warnings,
            processing_time_ms=result.get("processing_time_ms", 0),
        )

        # Add validation results if available
        if validate_goals and result.get("goal_validations"):
            response.goal_validations = [
                SMARTValidationResponse(
                    goal_number=v.goal_number,
                    goal_text=v.goal_text,
                    specific_score=v.specific_score,
                    specific_explanation=v.specific_explanation,
                    specific_suggestion=v.specific_suggestion,
                    measurable_score=v.measurable_score,
                    measurable_explanation=v.measurable_explanation,
                    measurable_suggestion=v.measurable_suggestion,
                    achievable_score=v.achievable_score,
                    achievable_explanation=v.achievable_explanation,
                    achievable_suggestion=v.achievable_suggestion,
                    relevant_score=v.relevant_score,
                    relevant_explanation=v.relevant_explanation,
                    relevant_suggestion=v.relevant_suggestion,
                    timebound_score=v.timebound_score,
                    timebound_explanation=v.timebound_explanation,
                    timebound_suggestion=v.timebound_suggestion,
                    overall_score=v.overall_score,
                    is_smart=v.is_smart,
                    recommendations=v.recommendations,
                )
                for v in result["goal_validations"]
            ]

            if result.get("quality_analysis"):
                qa = result["quality_analysis"]
                response.quality_analysis = QualityAnalysisResponse(
                    total_goals=qa["total_goals"],
                    smart_goals=qa["smart_goals"],
                    non_smart_goals=qa["non_smart_goals"],
                    average_scores=qa["average_scores"],
                    weakest_criterion=qa["weakest_criterion"],
                    summary_recommendations=qa["summary_recommendations"],
                )

        return response

    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"AI IEP extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/validate/goal", response_model=SMARTValidationResponse)
async def validate_goal(
    request: Request,
    goal_request: GoalValidationRequest,
):
    """
    Validate a single IEP goal against SMART criteria.

    Useful for real-time feedback during goal writing.

    Returns scores and suggestions for:
    - Specific: Clear target behavior/skill
    - Measurable: Quantifiable criteria
    - Achievable: Realistic given baseline
    - Relevant: Addresses identified needs
    - Time-bound: Clear deadline
    """
    try:
        # Get LLM client from app state if available
        llm_client = getattr(request.app.state, 'llm_client', None)

        # Create service
        service = IEPExtractionService(llm_client=llm_client)

        # Validate goal
        result = await service.revalidate_goal(
            goal_text=goal_request.goal_text,
            baseline=goal_request.baseline,
            target=goal_request.target,
            measurement_method=goal_request.measurement_method,
            use_llm=llm_client is not None,
        )

        return SMARTValidationResponse(
            goal_number=result.goal_number,
            goal_text=result.goal_text,
            specific_score=result.specific_score,
            specific_explanation=result.specific_explanation,
            specific_suggestion=result.specific_suggestion,
            measurable_score=result.measurable_score,
            measurable_explanation=result.measurable_explanation,
            measurable_suggestion=result.measurable_suggestion,
            achievable_score=result.achievable_score,
            achievable_explanation=result.achievable_explanation,
            achievable_suggestion=result.achievable_suggestion,
            relevant_score=result.relevant_score,
            relevant_explanation=result.relevant_explanation,
            relevant_suggestion=result.relevant_suggestion,
            timebound_score=result.timebound_score,
            timebound_explanation=result.timebound_explanation,
            timebound_suggestion=result.timebound_suggestion,
            overall_score=result.overall_score,
            is_smart=result.is_smart,
            recommendations=result.recommendations,
        )

    except Exception as e:
        logger.exception(f"Goal validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/validate/goal/compare")
async def compare_goal_versions(
    request: Request,
    comparison_request: GoalComparisonRequest,
):
    """
    Compare original and revised versions of a goal.

    Shows improvement in goal quality between versions.
    Useful for showing progress in goal writing.
    """
    try:
        # Get LLM client from app state if available
        llm_client = getattr(request.app.state, 'llm_client', None)

        # Create service
        service = IEPExtractionService(llm_client=llm_client)

        # Compare versions
        result = await service.compare_goal_versions(
            original_goal_text=comparison_request.original_goal_text,
            revised_goal_text=comparison_request.revised_goal_text,
            use_llm=llm_client is not None,
        )

        return {
            "original": {
                "text": result["original"]["text"],
                "overall_score": result["original"]["validation"].overall_score,
                "is_smart": result["original"]["validation"].is_smart,
            },
            "revised": {
                "text": result["revised"]["text"],
                "overall_score": result["revised"]["validation"].overall_score,
                "is_smart": result["revised"]["validation"].is_smart,
            },
            "improvements": result["improvements"],
            "improved_criteria": result["improved_criteria"],
            "declined_criteria": result["declined_criteria"],
            "overall_improved": result["overall_improved"],
        }

    except Exception as e:
        logger.exception(f"Goal comparison failed: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


# =============================================================================
# Batch Processing Endpoint
# =============================================================================

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
