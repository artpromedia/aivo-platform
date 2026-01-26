"""
Bayesian Belief System

Maintains probabilistic beliefs about learner knowledge states
using Bayesian inference for evidence-based updates.
"""

import logging
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol, Tuple

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)


class DatabaseSession(Protocol):
    """Protocol for async database session."""

    async def execute(self, query: Any) -> Any:
        ...

    async def commit(self) -> None:
        ...


class BeliefUpdate(BaseModel):
    """Record of a belief update."""
    update_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    belief_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    observation: bool
    observation_weight: float = 1.0
    prior: float
    posterior: float
    likelihood: float
    evidence_source: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "update_id": self.update_id,
            "belief_id": self.belief_id,
            "timestamp": self.timestamp.isoformat(),
            "observation": self.observation,
            "observation_weight": self.observation_weight,
            "prior": self.prior,
            "posterior": self.posterior,
            "likelihood": self.likelihood,
            "evidence_source": self.evidence_source,
        }


class LearnerBelief(BaseModel):
    """
    Represents the belief state about a learner's knowledge of a topic.

    Uses Bayesian probability to represent uncertainty about mastery.
    """
    belief_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_id: str
    topic: str
    belief_state: float = Field(ge=0.0, le=1.0, default=0.5)
    uncertainty: float = Field(ge=0.0, le=1.0, default=0.5)
    prior: float = Field(ge=0.0, le=1.0, default=0.5)
    evidence_count: int = Field(ge=0, default=0)
    correct_count: int = Field(ge=0, default=0)
    incorrect_count: int = Field(ge=0, default=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    evidence_history: List[Dict[str, Any]] = Field(default_factory=list)

    # Beta distribution parameters for conjugate prior
    alpha: float = Field(ge=0.0, default=1.0)  # Pseudo-correct count
    beta: float = Field(ge=0.0, default=1.0)   # Pseudo-incorrect count

    model_config = {"extra": "forbid"}

    @field_validator("belief_state", "uncertainty", "prior", mode="before")
    @classmethod
    def clamp_probability(cls, v: float) -> float:
        """Clamp probability to valid range."""
        return max(0.0, min(1.0, float(v)))

    def get_confidence_interval(
        self,
        confidence: float = 0.95,
    ) -> Tuple[float, float]:
        """
        Get confidence interval for the belief state.

        Uses beta distribution to compute credible interval.

        Args:
            confidence: Confidence level (e.g., 0.95 for 95%)

        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        from scipy import stats

        alpha_param = self.alpha
        beta_param = self.beta

        lower_quantile = (1 - confidence) / 2
        upper_quantile = 1 - lower_quantile

        try:
            beta_dist = stats.beta(alpha_param, beta_param)
            lower = beta_dist.ppf(lower_quantile)
            upper = beta_dist.ppf(upper_quantile)
            return (float(lower), float(upper))
        except Exception:
            # Fallback to simple approximation
            std = self.uncertainty
            lower = max(0.0, self.belief_state - 2 * std)
            upper = min(1.0, self.belief_state + 2 * std)
            return (lower, upper)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "belief_id": self.belief_id,
            "learner_id": self.learner_id,
            "topic": self.topic,
            "belief_state": self.belief_state,
            "uncertainty": self.uncertainty,
            "prior": self.prior,
            "evidence_count": self.evidence_count,
            "correct_count": self.correct_count,
            "incorrect_count": self.incorrect_count,
            "last_updated": self.last_updated.isoformat(),
            "created_at": self.created_at.isoformat(),
            "evidence_history": self.evidence_history[-50:],  # Keep last 50
            "alpha": self.alpha,
            "beta": self.beta,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearnerBelief":
        """Create from dictionary."""
        return cls(
            belief_id=data["belief_id"],
            learner_id=data["learner_id"],
            topic=data["topic"],
            belief_state=data["belief_state"],
            uncertainty=data["uncertainty"],
            prior=data["prior"],
            evidence_count=data["evidence_count"],
            correct_count=data.get("correct_count", 0),
            incorrect_count=data.get("incorrect_count", 0),
            last_updated=datetime.fromisoformat(data["last_updated"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            evidence_history=data.get("evidence_history", []),
            alpha=data.get("alpha", 1.0),
            beta=data.get("beta", 1.0),
        )


class BayesianBeliefSystem:
    """
    Bayesian belief system for learner knowledge tracking.

    Uses Bayesian inference to maintain probabilistic beliefs about
    learner mastery of topics, updating beliefs based on observed
    performance evidence.

    Mathematical foundation:
    - P(mastered|observation) ∝ P(observation|mastered) * P(mastered)
    - Uses Beta-Bernoulli conjugate prior for efficient updates
    """

    # Default likelihood parameters (tunable)
    DEFAULT_P_CORRECT_IF_MASTERED = 0.95  # P(correct|mastered)
    DEFAULT_P_CORRECT_IF_NOT_MASTERED = 0.25  # P(correct|not mastered) = guess rate

    def __init__(
        self,
        db_session_factory=None,
        p_correct_if_mastered: float = DEFAULT_P_CORRECT_IF_MASTERED,
        p_correct_if_not_mastered: float = DEFAULT_P_CORRECT_IF_NOT_MASTERED,
    ):
        """
        Initialize belief system.

        Args:
            db_session_factory: Factory for database sessions (optional)
            p_correct_if_mastered: P(correct|mastered), typically high
            p_correct_if_not_mastered: P(correct|not mastered), guess rate
        """
        self.db_session_factory = db_session_factory
        self.p_correct_given_mastered = p_correct_if_mastered
        self.p_correct_given_not_mastered = p_correct_if_not_mastered

        # In-memory belief cache
        self._beliefs: Dict[str, Dict[str, LearnerBelief]] = {}

        logger.info(
            f"BayesianBeliefSystem initialized: "
            f"P(correct|mastered)={p_correct_if_mastered}, "
            f"P(correct|not)={p_correct_if_not_mastered}"
        )

    def _get_learner_beliefs(self, learner_id: str) -> Dict[str, LearnerBelief]:
        """Get or create beliefs dict for a learner."""
        if learner_id not in self._beliefs:
            self._beliefs[learner_id] = {}
        return self._beliefs[learner_id]

    async def get_belief(
        self,
        learner_id: str,
        topic: str,
    ) -> Optional[LearnerBelief]:
        """
        Get belief for a specific topic.

        Args:
            learner_id: Learner ID
            topic: Topic/skill to get belief for

        Returns:
            LearnerBelief if exists, None otherwise
        """
        beliefs = self._get_learner_beliefs(learner_id)
        return beliefs.get(topic)

    async def get_or_create_belief(
        self,
        learner_id: str,
        topic: str,
        initial_prior: float = 0.5,
    ) -> LearnerBelief:
        """
        Get existing belief or create a new one with specified prior.

        Args:
            learner_id: Learner ID
            topic: Topic/skill
            initial_prior: Prior probability if creating new belief

        Returns:
            LearnerBelief
        """
        existing = await self.get_belief(learner_id, topic)

        if existing:
            return existing

        # Create new belief
        belief = LearnerBelief(
            learner_id=learner_id,
            topic=topic,
            belief_state=initial_prior,
            prior=initial_prior,
            uncertainty=0.5,  # High initial uncertainty
            alpha=initial_prior * 2,  # Weak prior
            beta=(1 - initial_prior) * 2,
        )

        beliefs = self._get_learner_beliefs(learner_id)
        beliefs[topic] = belief

        return belief

    async def update_belief(
        self,
        learner_id: str,
        topic: str,
        observation: bool,
        observation_weight: float = 1.0,
        evidence_source: Optional[str] = None,
    ) -> Tuple[LearnerBelief, BeliefUpdate]:
        """
        Update belief using Bayesian inference.

        Uses Bayes' rule:
        P(mastered|correct) = P(correct|mastered) * P(mastered) / P(correct)

        where:
        P(correct) = P(correct|mastered) * P(mastered) +
                     P(correct|not mastered) * P(not mastered)

        Args:
            learner_id: Learner ID
            topic: Topic/skill being assessed
            observation: True if correct response, False if incorrect
            observation_weight: Weight of this observation (0-1)
            evidence_source: Optional source identifier

        Returns:
            Tuple of (updated belief, update record)
        """
        belief = await self.get_or_create_belief(learner_id, topic)
        prior = belief.belief_state

        # Calculate likelihoods
        if observation:
            # P(correct|mastered) and P(correct|not mastered)
            likelihood_if_mastered = self.p_correct_given_mastered
            likelihood_if_not_mastered = self.p_correct_given_not_mastered
        else:
            # P(incorrect|mastered) and P(incorrect|not mastered)
            likelihood_if_mastered = 1 - self.p_correct_given_mastered
            likelihood_if_not_mastered = 1 - self.p_correct_given_not_mastered

        # Marginal likelihood P(observation)
        marginal = (
            likelihood_if_mastered * prior +
            likelihood_if_not_mastered * (1 - prior)
        )

        # Posterior P(mastered|observation) via Bayes' rule
        if marginal > 0:
            posterior = (likelihood_if_mastered * prior) / marginal
        else:
            posterior = prior

        # Apply observation weight (partial credit/confidence)
        weighted_posterior = (
            prior * (1 - observation_weight) +
            posterior * observation_weight
        )

        # Update Beta distribution parameters
        if observation:
            belief.alpha += observation_weight
            belief.correct_count += 1
        else:
            belief.beta += observation_weight
            belief.incorrect_count += 1

        # Update belief state
        belief.belief_state = max(0.0, min(1.0, weighted_posterior))

        # Update uncertainty (using Beta distribution variance)
        # Var(Beta) = α*β / ((α+β)² * (α+β+1))
        total = belief.alpha + belief.beta
        variance = (belief.alpha * belief.beta) / (total ** 2 * (total + 1))
        belief.uncertainty = min(0.5, math.sqrt(variance))

        belief.evidence_count += 1
        belief.last_updated = datetime.utcnow()

        # Record the update
        update = BeliefUpdate(
            belief_id=belief.belief_id,
            observation=observation,
            observation_weight=observation_weight,
            prior=prior,
            posterior=belief.belief_state,
            likelihood=likelihood_if_mastered if observation else likelihood_if_not_mastered,
            evidence_source=evidence_source,
        )

        # Add to evidence history
        belief.evidence_history.append(update.to_dict())
        belief.evidence_history = belief.evidence_history[-50:]  # Keep last 50

        logger.debug(
            f"Updated belief for {learner_id}/{topic}: "
            f"{prior:.3f} → {belief.belief_state:.3f} "
            f"(obs={observation}, weight={observation_weight})"
        )

        return belief, update

    async def batch_update_belief(
        self,
        learner_id: str,
        topic: str,
        observations: List[Tuple[bool, float]],
    ) -> LearnerBelief:
        """
        Update belief with multiple observations at once.

        More efficient than calling update_belief multiple times.

        Args:
            learner_id: Learner ID
            topic: Topic/skill
            observations: List of (correct, weight) tuples

        Returns:
            Updated belief
        """
        belief = await self.get_or_create_belief(learner_id, topic)

        for correct, weight in observations:
            belief, _ = await self.update_belief(
                learner_id, topic, correct, weight
            )

        return belief

    async def get_belief_state(
        self,
        learner_id: str,
        topics: List[str],
    ) -> Dict[str, LearnerBelief]:
        """
        Get current belief states for multiple topics.

        Args:
            learner_id: Learner ID
            topics: List of topics to get beliefs for

        Returns:
            Dictionary mapping topic to belief
        """
        result = {}

        for topic in topics:
            belief = await self.get_belief(learner_id, topic)
            if belief:
                result[topic] = belief
            else:
                # Create default belief
                result[topic] = await self.get_or_create_belief(learner_id, topic)

        return result

    async def predict_performance(
        self,
        learner_id: str,
        topic: str,
        difficulty: float = 0.5,
    ) -> float:
        """
        Predict probability of success on a task.

        Combines mastery belief with task difficulty.

        Args:
            learner_id: Learner ID
            topic: Topic/skill being assessed
            difficulty: Task difficulty (0=easy, 1=hard)

        Returns:
            Predicted probability of success
        """
        belief = await self.get_or_create_belief(learner_id, topic)

        # Item Response Theory (IRT) inspired prediction
        # P(success) depends on mastery and difficulty
        mastery = belief.belief_state

        # Logistic function for smooth difficulty scaling
        # When mastery = difficulty, P = 0.5
        # When mastery > difficulty, P > 0.5
        logit = 4 * (mastery - difficulty)  # Scale factor of 4 for reasonable spread
        p_success = 1 / (1 + math.exp(-logit))

        # Account for uncertainty - higher uncertainty means more regression to 0.5
        uncertainty_factor = belief.uncertainty
        p_success = p_success * (1 - uncertainty_factor) + 0.5 * uncertainty_factor

        return p_success

    async def get_mastery_level(
        self,
        learner_id: str,
        topic: str,
    ) -> str:
        """
        Get categorical mastery level for a topic.

        Args:
            learner_id: Learner ID
            topic: Topic/skill

        Returns:
            Mastery level: "not_started", "beginning", "developing",
            "proficient", or "mastered"
        """
        belief = await self.get_belief(learner_id, topic)

        if belief is None or belief.evidence_count == 0:
            return "not_started"

        p = belief.belief_state

        if p < 0.3:
            return "beginning"
        elif p < 0.5:
            return "developing"
        elif p < 0.7:
            return "proficient"
        else:
            return "mastered"

    async def get_topics_by_mastery(
        self,
        learner_id: str,
        mastery_threshold: float = 0.7,
    ) -> Dict[str, List[str]]:
        """
        Categorize all topics by mastery level.

        Args:
            learner_id: Learner ID
            mastery_threshold: Threshold for "mastered" category

        Returns:
            Dictionary with categories as keys and topic lists as values
        """
        beliefs = self._get_learner_beliefs(learner_id)

        categories = {
            "mastered": [],
            "proficient": [],
            "developing": [],
            "beginning": [],
        }

        for topic, belief in beliefs.items():
            p = belief.belief_state

            if p >= mastery_threshold:
                categories["mastered"].append(topic)
            elif p >= 0.5:
                categories["proficient"].append(topic)
            elif p >= 0.3:
                categories["developing"].append(topic)
            else:
                categories["beginning"].append(topic)

        return categories

    async def recommend_topics(
        self,
        learner_id: str,
        candidate_topics: List[str],
        target_success_rate: float = 0.7,
    ) -> List[Tuple[str, float]]:
        """
        Recommend topics that match target success rate.

        Topics where predicted success is close to target are good
        candidates for learning (not too easy, not too hard).

        Args:
            learner_id: Learner ID
            candidate_topics: Topics to consider
            target_success_rate: Desired success probability

        Returns:
            List of (topic, predicted_success) sorted by match to target
        """
        predictions = []

        for topic in candidate_topics:
            p_success = await self.predict_performance(
                learner_id, topic, difficulty=0.5
            )
            match_score = 1 - abs(p_success - target_success_rate)
            predictions.append((topic, p_success, match_score))

        # Sort by match to target success rate
        predictions.sort(key=lambda x: x[2], reverse=True)

        return [(topic, p_success) for topic, p_success, _ in predictions]

    async def reset_belief(
        self,
        learner_id: str,
        topic: str,
    ) -> LearnerBelief:
        """
        Reset belief for a topic to initial state.

        Args:
            learner_id: Learner ID
            topic: Topic to reset

        Returns:
            Reset belief
        """
        beliefs = self._get_learner_beliefs(learner_id)

        belief = LearnerBelief(
            learner_id=learner_id,
            topic=topic,
            belief_state=0.5,
            prior=0.5,
            uncertainty=0.5,
            alpha=1.0,
            beta=1.0,
        )

        beliefs[topic] = belief
        return belief

    async def get_all_beliefs(
        self,
        learner_id: str,
    ) -> List[LearnerBelief]:
        """Get all beliefs for a learner."""
        beliefs = self._get_learner_beliefs(learner_id)
        return list(beliefs.values())

    async def get_stats(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """Get statistics about learner's beliefs."""
        beliefs = await self.get_all_beliefs(learner_id)

        if not beliefs:
            return {
                "total_topics": 0,
                "avg_mastery": 0.0,
                "avg_uncertainty": 0.0,
                "total_evidence": 0,
            }

        total_mastery = sum(b.belief_state for b in beliefs)
        total_uncertainty = sum(b.uncertainty for b in beliefs)
        total_evidence = sum(b.evidence_count for b in beliefs)

        categories = await self.get_topics_by_mastery(learner_id)

        return {
            "total_topics": len(beliefs),
            "avg_mastery": total_mastery / len(beliefs),
            "avg_uncertainty": total_uncertainty / len(beliefs),
            "total_evidence": total_evidence,
            "mastery_distribution": {
                k: len(v) for k, v in categories.items()
            },
        }

    async def export_beliefs(
        self,
        learner_id: str,
    ) -> List[Dict[str, Any]]:
        """Export all beliefs as dictionaries for persistence."""
        beliefs = await self.get_all_beliefs(learner_id)
        return [b.to_dict() for b in beliefs]

    async def import_beliefs(
        self,
        learner_id: str,
        belief_data: List[Dict[str, Any]],
    ) -> int:
        """
        Import beliefs from dictionaries.

        Args:
            learner_id: Learner ID
            belief_data: List of belief dictionaries

        Returns:
            Number of beliefs imported
        """
        beliefs = self._get_learner_beliefs(learner_id)

        for data in belief_data:
            belief = LearnerBelief.from_dict(data)
            belief.learner_id = learner_id  # Ensure correct learner ID
            beliefs[belief.topic] = belief

        return len(belief_data)
