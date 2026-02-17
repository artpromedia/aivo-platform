"""
Speech Analysis Service API Routes

Provides REST endpoints for speech analysis:
- Phoneme recognition and articulation assessment
- Reading fluency analysis with prosody scoring
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Request, Form
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Fluency Analysis Response Models
# ============================================================================

class ProsodyFeaturesResponse(BaseModel):
    """Prosody features from fluency analysis"""
    pitch_mean: float = Field(..., description="Mean pitch in Hz")
    pitch_std: float = Field(..., description="Pitch standard deviation")
    pitch_range: float = Field(..., description="Pitch range in Hz")
    energy_mean: float = Field(..., description="Mean energy/loudness")
    energy_std: float = Field(..., description="Energy variation")
    speech_rate: float = Field(..., description="Syllables per second")
    pause_rate: float = Field(..., description="Pauses per minute")
    mean_pause_duration: float = Field(..., description="Average pause length in seconds")
    intonation_contour: List[float] = Field(default_factory=list, description="Pitch contour samples")


class ErrorAnalysisResponse(BaseModel):
    """Error analysis from fluency assessment"""
    substitutions: List[dict] = Field(default_factory=list, description="Word substitutions")
    omissions: List[str] = Field(default_factory=list, description="Omitted words")
    insertions: List[str] = Field(default_factory=list, description="Inserted words")
    repetitions: List[str] = Field(default_factory=list, description="Repeated words")
    self_corrections: List[str] = Field(default_factory=list, description="Self-corrected errors")


class FluencySegmentResponse(BaseModel):
    """Segment-level fluency data"""
    start_time: float
    end_time: float
    words: List[str]
    wpm: float
    accuracy: float
    prosody_score: float
    pauses: List[dict]


class FluencyAssessmentResponse(BaseModel):
    """Complete fluency assessment response"""
    success: bool = True
    
    # Core metrics
    words_per_minute: float = Field(..., description="Reading rate (WPM)")
    words_correct_per_minute: float = Field(..., description="Accuracy-adjusted rate (WCPM)")
    accuracy_rate: float = Field(..., description="Percentage of words read correctly")
    
    # Prosody scores (NAEP 0-4 scale)
    prosody_score: float = Field(..., ge=0, le=4, description="Overall prosody (NAEP 0-4)")
    expression_score: float = Field(..., ge=0, le=4, description="Expression/volume")
    phrasing_score: float = Field(..., ge=0, le=4, description="Phrasing")
    smoothness_score: float = Field(..., ge=0, le=4, description="Smoothness")
    pace_score: float = Field(..., ge=0, le=4, description="Pace")
    
    # NAEP fluency level
    naep_level: int = Field(..., ge=1, le=4, description="NAEP Oral Reading Fluency level")
    naep_description: str = Field(..., description="NAEP level description")
    
    # Norm comparison
    grade_level: Optional[int] = Field(None, description="Grade level for comparison")
    percentile: Optional[int] = Field(None, description="Percentile vs grade norms")
    benchmark_status: Optional[str] = Field(None, description="Above/At/Below benchmark")
    
    # Detailed analysis
    prosody_features: ProsodyFeaturesResponse
    error_analysis: ErrorAnalysisResponse
    segments: List[FluencySegmentResponse] = Field(default_factory=list)
    
    # Metadata
    duration_seconds: float
    total_words: int
    words_correct: int
    
    # Recommendations
    recommendations: List[str] = Field(default_factory=list)


class FluencyNormsResponse(BaseModel):
    """Grade-level fluency norms"""
    grade: int
    season: str
    wcpm_10th: int = Field(..., description="10th percentile WCPM")
    wcpm_25th: int = Field(..., description="25th percentile WCPM")
    wcpm_50th: int = Field(..., description="50th percentile (median) WCPM")
    wcpm_75th: int = Field(..., description="75th percentile WCPM")
    wcpm_90th: int = Field(..., description="90th percentile WCPM")
    benchmark_below: int = Field(..., description="Below benchmark threshold")
    benchmark_at: int = Field(..., description="At benchmark threshold")


# ============================================================================
# Fluency Analysis Endpoints
# ============================================================================

def _get_fluency_analyzer(request: Request):
    """Get fluency analyzer from app state or create new one"""
    analyzer = getattr(request.app.state, 'fluency_analyzer', None)
    if analyzer is None:
        from ..models.fluency import FluencyAnalyzer
        analyzer = FluencyAnalyzer()
    return analyzer


@router.post("/fluency/analyze", response_model=FluencyAssessmentResponse)
async def analyze_fluency(
    request: Request,
    file: UploadFile = File(..., description="Audio file of oral reading"),
    reference_text: str = Form(..., description="The text that should be read"),
    grade_level: Optional[int] = Form(None, description="Grade level for norm comparison (1-8)"),
    season: Optional[str] = Form("spring", description="Season for norms: fall, winter, spring"),
):
    """
    Analyze reading fluency from audio recording
    
    Performs comprehensive fluency assessment including:
    - Words per minute (WPM) and words correct per minute (WCPM)
    - Accuracy rate
    - Prosody scoring on NAEP Oral Reading Fluency Scale (0-4)
    - Error analysis (substitutions, omissions, insertions)
    - Grade-level norm comparison (Hasbrouck & Tindal norms)
    - Personalized recommendations
    
    The NAEP scale evaluates:
    - Level 1: Word-by-word reading
    - Level 2: Two-word phrase reading
    - Level 3: Phrase reading with some expression
    - Level 4: Fluent reading with expression
    """
    # Validate file type
    valid_extensions = ['.wav', '.mp3', '.m4a', '.ogg', '.flac']
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"File must be an audio file ({', '.join(valid_extensions)})"
        )
    
    # Check file size (max 100MB for longer readings)
    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 100MB limit")
    
    # Validate grade level
    if grade_level is not None and (grade_level < 1 or grade_level > 8):
        raise HTTPException(status_code=400, detail="Grade level must be between 1 and 8")
    
    # Validate season
    valid_seasons = ['fall', 'winter', 'spring']
    if season not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"Season must be one of: {valid_seasons}")
    
    try:
        analyzer = _get_fluency_analyzer(request)
        
        # Perform fluency analysis
        assessment = analyzer.analyze_fluency(
            audio_data=content,
            reference_text=reference_text,
            grade_level=grade_level,
            season=season,
        )
        
        return FluencyAssessmentResponse(
            success=True,
            words_per_minute=assessment.words_per_minute,
            words_correct_per_minute=assessment.words_correct_per_minute,
            accuracy_rate=assessment.accuracy_rate,
            prosody_score=assessment.prosody_score,
            expression_score=assessment.expression_score,
            phrasing_score=assessment.phrasing_score,
            smoothness_score=assessment.smoothness_score,
            pace_score=assessment.pace_score,
            naep_level=assessment.naep_level,
            naep_description=assessment.naep_description,
            grade_level=assessment.grade_level,
            percentile=assessment.percentile,
            benchmark_status=assessment.benchmark_status,
            prosody_features=ProsodyFeaturesResponse(
                pitch_mean=assessment.prosody_features.pitch_mean,
                pitch_std=assessment.prosody_features.pitch_std,
                pitch_range=assessment.prosody_features.pitch_range,
                energy_mean=assessment.prosody_features.energy_mean,
                energy_std=assessment.prosody_features.energy_std,
                speech_rate=assessment.prosody_features.speech_rate,
                pause_rate=assessment.prosody_features.pause_rate,
                mean_pause_duration=assessment.prosody_features.mean_pause_duration,
                intonation_contour=assessment.prosody_features.intonation_contour[:50],  # Limit size
            ),
            error_analysis=ErrorAnalysisResponse(
                substitutions=assessment.error_analysis.substitutions,
                omissions=assessment.error_analysis.omissions,
                insertions=assessment.error_analysis.insertions,
                repetitions=assessment.error_analysis.repetitions,
                self_corrections=assessment.error_analysis.self_corrections,
            ),
            segments=[
                FluencySegmentResponse(
                    start_time=seg.start_time,
                    end_time=seg.end_time,
                    words=seg.words,
                    wpm=seg.wpm,
                    accuracy=seg.accuracy,
                    prosody_score=seg.prosody_score,
                    pauses=seg.pauses,
                )
                for seg in assessment.segments[:20]  # Limit segments
            ],
            duration_seconds=assessment.duration_seconds,
            total_words=assessment.total_words,
            words_correct=assessment.words_correct,
            recommendations=assessment.recommendations,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Fluency analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/fluency/norms/{grade}", response_model=FluencyNormsResponse)
async def get_fluency_norms(
    request: Request,
    grade: int,
    season: str = Query("spring", description="Season: fall, winter, spring"),
):
    """
    Get Hasbrouck & Tindal fluency norms for a grade level
    
    Returns WCPM percentiles (10th, 25th, 50th, 75th, 90th) and
    benchmark thresholds for the specified grade and season.
    """
    if grade < 1 or grade > 8:
        raise HTTPException(status_code=400, detail="Grade must be between 1 and 8")
    
    valid_seasons = ['fall', 'winter', 'spring']
    if season not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"Season must be one of: {valid_seasons}")
    
    try:
        analyzer = _get_fluency_analyzer(request)
        norms = analyzer.get_grade_norms(grade, season)
        
        return FluencyNormsResponse(
            grade=grade,
            season=season,
            wcpm_10th=norms['10th'],
            wcpm_25th=norms['25th'],
            wcpm_50th=norms['50th'],
            wcpm_75th=norms['75th'],
            wcpm_90th=norms['90th'],
            benchmark_below=norms['benchmark_below'],
            benchmark_at=norms['benchmark_at'],
        )
        
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Norms not available for grade {grade}")
    except Exception as e:
        logger.exception(f"Failed to get fluency norms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fluency/compare")
async def compare_to_norms(
    request: Request,
    wcpm: float = Form(..., description="Words correct per minute"),
    grade: int = Form(..., description="Grade level (1-8)"),
    season: str = Form("spring", description="Season: fall, winter, spring"),
):
    """
    Compare a WCPM score to grade-level norms
    
    Returns percentile ranking and benchmark status without
    needing to perform full audio analysis.
    """
    if grade < 1 or grade > 8:
        raise HTTPException(status_code=400, detail="Grade must be between 1 and 8")
    
    try:
        analyzer = _get_fluency_analyzer(request)
        result = analyzer.compare_to_norms(wcpm, grade, season)
        
        return {
            "wcpm": wcpm,
            "grade": grade,
            "season": season,
            "percentile": result['percentile'],
            "benchmark_status": result['benchmark_status'],
            "norms": result['norms'],
        }
        
    except Exception as e:
        logger.exception(f"Norm comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fluency/batch")
async def analyze_fluency_batch(
    request: Request,
    files: List[UploadFile] = File(..., description="Audio files to analyze"),
    reference_texts: str = Form(..., description="JSON array of reference texts"),
    grade_level: Optional[int] = Form(None, description="Grade level for norm comparison"),
):
    """
    Analyze multiple reading samples in batch
    
    Accepts up to 10 audio files with corresponding reference texts.
    Returns summary statistics across all samples.
    """
    import json
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")
    
    try:
        texts = json.loads(reference_texts)
        if len(texts) != len(files):
            raise HTTPException(
                status_code=400,
                detail=f"Number of reference texts ({len(texts)}) must match number of files ({len(files)})"
            )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="reference_texts must be valid JSON array")
    
    analyzer = _get_fluency_analyzer(request)
    results = []
    
    for file, text in zip(files, texts):
        try:
            content = await file.read()
            assessment = analyzer.analyze_fluency(
                audio_data=content,
                reference_text=text,
                grade_level=grade_level,
            )
            
            results.append({
                "filename": file.filename,
                "success": True,
                "wcpm": assessment.words_correct_per_minute,
                "accuracy": assessment.accuracy_rate,
                "prosody_score": assessment.prosody_score,
                "naep_level": assessment.naep_level,
                "percentile": assessment.percentile,
                "benchmark_status": assessment.benchmark_status,
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
            })
    
    # Calculate aggregate statistics
    successful = [r for r in results if r.get("success")]
    
    return {
        "total": len(files),
        "successful": len(successful),
        "failed": len(results) - len(successful),
        "aggregate": {
            "mean_wcpm": sum(r["wcpm"] for r in successful) / len(successful) if successful else 0,
            "mean_accuracy": sum(r["accuracy"] for r in successful) / len(successful) if successful else 0,
            "mean_prosody": sum(r["prosody_score"] for r in successful) / len(successful) if successful else 0,
        },
        "results": results,
    }


@router.get("/fluency/naep-scale")
async def get_naep_scale():
    """
    Get NAEP Oral Reading Fluency Scale descriptions
    
    Returns the four-level rubric used to assess prosody and expression
    in oral reading fluency assessment.
    """
    return {
        "scale": "NAEP Oral Reading Fluency Scale",
        "levels": {
            1: {
                "name": "Level 1 - Word-by-Word",
                "description": "Reads primarily word-by-word. Occasional two-word or three-word phrases may occur, but these are infrequent and/or they do not preserve meaningful syntax.",
                "characteristics": [
                    "Monotone voice",
                    "Little sense of phrase boundaries",
                    "No expressive interpretation",
                    "Frequent hesitations and repetitions",
                ],
            },
            2: {
                "name": "Level 2 - Two-Word Phrases",
                "description": "Reads primarily in two-word phrases with some three- or four-word groupings. Some word-by-word reading may be present. Word groupings may seem awkward and unrelated to larger context of sentence or passage.",
                "characteristics": [
                    "Some phrase boundaries observed",
                    "Limited expression",
                    "Occasional attention to punctuation",
                    "Some hesitations but reading moves forward",
                ],
            },
            3: {
                "name": "Level 3 - Phrase Reading",
                "description": "Reads primarily in three- or four-word phrase groups. Some smaller groupings may be present. However, the majority of phrasing seems appropriate and preserves the syntax of the author.",
                "characteristics": [
                    "Appropriate phrasing most of the time",
                    "Some expression",
                    "Attention to punctuation",
                    "Reading is smooth with few breaks",
                ],
            },
            4: {
                "name": "Level 4 - Fluent Reading",
                "description": "Reads primarily in larger, meaningful phrase groups. Although some regressions, repetitions, and deviations from text may be present, these do not appear to detract from the overall structure of the story. Preservation of the author's syntax is consistent.",
                "characteristics": [
                    "Expressive interpretation",
                    "Appropriate stress and intonation",
                    "Smooth, effortless reading",
                    "Natural conversational pace",
                ],
            },
        },
        "scoring_notes": [
            "Score represents overall reading behavior, not every utterance",
            "Consider the majority of reading performance",
            "Half-point scores (e.g., 2.5) may be used for borderline cases",
        ],
    }


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


# ============================================================================
# Transcription Response Model
# ============================================================================

class TranscriptionResponse(BaseModel):
    """Speech-to-text transcription result"""
    success: bool = True
    text: str = Field(..., description="Transcribed text from audio")
    language: Optional[str] = Field(None, description="Detected language code")
    duration_seconds: float = Field(..., description="Audio duration in seconds")
    confidence: float = Field(0.0, ge=0, le=1, description="Overall transcription confidence")
    segments: List[dict] = Field(default_factory=list, description="Time-aligned segments")


# ============================================================================
# Transcription Endpoint
# ============================================================================

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file (WAV, MP3, WebM, OGG, FLAC, M4A)"),
    language: Optional[str] = Form(None, description="Language hint (ISO 639-1 code, e.g. 'en'). Auto-detected if omitted."),
):
    """
    Transcribe speech audio to text using Whisper.

    Accepts common audio formats and returns the transcribed text along with
    timing metadata. Used by the teacher IEP voice-note feature to convert
    recorded observations into editable text.
    """
    valid_extensions = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.webm']
    filename_lower = (file.filename or "audio.webm").lower()
    if not any(filename_lower.endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Accepted: {', '.join(valid_extensions)}"
        )

    try:
        import tempfile, os, time
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        if len(content) > 25 * 1024 * 1024:  # 25 MB limit
            raise HTTPException(status_code=400, detail="Audio file exceeds 25 MB limit")

        # Write to temp file — Whisper requires a file path
        suffix = os.path.splitext(filename_lower)[1] or '.webm'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        start_time = time.time()

        try:
            import whisper  # type: ignore[import-untyped]

            model_name = os.environ.get("WHISPER_MODEL", "base")
            model = whisper.load_model(model_name)

            transcribe_opts: dict = {"fp16": False}
            if language:
                transcribe_opts["language"] = language

            result = model.transcribe(tmp_path, **transcribe_opts)

            duration = time.time() - start_time
            text: str = result.get("text", "").strip()
            detected_language: str = result.get("language", language or "en")

            # Build segments list
            segments = []
            total_confidence = 0.0
            raw_segments = result.get("segments", [])
            for seg in raw_segments:
                segments.append({
                    "start": round(seg.get("start", 0), 2),
                    "end": round(seg.get("end", 0), 2),
                    "text": seg.get("text", "").strip(),
                })
                # avg_logprob is negative; convert to 0-1 confidence
                avg_logprob = seg.get("avg_logprob", -1.0)
                import math
                total_confidence += math.exp(avg_logprob)

            avg_confidence = (total_confidence / len(raw_segments)) if raw_segments else 0.0

            # Estimate audio duration from last segment end time
            audio_duration = raw_segments[-1]["end"] if raw_segments else 0.0

            logger.info(
                "Transcription completed",
                extra={
                    "duration_seconds": round(audio_duration, 2),
                    "processing_time": round(duration, 2),
                    "text_length": len(text),
                    "language": detected_language,
                },
            )

            return TranscriptionResponse(
                success=True,
                text=text,
                language=detected_language,
                duration_seconds=round(audio_duration, 2),
                confidence=round(avg_confidence, 3),
                segments=segments,
            )
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

