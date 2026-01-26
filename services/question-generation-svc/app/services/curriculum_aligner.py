"""
Curriculum Aligner

Align generated questions to curriculum standards using semantic similarity.

Integration with curriculum-py-svc:
1. Fetch relevant standards for subject/grade
2. Match question content to standard descriptions
3. Return alignment confidence scores

Supports:
- Common Core State Standards
- State-specific standards
- Custom learning objectives
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

import httpx

logger = logging.getLogger(__name__)


class StandardType(str, Enum):
    """Types of educational standards."""
    COMMON_CORE = "common_core"
    STATE = "state"
    CUSTOM = "custom"
    NGSS = "ngss"  # Next Generation Science Standards
    ISTE = "iste"  # International Society for Technology in Education


@dataclass
class StandardAlignment:
    """Alignment of a question to a specific standard."""

    standard_id: str
    description: str
    confidence: float  # 0-1 alignment confidence
    subject: str
    grade_level: Optional[int] = None
    strand: Optional[str] = None  # e.g., "Reading: Literature", "Number & Operations"
    keywords_matched: List[str] = field(default_factory=list)
    standard_type: StandardType = StandardType.COMMON_CORE


@dataclass
class AlignedQuestion:
    """A question with its curriculum alignments."""

    question_id: str
    question_text: str
    answer: str
    aligned_standards: List[StandardAlignment]
    primary_standard: Optional[StandardAlignment] = None
    alignment_confidence: float = 0.0  # Overall confidence
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CurriculumAlignerConfig:
    """Configuration for curriculum alignment."""

    curriculum_service_url: str = "http://curriculum-py-svc:8000"
    use_semantic_similarity: bool = True
    similarity_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    min_alignment_confidence: float = 0.3
    max_alignments_per_question: int = 3
    cache_standards: bool = True
    timeout_seconds: float = 10.0


class CurriculumAligner:
    """
    Align questions to educational standards.

    Uses semantic similarity between question content and standard descriptions
    to find the best matching curriculum standards.

    Supports:
    - Common Core State Standards
    - State-specific standards
    - Custom learning objectives

    Usage:
        aligner = CurriculumAligner()

        # Align questions to standards
        aligned = aligner.align_to_standards(
            questions=[...],
            grade=5,
            subject="math"
        )

        # Get single question alignment
        alignments = aligner.align(
            question="What is 2+2?",
            answer="4",
            grade=2,
            subject="math"
        )
    """

    # Common Core domain mappings
    COMMON_CORE_DOMAINS = {
        "math": {
            "k-2": ["Counting & Cardinality", "Operations & Algebraic Thinking",
                    "Number & Operations in Base Ten", "Measurement & Data", "Geometry"],
            "3-5": ["Operations & Algebraic Thinking", "Number & Operations in Base Ten",
                    "Number & Operations—Fractions", "Measurement & Data", "Geometry"],
            "6-8": ["Ratios & Proportional Relationships", "The Number System",
                    "Expressions & Equations", "Functions", "Geometry",
                    "Statistics & Probability"],
            "9-12": ["Number & Quantity", "Algebra", "Functions",
                     "Modeling", "Geometry", "Statistics & Probability"],
        },
        "ela": {
            "all": ["Reading: Literature", "Reading: Informational Text",
                    "Writing", "Speaking & Listening", "Language"],
        },
    }

    # Keywords for standard matching
    STANDARD_KEYWORDS = {
        "math": {
            "addition": ["add", "sum", "plus", "total", "combine"],
            "subtraction": ["subtract", "minus", "difference", "take away", "less"],
            "multiplication": ["multiply", "times", "product", "factor"],
            "division": ["divide", "quotient", "share", "split", "partition"],
            "fractions": ["fraction", "numerator", "denominator", "whole", "part"],
            "geometry": ["shape", "angle", "line", "point", "area", "perimeter", "volume"],
            "measurement": ["measure", "length", "width", "height", "weight", "time"],
            "algebra": ["variable", "equation", "expression", "solve", "unknown"],
            "statistics": ["mean", "median", "mode", "range", "data", "graph", "probability"],
        },
        "ela": {
            "reading_lit": ["story", "character", "plot", "theme", "setting", "fiction"],
            "reading_info": ["main idea", "detail", "fact", "evidence", "nonfiction"],
            "writing": ["write", "essay", "paragraph", "argument", "narrative", "opinion"],
            "language": ["grammar", "vocabulary", "word", "sentence", "punctuation"],
        },
        "science": {
            "life_science": ["organism", "cell", "ecosystem", "evolution", "genetics"],
            "physical_science": ["matter", "energy", "force", "motion", "chemical"],
            "earth_science": ["earth", "weather", "climate", "geology", "atmosphere"],
        },
    }

    def __init__(self, config: Optional[CurriculumAlignerConfig] = None):
        """Initialize the curriculum aligner."""
        self.config = config or CurriculumAlignerConfig()
        self._sentence_model = None
        self._standards_cache: Dict[str, List[Dict]] = {}
        self._http_client: Optional[httpx.AsyncClient] = None
        logger.info("CurriculumAligner initialized")

    def _load_sentence_model(self):
        """Lazy load sentence transformer model for semantic similarity."""
        if self._sentence_model is not None:
            return self._sentence_model

        if not self.config.use_semantic_similarity:
            return None

        try:
            from sentence_transformers import SentenceTransformer
            self._sentence_model = SentenceTransformer(self.config.similarity_model)
            logger.info(f"Loaded sentence model: {self.config.similarity_model}")
            return self._sentence_model
        except ImportError:
            logger.warning("sentence-transformers not available, using keyword matching only")
            return None
        except Exception as e:
            logger.warning(f"Failed to load sentence model: {e}")
            return None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=self.config.timeout_seconds
            )
        return self._http_client

    async def fetch_standards(
        self,
        grade: int,
        subject: str,
        standard_type: StandardType = StandardType.COMMON_CORE,
        state: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch standards from curriculum service.

        Args:
            grade: Grade level (1-12)
            subject: Subject area
            standard_type: Type of standards to fetch
            state: State code for state-specific standards

        Returns:
            List of standard dictionaries
        """
        cache_key = f"{standard_type.value}:{grade}:{subject}:{state or 'national'}"

        if self.config.cache_standards and cache_key in self._standards_cache:
            return self._standards_cache[cache_key]

        try:
            client = await self._get_http_client()

            params = {
                "grade": grade,
                "subject": subject,
                "standard_type": standard_type.value,
            }
            if state:
                params["state"] = state

            response = await client.get(
                f"{self.config.curriculum_service_url}/api/v1/standards",
                params=params,
            )

            if response.status_code == 200:
                standards = response.json().get("standards", [])
                if self.config.cache_standards:
                    self._standards_cache[cache_key] = standards
                return standards

            logger.warning(f"Failed to fetch standards: {response.status_code}")
            return self._get_fallback_standards(grade, subject)

        except Exception as e:
            logger.warning(f"Error fetching standards: {e}")
            return self._get_fallback_standards(grade, subject)

    def _get_fallback_standards(
        self,
        grade: int,
        subject: str,
    ) -> List[Dict[str, Any]]:
        """Get fallback standards when curriculum service is unavailable."""
        standards = []

        # Generate synthetic Common Core-style standards
        if subject.lower() in ("math", "mathematics"):
            grade_band = self._get_grade_band(grade)
            domains = self.COMMON_CORE_DOMAINS.get("math", {}).get(grade_band, [])

            for i, domain in enumerate(domains):
                standards.append({
                    "standard_id": f"CCSS.Math.Content.{grade}.{domain[:2].upper()}.{i+1}",
                    "description": f"Grade {grade} {domain} standard",
                    "grade": grade,
                    "subject": "math",
                    "domain": domain,
                    "strand": domain,
                })

        elif subject.lower() in ("ela", "english", "reading", "writing"):
            domains = self.COMMON_CORE_DOMAINS.get("ela", {}).get("all", [])

            for i, domain in enumerate(domains):
                standards.append({
                    "standard_id": f"CCSS.ELA-Literacy.{domain[:2].upper()}.{grade}.{i+1}",
                    "description": f"Grade {grade} {domain} standard",
                    "grade": grade,
                    "subject": "ela",
                    "domain": domain,
                    "strand": domain,
                })

        return standards

    def _get_grade_band(self, grade: int) -> str:
        """Get grade band for Common Core domains."""
        if grade <= 2:
            return "k-2"
        elif grade <= 5:
            return "3-5"
        elif grade <= 8:
            return "6-8"
        else:
            return "9-12"

    def align(
        self,
        question: str,
        answer: str,
        grade: Optional[int] = None,
        subject: Optional[str] = None,
        standards: Optional[List[Dict[str, Any]]] = None,
    ) -> List[StandardAlignment]:
        """
        Find matching standards for a single question.

        Args:
            question: The question text
            answer: The answer text
            grade: Target grade level
            subject: Subject area
            standards: Optional list of standards to match against

        Returns:
            List of StandardAlignment results, sorted by confidence
        """
        if standards is None:
            # Use fallback standards if not provided
            if grade and subject:
                standards = self._get_fallback_standards(grade, subject)
            else:
                return []

        if not standards:
            return []

        # Combine question and answer for matching
        question_content = f"{question} {answer}"

        alignments = []

        for standard in standards:
            # Calculate alignment score
            confidence, matched_keywords = self._calculate_alignment(
                question_content,
                standard.get("description", ""),
                subject=standard.get("subject") or subject,
            )

            if confidence >= self.config.min_alignment_confidence:
                alignment = StandardAlignment(
                    standard_id=standard.get("standard_id", ""),
                    description=standard.get("description", ""),
                    confidence=confidence,
                    subject=standard.get("subject", subject or ""),
                    grade_level=standard.get("grade", grade),
                    strand=standard.get("strand") or standard.get("domain"),
                    keywords_matched=matched_keywords,
                    standard_type=StandardType(
                        standard.get("standard_type", "common_core")
                    ) if standard.get("standard_type") else StandardType.COMMON_CORE,
                )
                alignments.append(alignment)

        # Sort by confidence and limit
        alignments.sort(key=lambda a: a.confidence, reverse=True)
        return alignments[:self.config.max_alignments_per_question]

    def _calculate_alignment(
        self,
        question_content: str,
        standard_description: str,
        subject: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """
        Calculate alignment score between question and standard.

        Uses combination of:
        1. Semantic similarity (if available)
        2. Keyword matching
        3. Domain-specific term matching

        Returns:
            Tuple of (confidence score, list of matched keywords)
        """
        scores = []
        matched_keywords = []

        # 1. Semantic similarity
        model = self._load_sentence_model()
        if model is not None:
            try:
                import numpy as np
                embeddings = model.encode([question_content, standard_description])
                similarity = np.dot(embeddings[0], embeddings[1]) / (
                    np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
                )
                scores.append(("semantic", float(similarity)))
            except Exception as e:
                logger.debug(f"Semantic similarity failed: {e}")

        # 2. Keyword matching
        keyword_score, keywords = self._keyword_match(
            question_content.lower(),
            standard_description.lower(),
            subject
        )
        scores.append(("keyword", keyword_score))
        matched_keywords.extend(keywords)

        # 3. Word overlap
        overlap_score = self._word_overlap(
            question_content.lower(),
            standard_description.lower()
        )
        scores.append(("overlap", overlap_score))

        # Combine scores with weights
        if len(scores) == 3:
            # Semantic similarity available
            confidence = 0.5 * scores[0][1] + 0.3 * scores[1][1] + 0.2 * scores[2][1]
        else:
            # No semantic similarity
            confidence = 0.6 * scores[0][1] + 0.4 * scores[1][1]

        return min(1.0, max(0.0, confidence)), matched_keywords

    def _keyword_match(
        self,
        question: str,
        standard: str,
        subject: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """Calculate keyword match score."""
        matched = []

        # Get subject-specific keywords
        subject_keywords = {}
        if subject and subject.lower() in self.STANDARD_KEYWORDS:
            subject_keywords = self.STANDARD_KEYWORDS[subject.lower()]

        # Check all keyword categories
        all_keywords = {}
        for subj_keywords in self.STANDARD_KEYWORDS.values():
            all_keywords.update(subj_keywords)

        # Prioritize subject-specific keywords
        if subject_keywords:
            all_keywords = {**all_keywords, **subject_keywords}

        matches = 0
        total_categories = 0

        for category, keywords in all_keywords.items():
            category_matched = False
            for keyword in keywords:
                if keyword in question and keyword in standard:
                    matched.append(keyword)
                    category_matched = True
                    break
            if category_matched:
                matches += 1
            total_categories += 1

        if total_categories == 0:
            return 0.0, matched

        # Also check direct word overlap in standard
        standard_words = set(re.findall(r"\b\w+\b", standard.lower()))
        question_words = set(re.findall(r"\b\w+\b", question.lower()))

        # Filter to content words
        content_overlap = standard_words & question_words
        content_overlap = {w for w in content_overlap if len(w) > 3}

        overlap_bonus = len(content_overlap) * 0.05

        score = (matches / max(total_categories, 1)) * 0.7 + overlap_bonus

        return min(1.0, score), matched

    def _word_overlap(self, text1: str, text2: str) -> float:
        """Calculate word overlap score."""
        words1 = set(re.findall(r"\b\w{4,}\b", text1))
        words2 = set(re.findall(r"\b\w{4,}\b", text2))

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        return len(intersection) / len(union)

    async def align_to_standards(
        self,
        questions: List[Dict[str, Any]],
        grade: int,
        subject: str,
        standard_type: StandardType = StandardType.COMMON_CORE,
    ) -> List[AlignedQuestion]:
        """
        Align multiple questions to curriculum standards.

        Args:
            questions: List of question dicts with 'question_text' and 'answer'
            grade: Target grade level
            subject: Subject area
            standard_type: Type of standards

        Returns:
            List of AlignedQuestion objects
        """
        # Fetch standards
        standards = await self.fetch_standards(
            grade=grade,
            subject=subject,
            standard_type=standard_type,
        )

        aligned_questions = []

        for q in questions:
            question_text = q.get("question_text") or q.get("question", "")
            answer = q.get("answer", "")
            question_id = q.get("question_id", "")

            # Get alignments
            alignments = self.align(
                question=question_text,
                answer=answer,
                grade=grade,
                subject=subject,
                standards=standards,
            )

            # Create aligned question
            primary = alignments[0] if alignments else None
            overall_confidence = primary.confidence if primary else 0.0

            aligned_question = AlignedQuestion(
                question_id=question_id,
                question_text=question_text,
                answer=answer,
                aligned_standards=alignments,
                primary_standard=primary,
                alignment_confidence=overall_confidence,
                metadata=q.get("metadata", {}),
            )
            aligned_questions.append(aligned_question)

        return aligned_questions

    def validate_alignment(
        self,
        question: str,
        standard_id: str,
        standards: Optional[List[Dict[str, Any]]] = None,
    ) -> float:
        """
        Validate how well a question aligns to a specific standard.

        Args:
            question: Question text
            standard_id: Standard ID to validate against
            standards: Optional list of standards

        Returns:
            Alignment confidence score (0-1)
        """
        if standards is None:
            logger.warning("No standards provided for validation")
            return 0.0

        # Find the specific standard
        target_standard = None
        for standard in standards:
            if standard.get("standard_id") == standard_id:
                target_standard = standard
                break

        if target_standard is None:
            logger.warning(f"Standard {standard_id} not found")
            return 0.0

        # Calculate alignment
        confidence, _ = self._calculate_alignment(
            question,
            target_standard.get("description", ""),
            subject=target_standard.get("subject"),
        )

        return confidence

    def suggest_standards(
        self,
        question: str,
        answer: str,
        subject: str,
        grade_range: Tuple[int, int] = (1, 12),
    ) -> List[StandardAlignment]:
        """
        Suggest appropriate standards for a question across grade levels.

        Args:
            question: Question text
            answer: Answer text
            subject: Subject area
            grade_range: Range of grades to consider

        Returns:
            List of suggested StandardAlignments from different grades
        """
        all_alignments = []

        for grade in range(grade_range[0], grade_range[1] + 1):
            standards = self._get_fallback_standards(grade, subject)
            alignments = self.align(
                question=question,
                answer=answer,
                grade=grade,
                subject=subject,
                standards=standards,
            )
            all_alignments.extend(alignments)

        # Sort by confidence and deduplicate by standard_id
        all_alignments.sort(key=lambda a: a.confidence, reverse=True)

        seen_ids = set()
        unique_alignments = []
        for a in all_alignments:
            if a.standard_id not in seen_ids:
                seen_ids.add(a.standard_id)
                unique_alignments.append(a)

        return unique_alignments[:self.config.max_alignments_per_question * 2]

    def get_standard_description(self, standard_id: str) -> Optional[str]:
        """Get description for a standard ID."""
        # Check cache
        for cache_key, standards in self._standards_cache.items():
            for standard in standards:
                if standard.get("standard_id") == standard_id:
                    return standard.get("description")

        return None

    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
