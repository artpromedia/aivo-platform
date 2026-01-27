"""
Pacing Optimizer

Optimize content delivery pacing based on cognitive load.
Implements strategies for interleaved practice, spaced complexity,
rest intervals, and chunk sizing.
"""
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PacingRecommendation:
    """Recommendation for content pacing."""
    pace: str  # slow, normal, fast
    break_suggested: bool
    break_duration_seconds: Optional[int]
    content_order: List[str]  # Content IDs in recommended order
    time_per_item: Dict[str, float]  # Recommended time per content item
    items_to_skip: List[str]  # Items to skip or defer
    rationale: str
    confidence: float = 0.8
    processing_time_ms: int = 0


@dataclass
class ContentSchedule:
    """A scheduled content delivery plan."""
    schedule_id: str
    content_items: List[Dict[str, Any]]  # Ordered content with timing
    total_duration_seconds: int
    break_points: List[int]  # Indices where breaks are recommended
    estimated_load_profile: List[float]  # Predicted load over time
    optimization_score: float


@dataclass
class PacingOptimizerConfig:
    """Configuration for the pacing optimizer."""
    # Pace thresholds
    slow_pace_load_threshold: float = 0.75
    fast_pace_load_threshold: float = 0.4

    # Break thresholds
    break_load_threshold: float = 0.8
    break_fatigue_threshold: float = 0.7
    min_time_between_breaks_seconds: int = 600  # 10 minutes
    max_time_between_breaks_seconds: int = 2700  # 45 minutes
    default_break_duration_seconds: int = 180  # 3 minutes

    # Content chunking
    optimal_chunk_complexity: float = 0.5
    min_chunk_length: int = 50  # characters
    max_chunk_length: int = 500  # characters

    # Interleaving
    enable_interleaving: bool = True
    max_consecutive_hard_items: int = 2

    # Pacing multipliers
    slow_pace_multiplier: float = 1.5
    fast_pace_multiplier: float = 0.75


@dataclass
class ContentItem:
    """A content item for scheduling."""
    content_id: str
    complexity: float
    estimated_duration_seconds: int
    prerequisites: List[str] = field(default_factory=list)
    content_type: str = "general"


class PacingOptimizer:
    """
    Optimize content pacing based on cognitive load.

    Strategies implemented:
    - Interleaved practice: Alternate between topics/difficulty levels
    - Spaced complexity: Distribute difficult content across time
    - Rest intervals: Strategic break placement
    - Chunk sizing: Optimal content segmentation

    Usage:
        optimizer = PacingOptimizer()
        pacing = optimizer.optimize(current_load=0.8, content_queue=[...])
        print(f"Recommended pace: {pacing.pace}")
        print(f"Content order: {pacing.content_order}")
    """

    def __init__(self, config: Optional[PacingOptimizerConfig] = None):
        """Initialize the pacing optimizer.

        Args:
            config: Optional configuration overrides
        """
        self.config = config or PacingOptimizerConfig()

        # Track learner pacing history
        self._pacing_history: Dict[str, List[Dict[str, Any]]] = {}

        logger.info("PacingOptimizer initialized")

    def optimize(
        self,
        current_load: float,
        content_queue: List[str],
        content_complexities: Dict[str, float],
        learner_id: Optional[str] = None,
        fatigue_level: float = 0.0,
        session_time_elapsed_seconds: float = 0.0,
        learner_pace_preference: Optional[str] = None,
    ) -> PacingRecommendation:
        """
        Optimize content delivery order and timing.

        Args:
            current_load: Current cognitive load (0-1)
            content_queue: List of content IDs to deliver
            content_complexities: Complexity score for each content ID
            learner_id: Optional learner identifier
            fatigue_level: Current fatigue level (0-1)
            session_time_elapsed_seconds: Time already spent in session
            learner_pace_preference: Learner's preferred pace (slow/normal/fast)

        Returns:
            PacingRecommendation with optimized delivery plan
        """
        start_time = time.time()

        if not content_queue:
            return PacingRecommendation(
                pace="normal",
                break_suggested=False,
                break_duration_seconds=None,
                content_order=[],
                time_per_item={},
                items_to_skip=[],
                rationale="No content to optimize",
                processing_time_ms=0,
            )

        try:
            # Determine recommended pace
            pace = self._determine_pace(
                current_load, fatigue_level, learner_pace_preference
            )

            # Check if break is needed
            break_suggested, break_duration = self._evaluate_break_need(
                current_load, fatigue_level, session_time_elapsed_seconds
            )

            # Optimize content order
            content_order = self._optimize_content_order(
                content_queue, content_complexities, current_load
            )

            # Calculate time per item
            time_per_item = self._calculate_time_per_item(
                content_order, content_complexities, pace
            )

            # Identify items to skip if overloaded
            items_to_skip = self._identify_items_to_skip(
                content_order, content_complexities, current_load
            )

            # Generate rationale
            rationale = self._generate_rationale(
                current_load, fatigue_level, pace, break_suggested
            )

            # Calculate confidence
            confidence = self._calculate_confidence(
                len(content_queue), current_load, learner_id
            )

            processing_time = int((time.time() - start_time) * 1000)

            recommendation = PacingRecommendation(
                pace=pace,
                break_suggested=break_suggested,
                break_duration_seconds=break_duration,
                content_order=content_order,
                time_per_item=time_per_item,
                items_to_skip=items_to_skip,
                rationale=rationale,
                confidence=confidence,
                processing_time_ms=processing_time,
            )

            # Update history
            if learner_id:
                self._update_history(learner_id, recommendation, current_load)

            return recommendation

        except Exception as e:
            logger.error(f"Error optimizing pacing: {e}", exc_info=True)
            processing_time = int((time.time() - start_time) * 1000)
            return PacingRecommendation(
                pace="normal",
                break_suggested=current_load > 0.8,
                break_duration_seconds=180 if current_load > 0.8 else None,
                content_order=content_queue,
                time_per_item={c: 300.0 for c in content_queue},
                items_to_skip=[],
                rationale="Using default pacing due to optimization error",
                confidence=0.5,
                processing_time_ms=processing_time,
            )

    def optimize_pacing(
        self,
        current_load: float,
        content_queue: List[str],
        content_complexities: Dict[str, float],
        **kwargs
    ) -> PacingRecommendation:
        """
        Optimize content delivery pacing.

        Alias for optimize() method for API compatibility.

        Args:
            current_load: Current cognitive load (0-1)
            content_queue: List of content IDs
            content_complexities: Complexity for each content ID

        Returns:
            PacingRecommendation with optimized plan
        """
        return self.optimize(current_load, content_queue, content_complexities, **kwargs)

    def recommend_pace(
        self,
        current_load: float,
        fatigue_level: float = 0.0,
        learner_preference: Optional[str] = None,
    ) -> str:
        """
        Recommend optimal pace based on current load.

        Args:
            current_load: Current cognitive load (0-1)
            fatigue_level: Current fatigue level (0-1)
            learner_preference: Learner's preferred pace

        Returns:
            Recommended pace: "slow", "normal", or "fast"
        """
        return self._determine_pace(current_load, fatigue_level, learner_preference)

    def suggest_break(
        self,
        load_history: List[float],
        session_duration_seconds: float,
        last_break_seconds_ago: Optional[float] = None,
    ) -> Tuple[bool, Optional[int]]:
        """
        Suggest whether a break is needed.

        Args:
            load_history: Recent load measurements
            session_duration_seconds: Total session duration
            last_break_seconds_ago: Time since last break

        Returns:
            Tuple of (should_take_break, suggested_duration_seconds)
        """
        if not load_history:
            return False, None

        current_load = load_history[-1]
        avg_load = float(np.mean(load_history))

        # Check if break is overdue
        if last_break_seconds_ago is not None:
            if last_break_seconds_ago > self.config.max_time_between_breaks_seconds:
                return True, self.config.default_break_duration_seconds

        # Check load-based criteria
        if current_load > self.config.break_load_threshold:
            duration = self._calculate_break_duration(current_load, avg_load)
            return True, duration

        # Check trend - if load is rapidly increasing
        if len(load_history) >= 3:
            trend = load_history[-1] - load_history[-3]
            if trend > 0.2:  # Rapid increase
                return True, self.config.default_break_duration_seconds

        # Check minimum time between breaks
        if last_break_seconds_ago is not None:
            if last_break_seconds_ago < self.config.min_time_between_breaks_seconds:
                return False, None

        # Check session duration
        if session_duration_seconds > self.config.max_time_between_breaks_seconds:
            if avg_load > 0.6:
                return True, self.config.default_break_duration_seconds

        return False, None

    def schedule_content(
        self,
        content_items: List[ContentItem],
        available_time_seconds: int,
        target_load: float = 0.6,
        include_breaks: bool = True,
    ) -> ContentSchedule:
        """
        Schedule content delivery with breaks.

        Creates an optimized schedule that:
        - Respects time constraints
        - Manages cognitive load
        - Includes strategic breaks
        - Interleaves difficulty levels

        Args:
            content_items: List of content items to schedule
            available_time_seconds: Total available time
            target_load: Target average load level
            include_breaks: Whether to include break recommendations

        Returns:
            ContentSchedule with optimized delivery plan
        """
        if not content_items:
            return ContentSchedule(
                schedule_id=f"schedule_{int(time.time())}",
                content_items=[],
                total_duration_seconds=0,
                break_points=[],
                estimated_load_profile=[],
                optimization_score=1.0,
            )

        try:
            # Sort and interleave content
            scheduled_items = self._schedule_with_interleaving(content_items, target_load)

            # Calculate timing for each item
            timed_items = []
            current_time = 0
            load_profile = []
            break_points = []

            cumulative_load = 0.0
            items_since_break = 0

            for item in scheduled_items:
                # Check if break is needed before this item
                if include_breaks and items_since_break > 0:
                    should_break = (
                        cumulative_load / items_since_break > self.config.break_load_threshold or
                        items_since_break >= 5
                    )
                    if should_break and current_time < available_time_seconds:
                        break_points.append(len(timed_items))
                        current_time += self.config.default_break_duration_seconds
                        cumulative_load = 0.0
                        items_since_break = 0

                # Check if we have time for this item
                if current_time + item.estimated_duration_seconds > available_time_seconds:
                    break  # No more time

                # Add item to schedule
                timed_items.append({
                    "content_id": item.content_id,
                    "complexity": item.complexity,
                    "start_time_seconds": current_time,
                    "duration_seconds": item.estimated_duration_seconds,
                    "content_type": item.content_type,
                })

                load_profile.append(item.complexity)
                current_time += item.estimated_duration_seconds
                cumulative_load += item.complexity
                items_since_break += 1

            # Calculate optimization score
            optimization_score = self._calculate_schedule_score(
                timed_items, load_profile, target_load
            )

            return ContentSchedule(
                schedule_id=f"schedule_{int(time.time())}",
                content_items=timed_items,
                total_duration_seconds=current_time,
                break_points=break_points,
                estimated_load_profile=load_profile,
                optimization_score=optimization_score,
            )

        except Exception as e:
            logger.error(f"Error scheduling content: {e}", exc_info=True)
            return ContentSchedule(
                schedule_id=f"schedule_{int(time.time())}",
                content_items=[
                    {
                        "content_id": item.content_id,
                        "complexity": item.complexity,
                        "start_time_seconds": i * 300,
                        "duration_seconds": item.estimated_duration_seconds,
                    }
                    for i, item in enumerate(content_items)
                ],
                total_duration_seconds=sum(item.estimated_duration_seconds for item in content_items),
                break_points=[],
                estimated_load_profile=[item.complexity for item in content_items],
                optimization_score=0.5,
            )

    def chunk_content(
        self,
        content: str,
        target_chunk_complexity: float = 0.5,
        max_chunks: int = 10,
    ) -> List[str]:
        """
        Break content into cognitively manageable chunks.

        Args:
            content: Content text to chunk
            target_chunk_complexity: Target complexity per chunk
            max_chunks: Maximum number of chunks to create

        Returns:
            List of content chunks
        """
        if not content or not content.strip():
            return []

        # Split by sentences first
        sentences = self._split_into_sentences(content)

        if len(sentences) <= 1:
            return [content.strip()]

        chunks = []
        current_chunk = []
        current_complexity = 0.0

        for sentence in sentences:
            sentence_complexity = self._estimate_sentence_complexity(sentence)

            # Check if adding this sentence would exceed target
            if current_chunk:
                potential_complexity = (
                    (current_complexity * len(current_chunk) + sentence_complexity) /
                    (len(current_chunk) + 1)
                )

                # Start new chunk if complexity exceeds target or chunk is long enough
                if (potential_complexity > target_chunk_complexity * 1.2 or
                    len(" ".join(current_chunk)) > self.config.max_chunk_length):
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_complexity = 0.0

                    if len(chunks) >= max_chunks - 1:
                        # Add remaining content to last chunk
                        remaining = sentences[sentences.index(sentence):]
                        chunks.append(" ".join(remaining))
                        return chunks

            current_chunk.append(sentence)
            current_complexity = (
                (current_complexity * (len(current_chunk) - 1) + sentence_complexity) /
                len(current_chunk)
            )

        # Add final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def _determine_pace(
        self,
        current_load: float,
        fatigue_level: float,
        preference: Optional[str],
    ) -> str:
        """Determine recommended pace."""
        combined_load = 0.7 * current_load + 0.3 * fatigue_level

        if combined_load > self.config.slow_pace_load_threshold:
            return "slow"
        elif combined_load < self.config.fast_pace_load_threshold:
            # Consider preference only when load is low
            if preference == "fast":
                return "fast"
            return "normal"
        else:
            return "normal"

    def _evaluate_break_need(
        self,
        current_load: float,
        fatigue_level: float,
        session_time_elapsed: float,
    ) -> Tuple[bool, Optional[int]]:
        """Evaluate if a break is needed."""
        # High load or fatigue triggers break
        if current_load > self.config.break_load_threshold:
            return True, self._calculate_break_duration(current_load, current_load)

        if fatigue_level > self.config.break_fatigue_threshold:
            return True, self._calculate_break_duration(fatigue_level, fatigue_level)

        # Time-based break
        if session_time_elapsed > self.config.max_time_between_breaks_seconds:
            return True, self.config.default_break_duration_seconds

        return False, None

    def _calculate_break_duration(
        self,
        current_load: float,
        avg_load: float,
    ) -> int:
        """Calculate appropriate break duration."""
        base_duration = self.config.default_break_duration_seconds

        # Increase duration for high load
        if current_load > 0.9:
            return int(base_duration * 2)
        elif current_load > 0.8:
            return int(base_duration * 1.5)

        return base_duration

    def _optimize_content_order(
        self,
        content_queue: List[str],
        complexities: Dict[str, float],
        current_load: float,
    ) -> List[str]:
        """Optimize content order using interleaving."""
        if not self.config.enable_interleaving:
            return content_queue

        # Separate into easy and hard content
        easy = [c for c in content_queue if complexities.get(c, 0.5) < 0.5]
        hard = [c for c in content_queue if complexities.get(c, 0.5) >= 0.5]

        # Sort each list by complexity
        easy.sort(key=lambda c: complexities.get(c, 0.5))
        hard.sort(key=lambda c: complexities.get(c, 0.5))

        # Interleave: if high load, start with easy
        result = []
        if current_load > 0.7:
            # Start with easy content
            while easy or hard:
                if easy:
                    result.append(easy.pop(0))
                if hard and len([r for r in result[-self.config.max_consecutive_hard_items:]
                               if complexities.get(r, 0) >= 0.5]) < self.config.max_consecutive_hard_items:
                    result.append(hard.pop(0))
        else:
            # Standard interleaving
            while easy or hard:
                if easy:
                    result.append(easy.pop(0))
                if hard:
                    result.append(hard.pop(0))

        return result

    def _calculate_time_per_item(
        self,
        content_order: List[str],
        complexities: Dict[str, float],
        pace: str,
    ) -> Dict[str, float]:
        """Calculate recommended time for each content item."""
        # Base time (in seconds)
        base_time = 300  # 5 minutes default

        # Pace multiplier
        if pace == "slow":
            multiplier = self.config.slow_pace_multiplier
        elif pace == "fast":
            multiplier = self.config.fast_pace_multiplier
        else:
            multiplier = 1.0

        time_per_item = {}
        for content_id in content_order:
            complexity = complexities.get(content_id, 0.5)
            # More time for complex content
            complexity_factor = 0.5 + complexity  # 0.5x to 1.5x
            time_per_item[content_id] = base_time * multiplier * complexity_factor

        return time_per_item

    def _identify_items_to_skip(
        self,
        content_order: List[str],
        complexities: Dict[str, float],
        current_load: float,
    ) -> List[str]:
        """Identify items that should be skipped when overloaded."""
        if current_load < 0.85:
            return []

        # Skip highest complexity items when severely overloaded
        items_with_complexity = [
            (c, complexities.get(c, 0.5))
            for c in content_order
        ]
        items_with_complexity.sort(key=lambda x: x[1], reverse=True)

        # Skip top 20% most complex items
        skip_count = max(1, len(content_order) // 5)
        return [item[0] for item in items_with_complexity[:skip_count]]

    def _generate_rationale(
        self,
        current_load: float,
        fatigue_level: float,
        pace: str,
        break_suggested: bool,
    ) -> str:
        """Generate human-readable rationale for recommendations."""
        parts = []

        if current_load > 0.8:
            parts.append(f"Current load is high ({current_load:.0%})")
        elif current_load < 0.4:
            parts.append(f"Current load is low ({current_load:.0%})")

        if fatigue_level > 0.7:
            parts.append(f"fatigue level is elevated ({fatigue_level:.0%})")

        if pace == "slow":
            parts.append("recommending slower pace to manage cognitive demands")
        elif pace == "fast":
            parts.append("capacity available for faster pace")

        if break_suggested:
            parts.append("break recommended to restore cognitive resources")

        if not parts:
            parts.append("Standard pacing recommended based on current state")

        return "; ".join(parts).capitalize() + "."

    def _calculate_confidence(
        self,
        queue_size: int,
        current_load: float,
        learner_id: Optional[str],
    ) -> float:
        """Calculate confidence in the recommendation."""
        confidence = 0.7  # Base confidence

        # More content = higher confidence in optimization
        if queue_size > 5:
            confidence += 0.1

        # Known learner = higher confidence
        if learner_id and learner_id in self._pacing_history:
            confidence += 0.1

        # Extreme load values are more certain
        if current_load > 0.9 or current_load < 0.2:
            confidence += 0.05

        return min(1.0, confidence)

    def _update_history(
        self,
        learner_id: str,
        recommendation: PacingRecommendation,
        current_load: float,
    ) -> None:
        """Update pacing history for learner."""
        if learner_id not in self._pacing_history:
            self._pacing_history[learner_id] = []

        self._pacing_history[learner_id].append({
            "timestamp": datetime.utcnow().isoformat(),
            "pace": recommendation.pace,
            "break_suggested": recommendation.break_suggested,
            "load": current_load,
        })

        # Keep history bounded
        max_history = 100
        if len(self._pacing_history[learner_id]) > max_history:
            self._pacing_history[learner_id] = self._pacing_history[learner_id][-max_history:]

    def _schedule_with_interleaving(
        self,
        content_items: List[ContentItem],
        target_load: float,
    ) -> List[ContentItem]:
        """Schedule content with interleaving for optimal learning."""
        if len(content_items) <= 2:
            return content_items

        # Separate by complexity
        easy = [item for item in content_items if item.complexity < 0.4]
        medium = [item for item in content_items if 0.4 <= item.complexity < 0.7]
        hard = [item for item in content_items if item.complexity >= 0.7]

        # Sort each group
        easy.sort(key=lambda x: x.complexity)
        medium.sort(key=lambda x: x.complexity)
        hard.sort(key=lambda x: x.complexity)

        # Interleave: easy -> medium -> hard -> easy -> ...
        result = []
        sources = [easy, medium, hard]
        source_idx = 0
        consecutive_hard = 0

        while any(sources):
            # Remove empty sources
            sources = [s for s in sources if s]
            if not sources:
                break

            # Select next source
            source_idx = source_idx % len(sources)
            item = sources[source_idx].pop(0)
            result.append(item)

            # Track consecutive hard items
            if item.complexity >= 0.7:
                consecutive_hard += 1
                if consecutive_hard >= self.config.max_consecutive_hard_items:
                    # Force next item to be easier
                    source_idx = 0  # Reset to easy
                    consecutive_hard = 0
            else:
                consecutive_hard = 0

            source_idx += 1

        return result

    def _calculate_schedule_score(
        self,
        timed_items: List[Dict[str, Any]],
        load_profile: List[float],
        target_load: float,
    ) -> float:
        """Calculate optimization score for a schedule."""
        if not load_profile:
            return 1.0

        # Score based on how close average load is to target
        avg_load = float(np.mean(load_profile))
        load_diff = abs(avg_load - target_load)
        load_score = 1.0 - load_diff

        # Score based on load variance (lower is better)
        variance = float(np.var(load_profile))
        variance_score = max(0.0, 1.0 - variance * 2)

        # Score based on interleaving (alternating complexity is good)
        interleave_score = self._calculate_interleave_score(load_profile)

        # Weighted combination
        score = (
            0.4 * load_score +
            0.3 * variance_score +
            0.3 * interleave_score
        )

        return float(np.clip(score, 0.0, 1.0))

    def _calculate_interleave_score(self, load_profile: List[float]) -> float:
        """Calculate how well the content is interleaved."""
        if len(load_profile) < 3:
            return 0.5

        # Count alternations between high and low
        alternations = 0
        for i in range(1, len(load_profile)):
            prev_high = load_profile[i - 1] >= 0.5
            curr_high = load_profile[i] >= 0.5
            if prev_high != curr_high:
                alternations += 1

        max_alternations = len(load_profile) - 1
        return alternations / max_alternations if max_alternations > 0 else 0.5

    def _split_into_sentences(self, content: str) -> List[str]:
        """Split content into sentences."""
        import re
        # Split on sentence-ending punctuation
        sentences = re.split(r'(?<=[.!?])\s+', content)
        return [s.strip() for s in sentences if s.strip()]

    def _estimate_sentence_complexity(self, sentence: str) -> float:
        """Estimate complexity of a single sentence."""
        words = sentence.split()
        if not words:
            return 0.0

        # Factors affecting complexity
        word_count = len(words)
        avg_word_length = sum(len(w) for w in words) / len(words)

        # Normalize factors
        length_factor = min(1.0, word_count / 25)  # Normalize to 25 words
        word_complexity = min(1.0, (avg_word_length - 3) / 7)  # Normalize avg length

        # Check for complex structures
        complex_markers = ["however", "therefore", "because", "although", "whereas"]
        has_complex_structure = any(m in sentence.lower() for m in complex_markers)

        complexity = (
            0.4 * length_factor +
            0.4 * word_complexity +
            0.2 * (1.0 if has_complex_structure else 0.0)
        )

        return float(np.clip(complexity, 0.0, 1.0))
