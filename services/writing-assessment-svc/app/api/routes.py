"""
API Routes for Writing Assessment Service.

Provides endpoints for:
- Full writing assessment
- Grammar checking
- Readability analysis
- Style analysis
- Coherence analysis
- Feedback generation
"""

import logging
import time
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.models.coherence_analyzer import CoherenceAnalyzer
from app.models.essay_scorer import EssayScorer
from app.models.grammar_checker import GrammarChecker
from app.models.readability_profiler import ReadabilityProfiler
from app.models.style_analyzer import StyleAnalyzer
from app.schemas.requests import (
    CoherenceAnalysisRequest,
    CoherenceAnalysisResponse,
    FeedbackRequest,
    FeedbackResponse,
    FullAssessmentRequest,
    FullAssessmentResponse,
    GrammarCheckRequest,
    GrammarCheckResponse,
    ReadabilityRequest,
    ReadabilityResponse,
    StyleAnalysisRequest,
    StyleAnalysisResponse,
)
from app.services.feedback_generator import FeedbackGenerator
from app.services.rubric_mapper import RubricMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["assessment"])

# Global instances (initialized in main.py lifespan)
_essay_scorer: Optional[EssayScorer] = None
_coherence_analyzer: Optional[CoherenceAnalyzer] = None
_grammar_checker: Optional[GrammarChecker] = None
_style_analyzer: Optional[StyleAnalyzer] = None
_readability_profiler: Optional[ReadabilityProfiler] = None
_feedback_generator: Optional[FeedbackGenerator] = None
_rubric_mapper: Optional[RubricMapper] = None

# In-memory assessment cache (for production, use Redis)
_assessment_cache: Dict[str, Dict[str, Any]] = {}


def get_essay_scorer() -> EssayScorer:
    """Dependency to get essay scorer instance."""
    global _essay_scorer
    if _essay_scorer is None:
        _essay_scorer = EssayScorer()
    return _essay_scorer


def get_coherence_analyzer() -> CoherenceAnalyzer:
    """Dependency to get coherence analyzer instance."""
    global _coherence_analyzer
    if _coherence_analyzer is None:
        _coherence_analyzer = CoherenceAnalyzer()
    return _coherence_analyzer


def get_grammar_checker() -> GrammarChecker:
    """Dependency to get grammar checker instance."""
    global _grammar_checker
    if _grammar_checker is None:
        _grammar_checker = GrammarChecker()
    return _grammar_checker


def get_style_analyzer() -> StyleAnalyzer:
    """Dependency to get style analyzer instance."""
    global _style_analyzer
    if _style_analyzer is None:
        _style_analyzer = StyleAnalyzer()
    return _style_analyzer


def get_readability_profiler() -> ReadabilityProfiler:
    """Dependency to get readability profiler instance."""
    global _readability_profiler
    if _readability_profiler is None:
        _readability_profiler = ReadabilityProfiler()
    return _readability_profiler


def get_feedback_generator() -> FeedbackGenerator:
    """Dependency to get feedback generator instance."""
    global _feedback_generator
    if _feedback_generator is None:
        _feedback_generator = FeedbackGenerator()
    return _feedback_generator


def get_rubric_mapper() -> RubricMapper:
    """Dependency to get rubric mapper instance."""
    global _rubric_mapper
    if _rubric_mapper is None:
        _rubric_mapper = RubricMapper()
    return _rubric_mapper


def init_components(settings: Settings) -> None:
    """Initialize all model components."""
    global _essay_scorer, _coherence_analyzer, _grammar_checker
    global _style_analyzer, _readability_profiler
    global _feedback_generator, _rubric_mapper

    logger.info("Initializing writing assessment components...")

    _essay_scorer = EssayScorer()
    _coherence_analyzer = CoherenceAnalyzer(
        model_name=settings.SENTENCE_TRANSFORMER_MODEL,
        device=settings.DEVICE,
    )
    _grammar_checker = GrammarChecker(
        language=settings.LANGUAGE_TOOL_LANGUAGE,
    )
    _style_analyzer = StyleAnalyzer()
    _readability_profiler = ReadabilityProfiler()
    _feedback_generator = FeedbackGenerator()
    _rubric_mapper = RubricMapper()

    logger.info("All components initialized successfully")


# =============================================================================
# Full Assessment Endpoint
# =============================================================================


@router.post(
    "/assess/full",
    response_model=FullAssessmentResponse,
    summary="Complete writing assessment",
    description="Perform comprehensive writing assessment including scoring, grammar, coherence, style, and readability.",
)
async def assess_full(
    request: FullAssessmentRequest,
    settings: Settings = Depends(get_settings),
    essay_scorer: EssayScorer = Depends(get_essay_scorer),
    coherence_analyzer: CoherenceAnalyzer = Depends(get_coherence_analyzer),
    grammar_checker: GrammarChecker = Depends(get_grammar_checker),
    style_analyzer: StyleAnalyzer = Depends(get_style_analyzer),
    readability_profiler: ReadabilityProfiler = Depends(get_readability_profiler),
    feedback_generator: FeedbackGenerator = Depends(get_feedback_generator),
) -> FullAssessmentResponse:
    """Perform complete writing assessment."""
    start_time = time.time()
    assessment_id = str(uuid4())

    try:
        # Validate text length
        if len(request.text) < settings.MIN_TEXT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Text must be at least {settings.MIN_TEXT_LENGTH} characters.",
            )

        if len(request.text) > settings.MAX_TEXT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Text must not exceed {settings.MAX_TEXT_LENGTH} characters.",
            )

        # Score essay
        holistic_score = essay_scorer.score_holistic(request.text, request.prompt)
        trait_scores = essay_scorer.score_traits(request.text, request.prompt)

        # Analyze coherence
        coherence_result = coherence_analyzer.analyze(request.text)

        # Check grammar
        grammar_report = grammar_checker.check(request.text)

        # Analyze style
        style_report = style_analyzer.analyze_style(request.text)

        # Profile readability
        readability_profile = readability_profiler.profile(request.text)

        # Calculate overall score (0-100)
        overall_score = (holistic_score.score / 6) * 100

        # Generate feedback if requested
        feedback = None
        if request.include_feedback:
            assessment_results = {
                "scores": {
                    "overall": overall_score,
                    "holistic": {
                        "score": holistic_score.score,
                        "confidence": holistic_score.confidence,
                    },
                    "traits": {
                        name: {
                            "score": ts.score,
                            "max_score": ts.max_score,
                            "feedback": ts.feedback,
                        }
                        for name, ts in trait_scores.traits.items()
                    },
                },
                "grammar_report": {
                    "errors": [
                        {
                            "offset": e.offset,
                            "length": e.length,
                            "message": e.message,
                            "category": e.category.value,
                            "replacements": e.replacements,
                            "context": e.context,
                        }
                        for e in grammar_report.errors[:10]
                    ],
                    "error_density": grammar_report.error_density,
                    "by_category": grammar_report.by_category,
                },
                "coherence_analysis": {
                    "overall_score": coherence_result.overall_score,
                    "local_coherence": {
                        "coherence_score": coherence_result.local_coherence.coherence_score,
                        "weak_transitions": [
                            {
                                "before_text": wt.before_text,
                                "after_text": wt.after_text,
                                "suggestion": wt.suggestion,
                            }
                            for wt in coherence_result.local_coherence.weak_transitions
                        ],
                    },
                    "global_coherence": {
                        "has_clear_intro": coherence_result.global_coherence.has_clear_intro,
                        "has_clear_conclusion": coherence_result.global_coherence.has_clear_conclusion,
                    },
                },
                "style_report": {
                    "word_variety_score": style_report.word_variety_score,
                    "tone": style_report.tone,
                    "overused_words": [
                        {
                            "word": ow.word,
                            "count": ow.count,
                            "suggestions": ow.suggestions,
                        }
                        for ow in style_report.overused_words
                    ],
                },
                "readability_profile": {
                    "average_grade_level": readability_profile.average_grade_level,
                },
            }

            feedback_result = feedback_generator.generate(
                assessment_results,
                feedback_style=request.include_feedback and "encouraging" or "direct",
                grade_level=request.grade_level,
            )

            from app.schemas.requests import (
                FeedbackPoint as FeedbackPointSchema,
                Suggestion as SuggestionSchema,
                WritingFeedback as WritingFeedbackSchema,
            )

            feedback = WritingFeedbackSchema(
                summary=feedback_result.summary,
                strengths=[
                    FeedbackPointSchema(
                        area=s.area,
                        description=s.description,
                        example_from_text=s.example_from_text,
                    )
                    for s in feedback_result.strengths
                ],
                areas_for_improvement=[
                    FeedbackPointSchema(
                        area=a.area,
                        description=a.description,
                        example_from_text=a.example_from_text,
                    )
                    for a in feedback_result.areas_for_improvement
                ],
                specific_suggestions=[
                    SuggestionSchema(
                        category=s.category,
                        original_text=s.original_text,
                        suggestion=s.suggestion,
                        explanation=s.explanation,
                    )
                    for s in feedback_result.specific_suggestions
                ],
                next_steps=feedback_result.next_steps,
            )

        # Cache assessment for feedback generation
        _assessment_cache[assessment_id] = {
            "text": request.text,
            "scores": trait_scores,
            "grammar": grammar_report,
            "coherence": coherence_result,
            "style": style_report,
            "readability": readability_profile,
        }

        processing_time = int((time.time() - start_time) * 1000)

        # Build response
        from app.schemas.requests import (
            CoherenceAnalysis,
            ComplexityFactor,
            GrammarCategory,
            GrammarError as GrammarErrorSchema,
            GrammarReport as GrammarReportSchema,
            GlobalCoherence,
            HolisticScore as HolisticScoreSchema,
            LocalCoherence,
            OverusedWord as OverusedWordSchema,
            ReadabilityProfile as ReadabilityProfileSchema,
            SentenceStats,
            StyleReport as StyleReportSchema,
            TraitScore as TraitScoreSchema,
            TraitScores as TraitScoresSchema,
            TransitionAnalysis,
            VocabularyLevel,
            WeakTransition as WeakTransitionSchema,
        )

        return FullAssessmentResponse(
            assessment_id=assessment_id,
            overall_score=round(overall_score, 1),
            holistic_score=HolisticScoreSchema(
                score=holistic_score.score,
                confidence=holistic_score.confidence,
                score_distribution=holistic_score.score_distribution,
                comparable_percentile=holistic_score.comparable_percentile,
            ),
            trait_scores=TraitScoresSchema(
                traits={
                    name: TraitScoreSchema(
                        trait_name=ts.trait_name,
                        score=ts.score,
                        max_score=ts.max_score,
                        confidence=ts.confidence,
                        feedback=ts.feedback,
                    )
                    for name, ts in trait_scores.traits.items()
                },
                overall_score=trait_scores.overall_score,
                strengths=trait_scores.strengths,
                weaknesses=trait_scores.weaknesses,
            ),
            grammar_report=GrammarReportSchema(
                errors=[
                    GrammarErrorSchema(
                        offset=e.offset,
                        length=e.length,
                        message=e.message,
                        category=GrammarCategory(e.category.value),
                        rule_id=e.rule_id,
                        replacements=e.replacements,
                        context=e.context,
                    )
                    for e in grammar_report.errors[:20]
                ],
                error_density=grammar_report.error_density,
                by_category=grammar_report.by_category,
                total_errors=grammar_report.total_errors,
                corrected_text=grammar_report.corrected_text,
            ),
            coherence_analysis=CoherenceAnalysis(
                overall_score=coherence_result.overall_score,
                local_coherence=LocalCoherence(
                    coherence_score=coherence_result.local_coherence.coherence_score,
                    sentence_similarities=coherence_result.local_coherence.sentence_similarities,
                    weak_transitions=[
                        WeakTransitionSchema(
                            sentence_index=wt.sentence_index,
                            before_text=wt.before_text,
                            after_text=wt.after_text,
                            suggestion=wt.suggestion,
                        )
                        for wt in coherence_result.local_coherence.weak_transitions
                    ],
                ),
                global_coherence=GlobalCoherence(
                    structure_score=coherence_result.global_coherence.structure_score,
                    has_clear_intro=coherence_result.global_coherence.has_clear_intro,
                    has_clear_conclusion=coherence_result.global_coherence.has_clear_conclusion,
                    paragraph_topics=coherence_result.global_coherence.paragraph_topics,
                    topic_drift_score=coherence_result.global_coherence.topic_drift_score,
                ),
                transition_analysis=TransitionAnalysis(
                    total_transitions=coherence_result.transition_analysis.total_transitions,
                    transition_types=coherence_result.transition_analysis.transition_types,
                    missing_transition_locations=coherence_result.transition_analysis.missing_transition_locations,
                    suggested_transitions=coherence_result.transition_analysis.suggested_transitions,
                ),
            ),
            style_report=StyleReportSchema(
                sentence_length_stats=SentenceStats(
                    mean=style_report.sentence_length_stats.mean,
                    std=style_report.sentence_length_stats.std,
                    min=style_report.sentence_length_stats.min,
                    max=style_report.sentence_length_stats.max,
                ),
                sentence_type_distribution=style_report.sentence_type_distribution,
                vocabulary_level=VocabularyLevel(
                    average_word_length=style_report.vocabulary_level.average_word_length,
                    awl_coverage=style_report.vocabulary_level.awl_coverage,
                    rare_word_percentage=style_report.vocabulary_level.rare_word_percentage,
                    grade_level_estimate=style_report.vocabulary_level.grade_level_estimate,
                ),
                voice_ratio=style_report.voice_ratio,
                tone=style_report.tone,
                word_variety_score=style_report.word_variety_score,
                overused_words=[
                    OverusedWordSchema(
                        word=ow.word,
                        count=ow.count,
                        percentage=ow.percentage,
                        suggestions=ow.suggestions,
                    )
                    for ow in style_report.overused_words
                ],
                sophisticated_words_used=style_report.sophisticated_words_used,
            ),
            readability_profile=ReadabilityProfileSchema(
                flesch_kincaid_grade=readability_profile.flesch_kincaid_grade,
                flesch_reading_ease=readability_profile.flesch_reading_ease,
                gunning_fog=readability_profile.gunning_fog,
                smog_index=readability_profile.smog_index,
                coleman_liau=readability_profile.coleman_liau,
                ari=readability_profile.ari,
                dale_chall=readability_profile.dale_chall,
                average_grade_level=readability_profile.average_grade_level,
                target_audience=readability_profile.target_audience,
                complexity_factors=[
                    ComplexityFactor(
                        factor=cf.factor,
                        value=cf.value,
                        impact=cf.impact,
                        description=cf.description,
                    )
                    for cf in readability_profile.complexity_factors
                ],
            ),
            feedback=feedback,
            processing_time_ms=processing_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment failed: {str(e)}",
        )


# =============================================================================
# Grammar Check Endpoint
# =============================================================================


@router.post(
    "/assess/grammar",
    response_model=GrammarCheckResponse,
    summary="Grammar-only check",
    description="Fast grammar and spelling check without full assessment.",
)
async def check_grammar(
    request: GrammarCheckRequest,
    grammar_checker: GrammarChecker = Depends(get_grammar_checker),
) -> GrammarCheckResponse:
    """Check grammar and spelling only."""
    start_time = time.time()

    try:
        report = grammar_checker.check(
            request.text,
            include_style=request.include_style,
            auto_correct=request.auto_correct,
        )

        from app.schemas.requests import (
            GrammarCategory,
            GrammarError as GrammarErrorSchema,
            GrammarReport as GrammarReportSchema,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return GrammarCheckResponse(
            report=GrammarReportSchema(
                errors=[
                    GrammarErrorSchema(
                        offset=e.offset,
                        length=e.length,
                        message=e.message,
                        category=GrammarCategory(e.category.value),
                        rule_id=e.rule_id,
                        replacements=e.replacements,
                        context=e.context,
                    )
                    for e in report.errors
                ],
                error_density=report.error_density,
                by_category=report.by_category,
                total_errors=report.total_errors,
                corrected_text=report.corrected_text,
            ),
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Grammar check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grammar check failed: {str(e)}",
        )


# =============================================================================
# Readability Endpoint
# =============================================================================


@router.post(
    "/assess/readability",
    response_model=ReadabilityResponse,
    summary="Readability-only analysis",
    description="Analyze text readability with multiple metrics.",
)
async def analyze_readability(
    request: ReadabilityRequest,
    readability_profiler: ReadabilityProfiler = Depends(get_readability_profiler),
) -> ReadabilityResponse:
    """Analyze readability only."""
    start_time = time.time()

    try:
        profile = readability_profiler.profile(request.text)

        comparison = None
        if request.target_grade:
            comparison = readability_profiler.compare_to_target(
                profile, request.target_grade
            )

        from app.schemas.requests import (
            ComplexityFactor,
            ReadabilityProfile as ReadabilityProfileSchema,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ReadabilityResponse(
            profile=ReadabilityProfileSchema(
                flesch_kincaid_grade=profile.flesch_kincaid_grade,
                flesch_reading_ease=profile.flesch_reading_ease,
                gunning_fog=profile.gunning_fog,
                smog_index=profile.smog_index,
                coleman_liau=profile.coleman_liau,
                ari=profile.ari,
                dale_chall=profile.dale_chall,
                average_grade_level=profile.average_grade_level,
                target_audience=profile.target_audience,
                complexity_factors=[
                    ComplexityFactor(
                        factor=cf.factor,
                        value=cf.value,
                        impact=cf.impact,
                        description=cf.description,
                    )
                    for cf in profile.complexity_factors
                ],
            ),
            comparison_to_target=comparison,
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Readability analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Readability analysis failed: {str(e)}",
        )


# =============================================================================
# Style Analysis Endpoint
# =============================================================================


@router.post(
    "/assess/style",
    response_model=StyleAnalysisResponse,
    summary="Style-only analysis",
    description="Analyze writing style characteristics.",
)
async def analyze_style(
    request: StyleAnalysisRequest,
    style_analyzer: StyleAnalyzer = Depends(get_style_analyzer),
) -> StyleAnalysisResponse:
    """Analyze writing style only."""
    start_time = time.time()

    try:
        report = style_analyzer.analyze_style(request.text)
        suggestions = style_analyzer.suggest_improvements(
            report, request.target_style or "academic"
        )

        from app.schemas.requests import (
            OverusedWord as OverusedWordSchema,
            SentenceStats,
            StyleReport as StyleReportSchema,
            VocabularyLevel,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return StyleAnalysisResponse(
            report=StyleReportSchema(
                sentence_length_stats=SentenceStats(
                    mean=report.sentence_length_stats.mean,
                    std=report.sentence_length_stats.std,
                    min=report.sentence_length_stats.min,
                    max=report.sentence_length_stats.max,
                ),
                sentence_type_distribution=report.sentence_type_distribution,
                vocabulary_level=VocabularyLevel(
                    average_word_length=report.vocabulary_level.average_word_length,
                    awl_coverage=report.vocabulary_level.awl_coverage,
                    rare_word_percentage=report.vocabulary_level.rare_word_percentage,
                    grade_level_estimate=report.vocabulary_level.grade_level_estimate,
                ),
                voice_ratio=report.voice_ratio,
                tone=report.tone,
                word_variety_score=report.word_variety_score,
                overused_words=[
                    OverusedWordSchema(
                        word=ow.word,
                        count=ow.count,
                        percentage=ow.percentage,
                        suggestions=ow.suggestions,
                    )
                    for ow in report.overused_words
                ],
                sophisticated_words_used=report.sophisticated_words_used,
            ),
            suggestions=suggestions,
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Style analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Style analysis failed: {str(e)}",
        )


# =============================================================================
# Coherence Analysis Endpoint
# =============================================================================


@router.post(
    "/assess/coherence",
    response_model=CoherenceAnalysisResponse,
    summary="Coherence-only analysis",
    description="Analyze text coherence and logical flow.",
)
async def analyze_coherence(
    request: CoherenceAnalysisRequest,
    coherence_analyzer: CoherenceAnalyzer = Depends(get_coherence_analyzer),
) -> CoherenceAnalysisResponse:
    """Analyze coherence only."""
    start_time = time.time()

    try:
        result = coherence_analyzer.analyze(request.text)

        from app.schemas.requests import (
            CoherenceAnalysis,
            GlobalCoherence,
            LocalCoherence,
            TransitionAnalysis,
            WeakTransition as WeakTransitionSchema,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return CoherenceAnalysisResponse(
            analysis=CoherenceAnalysis(
                overall_score=result.overall_score,
                local_coherence=LocalCoherence(
                    coherence_score=result.local_coherence.coherence_score,
                    sentence_similarities=result.local_coherence.sentence_similarities,
                    weak_transitions=[
                        WeakTransitionSchema(
                            sentence_index=wt.sentence_index,
                            before_text=wt.before_text,
                            after_text=wt.after_text,
                            suggestion=wt.suggestion,
                        )
                        for wt in result.local_coherence.weak_transitions
                    ],
                ),
                global_coherence=GlobalCoherence(
                    structure_score=result.global_coherence.structure_score,
                    has_clear_intro=result.global_coherence.has_clear_intro,
                    has_clear_conclusion=result.global_coherence.has_clear_conclusion,
                    paragraph_topics=result.global_coherence.paragraph_topics,
                    topic_drift_score=result.global_coherence.topic_drift_score,
                ),
                transition_analysis=TransitionAnalysis(
                    total_transitions=result.transition_analysis.total_transitions,
                    transition_types=result.transition_analysis.transition_types,
                    missing_transition_locations=result.transition_analysis.missing_transition_locations,
                    suggested_transitions=result.transition_analysis.suggested_transitions,
                ),
            ),
            suggestions=result.suggestions if request.include_suggestions else [],
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Coherence analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Coherence analysis failed: {str(e)}",
        )


# =============================================================================
# Feedback Generation Endpoint
# =============================================================================


@router.post(
    "/feedback/generate",
    response_model=FeedbackResponse,
    summary="Generate constructive feedback",
    description="Generate detailed feedback based on a previous assessment.",
)
async def generate_feedback(
    request: FeedbackRequest,
    feedback_generator: FeedbackGenerator = Depends(get_feedback_generator),
) -> FeedbackResponse:
    """Generate feedback from previous assessment."""
    start_time = time.time()

    try:
        # Get cached assessment
        cached = _assessment_cache.get(request.assessment_id)
        if not cached:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment {request.assessment_id} not found. Perform a full assessment first.",
            )

        # Build assessment results from cache
        assessment_results = {
            "scores": {
                "overall": 0,
                "holistic": {"score": 0},
                "traits": {},
            },
            "grammar_report": {
                "errors": [],
                "error_density": cached.get("grammar", {}).error_density
                if hasattr(cached.get("grammar", {}), "error_density")
                else 0,
                "by_category": {},
            },
            "coherence_analysis": {
                "overall_score": cached.get("coherence", {}).overall_score
                if hasattr(cached.get("coherence", {}), "overall_score")
                else 0,
                "local_coherence": {"weak_transitions": []},
                "global_coherence": {
                    "has_clear_intro": True,
                    "has_clear_conclusion": True,
                },
            },
            "style_report": {
                "word_variety_score": cached.get("style", {}).word_variety_score
                if hasattr(cached.get("style", {}), "word_variety_score")
                else 0,
                "tone": "neutral",
                "overused_words": [],
            },
        }

        result = feedback_generator.generate(
            assessment_results,
            feedback_style=request.feedback_style.value,
            focus_areas=request.focus_areas,
            max_suggestions=request.max_suggestions,
        )

        from app.schemas.requests import (
            FeedbackPoint as FeedbackPointSchema,
            Suggestion as SuggestionSchema,
            WritingFeedback as WritingFeedbackSchema,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return FeedbackResponse(
            feedback=WritingFeedbackSchema(
                summary=result.summary,
                strengths=[
                    FeedbackPointSchema(
                        area=s.area,
                        description=s.description,
                        example_from_text=s.example_from_text,
                    )
                    for s in result.strengths
                ],
                areas_for_improvement=[
                    FeedbackPointSchema(
                        area=a.area,
                        description=a.description,
                        example_from_text=a.example_from_text,
                    )
                    for a in result.areas_for_improvement
                ],
                specific_suggestions=[
                    SuggestionSchema(
                        category=s.category,
                        original_text=s.original_text,
                        suggestion=s.suggestion,
                        explanation=s.explanation,
                    )
                    for s in result.specific_suggestions
                ],
                next_steps=result.next_steps,
            ),
            processing_time_ms=processing_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feedback generation failed: {str(e)}",
        )
