"""
T5-based Question Generator.

Uses HuggingFace transformers to generate questions from passages.
Supports answer-aware generation using highlight format.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import torch
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
)

logger = logging.getLogger(__name__)


@dataclass
class GeneratedQuestion:
    """A single generated question with metadata."""

    question: str
    answer: str
    context: str
    confidence: float
    question_type: str = "factual"
    source_span: Tuple[int, int] = (0, 0)
    model_name: str = ""


@dataclass
class QuestionGeneratorConfig:
    """Configuration for question generation."""

    model_name: str = "valhalla/t5-base-qg-hl"
    max_input_length: int = 512
    max_output_length: int = 64
    num_beams: int = 4
    num_return_sequences: int = 1
    temperature: float = 1.0
    top_k: int = 50
    top_p: float = 0.95
    do_sample: bool = False
    device: str = "cpu"
    batch_size: int = 4


class QuestionGenerator:
    """
    Generate questions from educational content using T5.

    Uses the highlight format where answers are marked with <hl> tokens
    in the passage to guide question generation.

    Supports:
    - Factual questions (what, when, who)
    - Inference questions (why, how)
    - Application questions
    - Analysis questions

    Usage:
        generator = QuestionGenerator()
        questions = generator.generate_questions(
            passage="The Eiffel Tower is located in Paris.",
            answers=["Paris", "Eiffel Tower"],
            num_questions=2
        )
    """

    # Question type keywords for classification
    QUESTION_TYPE_PATTERNS = {
        "factual": [
            r"^what\s",
            r"^who\s",
            r"^when\s",
            r"^where\s",
            r"^which\s",
            r"^name\s",
        ],
        "inferential": [
            r"^why\s",
            r"^how\s",
            r"^explain\s",
        ],
        "conceptual": [
            r"^what\s+is\s+the\s+(?:meaning|definition)",
            r"^define\s",
            r"^describe\s",
        ],
        "procedural": [
            r"^how\s+(?:do|does|can|would|should)",
            r"^what\s+steps",
            r"^in\s+what\s+order",
        ],
    }

    def __init__(self, config: Optional[QuestionGeneratorConfig] = None):
        """Initialize the question generator."""
        self.config = config or QuestionGeneratorConfig()
        self._model: Optional[PreTrainedModel] = None
        self._tokenizer: Optional[PreTrainedTokenizer] = None
        self._loaded = False
        self.device = torch.device(self.config.device)
        logger.info(
            f"QuestionGenerator initialized with model: {self.config.model_name}"
        )

    def _load_model(self) -> None:
        """Lazy load the T5 model and tokenizer."""
        if not self._loaded:
            logger.info(f"Loading model: {self.config.model_name}")
            try:
                self._tokenizer = AutoTokenizer.from_pretrained(
                    self.config.model_name
                )
                self._model = AutoModelForSeq2SeqLM.from_pretrained(
                    self.config.model_name
                )
                self._model.to(self.device)
                self._model.eval()
                self._loaded = True
                logger.info(f"Model loaded successfully on {self.device}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise

    @property
    def model(self) -> PreTrainedModel:
        """Get the T5 model."""
        self._load_model()
        return self._model

    @property
    def tokenizer(self) -> PreTrainedTokenizer:
        """Get the tokenizer."""
        self._load_model()
        return self._tokenizer

    def generate_questions(
        self,
        passage: str,
        answers: List[str],
        num_questions: int = 5,
    ) -> List[GeneratedQuestion]:
        """
        Generate questions from a passage given target answers.

        Args:
            passage: The source text
            answers: List of answers to generate questions for
            num_questions: Maximum number of questions to generate

        Returns:
            List of GeneratedQuestion objects
        """
        questions = []

        # Limit to requested number
        target_answers = answers[:num_questions]

        for answer in target_answers:
            try:
                question = self._generate_for_answer(passage, answer)
                if question:
                    questions.append(question)
            except Exception as e:
                logger.warning(f"Failed to generate question for '{answer}': {e}")
                # Try fallback
                fallback = self._fallback_question(passage, answer)
                if fallback:
                    questions.append(fallback)

        return questions

    def _generate_for_answer(
        self, passage: str, answer: str
    ) -> Optional[GeneratedQuestion]:
        """Generate a question for a specific answer."""
        # Find answer position in passage
        answer_start = passage.lower().find(answer.lower())
        if answer_start == -1:
            # Answer not in passage, use without highlighting
            return self._generate_without_highlight(passage, answer)

        answer_end = answer_start + len(answer)

        # Create highlighted input
        highlighted = self._create_highlighted_input(
            passage, answer_start, answer_end
        )

        # Tokenize
        inputs = self.tokenizer(
            highlighted,
            max_length=self.config.max_input_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                max_length=self.config.max_output_length,
                num_beams=self.config.num_beams,
                num_return_sequences=self.config.num_return_sequences,
                temperature=self.config.temperature,
                do_sample=self.config.do_sample,
                top_k=self.config.top_k if self.config.do_sample else None,
                top_p=self.config.top_p if self.config.do_sample else None,
                early_stopping=True,
                return_dict_in_generate=True,
                output_scores=True,
            )

        # Decode
        generated_text = self.tokenizer.decode(
            outputs.sequences[0], skip_special_tokens=True
        )

        # Calculate confidence from sequence scores
        confidence = self._calculate_confidence(outputs)

        # Classify question type
        question_type = self._classify_question_type(generated_text)

        return GeneratedQuestion(
            question=generated_text.strip(),
            answer=answer,
            context=passage,
            confidence=confidence,
            question_type=question_type,
            source_span=(answer_start, answer_end),
            model_name=self.config.model_name,
        )

    def _create_highlighted_input(
        self, passage: str, start: int, end: int
    ) -> str:
        """Create input with answer highlighted using <hl> tokens."""
        return (
            passage[:start]
            + "<hl> "
            + passage[start:end]
            + " <hl>"
            + passage[end:]
        )

    def _generate_without_highlight(
        self, passage: str, answer: str
    ) -> Optional[GeneratedQuestion]:
        """Generate question without answer highlighting."""
        # Use a prompt-based approach
        prompt = f"generate question: {passage}"

        inputs = self.tokenizer(
            prompt,
            max_length=self.config.max_input_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                max_length=self.config.max_output_length,
                num_beams=self.config.num_beams,
                early_stopping=True,
                return_dict_in_generate=True,
                output_scores=True,
            )

        generated_text = self.tokenizer.decode(
            outputs.sequences[0], skip_special_tokens=True
        )
        confidence = self._calculate_confidence(outputs)
        question_type = self._classify_question_type(generated_text)

        return GeneratedQuestion(
            question=generated_text.strip(),
            answer=answer,
            context=passage,
            confidence=confidence * 0.8,  # Lower confidence for non-highlighted
            question_type=question_type,
            source_span=(0, 0),
            model_name=self.config.model_name,
        )

    def _calculate_confidence(self, outputs) -> float:
        """Calculate confidence score from model outputs."""
        try:
            if hasattr(outputs, "sequences_scores") and outputs.sequences_scores is not None:
                # Use sequence score (log probability)
                score = outputs.sequences_scores[0].item()
                # Convert log prob to probability-like score
                confidence = min(1.0, max(0.0, 1.0 + score / 10))
            elif hasattr(outputs, "scores") and outputs.scores:
                # Average token probabilities
                scores = []
                for step_scores in outputs.scores:
                    probs = torch.softmax(step_scores[0], dim=-1)
                    max_prob = probs.max().item()
                    scores.append(max_prob)
                confidence = sum(scores) / len(scores) if scores else 0.5
            else:
                confidence = 0.7  # Default confidence
            return confidence
        except Exception as e:
            logger.warning(f"Error calculating confidence: {e}")
            return 0.7

    def _classify_question_type(self, question: str) -> str:
        """Classify the question type based on patterns."""
        question_lower = question.lower().strip()

        for qtype, patterns in self.QUESTION_TYPE_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, question_lower):
                    return qtype

        return "factual"  # Default

    def generate_from_answer(self, context: str, answer: str) -> str:
        """Generate a question given context and answer."""
        result = self._generate_for_answer(context, answer)
        return result.question if result else ""

    def generate_varied(
        self,
        text: str,
        bloom_levels: List[str],
    ) -> List[GeneratedQuestion]:
        """
        Generate questions targeting specific Bloom's taxonomy levels.

        This requires more sophisticated prompting to target specific
        cognitive levels.
        """
        questions = []

        # Map bloom levels to question starters
        bloom_starters = {
            "remember": ["What is", "Who was", "When did", "Where is"],
            "understand": ["Explain how", "Describe the", "Summarize the"],
            "apply": ["How would you use", "What would happen if"],
            "analyze": ["Why did", "Compare the", "What is the relationship"],
            "evaluate": ["Do you agree that", "What is the best"],
            "create": ["How might you design", "What would you propose"],
        }

        for level in bloom_levels:
            starters = bloom_starters.get(level.lower(), ["What is"])
            # This would require a more advanced model or fine-tuning
            # For now, generate standard questions
            prompt = f"generate {level} question: {text}"

            try:
                inputs = self.tokenizer(
                    prompt,
                    max_length=self.config.max_input_length,
                    truncation=True,
                    return_tensors="pt",
                )
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

                with torch.no_grad():
                    outputs = self.model.generate(
                        input_ids=inputs["input_ids"],
                        attention_mask=inputs["attention_mask"],
                        max_length=self.config.max_output_length,
                        num_beams=self.config.num_beams,
                        early_stopping=True,
                    )

                generated = self.tokenizer.decode(
                    outputs[0], skip_special_tokens=True
                )

                questions.append(
                    GeneratedQuestion(
                        question=generated.strip(),
                        answer="",  # Unknown for varied generation
                        context=text,
                        confidence=0.6,
                        question_type=level.lower(),
                        model_name=self.config.model_name,
                    )
                )
            except Exception as e:
                logger.warning(f"Failed to generate {level} question: {e}")

        return questions

    def generate_batch(
        self,
        passages: List[str],
        answers_per_passage: List[List[str]],
    ) -> List[List[GeneratedQuestion]]:
        """
        Batch generation for efficiency.

        Args:
            passages: List of source texts
            answers_per_passage: List of answer lists for each passage

        Returns:
            List of question lists, one per passage
        """
        all_questions = []

        for passage, answers in zip(passages, answers_per_passage):
            questions = self.generate_questions(passage, answers)
            all_questions.append(questions)

        return all_questions

    def _fallback_question(
        self, passage: str, answer: str
    ) -> Optional[GeneratedQuestion]:
        """
        Generate a rule-based fallback question when model fails.

        Uses simple templates based on answer type.
        """
        # Detect answer type and generate appropriate question
        answer_lower = answer.lower()

        # Date patterns
        if re.match(r"\d{4}", answer) or re.match(
            r"(january|february|march|april|may|june|july|august|september|october|november|december)",
            answer_lower,
        ):
            question = f"When did this occur: {answer}?"
        # Number patterns
        elif re.match(r"^\d+", answer):
            question = f"What is the quantity or number related to {answer}?"
        # Person names (capitalized multi-word)
        elif answer[0].isupper() and " " in answer:
            question = f"Who is {answer}?"
        # Location/Organization (capitalized)
        elif answer[0].isupper():
            question = f"What is {answer}?"
        else:
            # Generic question
            question = f"What is meant by {answer}?"

        return GeneratedQuestion(
            question=question,
            answer=answer,
            context=passage,
            confidence=0.3,  # Low confidence for fallback
            question_type="factual",
            source_span=(0, 0),
            model_name="rule-based-fallback",
        )

    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._loaded

    def unload(self) -> None:
        """Unload model to free memory."""
        if self._model is not None:
            del self._model
            self._model = None
        if self._tokenizer is not None:
            del self._tokenizer
            self._tokenizer = None
        self._loaded = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Model unloaded")
