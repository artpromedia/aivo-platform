"""
Working Memory Model

Models learner working memory capacity and estimates current usage.
Based on cognitive load theory and working memory research.

Key concepts:
- Working memory capacity (~7±2 items, or ~4 chunks)
- Decay over time (items fade without rehearsal)
- Chunking (grouping items reduces load)
- Individual differences in capacity
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class MemoryChunk:
    """A chunk of information in working memory."""
    chunk_id: str
    content: str
    complexity: float  # 0-1, how complex is this chunk
    created_at: datetime
    last_accessed: datetime
    activation_level: float  # 0-1, current activation
    access_count: int
    related_chunks: List[str] = field(default_factory=list)
    semantic_connections: int = 0

    @property
    def age_seconds(self) -> float:
        """Age since creation in seconds."""
        return (datetime.utcnow() - self.created_at).total_seconds()

    @property
    def time_since_access(self) -> float:
        """Time since last access in seconds."""
        return (datetime.utcnow() - self.last_accessed).total_seconds()


@dataclass
class WorkingMemoryState:
    """Current state of working memory."""
    estimated_capacity: int  # Total slots available
    slots_used: int  # Slots currently occupied
    capacity_used_ratio: float  # 0-1
    estimated_load: float  # 0-1, considering complexity
    active_chunks: List[MemoryChunk]
    decay_predictions: Dict[str, float]  # chunk_id -> predicted activation in 30s
    overload_risk: float  # 0-1
    recommendations: List[str]
    processing_time_ms: int


@dataclass
class WorkingMemoryModelConfig:
    """Configuration for working memory model."""
    # Capacity settings
    default_capacity: int = 7  # Miller's magic number
    chunk_capacity: int = 4  # More realistic chunk-based capacity
    min_capacity: int = 3
    max_capacity: int = 9

    # Decay parameters (based on Baddeley's model)
    decay_rate: float = 0.1  # Base decay per second
    rehearsal_boost: float = 0.3  # Activation boost from rehearsal
    access_decay_reduction: float = 0.05  # Reduced decay per access

    # Complexity adjustments
    complexity_load_multiplier: float = 1.5  # Complex items take more capacity
    chunking_efficiency: float = 0.7  # Chunking reduces load

    # Individual differences
    capacity_adjustment_factor: float = 0.1  # How much to adjust based on performance

    # Overload thresholds
    overload_threshold: float = 0.9
    high_load_threshold: float = 0.7


class WorkingMemoryModel:
    """
    Models working memory capacity and load.

    Based on Baddeley's model of working memory and cognitive load theory.
    Tracks information chunks, their activation levels, and predicts decay.

    Key features:
    - Capacity estimation based on performance signals
    - Activation-based chunk management
    - Decay prediction over time
    - Overload risk assessment

    Usage:
        model = WorkingMemoryModel()
        state = model.estimate_load(
            learner_id="learner123",
            current_content="New concept to learn",
            recent_content=["Previous concept 1", "Previous concept 2"],
            response_latencies=[2.5, 3.0, 4.5]
        )
        print(f"WM Load: {state.estimated_load}, Risk: {state.overload_risk}")
    """

    def __init__(self, config: Optional[WorkingMemoryModelConfig] = None):
        self.config = config or WorkingMemoryModelConfig()

        # Learner-specific memory states
        self._learner_states: Dict[str, Dict[str, Any]] = {}

        logger.info("WorkingMemoryModel initialized")

    def estimate_load(
        self,
        learner_id: str,
        session_id: Optional[str] = None,
        current_content: str = "",
        recent_content: Optional[List[str]] = None,
        time_on_task_seconds: float = 0.0,
        response_latencies: Optional[List[float]] = None,
        error_count: int = 0,
        learner_wm_capacity: Optional[int] = None,
    ) -> WorkingMemoryState:
        """
        Estimate current working memory load.

        Args:
            learner_id: Learner identifier
            session_id: Optional session identifier
            current_content: Current content being processed
            recent_content: Recently presented content items
            time_on_task_seconds: Time spent on current task
            response_latencies: Recent response times in seconds
            error_count: Number of errors made
            learner_wm_capacity: Known WM capacity (if assessed)

        Returns:
            WorkingMemoryState with detailed analysis
        """
        start_time = time.time()

        recent_content = recent_content or []
        response_latencies = response_latencies or []

        # Initialize or retrieve learner state
        state = self._get_or_create_learner_state(learner_id, learner_wm_capacity)

        # Update chunks based on new content
        self._update_chunks(state, current_content, recent_content)

        # Apply decay to all chunks
        self._apply_decay(state)

        # Estimate capacity based on performance
        estimated_capacity = self._estimate_capacity(
            state, response_latencies, error_count, learner_wm_capacity
        )

        # Calculate current load
        active_chunks = self._get_active_chunks(state)
        load = self._calculate_load(active_chunks, estimated_capacity)

        # Predict decay for active chunks
        decay_predictions = self._predict_decay(active_chunks)

        # Calculate overload risk
        overload_risk = self._calculate_overload_risk(
            load, len(active_chunks), estimated_capacity,
            response_latencies, error_count
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            load, overload_risk, len(active_chunks), estimated_capacity
        )

        processing_time = int((time.time() - start_time) * 1000)

        return WorkingMemoryState(
            estimated_capacity=estimated_capacity,
            slots_used=len(active_chunks),
            capacity_used_ratio=len(active_chunks) / estimated_capacity,
            estimated_load=load,
            active_chunks=active_chunks,
            decay_predictions=decay_predictions,
            overload_risk=overload_risk,
            recommendations=recommendations,
            processing_time_ms=processing_time,
        )

    def add_content(
        self,
        learner_id: str,
        content: str,
        complexity: float = 0.5,
        related_to: Optional[List[str]] = None,
    ) -> MemoryChunk:
        """
        Add new content to working memory.

        Args:
            learner_id: Learner identifier
            content: Content being learned
            complexity: Content complexity (0-1)
            related_to: IDs of related chunks (for chunking)

        Returns:
            The created MemoryChunk
        """
        state = self._get_or_create_learner_state(learner_id)

        chunk = MemoryChunk(
            chunk_id=str(uuid4())[:8],
            content=content,
            complexity=complexity,
            created_at=datetime.utcnow(),
            last_accessed=datetime.utcnow(),
            activation_level=1.0,
            access_count=1,
            related_chunks=related_to or [],
        )

        state["chunks"][chunk.chunk_id] = chunk

        # If related to other chunks, increase their activation (associative priming)
        for related_id in chunk.related_chunks:
            if related_id in state["chunks"]:
                related = state["chunks"][related_id]
                related.activation_level = min(1.0, related.activation_level + 0.2)
                related.semantic_connections += 1

        return chunk

    def rehearse_content(
        self,
        learner_id: str,
        chunk_id: str,
    ) -> Optional[MemoryChunk]:
        """
        Rehearse (re-access) content to boost activation.

        Args:
            learner_id: Learner identifier
            chunk_id: ID of chunk to rehearse

        Returns:
            Updated chunk or None if not found
        """
        state = self._get_or_create_learner_state(learner_id)

        if chunk_id in state["chunks"]:
            chunk = state["chunks"][chunk_id]
            chunk.last_accessed = datetime.utcnow()
            chunk.access_count += 1
            chunk.activation_level = min(1.0, chunk.activation_level + self.config.rehearsal_boost)
            return chunk

        return None

    def remove_content(
        self,
        learner_id: str,
        chunk_id: str,
    ) -> bool:
        """
        Remove content from working memory (explicit forget/completion).

        Args:
            learner_id: Learner identifier
            chunk_id: ID of chunk to remove

        Returns:
            True if removed, False if not found
        """
        state = self._get_or_create_learner_state(learner_id)

        if chunk_id in state["chunks"]:
            del state["chunks"][chunk_id]
            return True

        return False

    def get_memory_snapshot(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """
        Get a snapshot of current working memory state.

        Args:
            learner_id: Learner identifier

        Returns:
            Snapshot of memory state
        """
        state = self._get_or_create_learner_state(learner_id)
        active_chunks = self._get_active_chunks(state)

        return {
            "learner_id": learner_id,
            "estimated_capacity": state["estimated_capacity"],
            "chunk_count": len(state["chunks"]),
            "active_chunk_count": len(active_chunks),
            "chunks": [
                {
                    "id": c.chunk_id,
                    "content_preview": c.content[:50] + "..." if len(c.content) > 50 else c.content,
                    "activation": c.activation_level,
                    "age_seconds": c.age_seconds,
                    "complexity": c.complexity,
                }
                for c in active_chunks
            ],
            "total_load": self._calculate_load(active_chunks, state["estimated_capacity"]),
        }

    def estimate_capacity_from_performance(
        self,
        response_times: List[float],
        accuracy_rates: List[float],
        task_complexities: List[float],
    ) -> Tuple[int, float]:
        """
        Estimate working memory capacity from performance data.

        Uses the relationship between task complexity and performance
        to estimate individual working memory capacity.

        Args:
            response_times: Response times for tasks
            accuracy_rates: Accuracy rates (0-1) for tasks
            task_complexities: Complexity of tasks (0-1)

        Returns:
            Tuple of (estimated_capacity, confidence)
        """
        if not response_times or not accuracy_rates or not task_complexities:
            return self.config.default_capacity, 0.5

        # Find the complexity level where performance starts to decline
        n = min(len(response_times), len(accuracy_rates), len(task_complexities))

        # Normalize response times (inverse, as faster = better)
        max_rt = max(response_times[:n])
        normalized_rt = [1 - (rt / max_rt) for rt in response_times[:n]]

        # Combined performance score
        performance_scores = [
            (acc * 0.6 + rt * 0.4)
            for acc, rt in zip(accuracy_rates[:n], normalized_rt)
        ]

        # Find inflection point where performance drops
        performance_threshold = 0.7
        drop_complexity = None

        for i, (perf, comp) in enumerate(zip(performance_scores, task_complexities[:n])):
            if perf < performance_threshold:
                drop_complexity = comp
                break

        if drop_complexity is None:
            # Performance stayed high - capacity is at least average
            estimated_capacity = self.config.default_capacity + 1
            confidence = 0.6
        else:
            # Estimate capacity based on where performance dropped
            # Lower drop complexity = lower capacity
            estimated_capacity = int(
                self.config.min_capacity +
                (1 - drop_complexity) * (self.config.max_capacity - self.config.min_capacity)
            )
            confidence = min(0.9, 0.5 + len(response_times) * 0.05)

        estimated_capacity = max(self.config.min_capacity,
                                min(self.config.max_capacity, estimated_capacity))

        return estimated_capacity, confidence

    def simulate_decay(
        self,
        chunks: List[MemoryChunk],
        time_seconds: float,
    ) -> List[Dict[str, Any]]:
        """
        Simulate memory decay over time.

        Args:
            chunks: Chunks to simulate
            time_seconds: Time to simulate (seconds)

        Returns:
            List of chunk states at each second
        """
        states = []
        step_size = max(1, int(time_seconds / 30))  # Max 30 data points

        for t in range(0, int(time_seconds), step_size):
            chunk_states = []
            for chunk in chunks:
                # Calculate activation at time t
                time_since_access = chunk.time_since_access + t
                decay_factor = self.config.decay_rate * (1 - chunk.access_count * self.config.access_decay_reduction)
                decay_factor = max(0.02, decay_factor)  # Minimum decay rate

                activation = chunk.activation_level * np.exp(-decay_factor * time_since_access / 10)

                chunk_states.append({
                    "chunk_id": chunk.chunk_id,
                    "activation": max(0, activation),
                    "is_active": activation > 0.3,
                })

            states.append({
                "time_seconds": t,
                "chunks": chunk_states,
                "active_count": sum(1 for c in chunk_states if c["is_active"]),
            })

        return states

    def _get_or_create_learner_state(
        self,
        learner_id: str,
        capacity: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get or create learner-specific state."""
        if learner_id not in self._learner_states:
            self._learner_states[learner_id] = {
                "learner_id": learner_id,
                "chunks": {},
                "estimated_capacity": capacity or self.config.default_capacity,
                "capacity_confidence": 0.5,
                "performance_history": [],
            }

        return self._learner_states[learner_id]

    def _update_chunks(
        self,
        state: Dict[str, Any],
        current_content: str,
        recent_content: List[str],
    ) -> None:
        """Update chunks based on new content."""
        now = datetime.utcnow()

        # Add current content as a new chunk if not empty
        if current_content.strip():
            # Check if similar content already exists
            existing = None
            for chunk in state["chunks"].values():
                if self._content_similarity(chunk.content, current_content) > 0.8:
                    existing = chunk
                    break

            if existing:
                # Refresh existing chunk
                existing.last_accessed = now
                existing.access_count += 1
                existing.activation_level = min(1.0, existing.activation_level + 0.3)
            else:
                # Create new chunk
                chunk = MemoryChunk(
                    chunk_id=str(uuid4())[:8],
                    content=current_content,
                    complexity=self._estimate_content_complexity(current_content),
                    created_at=now,
                    last_accessed=now,
                    activation_level=1.0,
                    access_count=1,
                )
                state["chunks"][chunk.chunk_id] = chunk

        # Update recent content chunks
        for content in recent_content:
            if not content.strip():
                continue

            for chunk in state["chunks"].values():
                if self._content_similarity(chunk.content, content) > 0.8:
                    chunk.last_accessed = now
                    chunk.access_count += 1
                    chunk.activation_level = min(1.0, chunk.activation_level + 0.1)
                    break

    def _apply_decay(self, state: Dict[str, Any]) -> None:
        """Apply time-based decay to all chunks."""
        chunks_to_remove = []

        for chunk_id, chunk in state["chunks"].items():
            time_since_access = chunk.time_since_access

            # Calculate decay (modified by access count)
            decay_factor = self.config.decay_rate * (
                1 - min(0.5, chunk.access_count * self.config.access_decay_reduction)
            )

            # Exponential decay
            chunk.activation_level *= np.exp(-decay_factor * time_since_access / 60)

            # Remove chunks that have decayed below threshold
            if chunk.activation_level < 0.1:
                chunks_to_remove.append(chunk_id)

        for chunk_id in chunks_to_remove:
            del state["chunks"][chunk_id]

    def _get_active_chunks(self, state: Dict[str, Any]) -> List[MemoryChunk]:
        """Get chunks with sufficient activation."""
        return [c for c in state["chunks"].values() if c.activation_level >= 0.3]

    def _calculate_load(
        self,
        chunks: List[MemoryChunk],
        capacity: int,
    ) -> float:
        """Calculate working memory load from active chunks."""
        if not chunks:
            return 0.0

        # Weight chunks by complexity
        weighted_load = sum(
            (1 + c.complexity * self.config.complexity_load_multiplier) * c.activation_level
            for c in chunks
        )

        # Consider chunking efficiency for related chunks
        chunked_groups = self._identify_chunk_groups(chunks)
        chunking_benefit = len(chunks) - len(chunked_groups)
        effective_load = weighted_load - (chunking_benefit * self.config.chunking_efficiency)

        # Normalize to capacity
        load = effective_load / capacity

        return min(1.0, max(0.0, load))

    def _identify_chunk_groups(self, chunks: List[MemoryChunk]) -> List[List[str]]:
        """Identify groups of related chunks that can be chunked together."""
        groups = []
        assigned = set()

        for chunk in chunks:
            if chunk.chunk_id in assigned:
                continue

            group = [chunk.chunk_id]
            assigned.add(chunk.chunk_id)

            for related_id in chunk.related_chunks:
                if related_id not in assigned:
                    group.append(related_id)
                    assigned.add(related_id)

            groups.append(group)

        return groups

    def _estimate_capacity(
        self,
        state: Dict[str, Any],
        latencies: List[float],
        errors: int,
        known_capacity: Optional[int],
    ) -> int:
        """Estimate working memory capacity."""
        if known_capacity:
            return max(self.config.min_capacity, min(self.config.max_capacity, known_capacity))

        base_capacity = state["estimated_capacity"]

        # Adjust based on performance signals
        if latencies:
            avg_latency = np.mean(latencies)
            # Slower responses might indicate capacity strain
            if avg_latency > 5.0:
                base_capacity -= 1
            elif avg_latency < 2.0:
                base_capacity += 1

        # High errors indicate capacity exceeded
        if errors > 3:
            base_capacity -= 1
        elif errors == 0:
            base_capacity = min(base_capacity + 1, self.config.max_capacity)

        return max(self.config.min_capacity, min(self.config.max_capacity, base_capacity))

    def _predict_decay(
        self,
        chunks: List[MemoryChunk],
        prediction_time: float = 30.0,
    ) -> Dict[str, float]:
        """Predict activation levels after given time."""
        predictions = {}

        for chunk in chunks:
            time_since_access = chunk.time_since_access + prediction_time
            decay_factor = self.config.decay_rate * (
                1 - min(0.5, chunk.access_count * self.config.access_decay_reduction)
            )

            predicted_activation = chunk.activation_level * np.exp(-decay_factor * time_since_access / 60)
            predictions[chunk.chunk_id] = max(0, predicted_activation)

        return predictions

    def _calculate_overload_risk(
        self,
        load: float,
        chunk_count: int,
        capacity: int,
        latencies: List[float],
        errors: int,
    ) -> float:
        """Calculate risk of working memory overload."""
        risk = 0.0

        # Load-based risk
        if load > self.config.high_load_threshold:
            risk += (load - self.config.high_load_threshold) * 2

        # Capacity-based risk
        if chunk_count >= capacity:
            risk += 0.3
        elif chunk_count >= capacity - 1:
            risk += 0.15

        # Performance-based risk
        if latencies:
            # Increasing latencies suggest struggle
            if len(latencies) >= 3:
                recent = latencies[-3:]
                if recent[-1] > recent[0] * 1.5:
                    risk += 0.2

        # Error-based risk
        risk += min(0.3, errors * 0.1)

        return min(1.0, risk)

    def _generate_recommendations(
        self,
        load: float,
        risk: float,
        chunk_count: int,
        capacity: int,
    ) -> List[str]:
        """Generate recommendations based on memory state."""
        recommendations = []

        if load > 0.9:
            recommendations.append("Critical: Take a break or simplify the task")
            recommendations.append("Consider breaking down complex information into smaller chunks")

        elif load > 0.7:
            recommendations.append("Working memory is heavily loaded - avoid adding new concepts")
            recommendations.append("Review and consolidate recent information before continuing")

        if risk > 0.7:
            recommendations.append("High risk of overload - consider scaffolding or support")

        if chunk_count >= capacity:
            recommendations.append("Memory at capacity - some information may be lost without review")

        if not recommendations:
            if load < 0.4:
                recommendations.append("Good capacity available for new learning")
            else:
                recommendations.append("Moderate load - proceed with attention to pacing")

        return recommendations

    def _content_similarity(self, content1: str, content2: str) -> float:
        """Calculate simple content similarity."""
        if not content1 or not content2:
            return 0.0

        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = len(words1 & words2)
        union = len(words1 | words2)

        return intersection / union if union > 0 else 0.0

    def _estimate_content_complexity(self, content: str) -> float:
        """Estimate complexity of content."""
        if not content:
            return 0.0

        words = content.split()
        if not words:
            return 0.0

        # Simple heuristics
        avg_word_length = np.mean([len(w) for w in words])
        sentence_count = max(1, content.count('.') + content.count('!') + content.count('?'))
        words_per_sentence = len(words) / sentence_count

        length_score = min(1.0, (avg_word_length - 3) / 7)
        sentence_score = min(1.0, (words_per_sentence - 5) / 20)

        return (length_score * 0.4 + sentence_score * 0.6)
