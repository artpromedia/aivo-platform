"""
Distractor Generator for MCQ Items.

Generates plausible wrong answers (distractors) for multiple choice questions
using multiple approaches: semantic similarity, WordNet, and entity replacement.
"""

import logging
import random
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import nltk
from nltk.corpus import wordnet as wn

logger = logging.getLogger(__name__)

# Ensure NLTK data is available
try:
    nltk.data.find("corpora/wordnet")
except LookupError:
    nltk.download("wordnet", quiet=True)
    nltk.download("omw-1.4", quiet=True)


@dataclass
class Distractor:
    """A single distractor with metadata."""

    text: str
    similarity_score: float
    generation_method: str  # semantic, wordnet, entity, pattern
    quality_score: float = 0.0


@dataclass
class DistractorSet:
    """A set of distractors for an MCQ item."""

    correct_answer: str
    distractors: List[Distractor]
    question: Optional[str] = None


@dataclass
class DistractorGeneratorConfig:
    """Configuration for distractor generation."""

    use_sentence_transformer: bool = True
    use_wordnet: bool = True
    use_entity_replacement: bool = True
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    num_distractors: int = 3
    min_similarity: float = 0.3
    max_similarity: float = 0.85
    device: str = "cpu"


class DistractorGenerator:
    """
    Generate plausible distractors for multiple choice questions.

    Uses multiple approaches:
    1. Semantic similarity - find semantically similar but incorrect options
    2. WordNet - find hypernyms, hyponyms, and co-hyponyms
    3. Entity replacement - replace with same-type entities from context
    4. Pattern-based - generate variations based on answer patterns

    Usage:
        generator = DistractorGenerator()
        result = generator.generate(
            question="What is the capital of France?",
            correct_answer="Paris",
            context="France is a country in Europe. Paris is its capital.",
            num_distractors=3
        )
    """

    # Common entity type replacement pools
    ENTITY_POOLS = {
        "country": [
            "Germany",
            "Spain",
            "Italy",
            "Portugal",
            "Netherlands",
            "Belgium",
            "Austria",
            "Switzerland",
            "Poland",
            "Sweden",
        ],
        "city": [
            "London",
            "Berlin",
            "Madrid",
            "Rome",
            "Vienna",
            "Amsterdam",
            "Brussels",
            "Warsaw",
            "Prague",
            "Dublin",
        ],
        "person": [
            "Alexander",
            "Napoleon",
            "Caesar",
            "Churchill",
            "Roosevelt",
            "Lincoln",
            "Washington",
            "Jefferson",
            "Franklin",
            "Kennedy",
        ],
        "year": lambda a: [
            str(int(a) + offset)
            for offset in [-10, -5, -2, -1, 1, 2, 5, 10]
            if a.isdigit()
        ][:4],
        "number": lambda a: [
            str(int(a) * m + o)
            for m, o in [(1, 10), (1, -10), (2, 0), (0.5, 0)]
            if a.isdigit()
        ][:4],
    }

    def __init__(self, config: Optional[DistractorGeneratorConfig] = None):
        """Initialize the distractor generator."""
        self.config = config or DistractorGeneratorConfig()
        self._sentence_model = None
        self._sentence_model_loaded = False
        self._spacy_nlp = None
        logger.info("DistractorGenerator initialized")

    def _load_sentence_model(self) -> None:
        """Lazy load sentence transformer model."""
        if not self._sentence_model_loaded and self.config.use_sentence_transformer:
            try:
                from sentence_transformers import SentenceTransformer

                self._sentence_model = SentenceTransformer(
                    self.config.sentence_transformer_model,
                    device=self.config.device,
                )
                self._sentence_model_loaded = True
                logger.info(
                    f"Loaded sentence transformer: {self.config.sentence_transformer_model}"
                )
            except ImportError:
                logger.warning(
                    "sentence-transformers not installed, semantic similarity disabled"
                )
            except Exception as e:
                logger.warning(f"Failed to load sentence transformer: {e}")

    def _load_spacy(self):
        """Lazy load spaCy for entity extraction."""
        if self._spacy_nlp is None:
            try:
                import spacy

                self._spacy_nlp = spacy.load("en_core_web_sm")
            except Exception as e:
                logger.warning(f"Failed to load spaCy: {e}")
        return self._spacy_nlp

    def generate(
        self,
        question: str,
        correct_answer: str,
        context: Optional[str] = None,
        num_distractors: int = 3,
    ) -> DistractorSet:
        """
        Generate distractors for a question.

        Args:
            question: The question text
            correct_answer: The correct answer
            context: Optional context/passage
            num_distractors: Number of distractors to generate

        Returns:
            DistractorSet with generated distractors
        """
        all_distractors: List[Distractor] = []

        # Try different generation methods
        if self.config.use_wordnet:
            wn_distractors = self._generate_wordnet_distractors(
                correct_answer, num_distractors
            )
            all_distractors.extend(wn_distractors)

        if self.config.use_sentence_transformer and context:
            semantic_distractors = self._generate_semantic_distractors(
                correct_answer, context, num_distractors
            )
            all_distractors.extend(semantic_distractors)

        if self.config.use_entity_replacement:
            entity_distractors = self._generate_entity_distractors(
                correct_answer, context, num_distractors
            )
            all_distractors.extend(entity_distractors)

        # Add pattern-based distractors as fallback
        pattern_distractors = self._generate_pattern_distractors(
            correct_answer, question, num_distractors
        )
        all_distractors.extend(pattern_distractors)

        # Deduplicate and filter
        filtered = self._filter_distractors(
            all_distractors, correct_answer, num_distractors
        )

        # Calculate quality scores
        for d in filtered:
            d.quality_score = self._calculate_quality_score(
                d, correct_answer, question
            )

        return DistractorSet(
            correct_answer=correct_answer,
            distractors=filtered[:num_distractors],
            question=question,
        )

    def _generate_wordnet_distractors(
        self, answer: str, num: int
    ) -> List[Distractor]:
        """Generate distractors using WordNet relationships."""
        distractors = []
        answer_lower = answer.lower()

        try:
            # Get synsets for the answer
            synsets = wn.synsets(answer_lower)
            if not synsets:
                return []

            primary_synset = synsets[0]
            candidates: Set[str] = set()

            # Get hypernyms (more general terms)
            for hypernym in primary_synset.hypernyms():
                for lemma in hypernym.lemmas():
                    name = lemma.name().replace("_", " ")
                    if name.lower() != answer_lower:
                        candidates.add(name)

            # Get hyponyms (more specific terms)
            for hyponym in primary_synset.hyponyms():
                for lemma in hyponym.lemmas():
                    name = lemma.name().replace("_", " ")
                    if name.lower() != answer_lower:
                        candidates.add(name)

            # Get co-hyponyms (siblings - same parent)
            for hypernym in primary_synset.hypernyms():
                for sibling in hypernym.hyponyms():
                    if sibling != primary_synset:
                        for lemma in sibling.lemmas():
                            name = lemma.name().replace("_", " ")
                            if name.lower() != answer_lower:
                                candidates.add(name)

            # Get similar terms
            for synset in synsets[:3]:
                for similar in synset.similar_tos():
                    for lemma in similar.lemmas():
                        name = lemma.name().replace("_", " ")
                        if name.lower() != answer_lower:
                            candidates.add(name)

            # Convert to distractors
            for candidate in list(candidates)[:num * 2]:
                # Calculate similarity using path similarity
                candidate_synsets = wn.synsets(candidate.lower().replace(" ", "_"))
                if candidate_synsets:
                    sim = primary_synset.path_similarity(candidate_synsets[0])
                    if sim is None:
                        sim = 0.3
                else:
                    sim = 0.3

                distractors.append(
                    Distractor(
                        text=candidate.title() if answer[0].isupper() else candidate,
                        similarity_score=min(sim, 0.8),
                        generation_method="wordnet",
                    )
                )

        except Exception as e:
            logger.warning(f"WordNet distractor generation failed: {e}")

        return distractors

    def _generate_semantic_distractors(
        self, answer: str, context: str, num: int
    ) -> List[Distractor]:
        """Generate distractors using semantic similarity."""
        self._load_sentence_model()

        if self._sentence_model is None:
            return []

        distractors = []

        try:
            # Extract candidate terms from context
            nlp = self._load_spacy()
            if nlp is None:
                return []

            doc = nlp(context)

            # Get noun phrases and entities as candidates
            candidates = set()
            for chunk in doc.noun_chunks:
                text = chunk.text.strip()
                if (
                    text.lower() != answer.lower()
                    and len(text) > 2
                    and len(text) < 50
                ):
                    candidates.add(text)

            for ent in doc.ents:
                text = ent.text.strip()
                if (
                    text.lower() != answer.lower()
                    and len(text) > 2
                    and len(text) < 50
                ):
                    candidates.add(text)

            if not candidates:
                return []

            # Encode answer and candidates
            answer_embedding = self._sentence_model.encode(
                [answer], convert_to_tensor=True
            )
            candidate_list = list(candidates)
            candidate_embeddings = self._sentence_model.encode(
                candidate_list, convert_to_tensor=True
            )

            # Calculate similarities
            from sentence_transformers import util

            similarities = util.pytorch_cos_sim(
                answer_embedding, candidate_embeddings
            )[0]

            # Select candidates with moderate similarity
            for i, (candidate, sim) in enumerate(
                zip(candidate_list, similarities.tolist())
            ):
                if self.config.min_similarity <= sim <= self.config.max_similarity:
                    distractors.append(
                        Distractor(
                            text=candidate,
                            similarity_score=sim,
                            generation_method="semantic",
                        )
                    )

            # Sort by similarity (prefer moderate similarity)
            distractors.sort(
                key=lambda d: abs(d.similarity_score - 0.6)
            )

        except Exception as e:
            logger.warning(f"Semantic distractor generation failed: {e}")

        return distractors[:num * 2]

    def _generate_entity_distractors(
        self, answer: str, context: Optional[str], num: int
    ) -> List[Distractor]:
        """Generate distractors by replacing with same-type entities."""
        distractors = []

        # Detect answer type
        answer_type = self._detect_answer_type(answer)

        if answer_type in self.ENTITY_POOLS:
            pool = self.ENTITY_POOLS[answer_type]
            if callable(pool):
                candidates = pool(answer)
            else:
                candidates = [c for c in pool if c.lower() != answer.lower()]
                random.shuffle(candidates)

            for candidate in candidates[:num]:
                distractors.append(
                    Distractor(
                        text=candidate,
                        similarity_score=0.7,
                        generation_method="entity",
                    )
                )

        # Also extract entities from context if available
        if context:
            nlp = self._load_spacy()
            if nlp:
                doc = nlp(context)
                answer_ent_type = None

                # Find the entity type of the answer
                for ent in doc.ents:
                    if ent.text.lower() == answer.lower():
                        answer_ent_type = ent.label_
                        break

                # Find other entities of the same type
                if answer_ent_type:
                    for ent in doc.ents:
                        if (
                            ent.label_ == answer_ent_type
                            and ent.text.lower() != answer.lower()
                        ):
                            distractors.append(
                                Distractor(
                                    text=ent.text,
                                    similarity_score=0.75,
                                    generation_method="entity",
                                )
                            )

        return distractors

    def _generate_pattern_distractors(
        self, answer: str, question: str, num: int
    ) -> List[Distractor]:
        """Generate distractors based on answer patterns."""
        distractors = []

        # Year patterns
        if re.match(r"^\d{4}$", answer):
            year = int(answer)
            for offset in [-5, -10, 5, 10]:
                distractors.append(
                    Distractor(
                        text=str(year + offset),
                        similarity_score=0.6,
                        generation_method="pattern",
                    )
                )

        # Number patterns
        elif re.match(r"^\d+$", answer):
            num_val = int(answer)
            for mult in [0.5, 0.75, 1.5, 2.0]:
                distractors.append(
                    Distractor(
                        text=str(int(num_val * mult)),
                        similarity_score=0.5,
                        generation_method="pattern",
                    )
                )

        # Percentage patterns
        elif re.match(r"^\d+%$", answer):
            pct = int(answer.rstrip("%"))
            for offset in [-10, -5, 5, 10]:
                new_pct = max(0, min(100, pct + offset))
                if new_pct != pct:
                    distractors.append(
                        Distractor(
                            text=f"{new_pct}%",
                            similarity_score=0.6,
                            generation_method="pattern",
                        )
                    )

        # Boolean patterns
        elif answer.lower() in ("true", "false", "yes", "no"):
            opposites = {
                "true": "false",
                "false": "true",
                "yes": "no",
                "no": "yes",
            }
            opposite = opposites.get(answer.lower(), "")
            if opposite:
                distractors.append(
                    Distractor(
                        text=opposite.capitalize() if answer[0].isupper() else opposite,
                        similarity_score=0.5,
                        generation_method="pattern",
                    )
                )

        return distractors

    def _detect_answer_type(self, answer: str) -> str:
        """Detect the type of answer for entity replacement."""
        answer_lower = answer.lower()

        # Check for year
        if re.match(r"^\d{4}$", answer):
            return "year"

        # Check for number
        if re.match(r"^\d+$", answer):
            return "number"

        # Check common cities
        cities = {
            "paris",
            "london",
            "berlin",
            "rome",
            "tokyo",
            "new york",
            "beijing",
            "moscow",
        }
        if answer_lower in cities:
            return "city"

        # Check common countries
        countries = {
            "france",
            "germany",
            "italy",
            "spain",
            "china",
            "japan",
            "russia",
            "brazil",
        }
        if answer_lower in countries:
            return "country"

        # Default to checking if it's a proper noun (capitalized)
        if answer[0].isupper():
            return "person"  # Guess it's a person name

        return "unknown"

    def _filter_distractors(
        self,
        distractors: List[Distractor],
        correct_answer: str,
        num: int,
    ) -> List[Distractor]:
        """Filter and deduplicate distractors."""
        seen = {correct_answer.lower()}
        filtered = []

        for d in distractors:
            text_lower = d.text.lower().strip()

            # Skip if too similar to correct answer
            if text_lower == correct_answer.lower():
                continue

            # Skip duplicates
            if text_lower in seen:
                continue

            # Skip if text is empty or too short
            if len(d.text.strip()) < 2:
                continue

            # Skip if too similar (substring)
            if (
                text_lower in correct_answer.lower()
                or correct_answer.lower() in text_lower
            ):
                continue

            seen.add(text_lower)
            filtered.append(d)

        # Sort by quality (similarity close to 0.6 is ideal)
        filtered.sort(
            key=lambda d: (
                d.generation_method == "semantic",  # Prefer semantic
                -abs(d.similarity_score - 0.6),  # Prefer moderate similarity
            ),
            reverse=True,
        )

        return filtered[:num]

    def _calculate_quality_score(
        self,
        distractor: Distractor,
        correct_answer: str,
        question: str,
    ) -> float:
        """Calculate quality score for a distractor."""
        score = 0.5  # Base score

        # Method bonus
        method_scores = {
            "semantic": 0.3,
            "wordnet": 0.25,
            "entity": 0.2,
            "pattern": 0.1,
        }
        score += method_scores.get(distractor.generation_method, 0)

        # Similarity bonus (prefer moderate similarity)
        sim = distractor.similarity_score
        if 0.4 <= sim <= 0.7:
            score += 0.2
        elif 0.3 <= sim <= 0.8:
            score += 0.1

        # Length similarity bonus
        len_ratio = len(distractor.text) / max(len(correct_answer), 1)
        if 0.5 <= len_ratio <= 2.0:
            score += 0.1

        return min(1.0, score)

    def generate_semantic(
        self, correct_answer: str, num_distractors: int = 3
    ) -> List[str]:
        """Generate semantically similar distractors only."""
        # This is a simplified version without context
        distractors = self._generate_wordnet_distractors(
            correct_answer, num_distractors
        )
        return [d.text for d in distractors[:num_distractors]]

    def filter_by_quality(
        self,
        distractors: List[str],
        correct_answer: str,
        min_quality: float = 0.5,
    ) -> List[str]:
        """Filter distractors by minimum quality threshold."""
        result = []
        for text in distractors:
            d = Distractor(
                text=text,
                similarity_score=0.5,
                generation_method="unknown",
            )
            score = self._calculate_quality_score(d, correct_answer, "")
            if score >= min_quality:
                result.append(text)
        return result
