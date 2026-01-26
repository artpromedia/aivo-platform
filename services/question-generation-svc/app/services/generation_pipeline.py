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
