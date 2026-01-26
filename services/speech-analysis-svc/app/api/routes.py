"""
Speech Analysis Service API Routes

Provides REST endpoints for speech analysis
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Request, Form
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# Response Models
class PhonemeSegmentResponse(BaseModel):
    symbol: str
    start_time: float
    end_time: float
    confidence: float
    accuracy_score: float


class ArticulationAssessmentResponse(BaseModel):
    success: bool
    phonemes_detected: List[PhonemeSegmentResponse]
    overall_intelligibility: float
    phoneme_accuracy: dict
    error_patterns: List[str]
    age_appropriate: bool
    recommendations: List[str]
    duration_seconds: float
    words_per_minute: float


class PhonemeNormsResponse(BaseModel):
    age: int
    expected_mastered: List[str]
    currently_developing: List[str]
    later_developing: List[str]


class PhonemeDetectionResponse(BaseModel):
    success: bool
    phonemes: List[PhonemeSegmentResponse]
    duration_seconds: float


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None


# Speech Analysis Endpoints
@router.post("/analyze/speech", response_model=ArticulationAssessmentResponse)
async def analyze_speech(
    request: Request,
    file: UploadFile = File(..., description="Audio file (WAV, MP3)"),
    target_words: Optional[str] = Form(None, description="Comma-separated target words"),
    learner_age: int = Form(6, description="Learner age for developmental norms"),
):
    """
    Analyze speech audio for articulation accuracy
    
    Performs:
    - Phoneme detection and segmentation
    - Articulation scoring against target words
    - Error pattern identification
    - Age-appropriate norm comparison
    - Therapy recommendations
    """
    # Validate file type
    valid_extensions = ['.wav', '.mp3', '.m4a', '.ogg', '.flac']
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"File must be an audio file ({', '.join(valid_extensions)})"
        )
    
    # Check file size (max 50MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    # Parse target words
    words = None
    if target_words:
        words = [w.strip() for w in target_words.split(',') if w.strip()]
    
    try:
        # Get analyzer from app state or create new one
        analyzer = getattr(request.app.state, 'speech_analyzer', None)
        if analyzer is None:
            from ..models.phoneme_model import SpeechAnalyzer
            analyzer = SpeechAnalyzer()
        
        # Analyze speech
        assessment = analyzer.analyze_bytes(
            content,
            target_words=words,
            learner_age=learner_age
        )
        
        return ArticulationAssessmentResponse(
            success=True,
            phonemes_detected=[
                PhonemeSegmentResponse(
                    symbol=p.symbol,
                    start_time=p.start_time,
                    end_time=p.end_time,
                    confidence=p.confidence,
                    accuracy_score=p.accuracy_score,
                )
                for p in assessment.phonemes_detected
            ],
            overall_intelligibility=assessment.overall_intelligibility,
            phoneme_accuracy=assessment.phoneme_accuracy,
            error_patterns=assessment.error_patterns,
            age_appropriate=assessment.age_appropriate,
            recommendations=assessment.recommendations,
            duration_seconds=assessment.duration_seconds,
            words_per_minute=assessment.words_per_minute,
        )
        
    except Exception as e:
        logger.exception(f"Speech analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/phonemes", response_model=PhonemeDetectionResponse)
async def detect_phonemes(
    request: Request,
    file: UploadFile = File(..., description="Audio file to analyze"),
):
    """
    Detect phonemes in audio without scoring
    
    Returns list of detected phonemes with timing and confidence
    """
    content = await file.read()
    
    try:
        analyzer = getattr(request.app.state, 'speech_analyzer', None)
        if analyzer is None:
            from ..models.phoneme_model import SpeechAnalyzer
            analyzer = SpeechAnalyzer()
        
        # Analyze without target words (detection only)
        assessment = analyzer.analyze_bytes(content, target_words=None, learner_age=6)
        
        return PhonemeDetectionResponse(
            success=True,
            phonemes=[
                PhonemeSegmentResponse(
                    symbol=p.symbol,
                    start_time=p.start_time,
                    end_time=p.end_time,
                    confidence=p.confidence,
                    accuracy_score=p.accuracy_score,
                )
                for p in assessment.phonemes_detected
            ],
            duration_seconds=assessment.duration_seconds,
        )
        
    except Exception as e:
        logger.exception(f"Phoneme detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@router.get("/norms/{age}", response_model=PhonemeNormsResponse)
async def get_phoneme_norms(
    request: Request,
    age: int,
):
    """
    Get age-appropriate phoneme developmental norms
    
    Returns phonemes expected to be mastered, currently developing,
    and later developing for the specified age.
    """
    if age < 2 or age > 12:
        raise HTTPException(
            status_code=400, 
            detail="Age must be between 2 and 12"
        )
    
    try:
        analyzer = getattr(request.app.state, 'speech_analyzer', None)
        if analyzer is None:
            from ..models.phoneme_model import SpeechAnalyzer
            analyzer = SpeechAnalyzer()
        
        norms = analyzer.get_phoneme_norms(age)
        
        return PhonemeNormsResponse(
            age=age,
            expected_mastered=norms["expected_mastered"],
            currently_developing=norms["currently_developing"],
            later_developing=norms["later_developing"],
        )
        
    except Exception as e:
        logger.exception(f"Failed to get norms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Phoneme Inventory Endpoint
@router.get("/phonemes")
async def list_phonemes(request: Request):
    """
    List all phonemes recognized by the system
    """
    analyzer = getattr(request.app.state, 'speech_analyzer', None)
    if analyzer is None:
        from ..models.phoneme_model import SpeechAnalyzer
        analyzer = SpeechAnalyzer()
    
    return {
        "total": len(analyzer.phonemes),
        "phonemes": analyzer.phonemes,
        "categories": {
            "plosives": ['p', 'b', 't', 'd', 'k', 'g'],
            "fricatives": ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'],
            "nasals": ['m', 'n', 'ŋ'],
            "approximants": ['l', 'r', 'w', 'j'],
            "vowels": ['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɔ', 'o', 'ʊ', 'u', 'ʌ', 'ə'],
            "diphthongs": ['aɪ', 'aʊ', 'ɔɪ', 'eɪ', 'oʊ'],
            "r_colored": ['ɪr', 'ɛr', 'ʊr', 'ɔr', 'ɑr'],
        }
    }


# Error Patterns Endpoint
@router.get("/error-patterns")
async def list_error_patterns():
    """
    List common speech error patterns and their descriptions
    """
    return {
        "patterns": {
            "fronting": {
                "description": "Back sounds replaced with front sounds",
                "examples": ["/k/ → /t/", "/g/ → /d/"],
                "typical_age_elimination": "3-4 years",
            },
            "stopping": {
                "description": "Fricatives replaced with stops",
                "examples": ["/s/ → /t/", "/f/ → /p/"],
                "typical_age_elimination": "3-5 years",
            },
            "gliding": {
                "description": "Liquids replaced with glides",
                "examples": ["/r/ → /w/", "/l/ → /w/"],
                "typical_age_elimination": "5-7 years",
            },
            "cluster_reduction": {
                "description": "Consonant clusters simplified",
                "examples": ["stop → top", "blue → boo"],
                "typical_age_elimination": "4-5 years",
            },
            "final_consonant_deletion": {
                "description": "Final consonants omitted",
                "examples": ["cat → ca", "dog → do"],
                "typical_age_elimination": "3-4 years",
            },
        }
    }


# Batch Analysis Endpoint
@router.post("/analyze/batch")
async def analyze_batch(
    request: Request,
    files: List[UploadFile] = File(..., description="Audio files to analyze"),
    learner_age: int = Form(6, description="Learner age"),
):
    """
    Analyze multiple audio files in batch
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")
    
    analyzer = getattr(request.app.state, 'speech_analyzer', None)
    if analyzer is None:
        from ..models.phoneme_model import SpeechAnalyzer
        analyzer = SpeechAnalyzer()
    
    results = []
    
    for file in files:
        try:
            content = await file.read()
            assessment = analyzer.analyze_bytes(
                content, 
                target_words=None, 
                learner_age=learner_age
            )
            
            results.append({
                "filename": file.filename,
                "success": True,
                "intelligibility": assessment.overall_intelligibility,
                "phonemes_count": len(assessment.phonemes_detected),
                "error_patterns": assessment.error_patterns,
                "age_appropriate": assessment.age_appropriate,
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
