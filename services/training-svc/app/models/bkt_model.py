"""
Bayesian Knowledge Tracing - Predicts skill mastery probability
Based on Corbett & Anderson (1995)

BKT is a foundational model in educational data mining that estimates
the probability a learner has mastered a skill based on their response history.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class BKTParameters:
    """
    BKT model parameters for a skill
    
    Parameters:
        p_init (float): P(L0) - Prior probability learner already knows the skill
        p_learn (float): P(T) - Probability of learning the skill on each opportunity
        p_guess (float): P(G) - Probability of correct response when skill not learned
        p_slip (float): P(S) - Probability of incorrect response when skill is learned
    """
    p_init: float = 0.0   # P(L0) - Prior knowledge
    p_learn: float = 0.1  # P(T) - Probability of learning
    p_guess: float = 0.2  # P(G) - Probability of correct guess
    p_slip: float = 0.1   # P(S) - Probability of careless mistake
    
    def __post_init__(self):
        """Validate parameters are in [0, 1] range"""
        for name, value in [
            ("p_init", self.p_init),
            ("p_learn", self.p_learn),
            ("p_guess", self.p_guess),
            ("p_slip", self.p_slip)
        ]:
            if not 0 <= value <= 1:
                raise ValueError(f"{name} must be between 0 and 1, got {value}")
        
        # Identifiability constraint: P(G) + P(S) < 1
        if self.p_guess + self.p_slip >= 1:
            raise ValueError(
                f"p_guess + p_slip must be < 1 for identifiability, "
                f"got {self.p_guess} + {self.p_slip} = {self.p_guess + self.p_slip}"
            )
    
    def to_dict(self) -> Dict:
        return {
            "p_init": self.p_init,
            "p_learn": self.p_learn,
            "p_guess": self.p_guess,
            "p_slip": self.p_slip,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "BKTParameters":
        return cls(**data)


@dataclass
class MasteryRecord:
    """Record of mastery state with metadata"""
    probability: float
    last_updated: datetime = field(default_factory=datetime.utcnow)
    attempts: int = 0
    correct_count: int = 0
    history: List[Tuple[bool, float]] = field(default_factory=list)
    
    @property
    def accuracy(self) -> float:
        if self.attempts == 0:
            return 0.0
        return self.correct_count / self.attempts


class BayesianKnowledgeTracing:
    """
    BKT model for tracking skill mastery over time
    
    Updates learner knowledge probability after each practice opportunity:
    - Correct responses increase mastery estimate
    - Incorrect responses decrease it
    - Model parameters are skill-specific
    
    Mathematical Foundation:
    - Uses Hidden Markov Model with binary latent state (learned/not learned)
    - State transitions only go from not-learned to learned (no forgetting)
    - Observations are binary (correct/incorrect)
    
    Example:
        >>> bkt = BayesianKnowledgeTracing()
        >>> bkt.initialize_skill("addition", p_init=0.1, p_learn=0.15)
        >>> p_know = bkt.update("student_1", "addition", correct=True)
        >>> print(f"Mastery probability: {p_know:.2f}")
    """
    
    # Mastery threshold - when P(know) exceeds this, skill is considered mastered
    MASTERY_THRESHOLD = 0.95
    
    def __init__(self, mastery_threshold: float = 0.95):
        self.parameters: Dict[str, BKTParameters] = {}
        self.mastery_states: Dict[str, Dict[str, MasteryRecord]] = {}
        self._mastery_threshold = mastery_threshold
    
    def initialize_skill(
        self, 
        skill_id: str, 
        p_init: float = 0.0,
        p_learn: float = 0.1,
        p_guess: float = 0.2,
        p_slip: float = 0.1
    ) -> None:
        """
        Initialize BKT parameters for a skill
        
        Args:
            skill_id: Unique identifier for the skill
            p_init: Prior probability of knowing the skill
            p_learn: Probability of learning per opportunity
            p_guess: Probability of guessing correctly without knowledge
            p_slip: Probability of making a mistake despite knowledge
        """
        self.parameters[skill_id] = BKTParameters(p_init, p_learn, p_guess, p_slip)
        logger.info(f"Initialized BKT parameters for skill {skill_id}")
    
    def initialize_skills_bulk(self, skills: Dict[str, BKTParameters]) -> None:
        """Initialize multiple skills at once"""
        for skill_id, params in skills.items():
            self.parameters[skill_id] = params
        logger.info(f"Bulk initialized {len(skills)} skills")
    
    def get_mastery(self, learner_id: str, skill_id: str) -> float:
        """
        Get current mastery probability for learner-skill pair
        
        Args:
            learner_id: Unique learner identifier
            skill_id: Unique skill identifier
            
        Returns:
            Probability that the learner has mastered the skill [0, 1]
        """
        if learner_id not in self.mastery_states:
            self.mastery_states[learner_id] = {}
        
        if skill_id not in self.mastery_states[learner_id]:
            # Initialize with prior
            params = self.parameters.get(skill_id, BKTParameters())
            self.mastery_states[learner_id][skill_id] = MasteryRecord(
                probability=params.p_init
            )
        
        return self.mastery_states[learner_id][skill_id].probability
    
    def get_mastery_record(self, learner_id: str, skill_id: str) -> MasteryRecord:
        """Get full mastery record with history"""
        self.get_mastery(learner_id, skill_id)  # Ensure initialized
        return self.mastery_states[learner_id][skill_id]
    
    def is_mastered(self, learner_id: str, skill_id: str) -> bool:
        """Check if a skill is considered mastered"""
        return self.get_mastery(learner_id, skill_id) >= self._mastery_threshold
    
    def update(
        self, 
        learner_id: str, 
        skill_id: str, 
        correct: bool,
        timestamp: Optional[datetime] = None
    ) -> float:
        """
        Update mastery probability after an attempt
        
        Uses Bayes' theorem to update the probability:
        P(L=1|obs) = P(obs|L=1) * P(L=1) / P(obs)
        
        Then applies learning transition:
        P(L_n) = P(L_n-1|obs) + (1 - P(L_n-1|obs)) * P(T)
        
        Args:
            learner_id: Unique learner identifier
            skill_id: Unique skill identifier
            correct: Whether the response was correct
            timestamp: When the attempt occurred (defaults to now)
            
        Returns:
            Updated mastery probability
        """
        params = self.parameters.get(skill_id, BKTParameters())
        p_know_before = self.get_mastery(learner_id, skill_id)
        
        # Calculate P(correct)
        p_correct = (
            p_know_before * (1 - params.p_slip) +
            (1 - p_know_before) * params.p_guess
        )
        
        # Avoid division by zero
        if p_correct == 0:
            p_correct = 1e-10
        if p_correct == 1:
            p_correct = 1 - 1e-10
        
        if correct:
            # Update given correct response
            # P(L|correct) = P(correct|L) * P(L) / P(correct)
            # P(correct|L) = 1 - P(S)
            p_know_after_attempt = (
                p_know_before * (1 - params.p_slip) / p_correct
            )
        else:
            # Update given incorrect response
            # P(L|incorrect) = P(incorrect|L) * P(L) / P(incorrect)
            # P(incorrect|L) = P(S)
            p_incorrect = 1 - p_correct
            p_know_after_attempt = (
                p_know_before * params.p_slip / p_incorrect
            )
        
        # Apply learning transition
        # Even if they got it wrong, they might have learned something
        p_know_after = (
            p_know_after_attempt + 
            (1 - p_know_after_attempt) * params.p_learn
        )
        
        # Clamp to valid probability range
        p_know_after = max(0.0, min(1.0, p_know_after))
        
        # Update record
        record = self.mastery_states[learner_id][skill_id]
        record.probability = p_know_after
        record.last_updated = timestamp or datetime.now(timezone.utc)
        record.attempts += 1
        if correct:
            record.correct_count += 1
        record.history.append((correct, p_know_after))
        
        logger.debug(
            f"BKT Update: learner={learner_id}, skill={skill_id}, "
            f"correct={correct}, p_know: {p_know_before:.3f} -> {p_know_after:.3f}"
        )
        
        return p_know_after
    
    def batch_update(
        self,
        interactions: List[Tuple[str, str, bool]]
    ) -> Dict[str, Dict[str, float]]:
        """
        Process multiple interactions in batch
        
        Args:
            interactions: List of (learner_id, skill_id, correct) tuples
            
        Returns:
            Dictionary of updated mastery states
        """
        results = {}
        for learner_id, skill_id, correct in interactions:
            p_know = self.update(learner_id, skill_id, correct)
            if learner_id not in results:
                results[learner_id] = {}
            results[learner_id][skill_id] = p_know
        return results
    
    def predict_performance(
        self, 
        learner_id: str, 
        skill_id: str
    ) -> float:
        """
        Predict probability of correct response on next attempt
        
        P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
        
        Args:
            learner_id: Unique learner identifier
            skill_id: Unique skill identifier
            
        Returns:
            Probability of correct response on next attempt
        """
        params = self.parameters.get(skill_id, BKTParameters())
        p_know = self.get_mastery(learner_id, skill_id)
        
        p_correct = (
            p_know * (1 - params.p_slip) +
            (1 - p_know) * params.p_guess
        )
        
        return p_correct
    
    def estimate_attempts_to_mastery(
        self,
        learner_id: str,
        skill_id: str,
        assumed_accuracy: float = 0.7
    ) -> int:
        """
        Estimate number of attempts needed to reach mastery
        
        Uses simulation with assumed accuracy rate
        
        Args:
            learner_id: Unique learner identifier  
            skill_id: Unique skill identifier
            assumed_accuracy: Expected accuracy rate for estimation
            
        Returns:
            Estimated number of attempts to reach mastery threshold
        """
        params = self.parameters.get(skill_id, BKTParameters())
        p_know = self.get_mastery(learner_id, skill_id)
        
        if p_know >= self._mastery_threshold:
            return 0
        
        # Simulate forward with assumed accuracy
        rng = np.random.default_rng(seed=42)
        attempts = 0
        max_attempts = 100  # Prevent infinite loop
        
        while p_know < self._mastery_threshold and attempts < max_attempts:
            # Calculate expected update
            correct = rng.random() < assumed_accuracy
            
            p_correct = (
                p_know * (1 - params.p_slip) +
                (1 - p_know) * params.p_guess
            )
            
            if correct:
                p_know_after_attempt = p_know * (1 - params.p_slip) / p_correct
            else:
                p_know_after_attempt = p_know * params.p_slip / (1 - p_correct)
            
            p_know = p_know_after_attempt + (1 - p_know_after_attempt) * params.p_learn
            attempts += 1
        
        return attempts
    
    def train_parameters_em(
        self,
        interaction_data: List[Tuple[str, str, bool]],
        max_iterations: int = 100,
        convergence_threshold: float = 1e-4
    ) -> Dict[str, BKTParameters]:
        """
        Train BKT parameters using Expectation-Maximization (EM) algorithm
        
        This implements a simplified EM algorithm for parameter estimation.
        For production use, consider more sophisticated implementations.
        
        Args:
            interaction_data: List of (learner_id, skill_id, correct) tuples
            max_iterations: Maximum EM iterations
            convergence_threshold: Stop when parameter changes are below this
            
        Returns:
            Fitted parameters for each skill
        """
        # Group by skill
        skill_sequences: Dict[str, Dict[str, List[bool]]] = {}
        for learner_id, skill_id, correct in interaction_data:
            if skill_id not in skill_sequences:
                skill_sequences[skill_id] = {}
            if learner_id not in skill_sequences[skill_id]:
                skill_sequences[skill_id][learner_id] = []
            skill_sequences[skill_id][learner_id].append(correct)
        
        # Train parameters for each skill
        for skill_id, learner_sequences in skill_sequences.items():
            params = self._em_single_skill(
                learner_sequences, 
                max_iterations, 
                convergence_threshold
            )
            self.parameters[skill_id] = params
            logger.info(f"Trained parameters for skill {skill_id}: {params}")
        
        return self.parameters
    
    def _em_single_skill(
        self,
        learner_sequences: Dict[str, List[bool]],
        max_iterations: int,
        convergence_threshold: float
    ) -> BKTParameters:
        """Run EM for a single skill"""
        # Initialize parameters
        all_responses = [r for seq in learner_sequences.values() for r in seq]
        accuracy = sum(all_responses) / len(all_responses) if all_responses else 0.5
        
        p_init = max(0.01, min(0.5, accuracy - 0.2))
        p_learn = 0.1
        p_guess = max(0.05, min(0.4, (1 - accuracy) * 0.5))
        p_slip = max(0.01, min(0.2, (1 - accuracy) * 0.3))
        
        for iteration in range(max_iterations):
            # E-step: Calculate expected latent states
            expected_states = []
            for seq in learner_sequences.values():
                states = self._forward_backward(seq, p_init, p_learn, p_guess, p_slip)
                expected_states.append(states)
            
            # M-step: Update parameters
            new_p_init, new_p_learn, new_p_guess, new_p_slip = self._m_step(
                learner_sequences, expected_states
            )
            
            # Check convergence
            delta = (
                abs(new_p_init - p_init) + 
                abs(new_p_learn - p_learn) +
                abs(new_p_guess - p_guess) +
                abs(new_p_slip - p_slip)
            )
            
            p_init, p_learn, p_guess, p_slip = new_p_init, new_p_learn, new_p_guess, new_p_slip
            
            if delta < convergence_threshold:
                logger.debug(f"EM converged at iteration {iteration}")
                break
        
        return BKTParameters(p_init, p_learn, p_guess, p_slip)
    
    def _forward_backward(
        self,
        sequence: List[bool],
        p_init: float,
        p_learn: float,
        p_guess: float,
        p_slip: float
    ) -> List[float]:
        """Forward-backward algorithm to estimate latent states"""
        n = len(sequence)
        if n == 0:
            return []
        
        # Forward pass
        alpha = [0.0] * n
        alpha[0] = p_init if sequence[0] else (1 - p_init)
        
        for t in range(1, n):
            # Transition
            p_know_prev = alpha[t-1]
            p_know = p_know_prev + (1 - p_know_prev) * p_learn
            
            # Observation
            if sequence[t]:
                p_obs = p_know * (1 - p_slip) + (1 - p_know) * p_guess
            else:
                p_obs = p_know * p_slip + (1 - p_know) * (1 - p_guess)
            
            alpha[t] = p_know * p_obs / (p_obs + 1e-10)
        
        return alpha
    
    def _m_step(
        self,
        learner_sequences: Dict[str, List[bool]],
        expected_states: List[List[float]]
    ) -> Tuple[float, float, float, float]:
        """M-step: Update parameters from expected states"""
        # Simplified M-step using moment matching
        all_states = [s for states in expected_states for s in states]
        all_responses = [r for seq in learner_sequences.values() for r in seq]
        
        if not all_states:
            return 0.1, 0.1, 0.2, 0.1
        
        avg_state = np.mean(all_states)
        accuracy = np.mean(all_responses)
        
        # Heuristic parameter updates
        p_init = max(0.01, min(0.5, all_states[0] if all_states else 0.1))
        p_learn = max(0.01, min(0.4, 0.1))
        p_guess = max(0.05, min(0.4, accuracy * (1 - avg_state) / max(1 - avg_state, 0.1)))
        p_slip = max(0.01, min(0.2, (1 - accuracy) * avg_state / max(avg_state, 0.1)))
        
        # Ensure identifiability
        if p_guess + p_slip >= 0.95:
            p_guess = min(p_guess, 0.4)
            p_slip = min(p_slip, 0.15)
        
        return p_init, p_learn, p_guess, p_slip
    
    def get_learner_profile(self, learner_id: str) -> Dict:
        """
        Get comprehensive profile for a learner
        
        Returns:
            Dictionary with mastery states, statistics, and recommendations
        """
        if learner_id not in self.mastery_states:
            return {"learner_id": learner_id, "skills": {}}
        
        skills = {}
        for skill_id, record in self.mastery_states[learner_id].items():
            skills[skill_id] = {
                "mastery_probability": record.probability,
                "is_mastered": record.probability >= self._mastery_threshold,
                "attempts": record.attempts,
                "accuracy": record.accuracy,
                "last_updated": record.last_updated.isoformat(),
            }
        
        return {
            "learner_id": learner_id,
            "skills": skills,
            "total_skills": len(skills),
            "mastered_skills": sum(1 for s in skills.values() if s["is_mastered"]),
            "average_mastery": np.mean([s["mastery_probability"] for s in skills.values()]) if skills else 0,
        }
    
    def recommend_next_skill(
        self,
        learner_id: str,
        available_skills: List[str],
        strategy: str = "zpd"  # zone of proximal development
    ) -> Optional[str]:
        """
        Recommend next skill to practice
        
        Strategies:
        - "zpd": Zone of Proximal Development (0.3-0.7 mastery range)
        - "lowest": Skill with lowest mastery
        - "almost_mastered": Skills close to mastery threshold
        
        Args:
            learner_id: Unique learner identifier
            available_skills: List of skills to consider
            strategy: Recommendation strategy
            
        Returns:
            Recommended skill_id or None
        """
        skill_masteries = []
        for skill_id in available_skills:
            mastery = self.get_mastery(learner_id, skill_id)
            if mastery < self._mastery_threshold:
                skill_masteries.append((skill_id, mastery))
        
        if not skill_masteries:
            return None
        
        if strategy == "zpd":
            # Zone of Proximal Development: prefer skills in 0.3-0.7 range
            zpd_skills = [(s, m) for s, m in skill_masteries if 0.3 <= m <= 0.7]
            if zpd_skills:
                return max(zpd_skills, key=lambda x: x[1])[0]
            return min(skill_masteries, key=lambda x: abs(x[1] - 0.5))[0]
        
        elif strategy == "lowest":
            return min(skill_masteries, key=lambda x: x[1])[0]
        
        elif strategy == "almost_mastered":
            return max(skill_masteries, key=lambda x: x[1])[0]
        
        return skill_masteries[0][0]
    
    def export_state(self) -> Dict:
        """Export model state for persistence"""
        return {
            "parameters": {
                skill_id: params.to_dict() 
                for skill_id, params in self.parameters.items()
            },
            "mastery_states": {
                learner_id: {
                    skill_id: {
                        "probability": record.probability,
                        "attempts": record.attempts,
                        "correct_count": record.correct_count,
                        "last_updated": record.last_updated.isoformat(),
                    }
                    for skill_id, record in skills.items()
                }
                for learner_id, skills in self.mastery_states.items()
            },
            "mastery_threshold": self._mastery_threshold,
        }
    
    def import_state(self, state: Dict) -> None:
        """Import model state from persistence"""
        self._mastery_threshold = state.get("mastery_threshold", 0.95)
        
        self.parameters = {
            skill_id: BKTParameters.from_dict(params)
            for skill_id, params in state.get("parameters", {}).items()
        }
        
        self.mastery_states = {}
        for learner_id, skills in state.get("mastery_states", {}).items():
            self.mastery_states[learner_id] = {}
            for skill_id, record_data in skills.items():
                self.mastery_states[learner_id][skill_id] = MasteryRecord(
                    probability=record_data["probability"],
                    attempts=record_data["attempts"],
                    correct_count=record_data["correct_count"],
                    last_updated=datetime.fromisoformat(record_data["last_updated"]),
                )


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    
    bkt = BayesianKnowledgeTracing()
    
    # Initialize skill with curriculum-calibrated parameters
    bkt.initialize_skill(
        "addition_single_digit",
        p_init=0.1,    # Most students don't know it initially
        p_learn=0.15,  # Moderate learning rate
        p_guess=0.25,  # 4-option multiple choice
        p_slip=0.1     # Low slip rate for simple problems
    )
    
    # Simulate a learner's practice session
    learner = "student_123"
    skill = "addition_single_digit"
    
    print("Simulating learning progression:")
    print("-" * 50)
    
    responses = [False, True, True, False, True, True, True, True, True, True]
    for i, correct in enumerate(responses):
        p_know = bkt.update(learner, skill, correct)
        p_correct_next = bkt.predict_performance(learner, skill)
        mastered = "✓ MASTERED" if bkt.is_mastered(learner, skill) else ""
        print(
            f"Attempt {i+1:2d}: {'✓' if correct else '✗'} -> "
            f"P(know)={p_know:.3f}, P(correct_next)={p_correct_next:.3f} {mastered}"
        )
    
    print("\n" + "-" * 50)
    print("Learner Profile:")
    profile = bkt.get_learner_profile(learner)
    print(json.dumps(profile, indent=2, default=str))
