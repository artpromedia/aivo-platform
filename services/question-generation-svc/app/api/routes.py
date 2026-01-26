"""
API Routes for Question Generation Service.

Defines all REST API endpoints for question generation, MCQ generation,
cloze generation, quality scoring, and other features.
"""

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.schemas import (
    BloomClassifyRequest,
    BloomClassifyResponse,
    BloomLevel,
    DifficultyEstimateRequest,
    DifficultyEstimateResponse,
    GenerateClozeRequest,
    GenerateClozeResponse,
    GenerateDistractorsRequest,
    GenerateDistractorsResponse,
    GenerateMCQRequest,
    GenerateMCQResponse,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GeneratedQuestion,
    MCQItem,
    ClozeItem,
    Distractor,
    QualityScoreRequest,
    QualityScoreResponse,
)
from app.services.generation_pipeline import GenerationPipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["question-generation"])


def get_pipeline(request: Request) -> GenerationPipeline:
    """Dependency to get the generation pipeline from app state."""
    return request.app.state.pipeline


# =============================================================================
# Question Generation Endpoints
# =============================================================================


@router.post(
    "/generate/questions",
    response_model=GenerateQuestionsResponse,
    summary="Generate questions from passage",
    description="Generate assessment questions from educational content using T5-based models.",
)
async def generate_questions(
    request: GenerateQuestionsRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> GenerateQuestionsResponse:
    """Generate questions from a passage."""
    try:
        start_time = time.time()

        result = await pipeline.generate_questions(
            passage=request.passage,
            num_questions=request.num_questions,
            question_types=[qt.value for qt in request.question_types],
            difficulty_target=request.difficulty_target,
            grade_level=request.grade_level,
            include_distractors=request.include_distractors,
        )

        # Convert to response model
        questions = []
        for q in result["questions"]:
            questions.append(
                GeneratedQuestion(
                    question_id=q["question_id"],
                    question_text=q["question_text"],
                    answer=q["answer"],
                    distractors=q.get("distractors"),
                    question_type=q.get("question_type", "factual"),
                    difficulty_estimate=q.get("difficulty_estimate", 0.5),
                    bloom_level=BloomLevel(q.get("bloom_level", "remember")),
                    source_span=q.get("source_span", (0, 0)),
                    confidence=q.get("confidence", 0.7),
                    quality_score=q.get("quality_score"),
                    curriculum_alignment=None,
                )
            )

        return GenerateQuestionsResponse(
            request_id=result["request_id"],
            questions=questions,
            generation_time_ms=result["generation_time_ms"],
            model_version=result["model_version"],
        )

    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Question generation failed",
        )


@router.post(
    "/generate/mcq",
    response_model=GenerateMCQResponse,
    summary="Generate multiple choice questions",
    description="Generate MCQ items with plausible distractors.",
)
async def generate_mcq(
    request: GenerateMCQRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> GenerateMCQResponse:
    """Generate multiple choice questions with distractors."""
    try:
        result = await pipeline.generate_mcq(
            passage=request.passage,
            num_questions=request.num_questions,
            num_distractors=request.num_distractors,
            difficulty_target=request.difficulty_target,
            grade_level=request.grade_level,
            shuffle_options=request.shuffle_options,
        )

        # Convert to response model
        questions = []
        for q in result["questions"]:
            questions.append(
                MCQItem(
                    question_id=q["question_id"],
                    stem=q["stem"],
                    correct_answer=q["correct_answer"],
                    distractors=q.get("distractors", []),
                    options=q.get("options", []),
                    correct_index=q.get("correct_index", 0),
                    difficulty=q.get("difficulty", 0.5),
                    bloom_level=BloomLevel(q.get("bloom_level", "remember")),
                )
            )

        return GenerateMCQResponse(
            request_id=result["request_id"],
            questions=questions,
            generation_time_ms=result["generation_time_ms"],
            model_version=result["model_version"],
        )

    except Exception as e:
        logger.error(f"MCQ generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MCQ generation failed",
        )


@router.post(
    "/generate/cloze",
    response_model=GenerateClozeResponse,
    summary="Generate cloze items",
    description="Generate fill-in-the-blank (cloze) items from text.",
)
async def generate_cloze(
    request: GenerateClozeRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> GenerateClozeResponse:
    """Generate cloze (fill-in-blank) items."""
    try:
        result = await pipeline.generate_cloze(
            passage=request.passage,
            num_items=request.num_items,
            blank_strategy=request.blank_strategy,
            include_hints=request.include_hints,
            grade_level=request.grade_level,
        )

        # Convert to response model
        items = []
        for item in result["items"]:
            items.append(
                ClozeItem(
                    item_id=item["item_id"],
                    text_with_blank=item["text_with_blank"],
                    answer=item["answer"],
                    hint=item.get("hint"),
                    difficulty=item.get("difficulty", 0.5),
                    blank_type=item.get("blank_type", "key_term"),
                    context_sentence=item.get("context_sentence", ""),
                )
            )

        return GenerateClozeResponse(
            request_id=result["request_id"],
            items=items,
            generation_time_ms=result["generation_time_ms"],
            model_version=result["model_version"],
        )

    except Exception as e:
        logger.error(f"Cloze generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloze generation failed",
        )


# =============================================================================
# Distractor Generation
# =============================================================================


@router.post(
    "/generate/distractors",
    response_model=GenerateDistractorsResponse,
    summary="Generate distractors",
    description="Generate plausible wrong answers for MCQ items.",
)
async def generate_distractors(
    request: GenerateDistractorsRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> GenerateDistractorsResponse:
    """Generate distractors for a question."""
    try:
        start_time = time.time()

        distractor_set = pipeline.distractor_generator.generate(
            question=request.question,
            correct_answer=request.correct_answer,
            context=request.context,
            num_distractors=request.num_distractors,
        )

        distractors = [
            Distractor(
                text=d.text,
                similarity_score=d.similarity_score,
                generation_method=d.generation_method,
                quality_score=d.quality_score,
            )
            for d in distractor_set.distractors
        ]

        generation_time_ms = int((time.time() - start_time) * 1000)

        return GenerateDistractorsResponse(
            distractors=distractors,
            generation_time_ms=generation_time_ms,
        )

    except Exception as e:
        logger.error(f"Distractor generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Distractor generation failed",
        )


# =============================================================================
# Quality Scoring
# =============================================================================


@router.post(
    "/quality/score",
    response_model=QualityScoreResponse,
    summary="Score question quality",
    description="Evaluate the quality of a generated question.",
)
async def score_quality(
    request: QualityScoreRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> QualityScoreResponse:
    """Score a question's quality."""
    try:
        result = await pipeline.score_quality(
            question=request.question,
            answer=request.answer,
            passage=request.passage,
            distractors=request.distractors,
        )

        return QualityScoreResponse(
            overall_score=result["overall_score"],
            answerability=result["answerability"],
            fluency=result["fluency"],
            relevance=result["relevance"],
            difficulty_estimate=result["difficulty_estimate"],
            specificity=result["specificity"],
            is_acceptable=result["is_acceptable"],
            issues=result.get("issues", []),
        )

    except Exception as e:
        logger.error(f"Quality scoring error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Quality scoring failed",
        )


# =============================================================================
# Bloom's Classification
# =============================================================================


@router.post(
    "/bloom/classify",
    response_model=BloomClassifyResponse,
    summary="Classify by Bloom's taxonomy",
    description="Classify a question by Bloom's cognitive taxonomy level.",
)
async def classify_bloom(
    request: BloomClassifyRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> BloomClassifyResponse:
    """Classify a question's Bloom's taxonomy level."""
    try:
        result = await pipeline.classify_bloom(request.question)

        return BloomClassifyResponse(
            primary_level=BloomLevel(result["primary_level"]),
            confidence=result["confidence"],
            level_probabilities=result["level_probabilities"],
        )

    except Exception as e:
        logger.error(f"Bloom classification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bloom classification failed",
        )


# =============================================================================
# Difficulty Estimation
# =============================================================================


@router.post(
    "/difficulty/estimate",
    response_model=DifficultyEstimateResponse,
    summary="Estimate question difficulty",
    description="Predict question difficulty before student exposure.",
)
async def estimate_difficulty(
    request: DifficultyEstimateRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> DifficultyEstimateResponse:
    """Estimate question difficulty."""
    try:
        result = await pipeline.estimate_difficulty(
            question=request.question,
            answer=request.answer,
            distractors=request.distractors,
        )

        return DifficultyEstimateResponse(
            difficulty=result["difficulty"],
            confidence=result["confidence"],
            factors=result["factors"],
            estimated_p_correct=result["estimated_p_correct"],
            grade_level_estimate=result.get("grade_level_estimate"),
        )

    except Exception as e:
        logger.error(f"Difficulty estimation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Difficulty estimation failed",
        )


# =============================================================================
# Status & Utility Endpoints
# =============================================================================


@router.get(
    "/status",
    summary="Get pipeline status",
    description="Get the current status of the generation pipeline.",
)
async def get_status(
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
):
    """Get pipeline status."""
    return pipeline.get_status()


@router.post(
    "/cache/clear",
    summary="Clear cache",
    description="Clear the generation cache.",
)
async def clear_cache(
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
):
    """Clear the generation cache."""
    pipeline.clear_cache()
    return {"status": "cache cleared"}
