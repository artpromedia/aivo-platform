"""
Advanced Reasoning Engine

Perform reasoning and inference over the knowledge graph including:
- Transitive closure (if A->B->C, then A->C)
- Common prerequisite inference
- Skill composition (combining skills)
- Analogy reasoning (if X is to Y as A is to B)
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set, Tuple
from collections import deque
from enum import Enum
import re

import numpy as np

logger = logging.getLogger(__name__)


class RuleType(str, Enum):
    """Types of inference rules."""
    TRANSITIVE = "transitive"
    SYMMETRIC = "symmetric"
    INVERSE = "inverse"
    COMPOSITION = "composition"
    ANALOGY = "analogy"
    SUBSUMPTION = "subsumption"


@dataclass
class ReasoningStep:
    """A single step in a reasoning chain."""
    step_type: str
    input_concepts: List[str]
    output_concepts: List[str]
    rule_applied: str
    confidence: float = 1.0
    explanation: str = ""


@dataclass
class ReasoningResult:
    """Result of reasoning/inference."""
    answer: str
    confidence: float
    reasoning_chain: List[ReasoningStep]
    supporting_facts: List[str]
    alternative_answers: List[Tuple[str, float]] = field(default_factory=list)


@dataclass
class InferenceRule:
    """Declarative inference rule."""
    name: str
    rule_type: RuleType
    pattern: str  # e.g., "(?x prerequisite ?y) AND (?y prerequisite ?z) => (?x prerequisite ?z)"
    confidence_factor: float = 0.9
    description: str = ""


@dataclass
class DerivedFact:
    """A fact derived through inference."""
    subject: str
    predicate: str
    object: str
    confidence: float
    provenance: List[str]  # List of source facts
    rule_used: str


@dataclass
class AdvancedReasoningConfig:
    """Configuration for advanced reasoning."""
    max_inference_depth: int = 5
    min_confidence_threshold: float = 0.3
    max_reasoning_steps: int = 20
    enable_analogy: bool = True
    enable_composition: bool = True
    cache_inferences: bool = True


# Knowledge graph for reasoning
KNOWLEDGE_BASE = {
    # Format: (subject, predicate, object, confidence)
    # Mathematics
    ("arithmetic", "prerequisite", "algebra", 1.0),
    ("algebra", "prerequisite", "calculus", 1.0),
    ("algebra", "prerequisite", "linear_algebra", 1.0),
    ("geometry", "prerequisite", "trigonometry", 1.0),
    ("trigonometry", "prerequisite", "calculus", 1.0),
    ("calculus", "prerequisite", "differential_equations", 1.0),
    ("linear_algebra", "prerequisite", "differential_equations", 1.0),
    ("fractions", "prerequisite", "algebra", 1.0),
    ("fractions", "prerequisite", "probability", 1.0),
    ("algebra", "prerequisite", "statistics", 1.0),
    ("probability", "related_to", "statistics", 1.0),

    # Domain membership
    ("arithmetic", "part_of", "mathematics", 1.0),
    ("algebra", "part_of", "mathematics", 1.0),
    ("calculus", "part_of", "mathematics", 1.0),
    ("geometry", "part_of", "mathematics", 1.0),
    ("trigonometry", "part_of", "mathematics", 1.0),
    ("linear_algebra", "part_of", "mathematics", 1.0),
    ("statistics", "part_of", "mathematics", 1.0),
    ("probability", "part_of", "mathematics", 1.0),

    # Computer Science
    ("programming", "prerequisite", "data_structures", 1.0),
    ("data_structures", "prerequisite", "algorithms", 1.0),
    ("linear_algebra", "prerequisite", "machine_learning", 1.0),
    ("statistics", "prerequisite", "machine_learning", 1.0),
    ("programming", "prerequisite", "machine_learning", 1.0),
    ("machine_learning", "prerequisite", "deep_learning", 1.0),
    ("calculus", "prerequisite", "deep_learning", 1.0),

    # Domain membership - CS
    ("programming", "part_of", "computer_science", 1.0),
    ("data_structures", "part_of", "computer_science", 1.0),
    ("algorithms", "part_of", "computer_science", 1.0),
    ("machine_learning", "part_of", "computer_science", 1.0),
    ("deep_learning", "part_of", "computer_science", 1.0),

    # Science
    ("calculus", "prerequisite", "physics", 1.0),
    ("algebra", "prerequisite", "chemistry", 1.0),
    ("chemistry", "related_to", "biology", 1.0),
    ("biology", "prerequisite", "genetics", 1.0),
    ("probability", "prerequisite", "genetics", 1.0),

    # Component relationships
    ("addition", "component_of", "arithmetic", 1.0),
    ("subtraction", "component_of", "arithmetic", 1.0),
    ("multiplication", "component_of", "arithmetic", 1.0),
    ("division", "component_of", "arithmetic", 1.0),
    ("derivatives", "component_of", "calculus", 1.0),
    ("integrals", "component_of", "calculus", 1.0),
    ("limits", "component_of", "calculus", 1.0),
    ("matrices", "component_of", "linear_algebra", 1.0),
    ("vectors", "component_of", "linear_algebra", 1.0),

    # Similarity relationships
    ("algebra", "similar_to", "arithmetic", 0.6),
    ("calculus", "similar_to", "algebra", 0.5),
    ("statistics", "similar_to", "probability", 0.8),
    ("deep_learning", "similar_to", "machine_learning", 0.7),

    # Analogy pairs (for analogy reasoning)
    # Format: (A, B) is analogous to (C, D) where A:B :: C:D
}

# Relation properties for inference
RELATION_PROPERTIES = {
    "prerequisite": {
        "transitive": True,
        "symmetric": False,
        "inverse": "enables",
        "confidence_decay": 0.85,
    },
    "related_to": {
        "transitive": False,
        "symmetric": True,
        "inverse": "related_to",
        "confidence_decay": 0.9,
    },
    "part_of": {
        "transitive": True,
        "symmetric": False,
        "inverse": "contains",
        "confidence_decay": 0.95,
    },
    "component_of": {
        "transitive": False,
        "symmetric": False,
        "inverse": "has_component",
        "confidence_decay": 1.0,
    },
    "similar_to": {
        "transitive": False,
        "symmetric": True,
        "inverse": "similar_to",
        "confidence_decay": 0.7,
    },
    "enables": {
        "transitive": True,
        "symmetric": False,
        "inverse": "prerequisite",
        "confidence_decay": 0.85,
    },
}

# Built-in inference rules
DEFAULT_RULES = [
    InferenceRule(
        name="transitive_prerequisite",
        rule_type=RuleType.TRANSITIVE,
        pattern="(?x prerequisite ?y) AND (?y prerequisite ?z) => (?x prerequisite ?z)",
        confidence_factor=0.85,
        description="If A is prerequisite for B and B is prerequisite for C, then A is prerequisite for C",
    ),
    InferenceRule(
        name="symmetric_related",
        rule_type=RuleType.SYMMETRIC,
        pattern="(?x related_to ?y) => (?y related_to ?x)",
        confidence_factor=1.0,
        description="related_to is symmetric",
    ),
    InferenceRule(
        name="inverse_prerequisite",
        rule_type=RuleType.INVERSE,
        pattern="(?x prerequisite ?y) => (?y enables ?x)",
        confidence_factor=1.0,
        description="prerequisite and enables are inverses",
    ),
    InferenceRule(
        name="component_prerequisite",
        rule_type=RuleType.COMPOSITION,
        pattern="(?x component_of ?y) AND (?y prerequisite ?z) => (?x prerequisite ?z)",
        confidence_factor=0.7,
        description="Components of a prerequisite are also prerequisites",
    ),
    InferenceRule(
        name="domain_prerequisite",
        rule_type=RuleType.SUBSUMPTION,
        pattern="(?x prerequisite ?y) AND (?y part_of ?d) => (?x related_to ?d)",
        confidence_factor=0.6,
        description="Prerequisites relate to the domain of their dependents",
    ),
]


class AdvancedReasoningEngine:
    """
    Advanced reasoning and inference over the knowledge graph.

    Capabilities:
    - Transitive closure (if A->B->C, then A->C)
    - Common prerequisite inference
    - Skill composition (combining skills)
    - Analogy reasoning (if X is to Y as A is to B)

    Usage:
        engine = AdvancedReasoningEngine()
        result = engine.infer_transitive_prerequisites("calculus")
        analogy = engine.reason_by_analogy(("arithmetic", "algebra"), "geometry")
    """

    def __init__(
        self,
        config: Optional[AdvancedReasoningConfig] = None,
        rules: Optional[List[InferenceRule]] = None,
    ):
        self.config = config or AdvancedReasoningConfig()
        self.rules = rules or DEFAULT_RULES

        # Build knowledge base
        self._facts: Set[Tuple[str, str, str]] = set()
        self._fact_confidence: Dict[Tuple[str, str, str], float] = {}
        self._subject_index: Dict[str, Set[Tuple[str, str, str]]] = {}
        self._predicate_index: Dict[str, Set[Tuple[str, str, str]]] = {}
        self._object_index: Dict[str, Set[Tuple[str, str, str]]] = {}

        # Derived facts cache
        self._derived_facts: Dict[Tuple[str, str, str], DerivedFact] = {}

        # All concepts
        self._all_concepts: Set[str] = set()

        self._load_knowledge_base()
        logger.info(f"AdvancedReasoningEngine initialized with {len(self._facts)} facts")

    def _load_knowledge_base(self):
        """Load knowledge base into indexed structures."""
        for item in KNOWLEDGE_BASE:
            if len(item) == 4:
                subj, pred, obj, conf = item
            else:
                subj, pred, obj = item
                conf = 1.0

            self._add_fact(subj, pred, obj, conf)

    def _add_fact(
        self,
        subject: str,
        predicate: str,
        object_: str,
        confidence: float = 1.0,
    ):
        """Add a fact to the knowledge base."""
        fact = (subject.lower(), predicate.lower(), object_.lower())
        self._facts.add(fact)
        self._fact_confidence[fact] = confidence

        # Update indices
        if fact[0] not in self._subject_index:
            self._subject_index[fact[0]] = set()
        self._subject_index[fact[0]].add(fact)

        if fact[1] not in self._predicate_index:
            self._predicate_index[fact[1]] = set()
        self._predicate_index[fact[1]].add(fact)

        if fact[2] not in self._object_index:
            self._object_index[fact[2]] = set()
        self._object_index[fact[2]].add(fact)

        # Track concepts
        self._all_concepts.add(fact[0])
        self._all_concepts.add(fact[2])

    def infer_transitive_prerequisites(
        self,
        concept_id: str,
        max_depth: Optional[int] = None,
    ) -> List[str]:
        """
        Infer all transitive prerequisites for a concept.

        Args:
            concept_id: Target concept
            max_depth: Maximum inference depth

        Returns:
            List of prerequisite concepts (direct and inferred)
        """
        concept = concept_id.lower()
        max_depth = max_depth or self.config.max_inference_depth
        prerequisites = set()
        visited = set()
        queue = deque([(concept, 0)])

        while queue:
            current, depth = queue.popleft()

            if current in visited or depth > max_depth:
                continue
            visited.add(current)

            # Find direct prerequisites
            for fact in self._object_index.get(current, set()):
                subj, pred, obj = fact
                if pred == "prerequisite":
                    if subj not in prerequisites:
                        prerequisites.add(subj)
                        queue.append((subj, depth + 1))

        return sorted(list(prerequisites))

    def find_common_prerequisites(
        self,
        concepts: List[str],
    ) -> List[str]:
        """
        Find prerequisites common to all given concepts.

        Args:
            concepts: List of concepts to analyze

        Returns:
            List of common prerequisites
        """
        if not concepts:
            return []

        # Get prerequisites for each concept
        prereq_sets = []
        for concept in concepts:
            prereqs = set(self.infer_transitive_prerequisites(concept))
            prereq_sets.append(prereqs)

        # Find intersection
        if prereq_sets:
            common = prereq_sets[0]
            for prereq_set in prereq_sets[1:]:
                common = common.intersection(prereq_set)
            return sorted(list(common))

        return []

    def reason_by_analogy(
        self,
        source_pair: Tuple[str, str],
        target_start: str,
    ) -> str:
        """
        Reason by analogy to complete A:B :: C:?

        Args:
            source_pair: (A, B) where A is to B
            target_start: C, to find what C is to

        Returns:
            The inferred concept D where A:B :: C:D
        """
        a, b = source_pair[0].lower(), source_pair[1].lower()
        c = target_start.lower()

        # Find relationship between A and B
        relations_ab = self._find_relations(a, b)

        if not relations_ab:
            return ""

        # Find concepts related to C with the same relationship
        best_match = None
        best_confidence = 0.0

        for relation, confidence in relations_ab:
            # Look for (C, relation, ?)
            for fact in self._subject_index.get(c, set()):
                subj, pred, obj = fact
                if pred == relation:
                    fact_conf = self._fact_confidence.get(fact, 1.0)
                    combined_conf = confidence * fact_conf

                    if combined_conf > best_confidence:
                        best_confidence = combined_conf
                        best_match = obj

        return best_match or ""

    def answer_question(
        self,
        question: str,
        graph_context: Optional[List[str]] = None,
    ) -> ReasoningResult:
        """
        Answer a natural language question using reasoning.

        Args:
            question: Natural language question
            graph_context: Optional list of concepts to focus on

        Returns:
            ReasoningResult with answer and reasoning chain
        """
        question_lower = question.lower()
        reasoning_chain = []
        supporting_facts = []

        # Extract concepts from question
        concepts = self._extract_concepts(question_lower)
        if graph_context:
            concepts = list(set(concepts + [c.lower() for c in graph_context]))

        # Pattern matching for question types
        if "prerequisite" in question_lower or "required for" in question_lower:
            return self._answer_prerequisite_question(question_lower, concepts)
        elif "common" in question_lower:
            return self._answer_common_question(question_lower, concepts)
        elif "path" in question_lower or "how to learn" in question_lower:
            return self._answer_path_question(question_lower, concepts)
        elif "similar" in question_lower or "like" in question_lower:
            return self._answer_similarity_question(question_lower, concepts)
        elif "analogy" in question_lower or "is to" in question_lower:
            return self._answer_analogy_question(question_lower, concepts)
        elif "why" in question_lower:
            return self._answer_why_question(question_lower, concepts)
        else:
            return self._answer_general_question(question_lower, concepts)

    def apply_inference_rules(
        self,
        max_iterations: int = 10,
    ) -> List[DerivedFact]:
        """
        Apply all inference rules to derive new facts.

        Args:
            max_iterations: Maximum number of rule application iterations

        Returns:
            List of newly derived facts
        """
        new_facts = []

        for iteration in range(max_iterations):
            derived_this_round = []

            for rule in self.rules:
                derived = self._apply_rule(rule)
                derived_this_round.extend(derived)

            if not derived_this_round:
                break  # Fixed point reached

            new_facts.extend(derived_this_round)

        return new_facts

    def get_reasoning_explanation(
        self,
        subject: str,
        predicate: str,
        object_: str,
    ) -> ReasoningResult:
        """
        Explain why a relationship holds (or doesn't).

        Args:
            subject: Source concept
            predicate: Relationship type
            object_: Target concept

        Returns:
            ReasoningResult with explanation
        """
        subject = subject.lower()
        predicate = predicate.lower()
        object_ = object_.lower()

        reasoning_chain = []
        supporting_facts = []

        # Check if it's a direct fact
        fact = (subject, predicate, object_)
        if fact in self._facts:
            confidence = self._fact_confidence.get(fact, 1.0)
            reasoning_chain.append(ReasoningStep(
                step_type="direct_fact",
                input_concepts=[subject, object_],
                output_concepts=[],
                rule_applied="direct_lookup",
                confidence=confidence,
                explanation=f"Direct fact: {subject} {predicate} {object_}",
            ))
            return ReasoningResult(
                answer=f"Yes, {subject} {predicate} {object_} (direct fact)",
                confidence=confidence,
                reasoning_chain=reasoning_chain,
                supporting_facts=[f"{subject} {predicate} {object_}"],
            )

        # Try to infer
        if predicate == "prerequisite":
            chain = self._find_prerequisite_chain(subject, object_)
            if chain:
                confidence = 0.85 ** (len(chain) - 1)
                for i in range(len(chain) - 1):
                    reasoning_chain.append(ReasoningStep(
                        step_type="transitive",
                        input_concepts=[chain[i], chain[i+1]],
                        output_concepts=[],
                        rule_applied="transitive_prerequisite",
                        confidence=0.85,
                        explanation=f"{chain[i]} is prerequisite for {chain[i+1]}",
                    ))
                    supporting_facts.append(f"{chain[i]} prerequisite {chain[i+1]}")

                return ReasoningResult(
                    answer=f"Yes, {subject} is a transitive prerequisite of {object_}",
                    confidence=confidence,
                    reasoning_chain=reasoning_chain,
                    supporting_facts=supporting_facts,
                )

        # Check for symmetric relation
        props = RELATION_PROPERTIES.get(predicate, {})
        if props.get("symmetric"):
            reverse_fact = (object_, predicate, subject)
            if reverse_fact in self._facts:
                confidence = self._fact_confidence.get(reverse_fact, 1.0)
                reasoning_chain.append(ReasoningStep(
                    step_type="symmetric",
                    input_concepts=[object_, subject],
                    output_concepts=[subject, object_],
                    rule_applied="symmetric_relation",
                    confidence=confidence,
                    explanation=f"{predicate} is symmetric, so {object_} {predicate} {subject} implies {subject} {predicate} {object_}",
                ))
                return ReasoningResult(
                    answer=f"Yes, by symmetry of {predicate}",
                    confidence=confidence,
                    reasoning_chain=reasoning_chain,
                    supporting_facts=[f"{object_} {predicate} {subject}"],
                )

        # Not found
        return ReasoningResult(
            answer=f"No evidence found that {subject} {predicate} {object_}",
            confidence=0.0,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _find_relations(
        self,
        concept_a: str,
        concept_b: str,
    ) -> List[Tuple[str, float]]:
        """Find all relations between two concepts."""
        relations = []

        for fact in self._subject_index.get(concept_a, set()):
            subj, pred, obj = fact
            if obj == concept_b:
                relations.append((pred, self._fact_confidence.get(fact, 1.0)))

        return relations

    def _find_prerequisite_chain(
        self,
        source: str,
        target: str,
    ) -> List[str]:
        """Find prerequisite chain from source to target."""
        if source == target:
            return [source]

        # BFS to find path
        queue = deque([(source, [source])])
        visited = {source}

        while queue:
            current, path = queue.popleft()

            # Find concepts that current is prerequisite for
            for fact in self._subject_index.get(current, set()):
                subj, pred, obj = fact
                if pred == "prerequisite":
                    if obj == target:
                        return path + [obj]

                    if obj not in visited:
                        visited.add(obj)
                        queue.append((obj, path + [obj]))

        return []

    def _extract_concepts(self, text: str) -> List[str]:
        """Extract concept mentions from text."""
        found = []
        for concept in self._all_concepts:
            # Check for concept name
            if concept in text or concept.replace("_", " ") in text:
                found.append(concept)
        return found

    def _apply_rule(self, rule: InferenceRule) -> List[DerivedFact]:
        """Apply a single inference rule."""
        derived = []

        if rule.rule_type == RuleType.TRANSITIVE:
            derived.extend(self._apply_transitive_rule(rule))
        elif rule.rule_type == RuleType.SYMMETRIC:
            derived.extend(self._apply_symmetric_rule(rule))
        elif rule.rule_type == RuleType.INVERSE:
            derived.extend(self._apply_inverse_rule(rule))
        elif rule.rule_type == RuleType.COMPOSITION:
            derived.extend(self._apply_composition_rule(rule))

        return derived

    def _apply_transitive_rule(self, rule: InferenceRule) -> List[DerivedFact]:
        """Apply transitive inference rule."""
        derived = []

        # Parse rule pattern (simplified)
        # Pattern: "(?x prerequisite ?y) AND (?y prerequisite ?z) => (?x prerequisite ?z)"
        predicate = "prerequisite"  # Extract from pattern

        for fact1 in self._predicate_index.get(predicate, set()):
            x, _, y = fact1
            for fact2 in self._subject_index.get(y, set()):
                y2, pred2, z = fact2
                if pred2 == predicate:
                    new_fact = (x, predicate, z)
                    if new_fact not in self._facts and new_fact not in self._derived_facts:
                        conf1 = self._fact_confidence.get(fact1, 1.0)
                        conf2 = self._fact_confidence.get(fact2, 1.0)
                        new_conf = conf1 * conf2 * rule.confidence_factor

                        if new_conf >= self.config.min_confidence_threshold:
                            derived_fact = DerivedFact(
                                subject=x,
                                predicate=predicate,
                                object=z,
                                confidence=new_conf,
                                provenance=[f"{x} {predicate} {y}", f"{y} {predicate} {z}"],
                                rule_used=rule.name,
                            )
                            self._derived_facts[new_fact] = derived_fact
                            derived.append(derived_fact)

        return derived

    def _apply_symmetric_rule(self, rule: InferenceRule) -> List[DerivedFact]:
        """Apply symmetric inference rule."""
        derived = []
        predicate = "related_to"  # Extract from pattern

        for fact in self._predicate_index.get(predicate, set()):
            x, _, y = fact
            reverse_fact = (y, predicate, x)

            if reverse_fact not in self._facts and reverse_fact not in self._derived_facts:
                conf = self._fact_confidence.get(fact, 1.0) * rule.confidence_factor

                derived_fact = DerivedFact(
                    subject=y,
                    predicate=predicate,
                    object=x,
                    confidence=conf,
                    provenance=[f"{x} {predicate} {y}"],
                    rule_used=rule.name,
                )
                self._derived_facts[reverse_fact] = derived_fact
                derived.append(derived_fact)

        return derived

    def _apply_inverse_rule(self, rule: InferenceRule) -> List[DerivedFact]:
        """Apply inverse relation rule."""
        derived = []
        predicate = "prerequisite"
        inverse = "enables"

        for fact in self._predicate_index.get(predicate, set()):
            x, _, y = fact
            inverse_fact = (y, inverse, x)

            if inverse_fact not in self._facts and inverse_fact not in self._derived_facts:
                conf = self._fact_confidence.get(fact, 1.0) * rule.confidence_factor

                derived_fact = DerivedFact(
                    subject=y,
                    predicate=inverse,
                    object=x,
                    confidence=conf,
                    provenance=[f"{x} {predicate} {y}"],
                    rule_used=rule.name,
                )
                self._derived_facts[inverse_fact] = derived_fact
                derived.append(derived_fact)

        return derived

    def _apply_composition_rule(self, rule: InferenceRule) -> List[DerivedFact]:
        """Apply composition rule."""
        derived = []
        # Component of + prerequisite => prerequisite

        for fact1 in self._predicate_index.get("component_of", set()):
            x, _, y = fact1
            for fact2 in self._subject_index.get(y, set()):
                y2, pred2, z = fact2
                if pred2 == "prerequisite":
                    new_fact = (x, "prerequisite", z)
                    if new_fact not in self._facts and new_fact not in self._derived_facts:
                        conf1 = self._fact_confidence.get(fact1, 1.0)
                        conf2 = self._fact_confidence.get(fact2, 1.0)
                        new_conf = conf1 * conf2 * rule.confidence_factor

                        if new_conf >= self.config.min_confidence_threshold:
                            derived_fact = DerivedFact(
                                subject=x,
                                predicate="prerequisite",
                                object=z,
                                confidence=new_conf,
                                provenance=[f"{x} component_of {y}", f"{y} prerequisite {z}"],
                                rule_used=rule.name,
                            )
                            self._derived_facts[new_fact] = derived_fact
                            derived.append(derived_fact)

        return derived

    def _answer_prerequisite_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer prerequisite-related questions."""
        if concepts:
            concept = concepts[0]
            prereqs = self.infer_transitive_prerequisites(concept)

            reasoning_chain = [
                ReasoningStep(
                    step_type="query",
                    input_concepts=[concept],
                    output_concepts=prereqs,
                    rule_applied="transitive_prerequisite",
                    confidence=0.9,
                    explanation=f"Found {len(prereqs)} prerequisites for {concept}",
                )
            ]

            if prereqs:
                answer = f"Prerequisites for {concept}: {', '.join(prereqs)}"
            else:
                answer = f"No prerequisites found for {concept}"

            return ReasoningResult(
                answer=answer,
                confidence=0.9,
                reasoning_chain=reasoning_chain,
                supporting_facts=[f"{p} prerequisite {concept}" for p in prereqs[:5]],
            )

        return ReasoningResult(
            answer="Could not identify concept in question",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_common_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer questions about common prerequisites."""
        if len(concepts) >= 2:
            common = self.find_common_prerequisites(concepts)

            reasoning_chain = [
                ReasoningStep(
                    step_type="intersection",
                    input_concepts=concepts,
                    output_concepts=common,
                    rule_applied="common_prerequisite",
                    confidence=0.85,
                    explanation=f"Found {len(common)} common prerequisites",
                )
            ]

            if common:
                answer = f"Common prerequisites for {', '.join(concepts)}: {', '.join(common)}"
            else:
                answer = f"No common prerequisites found for {', '.join(concepts)}"

            return ReasoningResult(
                answer=answer,
                confidence=0.85,
                reasoning_chain=reasoning_chain,
                supporting_facts=[],
            )

        return ReasoningResult(
            answer="Please specify at least two concepts to find common prerequisites",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_path_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer path-related questions."""
        if len(concepts) >= 2:
            source, target = concepts[0], concepts[1]
            chain = self._find_prerequisite_chain(source, target)

            if chain:
                answer = f"Learning path: {' -> '.join(chain)}"
                confidence = 0.85 ** (len(chain) - 1)
            else:
                # Try reverse
                chain = self._find_prerequisite_chain(target, source)
                if chain:
                    answer = f"Learning path: {' -> '.join(chain)}"
                    confidence = 0.85 ** (len(chain) - 1)
                else:
                    answer = f"No direct learning path found between {source} and {target}"
                    confidence = 0.3

            return ReasoningResult(
                answer=answer,
                confidence=confidence,
                reasoning_chain=[],
                supporting_facts=[],
            )

        return ReasoningResult(
            answer="Please specify two concepts to find a path between",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_similarity_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer similarity questions."""
        if concepts:
            concept = concepts[0]
            similar = []

            for fact in self._subject_index.get(concept, set()):
                subj, pred, obj = fact
                if pred == "similar_to":
                    similar.append((obj, self._fact_confidence.get(fact, 1.0)))

            for fact in self._object_index.get(concept, set()):
                subj, pred, obj = fact
                if pred == "similar_to":
                    similar.append((subj, self._fact_confidence.get(fact, 1.0)))

            similar.sort(key=lambda x: x[1], reverse=True)

            if similar:
                answer = f"Concepts similar to {concept}: {', '.join(s[0] for s in similar)}"
                confidence = similar[0][1] if similar else 0.5
            else:
                answer = f"No similar concepts found for {concept}"
                confidence = 0.3

            return ReasoningResult(
                answer=answer,
                confidence=confidence,
                reasoning_chain=[],
                supporting_facts=[],
            )

        return ReasoningResult(
            answer="Please specify a concept to find similar topics",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_analogy_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer analogy questions."""
        # Look for "A is to B as C is to ?"
        pattern = r"(\w+)\s+is\s+to\s+(\w+)\s+as\s+(\w+)\s+is\s+to"
        match = re.search(pattern, question)

        if match:
            a, b, c = match.group(1), match.group(2), match.group(3)
            d = self.reason_by_analogy((a, b), c)

            if d:
                answer = f"{a} is to {b} as {c} is to {d}"
                confidence = 0.7
            else:
                answer = f"Could not complete analogy: {a}:{b}::{c}:?"
                confidence = 0.3

            return ReasoningResult(
                answer=answer,
                confidence=confidence,
                reasoning_chain=[
                    ReasoningStep(
                        step_type="analogy",
                        input_concepts=[a, b, c],
                        output_concepts=[d] if d else [],
                        rule_applied="analogy_reasoning",
                        confidence=confidence,
                        explanation=f"Applied analogical reasoning from {a}:{b} to {c}:?",
                    )
                ],
                supporting_facts=[],
            )

        return ReasoningResult(
            answer="Could not parse analogy pattern. Use format: 'A is to B as C is to ?'",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_why_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer 'why' questions with explanations."""
        if len(concepts) >= 2:
            source, target = concepts[0], concepts[1]

            # Check for direct relationship
            for pred in ["prerequisite", "related_to", "part_of"]:
                fact = (source, pred, target)
                if fact in self._facts:
                    return ReasoningResult(
                        answer=f"{source} {pred} {target} is a direct fact in the knowledge base",
                        confidence=self._fact_confidence.get(fact, 1.0),
                        reasoning_chain=[
                            ReasoningStep(
                                step_type="direct",
                                input_concepts=[source],
                                output_concepts=[target],
                                rule_applied="direct_lookup",
                                confidence=1.0,
                                explanation=f"Direct relationship: {source} {pred} {target}",
                            )
                        ],
                        supporting_facts=[f"{source} {pred} {target}"],
                    )

            # Check for transitive chain
            chain = self._find_prerequisite_chain(source, target)
            if chain:
                steps = []
                for i in range(len(chain) - 1):
                    steps.append(ReasoningStep(
                        step_type="transitive",
                        input_concepts=[chain[i]],
                        output_concepts=[chain[i+1]],
                        rule_applied="transitive_prerequisite",
                        confidence=0.85,
                        explanation=f"{chain[i]} is prerequisite for {chain[i+1]}",
                    ))

                return ReasoningResult(
                    answer=f"{source} is a transitive prerequisite of {target} through chain: {' -> '.join(chain)}",
                    confidence=0.85 ** (len(chain) - 1),
                    reasoning_chain=steps,
                    supporting_facts=[f"{chain[i]} prerequisite {chain[i+1]}" for i in range(len(chain)-1)],
                )

        return ReasoningResult(
            answer="Could not find explanation for the relationship",
            confidence=0.3,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def _answer_general_question(
        self,
        question: str,
        concepts: List[str],
    ) -> ReasoningResult:
        """Answer general questions."""
        if concepts:
            concept = concepts[0]

            # Gather information about the concept
            facts_about = list(self._subject_index.get(concept, set()))
            facts_related = list(self._object_index.get(concept, set()))

            info_parts = []
            if facts_about:
                info_parts.append(f"has {len(facts_about)} outgoing relations")
            if facts_related:
                info_parts.append(f"has {len(facts_related)} incoming relations")

            if info_parts:
                answer = f"Information about {concept}: {', '.join(info_parts)}"
            else:
                answer = f"No information found about {concept}"

            return ReasoningResult(
                answer=answer,
                confidence=0.6,
                reasoning_chain=[],
                supporting_facts=[f"{f[0]} {f[1]} {f[2]}" for f in facts_about[:3]],
            )

        return ReasoningResult(
            answer="Could not understand the question. Try asking about prerequisites, paths, or similarities.",
            confidence=0.2,
            reasoning_chain=[],
            supporting_facts=[],
        )

    def get_all_facts(self) -> List[Tuple[str, str, str, float]]:
        """Get all facts including derived ones."""
        facts = []
        for fact in self._facts:
            facts.append((*fact, self._fact_confidence.get(fact, 1.0)))
        for fact, derived in self._derived_facts.items():
            facts.append((*fact, derived.confidence))
        return facts

    def get_derived_facts(self) -> List[DerivedFact]:
        """Get all derived facts."""
        return list(self._derived_facts.values())

    def add_fact(
        self,
        subject: str,
        predicate: str,
        object_: str,
        confidence: float = 1.0,
    ):
        """Add a new fact to the knowledge base."""
        self._add_fact(subject, predicate, object_, confidence)

    def get_statistics(self) -> Dict[str, Any]:
        """Get reasoning engine statistics."""
        predicate_counts = {}
        for fact in self._facts:
            pred = fact[1]
            predicate_counts[pred] = predicate_counts.get(pred, 0) + 1

        return {
            "total_facts": len(self._facts),
            "total_concepts": len(self._all_concepts),
            "derived_facts": len(self._derived_facts),
            "predicate_counts": predicate_counts,
            "rules_count": len(self.rules),
        }
