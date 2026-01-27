"""
Curriculum Mapper

Map between different curriculum standards using the knowledge graph.

Use cases:
- Transfer students between curricula
- Find equivalent concepts across standards
- Identify curriculum gaps between systems
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class MappingType(str, Enum):
    """Types of curriculum mappings."""
    EXACT = "exact"  # 1:1 mapping
    PARTIAL = "partial"  # Covers part of the standard
    RELATED = "related"  # Conceptually related
    SUPERSET = "superset"  # Contains more than the standard
    SUBSET = "subset"  # Contains less than the standard


class CurriculumStandard(str, Enum):
    """Supported curriculum standards."""
    COMMON_CORE = "common_core"
    NGSS = "ngss"  # Next Generation Science Standards
    IB = "ib"  # International Baccalaureate
    AP = "ap"  # Advanced Placement
    GCSE = "gcse"  # UK General Certificate
    STATE_SPECIFIC = "state_specific"
    CUSTOM = "custom"


@dataclass
class StandardMapping:
    """Mapping between curriculum standards."""
    source_standard_id: str
    target_standard_ids: List[str]
    mapping_confidence: float
    mapping_type: str  # exact, partial, related
    source_curriculum: str
    target_curriculum: str
    overlap_concepts: List[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class EquivalentConcept:
    """Equivalent concept in another curriculum."""
    source_concept_id: str
    target_concept_id: str
    target_curriculum: str
    equivalence_score: float
    mapping_type: str
    skills_overlap: List[str] = field(default_factory=list)
    prerequisites_aligned: bool = True


@dataclass
class CurriculumComparison:
    """Comparison between two curricula."""
    curriculum1: str
    curriculum2: str
    shared_concepts: List[str]
    unique_to_first: List[str]
    unique_to_second: List[str]
    overlap_percentage: float
    alignment_suggestions: List[str]
    domain_comparison: Dict[str, Dict[str, int]] = field(default_factory=dict)
    difficulty_comparison: Dict[str, float] = field(default_factory=dict)


@dataclass
class TransferPlan:
    """Plan for transferring between curricula."""
    source_curriculum: str
    target_curriculum: str
    student_id: Optional[str] = None
    equivalent_credits: List[StandardMapping] = field(default_factory=list)
    gaps_to_fill: List[str] = field(default_factory=list)
    additional_requirements: List[str] = field(default_factory=list)
    estimated_catch_up_hours: float = 0.0
    recommendations: List[str] = field(default_factory=list)


@dataclass
class CurriculumMapperConfig:
    """Configuration for curriculum mapper."""
    min_mapping_confidence: float = 0.5
    consider_prerequisites: bool = True
    fuzzy_matching_threshold: float = 0.7
    max_equivalent_suggestions: int = 5


# Curriculum standards data
CURRICULUM_STANDARDS = {
    "common_core": {
        "name": "Common Core State Standards",
        "domains": ["math", "ela"],
        "grade_levels": ["K", "1", "2", "3", "4", "5", "6", "7", "8", "HS"],
        "concepts": {
            # Math Standards
            "ccss.math.k.cc": {
                "name": "Counting and Cardinality",
                "domain": "math",
                "grade": "K",
                "skills": ["counting", "number_recognition", "comparison"],
                "difficulty": 0.1,
            },
            "ccss.math.k.oa": {
                "name": "Operations and Algebraic Thinking",
                "domain": "math",
                "grade": "K",
                "skills": ["addition", "subtraction"],
                "difficulty": 0.15,
            },
            "ccss.math.1.oa": {
                "name": "Operations and Algebraic Thinking",
                "domain": "math",
                "grade": "1",
                "skills": ["addition", "subtraction", "equations"],
                "difficulty": 0.2,
            },
            "ccss.math.1.nbt": {
                "name": "Number and Operations in Base Ten",
                "domain": "math",
                "grade": "1",
                "skills": ["place_value", "addition", "subtraction"],
                "difficulty": 0.2,
            },
            "ccss.math.3.nf": {
                "name": "Number and Operations - Fractions",
                "domain": "math",
                "grade": "3",
                "skills": ["fractions", "number_line"],
                "difficulty": 0.3,
            },
            "ccss.math.6.rp": {
                "name": "Ratios and Proportional Relationships",
                "domain": "math",
                "grade": "6",
                "skills": ["ratios", "proportions", "percentages"],
                "difficulty": 0.4,
            },
            "ccss.math.6.ee": {
                "name": "Expressions and Equations",
                "domain": "math",
                "grade": "6",
                "skills": ["variables", "expressions", "equations"],
                "difficulty": 0.4,
            },
            "ccss.math.8.f": {
                "name": "Functions",
                "domain": "math",
                "grade": "8",
                "skills": ["functions", "linear_equations", "graphs"],
                "difficulty": 0.5,
            },
            "ccss.math.hs.a": {
                "name": "High School Algebra",
                "domain": "math",
                "grade": "HS",
                "skills": ["polynomial", "quadratic", "systems"],
                "difficulty": 0.6,
            },
            "ccss.math.hs.f": {
                "name": "High School Functions",
                "domain": "math",
                "grade": "HS",
                "skills": ["functions", "exponential", "logarithmic"],
                "difficulty": 0.65,
            },
            "ccss.math.hs.g": {
                "name": "High School Geometry",
                "domain": "math",
                "grade": "HS",
                "skills": ["congruence", "similarity", "circles", "proofs"],
                "difficulty": 0.6,
            },
        },
    },
    "ngss": {
        "name": "Next Generation Science Standards",
        "domains": ["science"],
        "grade_levels": ["K-2", "3-5", "MS", "HS"],
        "concepts": {
            "ngss.k-2.ps1": {
                "name": "Matter and Its Interactions",
                "domain": "science",
                "grade": "K-2",
                "skills": ["observation", "classification", "properties"],
                "difficulty": 0.15,
            },
            "ngss.3-5.ls1": {
                "name": "From Molecules to Organisms",
                "domain": "science",
                "grade": "3-5",
                "skills": ["cells", "organisms", "systems"],
                "difficulty": 0.35,
            },
            "ngss.ms.ps1": {
                "name": "Matter and Its Interactions",
                "domain": "science",
                "grade": "MS",
                "skills": ["atoms", "molecules", "reactions"],
                "difficulty": 0.5,
            },
            "ngss.ms.ls1": {
                "name": "From Molecules to Organisms",
                "domain": "science",
                "grade": "MS",
                "skills": ["cells", "body_systems", "photosynthesis"],
                "difficulty": 0.5,
            },
            "ngss.hs.ps1": {
                "name": "Matter and Its Interactions",
                "domain": "science",
                "grade": "HS",
                "skills": ["periodic_table", "bonding", "reactions"],
                "difficulty": 0.7,
            },
            "ngss.hs.ls1": {
                "name": "From Molecules to Organisms",
                "domain": "science",
                "grade": "HS",
                "skills": ["dna", "protein_synthesis", "cell_division"],
                "difficulty": 0.7,
            },
        },
    },
    "ib": {
        "name": "International Baccalaureate",
        "domains": ["math", "science", "languages", "humanities"],
        "grade_levels": ["MYP", "DP"],
        "concepts": {
            "ib.myp.math.1": {
                "name": "MYP Mathematics 1",
                "domain": "math",
                "grade": "MYP",
                "skills": ["arithmetic", "algebra_intro", "geometry_intro"],
                "difficulty": 0.3,
            },
            "ib.myp.math.5": {
                "name": "MYP Mathematics 5",
                "domain": "math",
                "grade": "MYP",
                "skills": ["algebra", "functions", "trigonometry"],
                "difficulty": 0.5,
            },
            "ib.dp.math.aa.sl": {
                "name": "DP Math: Analysis and Approaches SL",
                "domain": "math",
                "grade": "DP",
                "skills": ["calculus", "algebra", "functions", "statistics"],
                "difficulty": 0.7,
            },
            "ib.dp.math.aa.hl": {
                "name": "DP Math: Analysis and Approaches HL",
                "domain": "math",
                "grade": "DP",
                "skills": ["calculus", "algebra", "functions", "statistics", "proofs"],
                "difficulty": 0.85,
            },
            "ib.dp.physics.sl": {
                "name": "DP Physics SL",
                "domain": "science",
                "grade": "DP",
                "skills": ["mechanics", "waves", "electricity", "thermal"],
                "difficulty": 0.7,
            },
            "ib.dp.chemistry.sl": {
                "name": "DP Chemistry SL",
                "domain": "science",
                "grade": "DP",
                "skills": ["atomic_structure", "bonding", "reactions", "organic"],
                "difficulty": 0.7,
            },
        },
    },
    "ap": {
        "name": "Advanced Placement",
        "domains": ["math", "science", "humanities", "languages"],
        "grade_levels": ["HS"],
        "concepts": {
            "ap.calc.ab": {
                "name": "AP Calculus AB",
                "domain": "math",
                "grade": "HS",
                "skills": ["limits", "derivatives", "integrals", "applications"],
                "difficulty": 0.75,
            },
            "ap.calc.bc": {
                "name": "AP Calculus BC",
                "domain": "math",
                "grade": "HS",
                "skills": ["limits", "derivatives", "integrals", "series", "parametric"],
                "difficulty": 0.85,
            },
            "ap.stats": {
                "name": "AP Statistics",
                "domain": "math",
                "grade": "HS",
                "skills": ["data_analysis", "probability", "inference", "regression"],
                "difficulty": 0.65,
            },
            "ap.physics.1": {
                "name": "AP Physics 1",
                "domain": "science",
                "grade": "HS",
                "skills": ["mechanics", "waves", "circuits"],
                "difficulty": 0.7,
            },
            "ap.physics.c.mech": {
                "name": "AP Physics C: Mechanics",
                "domain": "science",
                "grade": "HS",
                "skills": ["mechanics", "calculus_applications"],
                "difficulty": 0.8,
            },
            "ap.chem": {
                "name": "AP Chemistry",
                "domain": "science",
                "grade": "HS",
                "skills": ["atomic", "bonding", "reactions", "thermodynamics", "equilibrium"],
                "difficulty": 0.75,
            },
            "ap.bio": {
                "name": "AP Biology",
                "domain": "science",
                "grade": "HS",
                "skills": ["evolution", "cells", "genetics", "ecology"],
                "difficulty": 0.7,
            },
            "ap.csp": {
                "name": "AP Computer Science Principles",
                "domain": "cs",
                "grade": "HS",
                "skills": ["programming", "data", "algorithms_intro", "internet"],
                "difficulty": 0.5,
            },
            "ap.csa": {
                "name": "AP Computer Science A",
                "domain": "cs",
                "grade": "HS",
                "skills": ["programming", "oop", "data_structures", "algorithms"],
                "difficulty": 0.65,
            },
        },
    },
}

# Cross-curriculum mappings
STANDARD_MAPPINGS = [
    # Common Core to IB
    ("ccss.math.hs.a", "ib.myp.math.5", 0.8, "partial"),
    ("ccss.math.hs.f", "ib.dp.math.aa.sl", 0.6, "partial"),
    ("ccss.math.hs.g", "ib.myp.math.5", 0.5, "partial"),

    # Common Core to AP
    ("ccss.math.hs.a", "ap.calc.ab", 0.4, "related"),
    ("ccss.math.hs.f", "ap.calc.ab", 0.7, "partial"),
    ("ccss.math.6.rp", "ap.stats", 0.3, "related"),

    # AP to IB
    ("ap.calc.ab", "ib.dp.math.aa.sl", 0.85, "partial"),
    ("ap.calc.bc", "ib.dp.math.aa.hl", 0.9, "exact"),
    ("ap.stats", "ib.dp.math.aa.sl", 0.4, "partial"),
    ("ap.physics.1", "ib.dp.physics.sl", 0.75, "partial"),
    ("ap.chem", "ib.dp.chemistry.sl", 0.8, "partial"),

    # NGSS to other science
    ("ngss.hs.ps1", "ap.chem", 0.6, "partial"),
    ("ngss.hs.ls1", "ap.bio", 0.5, "partial"),
    ("ngss.ms.ps1", "ib.dp.chemistry.sl", 0.3, "related"),
]


class CurriculumMapper:
    """
    Map between different curriculum standards.

    Capabilities:
    - Transfer students between curricula
    - Find equivalent concepts across standards
    - Identify curriculum gaps between systems

    Usage:
        mapper = CurriculumMapper()
        mappings = mapper.map_standards("common_core", "ib")
        equivalents = mapper.find_equivalents("ccss.math.hs.a", "ap")
    """

    def __init__(
        self,
        config: Optional[CurriculumMapperConfig] = None,
        curriculum_data: Optional[Dict[str, Dict]] = None,
    ):
        self.config = config or CurriculumMapperConfig()
        self._curricula = curriculum_data or {**CURRICULUM_STANDARDS}

        # Build mapping index
        self._mappings: Dict[Tuple[str, str], List[StandardMapping]] = {}
        self._concept_index: Dict[str, Dict[str, Any]] = {}

        self._load_mappings()
        self._build_concept_index()

        logger.info(f"CurriculumMapper initialized with {len(self._curricula)} curricula")

    def _load_mappings(self):
        """Load standard mappings."""
        for mapping in STANDARD_MAPPINGS:
            source, target, confidence, mapping_type = mapping

            # Determine curricula
            source_curriculum = self._get_curriculum_for_concept(source)
            target_curriculum = self._get_curriculum_for_concept(target)

            if source_curriculum and target_curriculum:
                key = (source_curriculum, target_curriculum)
                if key not in self._mappings:
                    self._mappings[key] = []

                self._mappings[key].append(StandardMapping(
                    source_standard_id=source,
                    target_standard_ids=[target],
                    mapping_confidence=confidence,
                    mapping_type=mapping_type,
                    source_curriculum=source_curriculum,
                    target_curriculum=target_curriculum,
                ))

    def _build_concept_index(self):
        """Build index of all concepts across curricula."""
        for curriculum_id, curriculum_data in self._curricula.items():
            for concept_id, concept_data in curriculum_data.get("concepts", {}).items():
                self._concept_index[concept_id] = {
                    **concept_data,
                    "curriculum": curriculum_id,
                    "id": concept_id,
                }

    def _get_curriculum_for_concept(self, concept_id: str) -> Optional[str]:
        """Get curriculum ID for a concept."""
        for curriculum_id, curriculum_data in self._curricula.items():
            if concept_id in curriculum_data.get("concepts", {}):
                return curriculum_id
        return None

    def map_standards(
        self,
        source_standard: str,
        target_curriculum: str,
    ) -> List[StandardMapping]:
        """
        Map standards from source to target curriculum.

        Args:
            source_standard: Source standard ID or curriculum
            target_curriculum: Target curriculum ID

        Returns:
            List of standard mappings
        """
        results = []

        # Check if source_standard is a curriculum or concept
        if source_standard in self._curricula:
            # Map all concepts from source curriculum
            source_curriculum = source_standard
            source_concepts = self._curricula[source_curriculum].get("concepts", {})

            for concept_id in source_concepts:
                mappings = self._find_mappings_for_concept(concept_id, target_curriculum)
                results.extend(mappings)
        else:
            # Map single concept
            results = self._find_mappings_for_concept(source_standard, target_curriculum)

        return results

    def find_equivalents(
        self,
        concept_id: str,
        target_curriculum: str,
    ) -> List[EquivalentConcept]:
        """
        Find equivalent concepts in target curriculum.

        Args:
            concept_id: Source concept ID
            target_curriculum: Target curriculum ID

        Returns:
            List of equivalent concepts
        """
        source_concept = self._concept_index.get(concept_id)
        if not source_concept:
            return []

        target_concepts = self._curricula.get(target_curriculum, {}).get("concepts", {})
        equivalents = []

        for target_id, target_data in target_concepts.items():
            # Calculate equivalence score
            score, mapping_type = self._calculate_equivalence(
                source_concept, target_data
            )

            if score >= self.config.min_mapping_confidence:
                # Find overlapping skills
                source_skills = set(source_concept.get("skills", []))
                target_skills = set(target_data.get("skills", []))
                overlap = list(source_skills.intersection(target_skills))

                equivalents.append(EquivalentConcept(
                    source_concept_id=concept_id,
                    target_concept_id=target_id,
                    target_curriculum=target_curriculum,
                    equivalence_score=score,
                    mapping_type=mapping_type,
                    skills_overlap=overlap,
                    prerequisites_aligned=True,  # Could check prerequisites
                ))

        # Sort by equivalence score
        equivalents.sort(key=lambda x: x.equivalence_score, reverse=True)
        return equivalents[:self.config.max_equivalent_suggestions]

    def compare_curricula(
        self,
        curriculum1: str,
        curriculum2: str,
    ) -> CurriculumComparison:
        """
        Compare two curricula.

        Args:
            curriculum1: First curriculum ID
            curriculum2: Second curriculum ID

        Returns:
            CurriculumComparison with detailed analysis
        """
        curr1_data = self._curricula.get(curriculum1, {})
        curr2_data = self._curricula.get(curriculum2, {})

        curr1_concepts = set(curr1_data.get("concepts", {}).keys())
        curr2_concepts = set(curr2_data.get("concepts", {}).keys())

        # Find shared concepts by skills overlap
        shared = []
        unique_to_first = []
        unique_to_second = []

        # Build skills sets
        curr1_skills = self._get_all_skills(curriculum1)
        curr2_skills = self._get_all_skills(curriculum2)

        shared_skills = curr1_skills.intersection(curr2_skills)
        curr1_only_skills = curr1_skills - curr2_skills
        curr2_only_skills = curr2_skills - curr1_skills

        # Find concepts covering shared skills
        for concept_id, concept_data in curr1_data.get("concepts", {}).items():
            concept_skills = set(concept_data.get("skills", []))
            if concept_skills.intersection(shared_skills):
                shared.append(concept_id)
            elif concept_skills.intersection(curr1_only_skills):
                unique_to_first.append(concept_id)

        for concept_id, concept_data in curr2_data.get("concepts", {}).items():
            concept_skills = set(concept_data.get("skills", []))
            if concept_skills.issubset(curr2_only_skills):
                unique_to_second.append(concept_id)

        # Calculate overlap
        total_skills = len(curr1_skills.union(curr2_skills))
        overlap_percentage = len(shared_skills) / total_skills if total_skills > 0 else 0.0

        # Domain comparison
        domain_comparison = {
            curriculum1: self._count_by_domain(curriculum1),
            curriculum2: self._count_by_domain(curriculum2),
        }

        # Difficulty comparison
        difficulty_comparison = {
            curriculum1: self._average_difficulty(curriculum1),
            curriculum2: self._average_difficulty(curriculum2),
        }

        # Generate alignment suggestions
        suggestions = self._generate_alignment_suggestions(
            curriculum1, curriculum2, shared_skills, curr1_only_skills, curr2_only_skills
        )

        return CurriculumComparison(
            curriculum1=curriculum1,
            curriculum2=curriculum2,
            shared_concepts=shared,
            unique_to_first=unique_to_first,
            unique_to_second=unique_to_second,
            overlap_percentage=overlap_percentage * 100,
            alignment_suggestions=suggestions,
            domain_comparison=domain_comparison,
            difficulty_comparison=difficulty_comparison,
        )

    def create_transfer_plan(
        self,
        source_curriculum: str,
        target_curriculum: str,
        completed_concepts: List[str],
        student_id: Optional[str] = None,
    ) -> TransferPlan:
        """
        Create a plan for transferring between curricula.

        Args:
            source_curriculum: Source curriculum
            target_curriculum: Target curriculum
            completed_concepts: Concepts completed in source
            student_id: Optional student ID

        Returns:
            TransferPlan with recommendations
        """
        # Find equivalent credits
        equivalent_credits = []
        for concept_id in completed_concepts:
            mappings = self._find_mappings_for_concept(concept_id, target_curriculum)
            equivalent_credits.extend(mappings)

        # Find target concepts covered by equivalents
        covered_target_concepts = set()
        for mapping in equivalent_credits:
            covered_target_concepts.update(mapping.target_standard_ids)

        # Find gaps
        target_concepts = set(
            self._curricula.get(target_curriculum, {}).get("concepts", {}).keys()
        )
        gaps = list(target_concepts - covered_target_concepts)

        # Estimate catch-up time
        catch_up_hours = 0.0
        for gap_concept in gaps:
            concept_data = self._concept_index.get(gap_concept, {})
            # Estimate ~20 hours per difficulty unit
            difficulty = concept_data.get("difficulty", 0.5)
            catch_up_hours += difficulty * 20

        # Generate recommendations
        recommendations = []
        if gaps:
            recommendations.append(
                f"Complete {len(gaps)} additional concepts for full equivalence"
            )
        if catch_up_hours > 40:
            recommendations.append(
                f"Consider a bridge program (~{int(catch_up_hours)} hours estimated)"
            )

        # Find additional requirements (concepts not easily mapped)
        additional = [
            g for g in gaps
            if not self._find_mappings_for_concept(g, source_curriculum)
        ]

        return TransferPlan(
            source_curriculum=source_curriculum,
            target_curriculum=target_curriculum,
            student_id=student_id,
            equivalent_credits=equivalent_credits,
            gaps_to_fill=gaps,
            additional_requirements=additional,
            estimated_catch_up_hours=catch_up_hours,
            recommendations=recommendations,
        )

    def _find_mappings_for_concept(
        self,
        concept_id: str,
        target_curriculum: str,
    ) -> List[StandardMapping]:
        """Find all mappings for a concept to target curriculum."""
        source_curriculum = self._get_curriculum_for_concept(concept_id)
        if not source_curriculum:
            return []

        # Check existing mappings
        key = (source_curriculum, target_curriculum)
        existing = [
            m for m in self._mappings.get(key, [])
            if m.source_standard_id == concept_id
        ]

        if existing:
            return existing

        # Try to infer mapping
        return self._infer_mapping(concept_id, target_curriculum)

    def _infer_mapping(
        self,
        concept_id: str,
        target_curriculum: str,
    ) -> List[StandardMapping]:
        """Infer mapping based on skill similarity."""
        source_concept = self._concept_index.get(concept_id)
        if not source_concept:
            return []

        source_curriculum = source_concept.get("curriculum")
        target_concepts = self._curricula.get(target_curriculum, {}).get("concepts", {})

        best_matches = []
        for target_id, target_data in target_concepts.items():
            score, mapping_type = self._calculate_equivalence(source_concept, target_data)

            if score >= self.config.min_mapping_confidence:
                best_matches.append((target_id, score, mapping_type))

        if not best_matches:
            return []

        # Sort by score and take best
        best_matches.sort(key=lambda x: x[1], reverse=True)
        best = best_matches[0]

        return [StandardMapping(
            source_standard_id=concept_id,
            target_standard_ids=[best[0]],
            mapping_confidence=best[1],
            mapping_type=best[2],
            source_curriculum=source_curriculum,
            target_curriculum=target_curriculum,
        )]

    def _calculate_equivalence(
        self,
        source: Dict[str, Any],
        target: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Calculate equivalence score between concepts."""
        # Skill overlap
        source_skills = set(source.get("skills", []))
        target_skills = set(target.get("skills", []))

        if not source_skills or not target_skills:
            return 0.0, MappingType.RELATED.value

        intersection = source_skills.intersection(target_skills)
        union = source_skills.union(target_skills)

        jaccard = len(intersection) / len(union) if union else 0.0

        # Domain match bonus
        if source.get("domain") == target.get("domain"):
            jaccard += 0.1

        # Difficulty similarity
        source_diff = source.get("difficulty", 0.5)
        target_diff = target.get("difficulty", 0.5)
        diff_similarity = 1.0 - abs(source_diff - target_diff)
        jaccard = jaccard * 0.7 + diff_similarity * 0.3

        # Determine mapping type
        if jaccard >= 0.9:
            mapping_type = MappingType.EXACT.value
        elif jaccard >= 0.6:
            mapping_type = MappingType.PARTIAL.value
        else:
            mapping_type = MappingType.RELATED.value

        # Adjust for coverage
        if len(target_skills) > len(source_skills) * 1.5:
            mapping_type = MappingType.SUBSET.value
        elif len(source_skills) > len(target_skills) * 1.5:
            mapping_type = MappingType.SUPERSET.value

        return min(1.0, jaccard), mapping_type

    def _get_all_skills(self, curriculum_id: str) -> Set[str]:
        """Get all skills in a curriculum."""
        skills = set()
        concepts = self._curricula.get(curriculum_id, {}).get("concepts", {})
        for concept_data in concepts.values():
            skills.update(concept_data.get("skills", []))
        return skills

    def _count_by_domain(self, curriculum_id: str) -> Dict[str, int]:
        """Count concepts by domain."""
        counts = {}
        concepts = self._curricula.get(curriculum_id, {}).get("concepts", {})
        for concept_data in concepts.values():
            domain = concept_data.get("domain", "other")
            counts[domain] = counts.get(domain, 0) + 1
        return counts

    def _average_difficulty(self, curriculum_id: str) -> float:
        """Calculate average difficulty."""
        concepts = self._curricula.get(curriculum_id, {}).get("concepts", {})
        if not concepts:
            return 0.0
        difficulties = [c.get("difficulty", 0.5) for c in concepts.values()]
        return float(np.mean(difficulties))

    def _generate_alignment_suggestions(
        self,
        curriculum1: str,
        curriculum2: str,
        shared_skills: Set[str],
        curr1_only: Set[str],
        curr2_only: Set[str],
    ) -> List[str]:
        """Generate suggestions for curriculum alignment."""
        suggestions = []

        if curr1_only:
            suggestions.append(
                f"Skills unique to {curriculum1}: {', '.join(list(curr1_only)[:5])}"
            )
        if curr2_only:
            suggestions.append(
                f"Skills unique to {curriculum2}: {', '.join(list(curr2_only)[:5])}"
            )
        if shared_skills:
            suggestions.append(
                f"Strong alignment in: {', '.join(list(shared_skills)[:5])}"
            )

        return suggestions

    def get_curriculum_info(self, curriculum_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a curriculum."""
        curriculum = self._curricula.get(curriculum_id)
        if not curriculum:
            return None

        concepts = curriculum.get("concepts", {})
        return {
            "id": curriculum_id,
            "name": curriculum.get("name", curriculum_id),
            "domains": curriculum.get("domains", []),
            "grade_levels": curriculum.get("grade_levels", []),
            "total_concepts": len(concepts),
            "skills_count": len(self._get_all_skills(curriculum_id)),
            "average_difficulty": self._average_difficulty(curriculum_id),
        }

    def get_all_curricula(self) -> List[str]:
        """Get all available curriculum IDs."""
        return list(self._curricula.keys())

    def get_concept(self, concept_id: str) -> Optional[Dict[str, Any]]:
        """Get concept information."""
        return self._concept_index.get(concept_id)

    def add_curriculum(
        self,
        curriculum_id: str,
        name: str,
        domains: List[str],
        grade_levels: List[str],
        concepts: Dict[str, Dict],
    ):
        """Add a new curriculum."""
        self._curricula[curriculum_id] = {
            "name": name,
            "domains": domains,
            "grade_levels": grade_levels,
            "concepts": concepts,
        }

        # Update concept index
        for concept_id, concept_data in concepts.items():
            self._concept_index[concept_id] = {
                **concept_data,
                "curriculum": curriculum_id,
                "id": concept_id,
            }

    def add_mapping(
        self,
        source_id: str,
        target_id: str,
        confidence: float,
        mapping_type: str,
    ):
        """Add a curriculum mapping."""
        source_curriculum = self._get_curriculum_for_concept(source_id)
        target_curriculum = self._get_curriculum_for_concept(target_id)

        if source_curriculum and target_curriculum:
            key = (source_curriculum, target_curriculum)
            if key not in self._mappings:
                self._mappings[key] = []

            self._mappings[key].append(StandardMapping(
                source_standard_id=source_id,
                target_standard_ids=[target_id],
                mapping_confidence=confidence,
                mapping_type=mapping_type,
                source_curriculum=source_curriculum,
                target_curriculum=target_curriculum,
            ))
