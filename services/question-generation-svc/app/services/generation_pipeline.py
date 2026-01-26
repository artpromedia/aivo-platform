"""
Question Generation Pipeline.

Orchestrates the complete question generation flow:
1. Extract answers from passage
2. Generate questions for each answer
3. Classify by Bloom's level
4. Estimate difficulty
5. Generate distractors (for MCQ)
6. Filter by quality
7. Return final results
"""

import hashlib
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from app.models.answer_extractor import AnswerExtractor, AnswerExtractorConfig
from app.models.bloom_classifier import BloomClassifier
from app.models.cloze_generator import ClozeGenerator
from app.models.difficulty_estimator import DifficultyEstimator
from app.models.distractor_generator import DistractorGenerator
from app.models.question_generator import QuestionGenerator, QuestionGeneratorConfig
from app.services.quality_filter import QualityFilter

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """Configuration for the generation pipeline."""

    # Model settings
    qg_model_name: str = "valhalla/t5-base-qg-hl"
    device: str = "cpu"

    # Generation settings
    default_num_questions: int = 5
    default_num_distractors: int = 3
    min_quality_score: float = 0.6

    # Feature flags
    enable_quality_filter: bool = True
    enable_bloom_classification: bool = True
    enable_difficulty_estimation: bool = True
    enable_caching: bool = True


class GenerationPipeline:
    """
    Orchestrates the complete question generation pipeline.

    Integrates all components:
    - AnswerExtractor: Extract key answers from passages
    - QuestionGenerator: Generate questions using T5
    - DistractorGenerator: Create MCQ distractors
    - BloomClassifier: Classify cognitive level
    - DifficultyEstimator: Predict difficulty
    - QualityFilter: Filter low-quality questions

    Usage:
        pipeline = GenerationPipeline()
        result = await pipeline.generate_questions(
            passage="The Eiffel Tower is in Paris...",
            num_questions=5,
            include_distractors=True
        )
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """Initialize the generation pipeline."""
        self.config = config or PipelineConfig()

        # Initialize components (lazy loading where possible)
        self._answer_extractor: Optional[AnswerExtractor] = None
        self._question_generator: Optional[QuestionGenerator] = None
        self._distractor_generator: Optional[DistractorGenerator] = None
        self._bloom_classifier: Optional[BloomClassifier] = None
        self._difficulty_estimator: Optional[DifficultyEstimator] = None
        self._quality_filter: Optional[QualityFilter] = None
        self._cloze_generator: Optional[ClozeGenerator] = None

        # Cache for generated questions
        self._cache: Dict[str, Any] = {}

        logger.info("GenerationPipeline initialized")

    @property
    def answer_extractor(self) -> AnswerExtractor:
        if self._answer_extractor is None:
            self._answer_extractor = AnswerExtractor()
        return self._answer_extractor

    @property
    def question_generator(self) -> QuestionGenerator:
        if self._question_generator is None:
            config = QuestionGeneratorConfig(
                model_name=self.config.qg_model_name,
                device=self.config.device,
            )
            self._question_generator = QuestionGenerator(config)
        return self._question_generator

    @property
    def distractor_generator(self) -> DistractorGenerator:
        if self._distractor_generator is None:
            self._distractor_generator = DistractorGenerator()
        return self._distractor_generator

    @property
    def bloom_classifier(self) -> BloomClassifier:
        if self._bloom_classifier is None:
            self._bloom_classifier = BloomClassifier()
        return self._bloom_classifier

    @property
    def difficulty_estimator(self) -> DifficultyEstimator:
        if self._difficulty_estimator is None:
            self._difficulty_estimator = DifficultyEstimator()
        return self._difficulty_estimator

    @property
    def quality_filter(self) -> QualityFilter:
        if self._quality_filter is None:
            self._quality_filter = QualityFilter()
        return self._quality_filter

    @property
    def cloze_generator(self) -> ClozeGenerator:
        if self._cloze_generator is None:
            self._cloze_generator = ClozeGenerator()
        return self._cloze_generator

    def _get_cache_key(self, passage: str, num_questions: int) -> str:
        """Generate a cache key from passage content."""
        content = f"{passage}:{num_questions}"
        return hashlib.md5(content.encode()).hexdigest()

    async def generate_questions(
        self,
        passage: str,
        num_questions: int = 5,
        question_types: Optional[List[str]] = None,
        difficulty_target: Optional[float] = None,
        grade_level: Optional[int] = None,
        include_distractors: bool = False,
        num_distractors: int = 3,
    ) -> Dict[str, Any]:
        """
        Generate questions from a passage.

        Args:
            passage: Source text
            num_questions: Number of questions to generate
            question_types: Types of questions to generate
            difficulty_target: Target difficulty level (0-1)
            grade_level: Target grade level (1-12)
            include_distractors: Generate MCQ distractors
            num_distractors: Number of distractors per question

        Returns:
            Dictionary with generated questions and metadata
        """
        start_time = time.time()
        request_id = str(uuid4())

        logger.info(
            f"Starting generation pipeline: request_id={request_id}, "
            f"passage_length={len(passage)}, num_questions={num_questions}"
        )

        # Check cache
        if self.config.enable_caching:
            cache_key = self._get_cache_key(passage, num_questions)
            if cache_key in self._cache:
                logger.info(f"Cache hit for request {request_id}")
                cached = self._cache[cache_key].copy()
                cached["request_id"] = request_id
                cached["cached"] = True
                return cached

        try:
            # Step 1: Extract answers from passage
            extracted_answers = self.answer_extractor.extract(
                passage,
                max_answers=num_questions * 2,  # Extract extra for quality filtering
            )
            logger.info(f"Extracted {len(extracted_answers)} potential answers")

            # Step 2: Generate questions
            answers_text = [a.text for a in extracted_answers]
            generated = self.question_generator.generate_questions(
                passage=passage,
                answers=answers_text,
                num_questions=num_questions * 2,  # Generate extra
            )
            logger.info(f"Generated {len(generated)} raw questions")

            # Step 3: Process each question
            questions = []
            for gq in generated:
                question_data = await self._process_question(
                    question=gq.question,
                    answer=gq.answer,
                    passage=passage,
                    source_span=gq.source_span,
                    confidence=gq.confidence,
                    include_distractors=include_distractors,
                    num_distractors=num_distractors,
                )

                if question_data:
                    questions.append(question_data)

            # Step 4: Quality filter
            if self.config.enable_quality_filter:
                questions_for_filter = [
                    {
                        "question": q["question_text"],
                        "answer": q["answer"],
                        "context": passage,
                        **q,
                    }
                    for q in questions
                ]
                filtered = self.quality_filter.filter_batch(questions_for_filter)
                questions = filtered

            # Step 5: Apply difficulty/grade level targeting
            if difficulty_target is not None or grade_level is not None:
                questions = self._filter_by_difficulty(
                    questions, difficulty_target, grade_level
                )

            # Limit to requested number
            questions = questions[:num_questions]

            # Calculate generation time
            generation_time_ms = int((time.time() - start_time) * 1000)

            result = {
                "request_id": request_id,
                "questions": questions,
                "generation_time_ms": generation_time_ms,
                "model_version": self.config.qg_model_name,
                "passage_length": len(passage),
                "num_extracted_answers": len(extracted_answers),
                "num_generated": len(generated),
                "num_filtered": len(questions),
                "cached": False,
            }

            # Cache result
            if self.config.enable_caching:
                self._cache[cache_key] = result

            logger.info(
                f"Pipeline completed: request_id={request_id}, "
                f"questions={len(questions)}, time={generation_time_ms}ms"
            )

            return result

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            raise

    async def _process_question(
        self,
        question: str,
        answer: str,
        passage: str,
        source_span: Tuple[int, int],
        confidence: float,
        include_distractors: bool,
        num_distractors: int,
    ) -> Optional[Dict[str, Any]]:
        """Process a single generated question through the pipeline."""
        try:
            question_id = str(uuid4())

            # Bloom's classification
            bloom_level = "remember"
            if self.config.enable_bloom_classification:
                bloom_result = self.bloom_classifier.classify(question)
                bloom_level = bloom_result.primary_level.value

            # Difficulty estimation
            difficulty_estimate = 0.5
            if self.config.enable_difficulty_estimation:
                diff_result = self.difficulty_estimator.estimate(question, answer)
                difficulty_estimate = diff_result.difficulty

            # Distractors for MCQ
            distractors = None
            if include_distractors:
                distractor_result = self.distractor_generator.generate(
                    question=question,
                    correct_answer=answer,
                    context=passage,
                    num_distractors=num_distractors,
                )
                distractors = [d.text for d in distractor_result.distractors]

            return {
                "question_id": question_id,
                "question_text": question,
                "answer": answer,
                "distractors": distractors,
                "question_type": "mcq" if distractors else "short_answer",
                "difficulty_estimate": difficulty_estimate,
                "bloom_level": bloom_level,
                "source_span": source_span,
                "confidence": confidence,
            }

        except Exception as e:
            logger.warning(f"Error processing question '{question[:50]}...': {e}")
            return None

    def _filter_by_difficulty(
        self,
        questions: List[Dict[str, Any]],
        target_difficulty: Optional[float],
        target_grade: Optional[int],
    ) -> List[Dict[str, Any]]:
        """Filter questions by difficulty or grade level target."""
        if target_difficulty is not None:
            # Sort by closeness to target difficulty
            questions.sort(
                key=lambda q: abs(
                    q.get("difficulty_estimate", 0.5) - target_difficulty
                )
            )

        if target_grade is not None:
            # Filter by estimated grade level
            def grade_distance(q):
                est = self.difficulty_estimator.estimate(
                    q["question_text"], q["answer"]
                )
                return abs((est.grade_level_estimate or 6) - target_grade)

            questions.sort(key=grade_distance)

        return questions

    async def generate_mcq(
        self,
        passage: str,
        num_questions: int = 5,
        num_distractors: int = 3,
        difficulty_target: Optional[float] = None,
        grade_level: Optional[int] = None,
        shuffle_options: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate multiple choice questions with distractors.

        Returns questions with shuffled options.
        """
        import random

        result = await self.generate_questions(
            passage=passage,
            num_questions=num_questions,
            include_distractors=True,
            num_distractors=num_distractors,
            difficulty_target=difficulty_target,
            grade_level=grade_level,
        )

        # Format as MCQ with options
        mcq_questions = []
        for q in result["questions"]:
            options = [q["answer"]] + (q.get("distractors") or [])

            if shuffle_options:
                random.shuffle(options)

            correct_index = options.index(q["answer"])

            mcq_questions.append({
                "question_id": q["question_id"],
                "stem": q["question_text"],
                "correct_answer": q["answer"],
                "distractors": q.get("distractors", []),
                "options": options,
                "correct_index": correct_index,
                "difficulty": q["difficulty_estimate"],
                "bloom_level": q["bloom_level"],
            })

        result["questions"] = mcq_questions
        return result

    async def generate_cloze(
        self,
        passage: str,
        num_items: int = 5,
        blank_strategy: str = "key_terms",
        include_hints: bool = True,
        grade_level: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate cloze (fill-in-blank) items."""
        start_time = time.time()
        request_id = str(uuid4())

        items = self.cloze_generator.generate(
            text=passage,
            num_items=num_items,
            blank_strategy=blank_strategy,
        )

        cloze_items = []
        for item in items:
            cloze_items.append({
                "item_id": str(uuid4()),
                "text_with_blank": item.text_with_blank,
                "answer": item.answer,
                "hint": item.hint if include_hints else None,
                "difficulty": item.difficulty,
                "blank_type": item.blank_type,
                "context_sentence": item.context_sentence,
            })

        generation_time_ms = int((time.time() - start_time) * 1000)

        return {
            "request_id": request_id,
            "items": cloze_items,
            "generation_time_ms": generation_time_ms,
            "model_version": "cloze-generator-v1",
        }

    async def score_quality(
        self,
        question: str,
        answer: str,
        passage: str,
        distractors: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Score the quality of a question."""
        score = self.quality_filter.score(question, answer, passage)

        return {
            "overall_score": score.overall,
            "answerability": score.answerability,
            "fluency": score.grammaticality,
            "relevance": score.relevance,
            "difficulty_estimate": self.difficulty_estimator.estimate(
                question, answer
            ).difficulty,
            "specificity": score.specificity,
            "is_acceptable": score.is_acceptable,
            "issues": score.issues,
        }

    async def classify_bloom(self, question: str) -> Dict[str, Any]:
        """Classify a question by Bloom's taxonomy."""
        result = self.bloom_classifier.classify(question)

        return {
            "primary_level": result.primary_level.value,
            "confidence": result.confidence,
            "level_probabilities": result.level_probabilities,
        }

    async def estimate_difficulty(
        self,
        question: str,
        answer: str,
        distractors: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Estimate question difficulty."""
        result = self.difficulty_estimator.estimate(
            question, answer, distractors=distractors
        )

        return {
            "difficulty": result.difficulty,
            "confidence": result.confidence,
            "factors": result.factors,
            "estimated_p_correct": result.estimated_p_correct,
            "grade_level_estimate": result.grade_level_estimate,
        }

    def is_ready(self) -> bool:
        """Check if the pipeline is ready to process requests."""
        try:
            # Check if models can be loaded
            _ = self.answer_extractor
            return True
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get pipeline status and component states."""
        return {
            "ready": self.is_ready(),
            "config": {
                "qg_model": self.config.qg_model_name,
                "device": self.config.device,
                "quality_filter_enabled": self.config.enable_quality_filter,
                "bloom_enabled": self.config.enable_bloom_classification,
                "difficulty_enabled": self.config.enable_difficulty_estimation,
                "caching_enabled": self.config.enable_caching,
            },
            "cache_size": len(self._cache),
            "components": {
                "answer_extractor": self._answer_extractor is not None,
                "question_generator": self._question_generator is not None,
                "distractor_generator": self._distractor_generator is not None,
                "bloom_classifier": self._bloom_classifier is not None,
                "difficulty_estimator": self._difficulty_estimator is not None,
                "quality_filter": self._quality_filter is not None,
                "cloze_generator": self._cloze_generator is not None,
            },
        }

    def clear_cache(self) -> None:
        """Clear the generation cache."""
        self._cache.clear()
        logger.info("Pipeline cache cleared")

    # =========================================================================
    # New Sprint 2 Methods
    # =========================================================================

    def get_models_status(self) -> Dict[str, Any]:
        """Get status of all ML models."""
        total_memory = 0.0

        def get_component_status(component, name: str, model_name: str) -> Dict[str, Any]:
            loaded = component is not None
            memory_mb = 0.0
            if loaded:
                # Estimate memory based on typical model sizes
                memory_estimates = {
                    "question_generator": 800.0,  # T5-base ~800MB
                    "distractor_generator": 200.0,
                    "bloom_classifier": 50.0,
                    "difficulty_estimator": 20.0,
                    "cloze_generator": 100.0,
                }
                memory_mb = memory_estimates.get(name, 10.0)

            return {
                "loaded": loaded,
                "model_name": model_name,
                "device": self.config.device,
                "memory_mb": memory_mb,
                "last_inference_ms": None,
            }

        status = {
            "question_generator": get_component_status(
                self._question_generator,
                "question_generator",
                self.config.qg_model_name,
            ),
            "distractor_generator": get_component_status(
                self._distractor_generator,
                "distractor_generator",
                "distractor-v1",
            ),
            "bloom_classifier": get_component_status(
                self._bloom_classifier,
                "bloom_classifier",
                "bloom-keyword-v1",
            ),
            "difficulty_estimator": get_component_status(
                self._difficulty_estimator,
                "difficulty_estimator",
                "difficulty-heuristic-v1",
            ),
            "cloze_generator": get_component_status(
                self._cloze_generator,
                "cloze_generator",
                "cloze-spacy-v1",
            ),
        }

        total_memory = sum(s["memory_mb"] for s in status.values())
        status["total_memory_mb"] = total_memory

        return status

    async def generate_from_curriculum(
        self,
        curriculum_id: str,
        unit_id: Optional[str],
        learning_objectives: List[str],
        question_distribution: Dict[str, int],
        grade_level: int,
        subject: str,
        include_standards_alignment: bool = True,
    ) -> Dict[str, Any]:
        """Generate questions from curriculum learning objectives."""
        from app.services.curriculum_aligner import CurriculumAligner

        start_time = time.time()
        request_id = str(uuid4())

        all_questions = []
        bloom_counts: Dict[str, int] = {level: 0 for level in question_distribution}
        standards_covered = []

        # Create aligner for standards alignment
        aligner = CurriculumAligner() if include_standards_alignment else None

        # Generate questions for each learning objective
        for objective in learning_objectives:
            # Generate passage-like content from objective
            passage = f"Learning Objective: {objective}. This covers {subject} content for grade {grade_level}."

            # Determine how many questions for this objective
            questions_needed = sum(question_distribution.values()) // len(learning_objectives)

            result = await self.generate_questions(
                passage=passage,
                num_questions=questions_needed,
                grade_level=grade_level,
                include_distractors=True,
            )

            # Classify and filter by target Bloom level
            for q in result["questions"]:
                bloom_level = q.get("bloom_level", "remember")

                # Check if we still need questions at this Bloom level
                target_count = question_distribution.get(bloom_level, 0)
                current_count = bloom_counts.get(bloom_level, 0)

                if current_count < target_count:
                    q["curriculum_alignment"] = []

                    # Add standards alignment if enabled
                    if aligner and include_standards_alignment:
                        alignments = aligner.align(
                            question=q["question_text"],
                            answer=q["answer"],
                            grade=grade_level,
                            subject=subject,
                        )
                        if alignments:
                            q["curriculum_alignment"] = [a.standard_id for a in alignments]
                            for a in alignments:
                                if a.standard_id not in standards_covered:
                                    standards_covered.append(a.standard_id)

                    all_questions.append(q)
                    bloom_counts[bloom_level] = current_count + 1

        generation_time_ms = int((time.time() - start_time) * 1000)

        return {
            "request_id": request_id,
            "questions": all_questions,
            "bloom_distribution": bloom_counts,
            "standards_covered": standards_covered,
            "generation_time_ms": generation_time_ms,
        }

    # Job storage for async processing (in production, use Redis)
    _jobs: Dict[str, Dict[str, Any]] = {}

    async def process_async_batch(
        self,
        job_id: str,
        passages: List[Dict[str, Any]],
        questions_per_passage: int,
        question_types: List[str],
        webhook_url: Optional[str] = None,
    ) -> None:
        """Process a batch generation job asynchronously."""
        from datetime import datetime
        import httpx

        # Initialize job status
        self._jobs[job_id] = {
            "status": "processing",
            "created_at": datetime.utcnow(),
            "started_at": datetime.utcnow(),
            "passages_total": len(passages),
            "passages_processed": 0,
            "progress": 0.0,
            "results": [],
        }

        start_time = time.time()
        results = []
        total_questions = 0
        successful = 0
        failed = 0

        try:
            for i, passage_data in enumerate(passages):
                try:
                    result = await self.generate_questions(
                        passage=passage_data["text"],
                        num_questions=questions_per_passage,
                        question_types=question_types,
                        include_distractors=True,
                    )

                    passage_result = {
                        "passage_id": passage_data["passage_id"],
                        "questions": result["questions"],
                        "success": True,
                    }
                    results.append(passage_result)
                    total_questions += len(result["questions"])
                    successful += 1

                except Exception as e:
                    logger.warning(f"Async batch: failed on passage {passage_data['passage_id']}: {e}")
                    results.append({
                        "passage_id": passage_data["passage_id"],
                        "questions": [],
                        "success": False,
                        "error": str(e),
                    })
                    failed += 1

                # Update progress
                self._jobs[job_id]["passages_processed"] = i + 1
                self._jobs[job_id]["progress"] = (i + 1) / len(passages)

            # Mark as completed
            generation_time_ms = int((time.time() - start_time) * 1000)
            self._jobs[job_id].update({
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "results": results,
                "total_questions": total_questions,
                "successful_passages": successful,
                "failed_passages": failed,
                "generation_time_ms": generation_time_ms,
                "progress": 1.0,
            })

            # Call webhook if provided
            if webhook_url:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            webhook_url,
                            json={
                                "job_id": job_id,
                                "status": "completed",
                                "total_questions": total_questions,
                            },
                            timeout=10.0,
                        )
                except Exception as e:
                    logger.warning(f"Webhook call failed: {e}")

        except Exception as e:
            logger.error(f"Async batch job {job_id} failed: {e}")
            self._jobs[job_id].update({
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.utcnow(),
            })

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an async job."""
        return self._jobs.get(job_id)

    async def get_job_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get results of a completed async job."""
        job = self._jobs.get(job_id)
        if job is None:
            return None

        if job.get("status") != "completed":
            return {"status": job.get("status"), "error": job.get("error")}

        return job

    async def align_to_standards(
        self,
        questions: List[Dict[str, Any]],
        grade: int,
        subject: str,
        standard_type: str = "common_core",
    ) -> Dict[str, Any]:
        """Align questions to curriculum standards."""
        from app.services.curriculum_aligner import CurriculumAligner, StandardType

        aligner = CurriculumAligner()

        # Map string to StandardType enum
        try:
            std_type = StandardType(standard_type)
        except ValueError:
            std_type = StandardType.COMMON_CORE

        aligned_questions = await aligner.align_to_standards(
            questions=questions,
            grade=grade,
            subject=subject,
            standard_type=std_type,
        )

        result_questions = []
        for aq in aligned_questions:
            result_questions.append({
                "question_id": aq.question_id,
                "question_text": aq.question_text,
                "aligned_standards": [
                    {
                        "standard_id": s.standard_id,
                        "description": s.description,
                        "confidence": s.confidence,
                        "grade_level": s.grade_level,
                    }
                    for s in aq.aligned_standards
                ],
                "primary_standard": {
                    "standard_id": aq.primary_standard.standard_id,
                    "description": aq.primary_standard.description,
                    "confidence": aq.primary_standard.confidence,
                    "grade_level": aq.primary_standard.grade_level,
                } if aq.primary_standard else None,
                "alignment_confidence": aq.alignment_confidence,
            })

        return {
            "aligned_questions": result_questions,
            "standards_used": len(aligner._standards_cache.get(
                f"{standard_type}:{grade}:{subject}:national", []
            )),
        }
