"""
Extraneous Load Detector

Detects and quantifies extraneous cognitive load from:
- Visual clutter and poor layout
- Split attention requirements
- Redundant information
- Navigation complexity
- Poor presentation design
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class IssueType(str, Enum):
    """Types of extraneous load issues."""
    VISUAL_CLUTTER = "visual_clutter"
    SPLIT_ATTENTION = "split_attention"
    REDUNDANCY = "redundancy"
    NAVIGATION = "navigation"
    INCONSISTENCY = "inconsistency"
    DISTRACTION = "distraction"
    MODALITY_MISMATCH = "modality_mismatch"
    POOR_SIGNALING = "poor_signaling"


class Severity(str, Enum):
    """Severity levels for issues."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class UIElement:
    """Description of a UI element."""
    element_type: str
    element_id: Optional[str] = None
    position: Optional[Dict[str, int]] = None
    size: Optional[Dict[str, int]] = None
    is_essential: bool = True
    is_distracting: bool = False
    relevance_score: float = 1.0
    visual_weight: float = 0.5


@dataclass
class ExtraneousLoadIssue:
    """A detected extraneous load issue."""
    issue_type: IssueType
    severity: Severity
    description: str
    affected_elements: List[str] = field(default_factory=list)
    load_contribution: float = 0.0
    recommendation: str = ""


@dataclass
class ExtraneousLoadAnalysis:
    """Complete extraneous load analysis."""
    total_extraneous_load: float  # 0-1
    load_level: str  # low, optimal, high, overload
    visual_clutter_score: float
    split_attention_score: float
    redundancy_score: float
    navigation_complexity: float
    issues: List[ExtraneousLoadIssue]
    recommendations: List[str]
    processing_time_ms: int


@dataclass
class ExtraneousLoadDetectorConfig:
    """Configuration for extraneous load detection."""
    # Thresholds
    low_load_threshold: float = 0.3
    optimal_load_threshold: float = 0.5
    high_load_threshold: float = 0.7

    # Visual clutter settings
    max_visible_elements: int = 15
    visual_density_threshold: float = 0.6
    distractor_weight: float = 0.2

    # Split attention settings
    max_attention_sources: int = 2
    spatial_separation_penalty: float = 0.1

    # Navigation settings
    max_navigation_depth: int = 3
    max_options_per_level: int = 7

    # Redundancy detection
    redundancy_threshold: float = 0.7

    # Component weights
    clutter_weight: float = 0.25
    split_attention_weight: float = 0.30
    redundancy_weight: float = 0.20
    navigation_weight: float = 0.25


class ExtraneousLoadDetector:
    """
    Detects extraneous cognitive load in learning interfaces.

    Extraneous load is caused by poor instructional design and can be
    minimized without affecting learning objectives.

    Key factors detected:
    - Visual clutter: Too many elements competing for attention
    - Split attention: Information that should be integrated is separated
    - Redundancy: Same information presented in multiple formats unnecessarily
    - Navigation complexity: Difficult to navigate interface
    - Distractions: Elements that draw attention away from learning

    Usage:
        detector = ExtraneousLoadDetector()
        analysis = detector.analyze(
            visible_elements=elements,
            navigation_depth=2,
            split_attention_sources=["text", "diagram"]
        )
        print(f"Extraneous load: {analysis.total_extraneous_load}")
    """

    def __init__(self, config: Optional[ExtraneousLoadDetectorConfig] = None):
        self.config = config or ExtraneousLoadDetectorConfig()
        logger.info("ExtraneousLoadDetector initialized")

    def analyze(
        self,
        learner_id: str,
        session_id: Optional[str] = None,
        ui_description: Optional[str] = None,
        visible_elements: Optional[List[UIElement]] = None,
        navigation_depth: int = 0,
        distractors_present: Optional[List[str]] = None,
        split_attention_sources: Optional[List[str]] = None,
        layout_data: Optional[Dict[str, Any]] = None,
    ) -> ExtraneousLoadAnalysis:
        """
        Analyze extraneous cognitive load.

        Args:
            learner_id: Learner identifier
            session_id: Session identifier
            ui_description: Text description of UI
            visible_elements: Currently visible UI elements
            navigation_depth: Current navigation depth
            distractors_present: Known distracting elements
            split_attention_sources: Sources requiring split attention
            layout_data: Structured layout information

        Returns:
            ExtraneousLoadAnalysis with detailed findings
        """
        start_time = time.time()

        visible_elements = visible_elements or []
        distractors_present = distractors_present or []
        split_attention_sources = split_attention_sources or []

        issues: List[ExtraneousLoadIssue] = []
        recommendations: List[str] = []

        # Analyze visual clutter
        clutter_score, clutter_issues = self._analyze_visual_clutter(
            visible_elements, distractors_present
        )
        issues.extend(clutter_issues)

        # Analyze split attention
        split_score, split_issues = self._analyze_split_attention(
            split_attention_sources, layout_data
        )
        issues.extend(split_issues)

        # Analyze redundancy
        redundancy_score, redundancy_issues = self._analyze_redundancy(
            visible_elements, ui_description
        )
        issues.extend(redundancy_issues)

        # Analyze navigation complexity
        nav_score, nav_issues = self._analyze_navigation(
            navigation_depth, layout_data
        )
        issues.extend(nav_issues)

        # Calculate total extraneous load
        total_load = (
            self.config.clutter_weight * clutter_score +
            self.config.split_attention_weight * split_score +
            self.config.redundancy_weight * redundancy_score +
            self.config.navigation_weight * nav_score
        )

        # Determine load level
        load_level = self._determine_load_level(total_load)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            clutter_score, split_score, redundancy_score, nav_score, issues
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ExtraneousLoadAnalysis(
            total_extraneous_load=min(1.0, total_load),
            load_level=load_level,
            visual_clutter_score=clutter_score,
            split_attention_score=split_score,
            redundancy_score=redundancy_score,
            navigation_complexity=nav_score,
            issues=issues,
            recommendations=recommendations,
            processing_time_ms=processing_time,
        )

    def analyze_ui_layout(
        self,
        layout_description: Optional[Dict[str, Any]] = None,
        screenshot_base64: Optional[str] = None,
        content_areas: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze UI layout for extraneous load issues.

        Args:
            layout_description: Structured layout description
            screenshot_base64: Base64 encoded screenshot (for future vision analysis)
            content_areas: Defined content areas

        Returns:
            Layout analysis results
        """
        start_time = time.time()

        issues = []
        score = 0.0
        suggestions = []
        accessibility_concerns = []

        if layout_description:
            # Analyze element density
            element_count = layout_description.get("element_count", 0)
            if element_count > self.config.max_visible_elements:
                issues.append({
                    "type": "high_density",
                    "description": f"Too many elements ({element_count})",
                    "severity": "medium",
                })
                score += 0.2

            # Analyze whitespace
            whitespace_ratio = layout_description.get("whitespace_ratio", 0.5)
            if whitespace_ratio < 0.2:
                issues.append({
                    "type": "insufficient_whitespace",
                    "description": "Insufficient whitespace between elements",
                    "severity": "medium",
                })
                score += 0.15
                suggestions.append("Increase spacing between content elements")

            # Analyze visual hierarchy
            has_clear_hierarchy = layout_description.get("has_clear_hierarchy", True)
            if not has_clear_hierarchy:
                issues.append({
                    "type": "poor_hierarchy",
                    "description": "Unclear visual hierarchy",
                    "severity": "high",
                })
                score += 0.25
                suggestions.append("Establish clear visual hierarchy using size and contrast")

            # Check consistency
            is_consistent = layout_description.get("is_consistent", True)
            if not is_consistent:
                issues.append({
                    "type": "inconsistency",
                    "description": "Inconsistent design patterns",
                    "severity": "medium",
                })
                score += 0.15

        if content_areas:
            # Check for split attention issues
            text_areas = [a for a in content_areas if a.get("type") == "text"]
            visual_areas = [a for a in content_areas if a.get("type") in ("image", "diagram")]

            if text_areas and visual_areas:
                # Check spatial proximity
                for text in text_areas:
                    for visual in visual_areas:
                        if self._are_spatially_separated(text, visual):
                            issues.append({
                                "type": "split_attention",
                                "description": "Related text and visual content are spatially separated",
                                "severity": "high",
                            })
                            score += 0.2
                            suggestions.append("Integrate text with related visuals")
                            break

        # Accessibility checks
        if layout_description:
            font_size = layout_description.get("min_font_size", 16)
            if font_size < 14:
                accessibility_concerns.append("Font size may be too small for readability")

            contrast_ratio = layout_description.get("contrast_ratio", 4.5)
            if contrast_ratio < 4.5:
                accessibility_concerns.append("Insufficient color contrast")

        processing_time = int((time.time() - start_time) * 1000)

        return {
            "layout_score": min(1.0, 1.0 - score),
            "issues": issues,
            "suggested_improvements": suggestions,
            "accessibility_concerns": accessibility_concerns,
            "processing_time_ms": processing_time,
        }

    def detect_distractors(
        self,
        elements: List[UIElement],
        learning_focus: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Identify distracting elements in the UI.

        Args:
            elements: List of UI elements
            learning_focus: The primary learning content type

        Returns:
            List of identified distractors
        """
        distractors = []

        for element in elements:
            distraction_score = 0.0
            reasons = []

            # Check if explicitly marked as distracting
            if element.is_distracting:
                distraction_score += 0.5
                reasons.append("Marked as distracting")

            # Check relevance
            if element.relevance_score < 0.3:
                distraction_score += 0.3
                reasons.append(f"Low relevance ({element.relevance_score:.2f})")

            # Check if non-essential with high visual weight
            if not element.is_essential and element.visual_weight > 0.7:
                distraction_score += 0.2
                reasons.append("Non-essential but visually prominent")

            # Check element type (some types are more distracting)
            distracting_types = {"animation", "video_autoplay", "advertisement", "popup", "notification"}
            if element.element_type.lower() in distracting_types:
                distraction_score += 0.4
                reasons.append(f"Potentially distracting type: {element.element_type}")

            if distraction_score > 0.3:
                distractors.append({
                    "element_id": element.element_id or element.element_type,
                    "element_type": element.element_type,
                    "distraction_score": min(1.0, distraction_score),
                    "reasons": reasons,
                    "recommendation": self._get_distractor_recommendation(element),
                })

        return distractors

    def calculate_split_attention_effect(
        self,
        information_sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Calculate the split attention effect from multiple information sources.

        Split attention occurs when learners must mentally integrate multiple
        sources of information that are physically or temporally separated.

        Args:
            information_sources: List of information sources with positions

        Returns:
            Analysis of split attention effect
        """
        if len(information_sources) <= 1:
            return {
                "split_attention_effect": 0.0,
                "requires_integration": False,
                "recommendations": [],
            }

        # Calculate pairwise distances
        distances = []
        integration_pairs = []

        for i, source1 in enumerate(information_sources):
            for j, source2 in enumerate(information_sources):
                if i < j:
                    # Check if they need to be integrated
                    if source1.get("related_to") == source2.get("id") or \
                       source2.get("related_to") == source1.get("id"):
                        integration_pairs.append((source1, source2))

                        # Calculate spatial distance
                        pos1 = source1.get("position", {})
                        pos2 = source2.get("position", {})

                        if pos1 and pos2:
                            dx = abs(pos1.get("x", 0) - pos2.get("x", 0))
                            dy = abs(pos1.get("y", 0) - pos2.get("y", 0))
                            distance = np.sqrt(dx**2 + dy**2)
                            distances.append(distance)

        if not integration_pairs:
            return {
                "split_attention_effect": 0.0,
                "requires_integration": False,
                "recommendations": [],
            }

        # Calculate effect based on distances and number of sources
        avg_distance = np.mean(distances) if distances else 0
        normalized_distance = min(1.0, avg_distance / 500)  # Normalize to screen units

        source_count_factor = min(1.0, (len(information_sources) - 1) / 4)

        split_attention_effect = (normalized_distance * 0.6 + source_count_factor * 0.4)

        recommendations = []
        if split_attention_effect > 0.3:
            recommendations.append("Physically integrate related information sources")
        if split_attention_effect > 0.5:
            recommendations.append("Consider using integrated diagrams with embedded text")
        if len(information_sources) > 3:
            recommendations.append("Reduce the number of separate information sources")

        return {
            "split_attention_effect": split_attention_effect,
            "requires_integration": True,
            "integration_pairs": len(integration_pairs),
            "average_distance": avg_distance,
            "recommendations": recommendations,
        }

    def _analyze_visual_clutter(
        self,
        elements: List[UIElement],
        distractors: List[str],
    ) -> tuple[float, List[ExtraneousLoadIssue]]:
        """Analyze visual clutter."""
        issues = []

        if not elements:
            return 0.0, issues

        # Element count score
        element_count = len(elements)
        count_score = min(1.0, element_count / self.config.max_visible_elements)

        if element_count > self.config.max_visible_elements:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.VISUAL_CLUTTER,
                severity=Severity.MEDIUM if element_count < 25 else Severity.HIGH,
                description=f"Too many visible elements ({element_count})",
                load_contribution=count_score * 0.3,
                recommendation="Reduce the number of visible elements or use progressive disclosure",
            ))

        # Calculate visual density
        total_visual_weight = sum(e.visual_weight for e in elements)
        avg_visual_weight = total_visual_weight / len(elements)

        if avg_visual_weight > 0.7:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.VISUAL_CLUTTER,
                severity=Severity.MEDIUM,
                description="High average visual weight of elements",
                load_contribution=0.15,
                recommendation="Use visual hierarchy to differentiate important from supporting elements",
            ))

        # Distractor contribution
        distractor_score = len(distractors) * self.config.distractor_weight

        if distractors:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.DISTRACTION,
                severity=Severity.MEDIUM if len(distractors) < 3 else Severity.HIGH,
                description=f"{len(distractors)} distracting elements present",
                affected_elements=distractors,
                load_contribution=distractor_score,
                recommendation="Remove or minimize distracting elements",
            ))

        # Non-essential elements
        non_essential = [e for e in elements if not e.is_essential]
        non_essential_ratio = len(non_essential) / len(elements) if elements else 0

        if non_essential_ratio > 0.3:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.VISUAL_CLUTTER,
                severity=Severity.LOW,
                description=f"{len(non_essential)} non-essential elements visible",
                load_contribution=non_essential_ratio * 0.2,
                recommendation="Consider hiding non-essential elements",
            ))

        total_score = (
            count_score * 0.4 +
            avg_visual_weight * 0.3 +
            distractor_score +
            non_essential_ratio * 0.2
        )

        return min(1.0, total_score), issues

    def _analyze_split_attention(
        self,
        sources: List[str],
        layout_data: Optional[Dict[str, Any]],
    ) -> tuple[float, List[ExtraneousLoadIssue]]:
        """Analyze split attention requirements."""
        issues = []

        if len(sources) <= 1:
            return 0.0, issues

        # Calculate split attention score
        source_count = len(sources)
        base_score = min(1.0, (source_count - 1) / (self.config.max_attention_sources))

        if source_count > self.config.max_attention_sources:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.SPLIT_ATTENTION,
                severity=Severity.HIGH if source_count > 4 else Severity.MEDIUM,
                description=f"Attention must be split across {source_count} sources",
                affected_elements=sources,
                load_contribution=base_score * 0.4,
                recommendation="Integrate information sources or present sequentially",
            ))

        # Check for modality effects
        modalities = set()
        for source in sources:
            if "text" in source.lower():
                modalities.add("visual_text")
            elif any(v in source.lower() for v in ["diagram", "image", "graph", "chart"]):
                modalities.add("visual_graphic")
            elif any(a in source.lower() for a in ["audio", "narration", "speech"]):
                modalities.add("auditory")

        # Check for redundancy effect (same modality)
        if len(modalities) == 1 and source_count > 2:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.MODALITY_MISMATCH,
                severity=Severity.MEDIUM,
                description="Multiple sources using same modality (potential overload)",
                load_contribution=0.15,
                recommendation="Consider using different modalities (e.g., audio for text)",
            ))

        # Layout-based split attention (if layout data available)
        if layout_data:
            spatial_separation = layout_data.get("max_spatial_separation", 0)
            if spatial_separation > 300:  # pixels
                separation_score = min(1.0, spatial_separation / 600)
                issues.append(ExtraneousLoadIssue(
                    issue_type=IssueType.SPLIT_ATTENTION,
                    severity=Severity.MEDIUM,
                    description="Related content is spatially separated",
                    load_contribution=separation_score * 0.2,
                    recommendation="Move related content closer together",
                ))
                base_score += separation_score * 0.2

        return min(1.0, base_score), issues

    def _analyze_redundancy(
        self,
        elements: List[UIElement],
        ui_description: Optional[str],
    ) -> tuple[float, List[ExtraneousLoadIssue]]:
        """Analyze redundant information."""
        issues = []
        score = 0.0

        # Check for text duplication in elements
        element_texts = [e.element_type for e in elements if e.element_type]
        text_counts: Dict[str, int] = {}
        for text in element_texts:
            text_lower = text.lower()
            text_counts[text_lower] = text_counts.get(text_lower, 0) + 1

        duplicates = {k: v for k, v in text_counts.items() if v > 1}
        if duplicates:
            dup_score = min(1.0, sum(duplicates.values()) / 10)
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.REDUNDANCY,
                severity=Severity.LOW,
                description=f"Redundant element types detected: {list(duplicates.keys())}",
                load_contribution=dup_score * 0.15,
                recommendation="Remove redundant elements or consolidate information",
            ))
            score += dup_score * 0.3

        # Check for text + identical audio (would need additional data)
        # This is a placeholder for more sophisticated redundancy detection

        return min(1.0, score), issues

    def _analyze_navigation(
        self,
        depth: int,
        layout_data: Optional[Dict[str, Any]],
    ) -> tuple[float, List[ExtraneousLoadIssue]]:
        """Analyze navigation complexity."""
        issues = []

        # Depth score
        depth_score = min(1.0, depth / self.config.max_navigation_depth)

        if depth > self.config.max_navigation_depth:
            issues.append(ExtraneousLoadIssue(
                issue_type=IssueType.NAVIGATION,
                severity=Severity.MEDIUM,
                description=f"Navigation depth too deep ({depth} levels)",
                load_contribution=depth_score * 0.3,
                recommendation="Flatten navigation structure or provide shortcuts",
            ))

        # Options per level (if available)
        options_per_level = 0
        if layout_data:
            options_per_level = layout_data.get("options_per_level", 0)
            if options_per_level > self.config.max_options_per_level:
                options_score = min(1.0, options_per_level / (self.config.max_options_per_level * 2))
                issues.append(ExtraneousLoadIssue(
                    issue_type=IssueType.NAVIGATION,
                    severity=Severity.MEDIUM,
                    description=f"Too many navigation options ({options_per_level})",
                    load_contribution=options_score * 0.2,
                    recommendation="Group related options or use progressive disclosure",
                ))
                depth_score = (depth_score + options_score) / 2

        return depth_score, issues

    def _determine_load_level(self, load: float) -> str:
        """Determine load level from score."""
        if load <= self.config.low_load_threshold:
            return "low"
        elif load <= self.config.optimal_load_threshold:
            return "optimal"
        elif load <= self.config.high_load_threshold:
            return "high"
        else:
            return "overload"

    def _generate_recommendations(
        self,
        clutter: float,
        split_attention: float,
        redundancy: float,
        navigation: float,
        issues: List[ExtraneousLoadIssue],
    ) -> List[str]:
        """Generate prioritized recommendations."""
        recommendations = []

        # Priority recommendations based on scores
        score_factors = [
            (split_attention, "Integrate information sources to reduce split attention"),
            (clutter, "Reduce visual clutter by removing non-essential elements"),
            (navigation, "Simplify navigation structure"),
            (redundancy, "Eliminate redundant information"),
        ]

        # Sort by score and add top recommendations
        score_factors.sort(key=lambda x: x[0], reverse=True)
        for score, rec in score_factors:
            if score > 0.5:
                recommendations.append(rec)

        # Add issue-specific recommendations
        for issue in sorted(issues, key=lambda i: i.load_contribution, reverse=True)[:3]:
            if issue.recommendation and issue.recommendation not in recommendations:
                recommendations.append(issue.recommendation)

        return recommendations[:5]  # Return top 5

    def _are_spatially_separated(
        self,
        area1: Dict[str, Any],
        area2: Dict[str, Any],
        threshold: int = 200,
    ) -> bool:
        """Check if two content areas are spatially separated."""
        pos1 = area1.get("position", {})
        pos2 = area2.get("position", {})

        if not pos1 or not pos2:
            return False

        dx = abs(pos1.get("x", 0) - pos2.get("x", 0))
        dy = abs(pos1.get("y", 0) - pos2.get("y", 0))

        return np.sqrt(dx**2 + dy**2) > threshold

    def _get_distractor_recommendation(self, element: UIElement) -> str:
        """Get recommendation for handling a distractor."""
        if element.element_type.lower() in ("animation", "video_autoplay"):
            return "Pause or remove auto-playing media during focused learning"
        elif element.element_type.lower() in ("advertisement", "popup"):
            return "Block or hide advertisements during learning sessions"
        elif element.element_type.lower() == "notification":
            return "Disable non-essential notifications during learning"
        else:
            return "Consider removing or minimizing this element"
