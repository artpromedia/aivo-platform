"""
Topic Classifier

Classify content by topic and subject using keyword matching and TF-IDF.
"""
import logging
import re
from dataclasses import dataclass
from typing import List, Dict, Tuple, Set, Optional
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Classification:
    subject: str
    topic: str
    subtopic: str
    grade_level_min: int
    grade_level_max: int
    confidence: float


class TopicClassifier:
    """
    Classify content by topic and subject area using keyword matching and TF-IDF.

    Hierarchical classification:
    - Subject (Math, Science, ELA, Social Studies, Arts)
    - Topic (Algebra, Biology, Fiction)
    - Subtopic (Linear equations, Cells, Short stories)

    Usage:
        classifier = TopicClassifier()
        result = classifier.classify("Solve for x: 2x + 5 = 13")
    """

    # Comprehensive subject taxonomy with keywords and grade indicators
    TAXONOMY: Dict[str, Dict[str, Dict[str, Dict]]] = {
        "Mathematics": {
            "Arithmetic": {
                "keywords": ["add", "subtract", "multiply", "divide", "number", "count",
                            "sum", "difference", "product", "quotient", "digit"],
                "subtopics": {
                    "Addition": {"keywords": ["add", "sum", "plus", "total"], "grades": (1, 3)},
                    "Subtraction": {"keywords": ["subtract", "minus", "difference", "take away"], "grades": (1, 3)},
                    "Multiplication": {"keywords": ["multiply", "times", "product"], "grades": (2, 4)},
                    "Division": {"keywords": ["divide", "quotient", "remainder"], "grades": (3, 5)},
                },
                "grades": (1, 5)
            },
            "Algebra": {
                "keywords": ["equation", "variable", "solve", "linear", "quadratic",
                            "polynomial", "expression", "factor", "coefficient", "slope"],
                "subtopics": {
                    "Linear Equations": {"keywords": ["linear", "slope", "intercept", "mx + b", "y = mx"], "grades": (6, 9)},
                    "Quadratic Equations": {"keywords": ["quadratic", "parabola", "x^2", "x squared"], "grades": (8, 11)},
                    "Polynomials": {"keywords": ["polynomial", "factor", "degree", "term"], "grades": (9, 12)},
                    "Systems of Equations": {"keywords": ["system", "simultaneous", "substitution", "elimination"], "grades": (8, 11)},
                },
                "grades": (6, 12)
            },
            "Geometry": {
                "keywords": ["angle", "triangle", "circle", "area", "perimeter", "volume",
                            "polygon", "shape", "theorem", "proof", "congruent", "similar"],
                "subtopics": {
                    "Basic Shapes": {"keywords": ["square", "rectangle", "triangle", "circle"], "grades": (1, 4)},
                    "Area and Perimeter": {"keywords": ["area", "perimeter", "surface"], "grades": (3, 6)},
                    "Triangles": {"keywords": ["triangle", "pythagorean", "hypotenuse", "isosceles"], "grades": (6, 10)},
                    "Proofs": {"keywords": ["proof", "theorem", "postulate", "axiom"], "grades": (9, 12)},
                },
                "grades": (1, 12)
            },
            "Calculus": {
                "keywords": ["derivative", "integral", "limit", "function", "differentiate",
                            "integrate", "continuous", "rate of change", "antiderivative"],
                "subtopics": {
                    "Limits": {"keywords": ["limit", "approach", "continuous", "discontinuous"], "grades": (11, 12)},
                    "Derivatives": {"keywords": ["derivative", "differentiate", "rate of change", "slope"], "grades": (11, 12)},
                    "Integrals": {"keywords": ["integral", "integrate", "area under", "antiderivative"], "grades": (11, 12)},
                },
                "grades": (11, 12)
            },
            "Statistics": {
                "keywords": ["mean", "median", "mode", "probability", "data", "graph",
                            "histogram", "standard deviation", "variance", "distribution"],
                "subtopics": {
                    "Descriptive Statistics": {"keywords": ["mean", "median", "mode", "average"], "grades": (5, 8)},
                    "Probability": {"keywords": ["probability", "chance", "odds", "likely"], "grades": (6, 10)},
                    "Data Analysis": {"keywords": ["data", "graph", "chart", "histogram"], "grades": (4, 10)},
                },
                "grades": (4, 12)
            },
        },
        "Science": {
            "Biology": {
                "keywords": ["cell", "organism", "DNA", "evolution", "species", "ecosystem",
                            "photosynthesis", "genetics", "protein", "organism", "life"],
                "subtopics": {
                    "Cells": {"keywords": ["cell", "membrane", "nucleus", "mitochondria", "organelle"], "grades": (6, 10)},
                    "Genetics": {"keywords": ["DNA", "gene", "chromosome", "heredity", "mutation"], "grades": (8, 12)},
                    "Evolution": {"keywords": ["evolution", "natural selection", "adaptation", "species"], "grades": (7, 12)},
                    "Ecology": {"keywords": ["ecosystem", "habitat", "food chain", "biodiversity"], "grades": (5, 10)},
                },
                "grades": (3, 12)
            },
            "Chemistry": {
                "keywords": ["atom", "molecule", "element", "compound", "reaction", "bond",
                            "periodic table", "electron", "proton", "neutron", "ion"],
                "subtopics": {
                    "Atomic Structure": {"keywords": ["atom", "electron", "proton", "neutron", "nucleus"], "grades": (7, 11)},
                    "Chemical Reactions": {"keywords": ["reaction", "reactant", "product", "balance"], "grades": (8, 12)},
                    "Periodic Table": {"keywords": ["element", "periodic", "metal", "nonmetal"], "grades": (6, 10)},
                    "Bonding": {"keywords": ["bond", "ionic", "covalent", "molecular"], "grades": (9, 12)},
                },
                "grades": (6, 12)
            },
            "Physics": {
                "keywords": ["force", "energy", "motion", "velocity", "acceleration", "mass",
                            "gravity", "momentum", "wave", "electricity", "magnetism"],
                "subtopics": {
                    "Mechanics": {"keywords": ["force", "motion", "velocity", "acceleration", "newton"], "grades": (8, 12)},
                    "Energy": {"keywords": ["energy", "kinetic", "potential", "conservation"], "grades": (6, 12)},
                    "Waves": {"keywords": ["wave", "frequency", "amplitude", "wavelength", "sound", "light"], "grades": (7, 12)},
                    "Electricity": {"keywords": ["electricity", "current", "voltage", "circuit", "ohm"], "grades": (8, 12)},
                },
                "grades": (6, 12)
            },
            "Earth Science": {
                "keywords": ["rock", "mineral", "earthquake", "volcano", "weather", "climate",
                            "plate tectonic", "erosion", "atmosphere", "ocean"],
                "subtopics": {
                    "Geology": {"keywords": ["rock", "mineral", "earthquake", "volcano", "plate"], "grades": (4, 10)},
                    "Weather": {"keywords": ["weather", "climate", "temperature", "precipitation"], "grades": (3, 8)},
                    "Oceanography": {"keywords": ["ocean", "marine", "tide", "current"], "grades": (5, 10)},
                },
                "grades": (3, 12)
            },
        },
        "English Language Arts": {
            "Reading": {
                "keywords": ["read", "comprehension", "passage", "text", "main idea",
                            "inference", "context", "vocabulary", "fluency"],
                "subtopics": {
                    "Comprehension": {"keywords": ["comprehension", "understand", "main idea", "detail"], "grades": (1, 8)},
                    "Vocabulary": {"keywords": ["vocabulary", "word", "definition", "context clue"], "grades": (1, 12)},
                    "Analysis": {"keywords": ["analyze", "inference", "interpret", "evidence"], "grades": (6, 12)},
                },
                "grades": (1, 12)
            },
            "Writing": {
                "keywords": ["write", "essay", "paragraph", "sentence", "grammar",
                            "punctuation", "thesis", "argument", "narrative", "draft"],
                "subtopics": {
                    "Grammar": {"keywords": ["grammar", "punctuation", "spelling", "sentence"], "grades": (1, 8)},
                    "Essays": {"keywords": ["essay", "thesis", "argument", "introduction", "conclusion"], "grades": (5, 12)},
                    "Creative Writing": {"keywords": ["creative", "story", "narrative", "poem", "fiction"], "grades": (3, 12)},
                },
                "grades": (1, 12)
            },
            "Literature": {
                "keywords": ["novel", "poem", "story", "author", "character", "plot",
                            "theme", "setting", "conflict", "literary"],
                "subtopics": {
                    "Fiction": {"keywords": ["fiction", "novel", "story", "character", "plot"], "grades": (3, 12)},
                    "Poetry": {"keywords": ["poem", "poetry", "verse", "rhyme", "meter", "stanza"], "grades": (2, 12)},
                    "Drama": {"keywords": ["play", "drama", "act", "scene", "dialogue"], "grades": (5, 12)},
                },
                "grades": (2, 12)
            },
        },
        "Social Studies": {
            "History": {
                "keywords": ["history", "war", "revolution", "civilization", "century",
                            "ancient", "medieval", "modern", "president", "government"],
                "subtopics": {
                    "Ancient History": {"keywords": ["ancient", "rome", "greece", "egypt", "mesopotamia"], "grades": (5, 10)},
                    "World History": {"keywords": ["world war", "europe", "asia", "civilization"], "grades": (6, 12)},
                    "American History": {"keywords": ["america", "colonial", "revolution", "civil war", "constitution"], "grades": (4, 12)},
                },
                "grades": (3, 12)
            },
            "Geography": {
                "keywords": ["map", "continent", "country", "region", "climate",
                            "landform", "population", "migration", "resource"],
                "subtopics": {
                    "Physical Geography": {"keywords": ["landform", "mountain", "river", "climate zone"], "grades": (3, 8)},
                    "Human Geography": {"keywords": ["population", "culture", "migration", "urbanization"], "grades": (6, 12)},
                    "Maps and Navigation": {"keywords": ["map", "latitude", "longitude", "scale", "legend"], "grades": (3, 8)},
                },
                "grades": (3, 12)
            },
            "Civics": {
                "keywords": ["government", "democracy", "constitution", "rights", "vote",
                            "law", "citizen", "president", "congress", "court"],
                "subtopics": {
                    "Government Structure": {"keywords": ["branch", "executive", "legislative", "judicial"], "grades": (5, 12)},
                    "Rights and Responsibilities": {"keywords": ["rights", "amendment", "freedom", "duty"], "grades": (4, 12)},
                    "Elections": {"keywords": ["vote", "election", "candidate", "campaign"], "grades": (4, 12)},
                },
                "grades": (3, 12)
            },
        },
        "Arts": {
            "Visual Arts": {
                "keywords": ["art", "draw", "paint", "color", "sculpture", "design",
                            "composition", "perspective", "medium", "canvas"],
                "subtopics": {
                    "Drawing": {"keywords": ["draw", "sketch", "line", "shade"], "grades": (1, 12)},
                    "Painting": {"keywords": ["paint", "brush", "canvas", "color"], "grades": (1, 12)},
                    "Art History": {"keywords": ["artist", "movement", "renaissance", "impressionism"], "grades": (6, 12)},
                },
                "grades": (1, 12)
            },
            "Music": {
                "keywords": ["music", "note", "rhythm", "melody", "instrument", "compose",
                            "tempo", "key", "chord", "scale"],
                "subtopics": {
                    "Music Theory": {"keywords": ["note", "scale", "chord", "key", "tempo"], "grades": (4, 12)},
                    "Performance": {"keywords": ["perform", "instrument", "sing", "concert"], "grades": (1, 12)},
                    "Music History": {"keywords": ["composer", "classical", "baroque", "jazz", "symphony"], "grades": (6, 12)},
                },
                "grades": (1, 12)
            },
        },
    }

    # Difficulty indicators for grade level estimation
    DIFFICULTY_INDICATORS: Dict[str, Tuple[int, int]] = {
        # Simple words suggest lower grades
        "simple": (1, 4),
        "basic": (1, 5),
        "introduction": (1, 6),
        "beginner": (1, 5),
        "fundamental": (3, 7),
        # Medium difficulty
        "intermediate": (5, 9),
        "moderate": (5, 9),
        # Advanced indicators
        "advanced": (9, 12),
        "complex": (8, 12),
        "sophisticated": (10, 12),
        "theoretical": (10, 12),
        "abstract": (9, 12),
    }

    def __init__(self):
        """Initialize the TopicClassifier with precomputed keyword sets."""
        self._build_keyword_index()
        logger.info("TopicClassifier initialized")

    def _build_keyword_index(self) -> None:
        """Build inverted index from keywords to (subject, topic, subtopic)."""
        self._keyword_index: Dict[str, List[Tuple[str, str, Optional[str], Tuple[int, int]]]] = {}

        for subject, topics in self.TAXONOMY.items():
            for topic, topic_data in topics.items():
                # Index topic-level keywords
                for keyword in topic_data.get("keywords", []):
                    keyword_lower = keyword.lower()
                    if keyword_lower not in self._keyword_index:
                        self._keyword_index[keyword_lower] = []
                    self._keyword_index[keyword_lower].append(
                        (subject, topic, None, topic_data.get("grades", (1, 12)))
                    )

                # Index subtopic-level keywords
                for subtopic, subtopic_data in topic_data.get("subtopics", {}).items():
                    for keyword in subtopic_data.get("keywords", []):
                        keyword_lower = keyword.lower()
                        if keyword_lower not in self._keyword_index:
                            self._keyword_index[keyword_lower] = []
                        self._keyword_index[keyword_lower].append(
                            (subject, topic, subtopic, subtopic_data.get("grades", topic_data.get("grades", (1, 12))))
                        )

    def _tokenize(self, text: str) -> List[str]:
        """Extract words from text."""
        return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

    def _extract_ngrams(self, text: str, n: int = 2) -> List[str]:
        """Extract word n-grams from text."""
        words = self._tokenize(text)
        ngrams = []
        for i in range(len(words) - n + 1):
            ngrams.append(' '.join(words[i:i+n]))
        return ngrams

    def _compute_keyword_scores(
        self, text: str
    ) -> Dict[Tuple[str, str, Optional[str]], float]:
        """
        Compute classification scores based on keyword matching.

        Returns:
            Dictionary mapping (subject, topic, subtopic) to match scores
        """
        text_lower = text.lower()
        tokens = set(self._tokenize(text))
        bigrams = set(self._extract_ngrams(text, 2))

        scores: Dict[Tuple[str, str, Optional[str]], Dict[str, float]] = {}

        # Match single-word keywords
        for token in tokens:
            if token in self._keyword_index:
                for subject, topic, subtopic, grades in self._keyword_index[token]:
                    key = (subject, topic, subtopic)
                    if key not in scores:
                        scores[key] = {"match_count": 0, "weight_sum": 0.0, "grades": grades}
                    scores[key]["match_count"] += 1
                    # Weight longer keywords higher
                    scores[key]["weight_sum"] += 1.0 + len(token) / 20.0

        # Match multi-word keywords (phrases)
        for keyword, entries in self._keyword_index.items():
            if ' ' in keyword and keyword in text_lower:
                for subject, topic, subtopic, grades in entries:
                    key = (subject, topic, subtopic)
                    if key not in scores:
                        scores[key] = {"match_count": 0, "weight_sum": 0.0, "grades": grades}
                    scores[key]["match_count"] += 2  # Phrase matches count more
                    scores[key]["weight_sum"] += 2.0

        # Compute final scores
        final_scores: Dict[Tuple[str, str, Optional[str]], float] = {}
        for key, data in scores.items():
            # Score combines match count and weighted importance
            final_scores[key] = data["match_count"] * 0.5 + data["weight_sum"] * 0.5

        return final_scores

    def _estimate_grade_from_text(self, text: str) -> Tuple[int, int]:
        """Estimate grade level from difficulty indicators in text."""
        text_lower = text.lower()
        min_grade = 1
        max_grade = 12

        for indicator, (ind_min, ind_max) in self.DIFFICULTY_INDICATORS.items():
            if indicator in text_lower:
                min_grade = max(min_grade, ind_min)
                max_grade = min(max_grade, ind_max)

        # Also consider vocabulary complexity
        words = self._tokenize(text)
        if words:
            avg_word_length = sum(len(w) for w in words) / len(words)
            if avg_word_length > 8:
                min_grade = max(min_grade, 7)
            elif avg_word_length > 6:
                min_grade = max(min_grade, 4)

        return (min_grade, max_grade)

    def classify(self, text: str) -> Classification:
        """
        Classify content by topic using keyword matching and TF-IDF scoring.

        Args:
            text: Content text to classify

        Returns:
            Classification with subject, topic, subtopic, grade range, and confidence
        """
        if not text or not text.strip():
            return Classification(
                subject="Unknown",
                topic="Unknown",
                subtopic="Unknown",
                grade_level_min=1,
                grade_level_max=12,
                confidence=0.0
            )

        scores = self._compute_keyword_scores(text)

        if not scores:
            # No keyword matches - return unknown classification
            grade_min, grade_max = self._estimate_grade_from_text(text)
            return Classification(
                subject="Unknown",
                topic="Unknown",
                subtopic="Unknown",
                grade_level_min=grade_min,
                grade_level_max=grade_max,
                confidence=0.1
            )

        # Find best match
        best_key = max(scores.keys(), key=lambda k: scores[k])
        best_score = scores[best_key]
        subject, topic, subtopic = best_key

        # Compute confidence based on score magnitude and distinctiveness
        total_score = sum(scores.values())
        confidence = min(best_score / max(total_score, 1) * 0.7 + min(best_score / 10, 0.3), 0.99)

        # Get grade range from taxonomy or estimate
        if subtopic:
            grades = self.TAXONOMY[subject][topic]["subtopics"][subtopic].get(
                "grades", self.TAXONOMY[subject][topic].get("grades", (1, 12))
            )
        else:
            grades = self.TAXONOMY[subject][topic].get("grades", (1, 12))

        # Adjust grade range based on text difficulty indicators
        text_grades = self._estimate_grade_from_text(text)
        grade_min = max(grades[0], text_grades[0])
        grade_max = min(grades[1], text_grades[1])

        # Ensure valid range
        if grade_min > grade_max:
            grade_min, grade_max = grades

        return Classification(
            subject=subject,
            topic=topic,
            subtopic=subtopic or topic,
            grade_level_min=grade_min,
            grade_level_max=grade_max,
            confidence=round(confidence, 3)
        )

    def classify_multi_label(self, text: str, threshold: float = 0.3) -> List[Classification]:
        """
        Classify content with multiple labels for interdisciplinary content.

        Args:
            text: Content text to classify
            threshold: Minimum relative score threshold for inclusion (0-1)

        Returns:
            List of Classifications ordered by confidence
        """
        if not text or not text.strip():
            return []

        scores = self._compute_keyword_scores(text)

        if not scores:
            return []

        # Get max score for relative thresholding
        max_score = max(scores.values())
        total_score = sum(scores.values())

        classifications = []

        for key, score in sorted(scores.items(), key=lambda x: -x[1]):
            # Apply relative threshold
            if score < threshold * max_score:
                continue

            subject, topic, subtopic = key
            confidence = min(score / max(total_score, 1) * 0.7 + min(score / 10, 0.3), 0.99)

            # Get grade range
            if subtopic:
                grades = self.TAXONOMY[subject][topic]["subtopics"][subtopic].get(
                    "grades", self.TAXONOMY[subject][topic].get("grades", (1, 12))
                )
            else:
                grades = self.TAXONOMY[subject][topic].get("grades", (1, 12))

            classifications.append(Classification(
                subject=subject,
                topic=topic,
                subtopic=subtopic or topic,
                grade_level_min=grades[0],
                grade_level_max=grades[1],
                confidence=round(confidence, 3)
            ))

        return classifications

    def estimate_grade_level(self, text: str) -> Tuple[int, int]:
        """
        Estimate appropriate grade level range for content.

        Uses both topic classification and text complexity analysis.

        Args:
            text: Content text to analyze

        Returns:
            Tuple of (min_grade, max_grade) from 1-12
        """
        if not text or not text.strip():
            return (1, 12)

        # Get classification-based grade estimate
        classification = self.classify(text)
        class_grades = (classification.grade_level_min, classification.grade_level_max)

        # Get text complexity-based estimate
        text_grades = self._estimate_grade_from_text(text)

        # Analyze vocabulary complexity
        words = self._tokenize(text)
        if not words:
            return class_grades

        # Word length analysis
        avg_word_length = sum(len(w) for w in words) / len(words)
        unique_ratio = len(set(words)) / len(words)

        # Sentence complexity (if detectable)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        avg_sentence_length = len(words) / max(len(sentences), 1)

        # Estimate grade from complexity metrics
        complexity_grade_min = 1
        complexity_grade_max = 12

        if avg_word_length > 8:
            complexity_grade_min = max(complexity_grade_min, 8)
        elif avg_word_length > 6:
            complexity_grade_min = max(complexity_grade_min, 5)
        elif avg_word_length < 4.5:
            complexity_grade_max = min(complexity_grade_max, 6)

        if avg_sentence_length > 25:
            complexity_grade_min = max(complexity_grade_min, 7)
        elif avg_sentence_length > 15:
            complexity_grade_min = max(complexity_grade_min, 4)
        elif avg_sentence_length < 8:
            complexity_grade_max = min(complexity_grade_max, 5)

        if unique_ratio > 0.8:
            complexity_grade_min = max(complexity_grade_min, 6)

        # Combine estimates (intersection favoring classification)
        final_min = max(class_grades[0], text_grades[0], complexity_grade_min)
        final_max = min(class_grades[1], text_grades[1], complexity_grade_max)

        # Ensure valid range
        if final_min > final_max:
            return class_grades

        return (final_min, final_max)

    def get_subject_keywords(self, subject: str) -> List[str]:
        """
        Get all keywords associated with a subject.

        Args:
            subject: Subject name (e.g., "Mathematics")

        Returns:
            List of keywords
        """
        keywords = []
        if subject in self.TAXONOMY:
            for topic_data in self.TAXONOMY[subject].values():
                keywords.extend(topic_data.get("keywords", []))
                for subtopic_data in topic_data.get("subtopics", {}).values():
                    keywords.extend(subtopic_data.get("keywords", []))
        return list(set(keywords))

    def get_all_subjects(self) -> List[str]:
        """Get list of all subjects in the taxonomy."""
        return list(self.TAXONOMY.keys())

    def get_topics_for_subject(self, subject: str) -> List[str]:
        """Get list of topics for a subject."""
        if subject in self.TAXONOMY:
            return list(self.TAXONOMY[subject].keys())
        return []
