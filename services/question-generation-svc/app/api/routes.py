"""
API Routes for Question Generation Service.

Defines all REST API endpoints for question generation, MCQ generation,
cloze generation, quality scoring, and other features.
"""

import logging
import time
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

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
    # New Sprint 2 schemas
    BatchGenerateRequest,
    BatchGenerateResponse,
    PassageQuestions,
    ModelsStatusResponse,
    ModelStatus,
    CurriculumGenerateRequest,
    CurriculumGenerateResponse,
    AsyncGenerateRequest,
    AsyncGenerateResponse,
    JobStatus,
    JobStatusResponse,
    JobResultResponse,
    AlignToStandardsRequest,
    AlignToStandardsResponse,
    AlignedQuestionItem,
    StandardAlignmentItem,
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


# =============================================================================
# Batch Generation Endpoints
# =============================================================================


@router.post(
    "/generate/batch",
    response_model=BatchGenerateResponse,
    summary="Batch generate questions",
    description="Generate questions from multiple passages in a single request.",
)
async def generate_batch(
    request: BatchGenerateRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> BatchGenerateResponse:
    """Batch generate questions from multiple passages."""
    try:
        start_time = time.time()

        results = []
        total_questions = 0
        successful = 0
        failed = 0

        for passage_input in request.passages:
            try:
                result = await pipeline.generate_questions(
                    passage=passage_input.text,
                    num_questions=request.questions_per_passage,
                    question_types=[qt.value for qt in request.question_types],
                    difficulty_target=request.difficulty_target,
                    grade_level=passage_input.grade_level,
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

                results.append(
                    PassageQuestions(
                        passage_id=passage_input.passage_id,
                        questions=questions,
                        success=True,
                    )
                )
                total_questions += len(questions)
                successful += 1

            except Exception as e:
                logger.warning(f"Failed to generate for passage {passage_input.passage_id}: {e}")
                results.append(
                    PassageQuestions(
                        passage_id=passage_input.passage_id,
                        questions=[],
                        success=False,
                        error=str(e),
                    )
                )
                failed += 1

        generation_time_ms = int((time.time() - start_time) * 1000)

        return BatchGenerateResponse(
            results=results,
            total_questions=total_questions,
            successful_passages=successful,
            failed_passages=failed,
            generation_time_ms=generation_time_ms,
        )

    except Exception as e:
        logger.error(f"Batch generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch generation failed",
        )


# =============================================================================
# Model Status Endpoint
# =============================================================================


@router.get(
    "/models/status",
    response_model=ModelsStatusResponse,
    summary="Get models status",
    description="Get the status of all loaded ML models.",
)
async def get_models_status(
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> ModelsStatusResponse:
    """Get status of all ML models."""
    try:
        status_info = pipeline.get_models_status()

        return ModelsStatusResponse(
            question_generator=ModelStatus(
                loaded=status_info.get("question_generator", {}).get("loaded", False),
                model_name=status_info.get("question_generator", {}).get("model_name", "unknown"),
                device=status_info.get("question_generator", {}).get("device", "cpu"),
                memory_mb=status_info.get("question_generator", {}).get("memory_mb", 0.0),
                last_inference_ms=status_info.get("question_generator", {}).get("last_inference_ms"),
            ),
            distractor_generator=ModelStatus(
                loaded=status_info.get("distractor_generator", {}).get("loaded", False),
                model_name=status_info.get("distractor_generator", {}).get("model_name", "unknown"),
                device=status_info.get("distractor_generator", {}).get("device", "cpu"),
                memory_mb=status_info.get("distractor_generator", {}).get("memory_mb", 0.0),
                last_inference_ms=status_info.get("distractor_generator", {}).get("last_inference_ms"),
            ),
            bloom_classifier=ModelStatus(
                loaded=status_info.get("bloom_classifier", {}).get("loaded", True),
                model_name=status_info.get("bloom_classifier", {}).get("model_name", "keyword-based"),
                device=status_info.get("bloom_classifier", {}).get("device", "cpu"),
                memory_mb=status_info.get("bloom_classifier", {}).get("memory_mb", 0.0),
                last_inference_ms=status_info.get("bloom_classifier", {}).get("last_inference_ms"),
            ),
            difficulty_estimator=ModelStatus(
                loaded=status_info.get("difficulty_estimator", {}).get("loaded", True),
                model_name=status_info.get("difficulty_estimator", {}).get("model_name", "heuristic"),
                device=status_info.get("difficulty_estimator", {}).get("device", "cpu"),
                memory_mb=status_info.get("difficulty_estimator", {}).get("memory_mb", 0.0),
                last_inference_ms=status_info.get("difficulty_estimator", {}).get("last_inference_ms"),
            ),
            total_memory_mb=status_info.get("total_memory_mb", 0.0),
        )

    except Exception as e:
        logger.error(f"Models status error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get models status",
        )


# =============================================================================
# Curriculum-Based Generation
# =============================================================================


@router.post(
    "/generate/from-curriculum",
    response_model=CurriculumGenerateResponse,
    summary="Generate from curriculum",
    description="Generate questions based on curriculum objectives and Bloom's level distribution.",
)
async def generate_from_curriculum(
    request: CurriculumGenerateRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> CurriculumGenerateResponse:
    """Generate questions from curriculum learning objectives."""
    try:
        start_time = time.time()

        result = await pipeline.generate_from_curriculum(
            curriculum_id=request.curriculum_id,
            unit_id=request.unit_id,
            learning_objectives=request.learning_objectives,
            question_distribution=request.question_distribution,
            grade_level=request.grade_level,
            subject=request.subject,
            include_standards_alignment=request.include_standards_alignment,
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
                    curriculum_alignment=q.get("curriculum_alignment"),
                )
            )

        generation_time_ms = int((time.time() - start_time) * 1000)

        return CurriculumGenerateResponse(
            curriculum_id=request.curriculum_id,
            questions=questions,
            bloom_distribution=result.get("bloom_distribution", {}),
            standards_covered=result.get("standards_covered", []),
            generation_time_ms=generation_time_ms,
        )

    except Exception as e:
        logger.error(f"Curriculum generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Curriculum-based generation failed",
        )


# =============================================================================
# Async Job Endpoints
# =============================================================================


@router.post(
    "/generate/async",
    response_model=AsyncGenerateResponse,
    summary="Async batch generation",
    description="Queue a batch generation job for background processing.",
)
async def generate_async(
    request: AsyncGenerateRequest,
    background_tasks: BackgroundTasks,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
    http_request: Request,
) -> AsyncGenerateResponse:
    """Queue async batch generation job."""
    from uuid import uuid4

    try:
        job_id = str(uuid4())

        # Estimate completion time (roughly 2 seconds per passage)
        estimated_seconds = len(request.passages) * 2

        # Queue the background task
        background_tasks.add_task(
            pipeline.process_async_batch,
            job_id=job_id,
            passages=[p.model_dump() for p in request.passages],
            questions_per_passage=request.questions_per_passage,
            question_types=[qt.value for qt in request.question_types],
            webhook_url=request.webhook_url,
        )

        base_url = str(http_request.base_url).rstrip("/")

        return AsyncGenerateResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            estimated_completion_seconds=estimated_seconds,
            status_url=f"{base_url}/api/v1/jobs/{job_id}",
        )

    except Exception as e:
        logger.error(f"Async generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue async generation",
        )


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="Check the status of a background generation job.",
)
async def get_job_status(
    job_id: str,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
    http_request: Request,
) -> JobStatusResponse:
    """Get status of a background job."""
    from datetime import datetime

    try:
        job_info = await pipeline.get_job_status(job_id)

        if job_info is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found",
            )

        base_url = str(http_request.base_url).rstrip("/")
        result_url = None
        if job_info.get("status") == "completed":
            result_url = f"{base_url}/api/v1/jobs/{job_id}/result"

        return JobStatusResponse(
            job_id=job_id,
            status=JobStatus(job_info.get("status", "queued")),
            progress=job_info.get("progress", 0.0),
            created_at=job_info.get("created_at", datetime.utcnow()),
            started_at=job_info.get("started_at"),
            completed_at=job_info.get("completed_at"),
            passages_processed=job_info.get("passages_processed", 0),
            passages_total=job_info.get("passages_total", 0),
            error=job_info.get("error"),
            result_url=result_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job status error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job status",
        )


@router.get(
    "/jobs/{job_id}/result",
    response_model=JobResultResponse,
    summary="Get job result",
    description="Get the results of a completed background job.",
)
async def get_job_result(
    job_id: str,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> JobResultResponse:
    """Get results of a completed job."""
    try:
        result = await pipeline.get_job_result(job_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found or not completed",
            )

        if result.get("status") == "failed":
            return JobResultResponse(
                job_id=job_id,
                status=JobStatus.FAILED,
                error=result.get("error"),
            )

        # Convert results to BatchGenerateResponse format
        batch_results = []
        for passage_result in result.get("results", []):
            questions = []
            for q in passage_result.get("questions", []):
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
            batch_results.append(
                PassageQuestions(
                    passage_id=passage_result["passage_id"],
                    questions=questions,
                    success=passage_result.get("success", True),
                    error=passage_result.get("error"),
                )
            )

        batch_response = BatchGenerateResponse(
            results=batch_results,
            total_questions=result.get("total_questions", 0),
            successful_passages=result.get("successful_passages", 0),
            failed_passages=result.get("failed_passages", 0),
            generation_time_ms=result.get("generation_time_ms", 0),
        )

        return JobResultResponse(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            results=batch_response,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job result error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job result",
        )


# =============================================================================
# Curriculum Alignment Endpoints
# =============================================================================


@router.post(
    "/curriculum/align",
    response_model=AlignToStandardsResponse,
    summary="Align questions to standards",
    description="Align generated questions to curriculum standards.",
)
async def align_to_standards(
    request: AlignToStandardsRequest,
    pipeline: Annotated[GenerationPipeline, Depends(get_pipeline)],
) -> AlignToStandardsResponse:
    """Align questions to curriculum standards."""
    try:
        start_time = time.time()

        result = await pipeline.align_to_standards(
            questions=request.questions,
            grade=request.grade,
            subject=request.subject,
            standard_type=request.standard_type,
        )

        # Convert to response model
        aligned_questions = []
        for aq in result["aligned_questions"]:
            standards = []
            for s in aq.get("aligned_standards", []):
                standards.append(
                    StandardAlignmentItem(
                        standard_id=s["standard_id"],
                        description=s["description"],
                        confidence=s["confidence"],
                        grade_level=s.get("grade_level"),
                    )
                )

            primary = None
            if aq.get("primary_standard"):
                ps = aq["primary_standard"]
                primary = StandardAlignmentItem(
                    standard_id=ps["standard_id"],
                    description=ps["description"],
                    confidence=ps["confidence"],
                    grade_level=ps.get("grade_level"),
                )

            aligned_questions.append(
                AlignedQuestionItem(
                    question_id=aq["question_id"],
                    question_text=aq["question_text"],
                    aligned_standards=standards,
                    primary_standard=primary,
                    alignment_confidence=aq.get("alignment_confidence", 0.0),
                )
            )

        alignment_time_ms = int((time.time() - start_time) * 1000)

        return AlignToStandardsResponse(
            aligned_questions=aligned_questions,
            standards_used=result.get("standards_used", 0),
            alignment_time_ms=alignment_time_ms,
        )

    except Exception as e:
        logger.error(f"Alignment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Standards alignment failed",
        )
