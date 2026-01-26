"""
Argumentation Detector

Detects and analyzes argument structure in persuasive/argumentative writing.
Identifies claims, evidence, reasoning, counterarguments, and rebuttals.

Based on:
- Argument Mining research
- Toulmin model of argumentation
- BIO tagging for sequence labeling
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class ArgumentComponentType(Enum):
    """Types of argument components."""

    CLAIM = "claim"
    MAJOR_CLAIM = "major_claim"
    EVIDENCE = "evidence"
    REASONING = "reasoning"
    COUNTERARGUMENT = "counterargument"
    REBUTTAL = "rebuttal"
    CONCLUSION = "conclusion"


class BIOTag(Enum):
    """BIO tags for sequence labeling."""

    B_CLAIM = "B-Claim"
    I_CLAIM = "I-Claim"
    B_MAJOR_CLAIM = "B-MajorClaim"
    I_MAJOR_CLAIM = "I-MajorClaim"
    B_EVIDENCE = "B-Evidence"
    I_EVIDENCE = "I-Evidence"
    B_REASONING = "B-Reasoning"
    I_REASONING = "I-Reasoning"
    B_COUNTERARGUMENT = "B-Counterargument"
    I_COUNTERARGUMENT = "I-Counterargument"
    B_REBUTTAL = "B-Rebuttal"
    I_REBUTTAL = "I-Rebuttal"
    O = "O"  # Outside any component


@dataclass
class ArgumentComponent:
    """Single argument component with metadata."""

    component_id: str
    component_type: ArgumentComponentType
    text: str
    span: Tuple[int, int]  # (start, end) character positions
    confidence: float
    supports: Optional[str] = None  # ID of component it supports
    attacks: Optional[str] = None  # ID of component it attacks
    component_quality: float = 0.0
    bio_tags: List[str] = field(default_factory=list)


@dataclass
class ArgumentRelation:
    """Relationship between argument components."""

    source_id: str
    target_id: str
    relation_type: str  # supports, attacks, elaborates
    confidence: float


@dataclass
class ArgumentStructure:
    """Complete argument structure analysis."""

    claims: List[ArgumentComponent] = field(default_factory=list)
    major_claim: Optional[ArgumentComponent] = None
    evidence: List[ArgumentComponent] = field(default_factory=list)
    reasoning: List[ArgumentComponent] = field(default_factory=list)
    counterarguments: List[ArgumentComponent] = field(default_factory=list)
    rebuttals: List[ArgumentComponent] = field(default_factory=list)
    argument_graph: Dict[str, Any] = field(default_factory=dict)
    relations: List[ArgumentRelation] = field(default_factory=list)
    argument_strength_score: float = 0.0
    completeness_score: float = 0.0
    missing_components: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


class ArgumentationDetector:
    """
    Detect and analyze argumentation structure in essays.

    Identifies:
    - Claims (main thesis and supporting claims)
    - Evidence (facts, statistics, examples, quotes)
    - Reasoning (logical connections)
    - Counterarguments (opposing views)
    - Rebuttals (responses to counterarguments)

    Uses BIO tagging for component boundary detection and
    builds an argument graph showing relationships.

    Usage:
        detector = ArgumentationDetector()
        structure = detector.detect_arguments(essay_text)
        print(f"Argument strength: {structure.argument_strength_score}")
    """

    # Claim indicators - phrases that signal assertions
    CLAIM_INDICATORS = [
        r"\bi (?:believe|think|argue|contend|maintain|assert|claim) that\b",
        r"\bit is (?:clear|evident|obvious|true|important) that\b",
        r"\bthe (?:main|key|central|primary) (?:point|argument|thesis|claim) is\b",
        r"\bin (?:my|this) (?:view|opinion|essay)\b",
        r"\bthis (?:essay|paper) (?:argues|shows|demonstrates|proves)\b",
        r"\bwe (?:should|must|need to|ought to)\b",
        r"\bthe (?:fact|truth|reality) is\b",
        r"\bultimately\b",
        r"\bfundamentally\b",
        r"\bin conclusion\b",
        r"\btherefore\b",
        r"\bthus\b",
        r"\bhence\b",
        r"\bconsequently\b",
    ]

    # Evidence indicators - phrases that signal supporting material
    EVIDENCE_INDICATORS = [
        r"\baccording to\b",
        r"\bresearch (?:shows|indicates|demonstrates|suggests|proves)\b",
        r"\bstudies (?:show|indicate|demonstrate|suggest|prove)\b",
        r"\bstatistics (?:show|indicate|demonstrate|reveal)\b",
        r"\bfor (?:example|instance)\b",
        r"\bsuch as\b",
        r"\bspecifically\b",
        r"\bin fact\b",
        r"\bdata (?:shows|indicates|demonstrates|suggests)\b",
        r"\bexperts (?:say|believe|argue|suggest)\b",
        r"\b(?:one|a|another) (?:example|case|instance)\b",
        r'\b(?:he|she|they|the author) (?:states?|writes?|notes?|observes?)\b',
        r"\bpercent\b|\b%\b",
        r"\b\d{4}\b",  # Years as evidence markers
        r'"[^"]{10,}"',  # Quoted material
    ]

    # Reasoning indicators - phrases that show logical connections
    REASONING_INDICATORS = [
        r"\bbecause\b",
        r"\bsince\b",
        r"\bas a result\b",
        r"\btherefore\b",
        r"\bthus\b",
        r"\bconsequently\b",
        r"\bthis (?:shows|demonstrates|proves|indicates|means)\b",
        r"\bthe reason (?:is|being)\b",
        r"\bit follows that\b",
        r"\bthis (?:leads|leading) to\b",
        r"\bif\.\.\.then\b",
        r"\bgiven that\b",
        r"\bdue to\b",
        r"\bowing to\b",
        r"\bas such\b",
        r"\bfor this reason\b",
    ]

    # Counterargument indicators - phrases that introduce opposing views
    COUNTERARGUMENT_INDICATORS = [
        r"\bsome (?:may|might|could|would) (?:argue|say|claim|believe)\b",
        r"\bopponents (?:argue|claim|believe|say)\b",
        r"\bcritics (?:argue|claim|believe|say|point out)\b",
        r"\bit (?:may|might|could) be (?:argued|said|claimed)\b",
        r"\bon the other hand\b",
        r"\bhowever\b",
        r"\bnevertheless\b",
        r"\bnonetheless\b",
        r"\bdespite this\b",
        r"\balthough\b",
        r"\beven though\b",
        r"\bwhile (?:some|others|many)\b",
        r"\badmittedly\b",
        r"\bgranted\b",
        r"\bit is true that\b",
        r"\bone objection\b",
        r"\ba common (?:criticism|objection|argument)\b",
    ]

    # Rebuttal indicators - phrases that respond to counterarguments
    REBUTTAL_INDICATORS = [
        r"\bhowever,? this (?:argument|view|position|claim)\b",
        r"\bthis (?:objection|criticism|argument) (?:fails|ignores|overlooks)\b",
        r"\bbut this (?:misses|ignores|overlooks)\b",
        r"\bin response\b",
        r"\bwhile this (?:may be|is) true\b",
        r"\bdespite (?:this|these) (?:objections?|arguments?|claims?)\b",
        r"\bthis (?:counterargument|objection) (?:fails|is flawed)\b",
        r"\byet\b",
        r"\bstill\b",
        r"\beven so\b",
        r"\bregardless\b",
    ]

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: str = "cpu",
        use_ml_model: bool = False,
    ):
        """
        Initialize the ArgumentationDetector.

        Args:
            model_path: Path to trained argument mining model (optional)
            device: Device for ML inference (cpu/cuda)
            use_ml_model: Whether to use ML-based detection
        """
        self.model_path = model_path
        self.device = device
        self.use_ml_model = use_ml_model
        self._model = None
        self._model_loaded = False
        self._component_counter = 0

        # Compile regex patterns
        self._claim_patterns = [re.compile(p, re.IGNORECASE) for p in self.CLAIM_INDICATORS]
        self._evidence_patterns = [re.compile(p, re.IGNORECASE) for p in self.EVIDENCE_INDICATORS]
        self._reasoning_patterns = [re.compile(p, re.IGNORECASE) for p in self.REASONING_INDICATORS]
        self._counter_patterns = [re.compile(p, re.IGNORECASE) for p in self.COUNTERARGUMENT_INDICATORS]
        self._rebuttal_patterns = [re.compile(p, re.IGNORECASE) for p in self.REBUTTAL_INDICATORS]

        logger.info("ArgumentationDetector initialized")

    def _generate_component_id(self, component_type: str) -> str:
        """Generate unique component ID."""
        self._component_counter += 1
        return f"{component_type}_{self._component_counter}"

    def _split_into_sentences(self, text: str) -> List[Tuple[str, int, int]]:
        """Split text into sentences with character positions."""
        # Simple sentence splitting that preserves positions
        sentences = []
        current_pos = 0

        # Pattern for sentence boundaries
        sentence_pattern = re.compile(r'([^.!?]*[.!?]+(?:\s|$)|\S[^.!?]*$)')

        for match in sentence_pattern.finditer(text):
            sentence = match.group().strip()
            if sentence:
                start = match.start()
                end = match.end()
                sentences.append((sentence, start, end))

        return sentences

    def _calculate_indicator_score(
        self,
        text: str,
        patterns: List[re.Pattern],
    ) -> Tuple[float, List[str]]:
        """Calculate how strongly text matches indicator patterns."""
        matches = []
        for pattern in patterns:
            found = pattern.findall(text)
            matches.extend(found)

        # Score based on number of matches, normalized
        if not matches:
            return 0.0, []

        score = min(1.0, len(matches) * 0.3)
        return score, matches

    def _classify_sentence(
        self,
        sentence: str,
        context_before: str = "",
        context_after: str = "",
    ) -> Tuple[ArgumentComponentType, float, List[str]]:
        """
        Classify a sentence into argument component type.

        Returns:
            Tuple of (component_type, confidence, matching_indicators)
        """
        scores = {}
        indicators = {}

        # Check each component type
        score, matches = self._calculate_indicator_score(sentence, self._claim_patterns)
        scores[ArgumentComponentType.CLAIM] = score
        indicators[ArgumentComponentType.CLAIM] = matches

        score, matches = self._calculate_indicator_score(sentence, self._evidence_patterns)
        scores[ArgumentComponentType.EVIDENCE] = score
        indicators[ArgumentComponentType.EVIDENCE] = matches

        score, matches = self._calculate_indicator_score(sentence, self._reasoning_patterns)
        scores[ArgumentComponentType.REASONING] = score
        indicators[ArgumentComponentType.REASONING] = matches

        score, matches = self._calculate_indicator_score(sentence, self._counter_patterns)
        scores[ArgumentComponentType.COUNTERARGUMENT] = score
        indicators[ArgumentComponentType.COUNTERARGUMENT] = matches

        score, matches = self._calculate_indicator_score(sentence, self._rebuttal_patterns)
        scores[ArgumentComponentType.REBUTTAL] = score
        indicators[ArgumentComponentType.REBUTTAL] = matches

        # Position-based heuristics
        sentence_lower = sentence.lower()

        # First/last sentences often contain claims
        if context_before == "":  # First sentence
            scores[ArgumentComponentType.CLAIM] += 0.2

        # Sentences with numbers/quotes likely evidence
        if re.search(r'\d+(?:\.\d+)?(?:%|percent)?', sentence):
            scores[ArgumentComponentType.EVIDENCE] += 0.15

        if '"' in sentence or "'" in sentence:
            scores[ArgumentComponentType.EVIDENCE] += 0.15

        # Find best match
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]

        # Minimum threshold for classification
        if best_score < 0.1:
            # Default to claim for assertive statements, otherwise reasoning
            if any(word in sentence_lower for word in ['should', 'must', 'need', 'important', 'best', 'worst']):
                return ArgumentComponentType.CLAIM, 0.3, []
            return ArgumentComponentType.REASONING, 0.2, []

        return best_type, min(1.0, best_score + 0.2), indicators.get(best_type, [])

    def _detect_major_claim(
        self,
        claims: List[ArgumentComponent],
        text: str,
    ) -> Optional[ArgumentComponent]:
        """
        Identify the major claim (thesis statement).

        Looks for:
        - Position (first paragraph, last paragraph)
        - Explicit thesis markers
        - Scope (broadest claim)
        """
        if not claims:
            return None

        # Score each claim for "major claim" characteristics
        scores = []

        paragraphs = text.split('\n\n')
        first_para_end = len(paragraphs[0]) if paragraphs else len(text) // 3
        last_para_start = len(text) - len(paragraphs[-1]) if paragraphs else 2 * len(text) // 3

        for claim in claims:
            score = claim.confidence

            # Position bonus - thesis typically in intro or conclusion
            if claim.span[0] < first_para_end:
                score += 0.3
            elif claim.span[0] > last_para_start:
                score += 0.2

            # Explicit thesis markers
            claim_lower = claim.text.lower()
            if any(marker in claim_lower for marker in [
                'thesis', 'main argument', 'central claim', 'primary point',
                'this essay', 'i argue', 'in conclusion'
            ]):
                score += 0.3

            # Length - major claims tend to be more developed
            if len(claim.text.split()) > 15:
                score += 0.1

            scores.append((claim, score))

        # Return highest scoring claim as major claim
        if scores:
            best_claim, _ = max(scores, key=lambda x: x[1])
            major = ArgumentComponent(
                component_id=self._generate_component_id("major_claim"),
                component_type=ArgumentComponentType.MAJOR_CLAIM,
                text=best_claim.text,
                span=best_claim.span,
                confidence=best_claim.confidence,
                component_quality=best_claim.component_quality,
            )
            return major

        return None

    def _build_argument_graph(
        self,
        structure: ArgumentStructure,
    ) -> Dict[str, Any]:
        """
        Build a graph representation of argument relationships.

        Graph structure:
        - nodes: All argument components
        - edges: Support/attack relationships
        """
        graph = {
            "nodes": [],
            "edges": [],
            "adjacency": {},
        }

        # Add all components as nodes
        all_components = []
        if structure.major_claim:
            all_components.append(structure.major_claim)
        all_components.extend(structure.claims)
        all_components.extend(structure.evidence)
        all_components.extend(structure.reasoning)
        all_components.extend(structure.counterarguments)
        all_components.extend(structure.rebuttals)

        for comp in all_components:
            graph["nodes"].append({
                "id": comp.component_id,
                "type": comp.component_type.value,
                "text_preview": comp.text[:100] + "..." if len(comp.text) > 100 else comp.text,
                "confidence": comp.confidence,
                "quality": comp.component_quality,
            })
            graph["adjacency"][comp.component_id] = []

        # Build edges based on relationships
        # Evidence supports claims
        for evidence in structure.evidence:
            # Find nearest preceding claim
            for claim in structure.claims:
                if claim.span[1] < evidence.span[0]:
                    edge = {
                        "source": evidence.component_id,
                        "target": claim.component_id,
                        "relation": "supports",
                        "confidence": (evidence.confidence + claim.confidence) / 2,
                    }
                    graph["edges"].append(edge)
                    graph["adjacency"][evidence.component_id].append(claim.component_id)
                    evidence.supports = claim.component_id
                    break

        # Reasoning supports claims
        for reasoning in structure.reasoning:
            for claim in structure.claims:
                if abs(claim.span[0] - reasoning.span[0]) < 500:  # Within proximity
                    edge = {
                        "source": reasoning.component_id,
                        "target": claim.component_id,
                        "relation": "supports",
                        "confidence": (reasoning.confidence + claim.confidence) / 2,
                    }
                    graph["edges"].append(edge)
                    graph["adjacency"][reasoning.component_id].append(claim.component_id)
                    break

        # Counterarguments attack major claim
        if structure.major_claim:
            for counter in structure.counterarguments:
                edge = {
                    "source": counter.component_id,
                    "target": structure.major_claim.component_id,
                    "relation": "attacks",
                    "confidence": counter.confidence,
                }
                graph["edges"].append(edge)
                graph["adjacency"][counter.component_id].append(structure.major_claim.component_id)
                counter.attacks = structure.major_claim.component_id

        # Rebuttals attack counterarguments
        for rebuttal in structure.rebuttals:
            for counter in structure.counterarguments:
                if rebuttal.span[0] > counter.span[0]:  # Rebuttal comes after
                    edge = {
                        "source": rebuttal.component_id,
                        "target": counter.component_id,
                        "relation": "attacks",
                        "confidence": (rebuttal.confidence + counter.confidence) / 2,
                    }
                    graph["edges"].append(edge)
                    graph["adjacency"][rebuttal.component_id].append(counter.component_id)
                    rebuttal.attacks = counter.component_id
                    break

        return graph

    def _calculate_component_quality(
        self,
        component: ArgumentComponent,
        component_type: ArgumentComponentType,
    ) -> float:
        """
        Calculate quality score for an argument component.

        Factors:
        - Length (sufficient development)
        - Specificity (concrete vs vague)
        - Language quality
        """
        text = component.text
        words = text.split()
        word_count = len(words)

        quality = 0.5  # Base score

        # Length appropriateness
        if component_type == ArgumentComponentType.CLAIM:
            # Claims should be concise but complete
            if 10 <= word_count <= 30:
                quality += 0.2
            elif word_count < 5:
                quality -= 0.2

        elif component_type == ArgumentComponentType.EVIDENCE:
            # Evidence should be developed
            if word_count >= 15:
                quality += 0.2
            # Bonus for specific details
            if re.search(r'\d+', text):  # Contains numbers
                quality += 0.1
            if '"' in text:  # Contains quotes
                quality += 0.1

        elif component_type == ArgumentComponentType.REASONING:
            # Reasoning should show logical connection
            if any(word in text.lower() for word in ['because', 'therefore', 'thus', 'since']):
                quality += 0.2

        # Specificity - penalize vague language
        vague_words = ['things', 'stuff', 'something', 'somehow', 'somewhat', 'very', 'really']
        vague_count = sum(1 for word in words if word.lower() in vague_words)
        quality -= vague_count * 0.05

        return max(0.0, min(1.0, quality))

    def _calculate_argument_strength(
        self,
        structure: ArgumentStructure,
    ) -> float:
        """
        Calculate overall argument strength score.

        Factors:
        - Presence of all component types
        - Quality of components
        - Logical structure (proper support relationships)
        - Handling of counterarguments
        """
        score = 0.0

        # Major claim presence (essential)
        if structure.major_claim:
            score += 0.2

        # Claims with support
        if structure.claims:
            claim_score = min(0.15, len(structure.claims) * 0.05)
            score += claim_score

        # Evidence quality and quantity
        if structure.evidence:
            evidence_avg_quality = sum(e.component_quality for e in structure.evidence) / len(structure.evidence)
            evidence_score = min(0.2, len(structure.evidence) * 0.04) * evidence_avg_quality
            score += evidence_score

        # Reasoning presence
        if structure.reasoning:
            reasoning_score = min(0.15, len(structure.reasoning) * 0.05)
            score += reasoning_score

        # Counterargument handling (shows sophisticated argumentation)
        if structure.counterarguments:
            score += 0.1

        # Rebuttals (shows complete argument)
        if structure.rebuttals:
            # More credit if rebuttals match counterarguments
            rebuttal_ratio = min(1.0, len(structure.rebuttals) / max(1, len(structure.counterarguments)))
            score += 0.1 * rebuttal_ratio

        # Graph connectivity bonus
        if structure.argument_graph:
            edges = structure.argument_graph.get("edges", [])
            nodes = structure.argument_graph.get("nodes", [])
            if nodes:
                connectivity = len(edges) / max(1, len(nodes))
                score += min(0.1, connectivity * 0.1)

        return min(1.0, score)

    def _calculate_completeness(
        self,
        structure: ArgumentStructure,
    ) -> Tuple[float, List[str]]:
        """
        Calculate argument completeness and identify missing components.

        Returns:
            Tuple of (completeness_score, list of missing components)
        """
        missing = []
        score = 0.0
        max_score = 5.0  # 5 component types

        if structure.major_claim or structure.claims:
            score += 1.0
        else:
            missing.append("Main claim/thesis statement")

        if structure.evidence:
            score += 1.0
        else:
            missing.append("Supporting evidence (facts, examples, data)")

        if structure.reasoning:
            score += 1.0
        else:
            missing.append("Logical reasoning connecting evidence to claims")

        if structure.counterarguments:
            score += 1.0
        else:
            missing.append("Acknowledgment of counterarguments")

        if structure.rebuttals:
            score += 1.0
        else:
            missing.append("Rebuttals to counterarguments")

        return score / max_score, missing

    def _generate_suggestions(
        self,
        structure: ArgumentStructure,
    ) -> List[str]:
        """Generate suggestions for improving the argument."""
        suggestions = []

        # Based on missing components
        if not structure.major_claim and not structure.claims:
            suggestions.append(
                "Add a clear thesis statement that presents your main argument. "
                "Try starting with 'I argue that...' or 'This essay demonstrates that...'"
            )

        if not structure.evidence:
            suggestions.append(
                "Support your claims with specific evidence such as statistics, "
                "examples, expert opinions, or research findings."
            )

        if not structure.reasoning:
            suggestions.append(
                "Explain the logical connection between your evidence and claims. "
                "Use phrases like 'This shows that...' or 'Because of this...'"
            )

        if not structure.counterarguments:
            suggestions.append(
                "Consider addressing opposing viewpoints to strengthen your argument. "
                "Try 'Some might argue that...' or 'Critics may point out...'"
            )

        if structure.counterarguments and not structure.rebuttals:
            suggestions.append(
                "After presenting counterarguments, add rebuttals to defend your position. "
                "Explain why the opposing view is incomplete or incorrect."
            )

        # Quality-based suggestions
        if structure.evidence:
            low_quality_evidence = [e for e in structure.evidence if e.component_quality < 0.5]
            if low_quality_evidence:
                suggestions.append(
                    "Some of your evidence could be more specific. "
                    "Consider adding concrete details, numbers, or direct quotes."
                )

        return suggestions[:5]  # Limit to top 5 suggestions

    def detect_arguments(self, text: str) -> ArgumentStructure:
        """
        Detect full argument structure in text.

        Args:
            text: Essay or argumentative text to analyze

        Returns:
            ArgumentStructure with all detected components
        """
        self._component_counter = 0  # Reset counter
        structure = ArgumentStructure()

        # Split into sentences
        sentences = self._split_into_sentences(text)

        if not sentences:
            return structure

        # Classify each sentence
        claims = []
        evidence = []
        reasoning = []
        counterarguments = []
        rebuttals = []

        for i, (sentence, start, end) in enumerate(sentences):
            context_before = sentences[i - 1][0] if i > 0 else ""
            context_after = sentences[i + 1][0] if i < len(sentences) - 1 else ""

            comp_type, confidence, _ = self._classify_sentence(
                sentence, context_before, context_after
            )

            component = ArgumentComponent(
                component_id=self._generate_component_id(comp_type.value),
                component_type=comp_type,
                text=sentence,
                span=(start, end),
                confidence=confidence,
            )

            # Calculate quality
            component.component_quality = self._calculate_component_quality(
                component, comp_type
            )

            # Add to appropriate list
            if comp_type == ArgumentComponentType.CLAIM:
                claims.append(component)
            elif comp_type == ArgumentComponentType.EVIDENCE:
                evidence.append(component)
            elif comp_type == ArgumentComponentType.REASONING:
                reasoning.append(component)
            elif comp_type == ArgumentComponentType.COUNTERARGUMENT:
                counterarguments.append(component)
            elif comp_type == ArgumentComponentType.REBUTTAL:
                rebuttals.append(component)

        # Populate structure
        structure.claims = claims
        structure.evidence = evidence
        structure.reasoning = reasoning
        structure.counterarguments = counterarguments
        structure.rebuttals = rebuttals

        # Identify major claim
        structure.major_claim = self._detect_major_claim(claims, text)

        # Build argument graph
        structure.argument_graph = self._build_argument_graph(structure)

        # Calculate scores
        structure.argument_strength_score = self._calculate_argument_strength(structure)
        structure.completeness_score, structure.missing_components = self._calculate_completeness(structure)

        # Generate suggestions
        structure.suggestions = self._generate_suggestions(structure)

        return structure

    def find_claims(self, text: str) -> List[ArgumentComponent]:
        """
        Find only claim statements in text.

        Args:
            text: Text to analyze

        Returns:
            List of claim components
        """
        structure = self.detect_arguments(text)
        all_claims = structure.claims.copy()
        if structure.major_claim:
            all_claims.insert(0, structure.major_claim)
        return all_claims

    def find_evidence(self, text: str) -> List[ArgumentComponent]:
        """
        Find only evidence in text.

        Args:
            text: Text to analyze

        Returns:
            List of evidence components
        """
        structure = self.detect_arguments(text)
        return structure.evidence

    def evaluate_argument_quality(
        self,
        structure: ArgumentStructure,
    ) -> Dict[str, Any]:
        """
        Evaluate overall argument quality with detailed metrics.

        Args:
            structure: Previously detected argument structure

        Returns:
            Dictionary with quality metrics
        """
        return {
            "overall_strength": structure.argument_strength_score,
            "completeness": structure.completeness_score,
            "claim_clarity": self._evaluate_claim_clarity(structure),
            "evidence_quality": self._evaluate_evidence_quality(structure),
            "reasoning_soundness": self._evaluate_reasoning_soundness(structure),
            "counterargument_handling": self._evaluate_counterargument_handling(structure),
            "component_counts": {
                "claims": len(structure.claims),
                "evidence": len(structure.evidence),
                "reasoning": len(structure.reasoning),
                "counterarguments": len(structure.counterarguments),
                "rebuttals": len(structure.rebuttals),
            },
            "missing_components": structure.missing_components,
        }

    def _evaluate_claim_clarity(self, structure: ArgumentStructure) -> float:
        """Evaluate clarity of claims."""
        if not structure.claims and not structure.major_claim:
            return 0.0

        all_claims = structure.claims.copy()
        if structure.major_claim:
            all_claims.append(structure.major_claim)

        # Average confidence and quality
        avg_confidence = sum(c.confidence for c in all_claims) / len(all_claims)
        avg_quality = sum(c.component_quality for c in all_claims) / len(all_claims)

        return (avg_confidence + avg_quality) / 2

    def _evaluate_evidence_quality(self, structure: ArgumentStructure) -> float:
        """Evaluate quality of evidence."""
        if not structure.evidence:
            return 0.0

        # Average quality of evidence
        avg_quality = sum(e.component_quality for e in structure.evidence) / len(structure.evidence)

        # Bonus for variety (different types of evidence)
        variety_bonus = min(0.2, len(structure.evidence) * 0.05)

        return min(1.0, avg_quality + variety_bonus)

    def _evaluate_reasoning_soundness(self, structure: ArgumentStructure) -> float:
        """Evaluate soundness of reasoning."""
        if not structure.reasoning:
            return 0.0

        # Check for logical connectors
        score = 0.0
        for r in structure.reasoning:
            text_lower = r.text.lower()
            if any(word in text_lower for word in ['because', 'since', 'therefore', 'thus']):
                score += 0.3
            if r.confidence > 0.5:
                score += 0.2

        return min(1.0, score / max(1, len(structure.reasoning)))

    def _evaluate_counterargument_handling(self, structure: ArgumentStructure) -> float:
        """Evaluate handling of counterarguments."""
        if not structure.counterarguments:
            return 0.0  # No counterarguments addressed

        score = 0.3  # Base score for having counterarguments

        # Bonus for rebuttals
        if structure.rebuttals:
            rebuttal_ratio = len(structure.rebuttals) / len(structure.counterarguments)
            score += min(0.7, rebuttal_ratio * 0.7)

        return min(1.0, score)

    def suggest_improvements(
        self,
        structure: ArgumentStructure,
    ) -> List[str]:
        """
        Suggest ways to strengthen the argument.

        Args:
            structure: Previously detected argument structure

        Returns:
            List of improvement suggestions
        """
        return structure.suggestions

    def get_bio_tags(self, text: str) -> List[Tuple[str, str]]:
        """
        Get BIO tags for text at token level.

        Args:
            text: Text to tag

        Returns:
            List of (token, BIO_tag) tuples
        """
        structure = self.detect_arguments(text)
        tokens = text.split()
        tags = ['O'] * len(tokens)

        # Map character positions to token indices
        token_positions = []
        pos = 0
        for token in tokens:
            start = text.find(token, pos)
            end = start + len(token)
            token_positions.append((start, end))
            pos = end

        # Tag tokens based on components
        all_components = []
        if structure.major_claim:
            all_components.append((structure.major_claim, 'MajorClaim'))
        for c in structure.claims:
            all_components.append((c, 'Claim'))
        for e in structure.evidence:
            all_components.append((e, 'Evidence'))
        for r in structure.reasoning:
            all_components.append((r, 'Reasoning'))
        for ca in structure.counterarguments:
            all_components.append((ca, 'Counterargument'))
        for rb in structure.rebuttals:
            all_components.append((rb, 'Rebuttal'))

        for comp, comp_name in all_components:
            comp_start, comp_end = comp.span
            first_token = True

            for i, (tok_start, tok_end) in enumerate(token_positions):
                if tok_start >= comp_start and tok_end <= comp_end:
                    if first_token:
                        tags[i] = f'B-{comp_name}'
                        first_token = False
                    else:
                        tags[i] = f'I-{comp_name}'

        return list(zip(tokens, tags))
