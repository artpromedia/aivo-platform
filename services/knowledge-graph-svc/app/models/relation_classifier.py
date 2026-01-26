"""
Relation Classifier

Classify relationships between educational concepts using
pattern matching, embeddings, and ML models.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class RelationType(Enum):
    """Types of relationships between educational concepts."""
    PREREQUISITE = "prerequisite"  # A must be learned before B
    RELATED = "related"            # A and B are related
    PART_OF = "part_of"           # A is part of B
    ENABLES = "enables"           # A enables understanding of B
    CONTRASTS = "contrasts"       # A contrasts with B
    EXAMPLE_OF = "example_of"     # A is an example of B
    SIMILAR_TO = "similar_to"     # A is similar to B
    EXTENDS = "extends"           # A extends/builds upon B
    APPLIES_TO = "applies_to"     # A applies to/is used in B
    SPECIALIZATION = "specialization"  # A is a specialization of B


@dataclass
class ClassifiedRelation:
    """Represents a classified relationship between concepts."""
    source: str
    target: str
    relation_type: RelationType
    confidence: float
    evidence: Optional[str] = None
    bidirectional: bool = False
    strength: float = 1.0  # Strength of the relationship (0-1)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RelationClassifierConfig:
    """Configuration for relation classification."""
    # Pattern matching settings
    use_patterns: bool = True

    # Embedding-based settings
    use_embeddings: bool = True
    embedding_model: str = "all-MiniLM-L6-v2"
    similarity_threshold: float = 0.7

    # ML model settings
    use_ml_model: bool = False
    model_path: Optional[str] = None

    # General settings
    min_confidence: float = 0.4
    default_relation: RelationType = RelationType.RELATED


# Linguistic patterns for relation extraction
RELATION_PATTERNS = {
    RelationType.PREREQUISITE: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:a\s+)?prerequisite(?:s)?\s+(?:for|to|of)\s+(?P<target>[A-Za-z\s]+)",
        r"(?:before|prior\s+to)\s+(?:learning|studying|understanding)\s+(?P<target>[A-Za-z\s]+),?\s+(?:you\s+)?(?:must|should|need\s+to)\s+(?:learn|study|understand|know)\s+(?P<source>[A-Za-z\s]+)",
        r"(?P<target>[A-Za-z\s]+)\s+requires?\s+(?:knowledge\s+of|understanding\s+of|familiarity\s+with)?\s*(?P<source>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:required|needed|necessary)\s+(?:for|to\s+understand|to\s+learn)\s+(?P<target>[A-Za-z\s]+)",
    ],
    RelationType.PART_OF: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:a\s+)?(?:part|component|element|aspect)\s+of\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<target>[A-Za-z\s]+)\s+(?:includes?|contains?|comprises?|consists?\s+of)\s+(?P<source>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:belongs?\s+to|falls?\s+under)\s+(?P<target>[A-Za-z\s]+)",
    ],
    RelationType.EXAMPLE_OF: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:an?\s+)?example(?:s)?\s+of\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<target>[A-Za-z\s]+)\s+(?:such\s+as|like|including|for\s+example)\s+(?P<source>[A-Za-z\s]+)",
        r"(?:examples?\s+of\s+)?(?P<target>[A-Za-z\s]+)\s+(?:include|are)\s+(?P<source>[A-Za-z\s]+)",
    ],
    RelationType.SIMILAR_TO: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:similar|analogous|comparable)\s+to\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:resembles?|is\s+like)\s+(?P<target>[A-Za-z\s]+)",
        r"(?:like|similar\s+to)\s+(?P<target>[A-Za-z\s]+),?\s+(?P<source>[A-Za-z\s]+)",
    ],
    RelationType.CONTRASTS: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:contrasts?|differs?)\s+(?:with|from)\s+(?P<target>[A-Za-z\s]+)",
        r"(?:unlike|in\s+contrast\s+to|as\s+opposed\s+to)\s+(?P<target>[A-Za-z\s]+),?\s+(?P<source>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:the\s+)?opposite\s+of\s+(?P<target>[A-Za-z\s]+)",
    ],
    RelationType.EXTENDS: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:extends?|builds?\s+(?:on|upon)|expands?)\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:an?\s+)?extension\s+of\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<target>[A-Za-z\s]+)\s+(?:leads?\s+to|evolves?\s+into)\s+(?P<source>[A-Za-z\s]+)",
    ],
    RelationType.APPLIES_TO: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:applies?\s+to|is\s+used\s+in|is\s+applied\s+to)\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<target>[A-Za-z\s]+)\s+uses?\s+(?P<source>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:applicable|relevant)\s+to\s+(?P<target>[A-Za-z\s]+)",
    ],
    RelationType.ENABLES: [
        r"(?P<source>[A-Za-z\s]+)\s+enables?\s+(?:understanding\s+of|learning)?\s*(?P<target>[A-Za-z\s]+)",
        r"(?:understanding|knowing|learning)\s+(?P<source>[A-Za-z\s]+)\s+(?:helps?|allows?|enables?)\s+(?:you\s+)?(?:to\s+)?(?:understand|learn)?\s*(?P<target>[A-Za-z\s]+)",
    ],
    RelationType.SPECIALIZATION: [
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:a\s+)?(?:type|kind|form|specialization)\s+of\s+(?P<target>[A-Za-z\s]+)",
        r"(?P<source>[A-Za-z\s]+)\s+(?:is|are)\s+(?:a\s+)?specific\s+(?:type|kind|form)\s+of\s+(?P<target>[A-Za-z\s]+)",
    ],
}

# Known educational concept relationships (curriculum-based)
KNOWN_RELATIONSHIPS = {
    # Mathematics
    ("arithmetic", "algebra"): RelationType.PREREQUISITE,
    ("algebra", "calculus"): RelationType.PREREQUISITE,
    ("algebra", "linear algebra"): RelationType.PREREQUISITE,
    ("calculus", "differential equations"): RelationType.PREREQUISITE,
    ("geometry", "trigonometry"): RelationType.PREREQUISITE,
    ("trigonometry", "calculus"): RelationType.PREREQUISITE,
    ("addition", "arithmetic"): RelationType.PART_OF,
    ("subtraction", "arithmetic"): RelationType.PART_OF,
    ("multiplication", "arithmetic"): RelationType.PART_OF,
    ("division", "arithmetic"): RelationType.PART_OF,
    ("derivatives", "calculus"): RelationType.PART_OF,
    ("integrals", "calculus"): RelationType.PART_OF,
    ("limits", "calculus"): RelationType.PART_OF,

    # Science
    ("atoms", "molecules"): RelationType.PREREQUISITE,
    ("molecules", "compounds"): RelationType.PREREQUISITE,
    ("cells", "organisms"): RelationType.PART_OF,
    ("photosynthesis", "biology"): RelationType.PART_OF,
    ("genetics", "biology"): RelationType.PART_OF,
    ("force", "physics"): RelationType.PART_OF,
    ("energy", "physics"): RelationType.PART_OF,
    ("electrons", "atoms"): RelationType.PART_OF,
    ("protons", "atoms"): RelationType.PART_OF,
    ("neutrons", "atoms"): RelationType.PART_OF,
    ("dna", "genetics"): RelationType.PART_OF,

    # Computer Science
    ("variables", "programming"): RelationType.PART_OF,
    ("functions", "programming"): RelationType.PART_OF,
    ("arrays", "data structures"): RelationType.PART_OF,
    ("lists", "data structures"): RelationType.PART_OF,
    ("trees", "data structures"): RelationType.PART_OF,
    ("graphs", "data structures"): RelationType.PART_OF,
    ("programming", "algorithms"): RelationType.PREREQUISITE,
    ("algorithms", "data structures"): RelationType.RELATED,
    ("sorting", "algorithms"): RelationType.PART_OF,
    ("searching", "algorithms"): RelationType.PART_OF,
}


class RelationClassifier:
    """
    Classify relationships between educational concepts.

    Methods:
    - Pattern-based classification using linguistic patterns
    - Embedding-based similarity for semantic relationships
    - Knowledge-base lookup for known relationships
    - ML model for learned classifications (optional)

    Usage:
        classifier = RelationClassifier()
        relation = classifier.classify("algebra", "calculus")
        print(relation.relation_type)  # RelationType.PREREQUISITE
    """

    def __init__(
        self,
        config: Optional[RelationClassifierConfig] = None,
        model_name: str = None,
    ):
        self.config = config or RelationClassifierConfig()
        self.model_name = model_name
        self._embedding_model = None
        self._ml_model = None
        self._initialized = False

        # Compile regex patterns
        self._compiled_patterns = {}
        for rel_type, patterns in RELATION_PATTERNS.items():
            self._compiled_patterns[rel_type] = [
                re.compile(p, re.IGNORECASE) for p in patterns
            ]

        logger.info("RelationClassifier initialized")

    def _ensure_initialized(self):
        """Lazy initialization of models."""
        if self._initialized:
            return

        if self.config.use_embeddings:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer(self.config.embedding_model)
            except ImportError:
                logger.warning("sentence-transformers not available, embedding-based classification disabled")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}")

        self._initialized = True

    def classify(
        self,
        concept_a: str,
        concept_b: str,
        context: Optional[str] = None,
    ) -> ClassifiedRelation:
        """
        Classify the relationship between two concepts.

        Args:
            concept_a: First concept (source)
            concept_b: Second concept (target)
            context: Optional context text containing both concepts

        Returns:
            ClassifiedRelation with relation type and confidence
        """
        self._ensure_initialized()

        # Normalize concept names
        concept_a_norm = concept_a.lower().strip()
        concept_b_norm = concept_b.lower().strip()

        # 1. Check known relationships first
        known_rel = self._check_known_relationships(concept_a_norm, concept_b_norm)
        if known_rel:
            return known_rel

        # 2. Pattern-based classification from context
        if context and self.config.use_patterns:
            pattern_rel = self._classify_from_patterns(concept_a, concept_b, context)
            if pattern_rel and pattern_rel.confidence >= self.config.min_confidence:
                return pattern_rel

        # 3. Embedding-based classification
        if self.config.use_embeddings and self._embedding_model:
            embedding_rel = self._classify_from_embeddings(concept_a, concept_b)
            if embedding_rel and embedding_rel.confidence >= self.config.min_confidence:
                return embedding_rel

        # 4. Default to RELATED with low confidence
        return ClassifiedRelation(
            source=concept_a,
            target=concept_b,
            relation_type=self.config.default_relation,
            confidence=0.3,
            evidence="No specific relationship detected",
            bidirectional=True,
        )

    def _check_known_relationships(
        self,
        concept_a: str,
        concept_b: str,
    ) -> Optional[ClassifiedRelation]:
        """Check if relationship exists in known relationships."""
        # Check direct relationship
        key = (concept_a, concept_b)
        if key in KNOWN_RELATIONSHIPS:
            return ClassifiedRelation(
                source=concept_a,
                target=concept_b,
                relation_type=KNOWN_RELATIONSHIPS[key],
                confidence=0.95,
                evidence="Known curriculum relationship",
                strength=1.0,
            )

        # Check reverse relationship
        key_reverse = (concept_b, concept_a)
        if key_reverse in KNOWN_RELATIONSHIPS:
            rel_type = KNOWN_RELATIONSHIPS[key_reverse]
            # Reverse the relationship direction
            return ClassifiedRelation(
                source=concept_b,
                target=concept_a,
                relation_type=rel_type,
                confidence=0.95,
                evidence="Known curriculum relationship (reversed)",
                strength=1.0,
            )

        return None

    def _classify_from_patterns(
        self,
        concept_a: str,
        concept_b: str,
        context: str,
    ) -> Optional[ClassifiedRelation]:
        """Classify relationship using linguistic patterns."""
        best_match = None
        best_confidence = 0.0

        for rel_type, patterns in self._compiled_patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(context):
                    source = match.group("source").strip().lower()
                    target = match.group("target").strip().lower()

                    # Check if matched concepts align with our concepts
                    source_match = self._concept_matches(source, concept_a, concept_b)
                    target_match = self._concept_matches(target, concept_a, concept_b)

                    if source_match and target_match and source_match != target_match:
                        # Calculate confidence based on match quality
                        confidence = self._calculate_pattern_confidence(
                            source, target, concept_a, concept_b
                        )

                        if confidence > best_confidence:
                            best_confidence = confidence
                            best_match = ClassifiedRelation(
                                source=source_match,
                                target=target_match,
                                relation_type=rel_type,
                                confidence=confidence,
                                evidence=match.group(0),
                            )

        return best_match

    def _concept_matches(
        self,
        extracted: str,
        concept_a: str,
        concept_b: str,
    ) -> Optional[str]:
        """Check if extracted text matches either concept."""
        extracted_lower = extracted.lower()
        concept_a_lower = concept_a.lower()
        concept_b_lower = concept_b.lower()

        if (extracted_lower in concept_a_lower or
            concept_a_lower in extracted_lower):
            return concept_a

        if (extracted_lower in concept_b_lower or
            concept_b_lower in extracted_lower):
            return concept_b

        return None

    def _calculate_pattern_confidence(
        self,
        source: str,
        target: str,
        concept_a: str,
        concept_b: str,
    ) -> float:
        """Calculate confidence for pattern-based match."""
        # Base confidence for pattern match
        confidence = 0.7

        # Boost for exact matches
        if source.lower() == concept_a.lower() or source.lower() == concept_b.lower():
            confidence += 0.1
        if target.lower() == concept_a.lower() or target.lower() == concept_b.lower():
            confidence += 0.1

        return min(0.95, confidence)

    def _classify_from_embeddings(
        self,
        concept_a: str,
        concept_b: str,
    ) -> Optional[ClassifiedRelation]:
        """Classify relationship using embedding similarity."""
        if not self._embedding_model:
            return None

        try:
            # Compute embeddings
            embeddings = self._embedding_model.encode([concept_a, concept_b])

            # Compute cosine similarity
            similarity = self._cosine_similarity(embeddings[0], embeddings[1])

            # Determine relationship based on similarity
            if similarity >= self.config.similarity_threshold:
                return ClassifiedRelation(
                    source=concept_a,
                    target=concept_b,
                    relation_type=RelationType.SIMILAR_TO,
                    confidence=float(similarity),
                    evidence=f"Semantic similarity: {similarity:.3f}",
                    bidirectional=True,
                    strength=float(similarity),
                )
            elif similarity >= 0.5:
                return ClassifiedRelation(
                    source=concept_a,
                    target=concept_b,
                    relation_type=RelationType.RELATED,
                    confidence=float(similarity),
                    evidence=f"Semantic similarity: {similarity:.3f}",
                    bidirectional=True,
                    strength=float(similarity),
                )

        except Exception as e:
            logger.warning(f"Embedding classification failed: {e}")

        return None

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between vectors."""
        dot = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def batch_classify(
        self,
        concept_pairs: List[Tuple[str, str]],
        context: Optional[str] = None,
    ) -> List[ClassifiedRelation]:
        """
        Classify multiple concept pairs efficiently.

        Args:
            concept_pairs: List of (concept_a, concept_b) tuples
            context: Optional shared context text

        Returns:
            List of ClassifiedRelation objects
        """
        return [
            self.classify(pair[0], pair[1], context)
            for pair in concept_pairs
        ]

    def extract_from_text(
        self,
        text: str,
        concepts: List[str],
    ) -> List[ClassifiedRelation]:
        """
        Extract relations between all pairs of concepts in text.

        Args:
            text: Text containing concepts
            concepts: List of concepts to find relationships between

        Returns:
            List of discovered relationships
        """
        self._ensure_initialized()

        relations = []
        processed_pairs = set()

        # Generate all pairs
        for i, concept_a in enumerate(concepts):
            for concept_b in concepts[i + 1:]:
                pair_key = tuple(sorted([concept_a.lower(), concept_b.lower()]))
                if pair_key in processed_pairs:
                    continue
                processed_pairs.add(pair_key)

                relation = self.classify(concept_a, concept_b, text)
                if relation.confidence >= self.config.min_confidence:
                    relations.append(relation)

        return relations

    def suggest_relations(
        self,
        concept: str,
        candidate_concepts: List[str],
        top_k: int = 5,
    ) -> List[ClassifiedRelation]:
        """
        Suggest most likely related concepts for a given concept.

        Args:
            concept: The source concept
            candidate_concepts: List of potential related concepts
            top_k: Number of suggestions to return

        Returns:
            Top-k most likely relationships sorted by confidence
        """
        self._ensure_initialized()

        relations = []
        for candidate in candidate_concepts:
            if candidate.lower() != concept.lower():
                relation = self.classify(concept, candidate)
                relations.append(relation)

        # Sort by confidence and strength
        relations.sort(key=lambda r: (r.confidence, r.strength), reverse=True)
        return relations[:top_k]

    def get_relation_types(self) -> List[str]:
        """Get all supported relation types."""
        return [rt.value for rt in RelationType]

    def validate_relation(
        self,
        relation: ClassifiedRelation,
        context: Optional[str] = None,
    ) -> Tuple[bool, float]:
        """
        Validate a proposed relation.

        Returns:
            Tuple of (is_valid, confidence)
        """
        # Re-classify and compare
        new_relation = self.classify(relation.source, relation.target, context)

        is_same_type = new_relation.relation_type == relation.relation_type
        confidence = new_relation.confidence

        return is_same_type, confidence
