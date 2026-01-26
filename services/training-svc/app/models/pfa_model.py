"""
Performance Factor Analysis (PFA)
Learning curve model based on practice opportunities
Based on Pavlik et al. (2009)

Key insight: Mastery depends on:
- Number of successful practices (s)
- Number of failed attempts (f)
- Recency of practice

PFA logistic model:
P(correct) = 1 / (1 + exp(-(β + γ*s + ρ*f)))

where:
- β: skill difficulty (higher = harder)
- γ: learning rate from success (positive)
- ρ: learning rate from failure (typically negative)
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from scipy.optimize import minimize
import pickle
import logging

logger = logging.getLogger(__name__)


@dataclass
class PFAParameters:
    """PFA model parameters for a skill"""
    beta: float = 0.0      # Difficulty parameter (higher = harder)
    gamma: float = 0.3     # Learning rate from success
    rho: float = -0.15     # Learning rate from failure (negative)
    decay: float = 0.95    # Memory decay per day
    
    def to_dict(self) -> Dict:
        return {
            "beta": self.beta,
            "gamma": self.gamma,
            "rho": self.rho,
            "decay": self.decay,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "PFAParameters":
        return cls(**data)


@dataclass
class PFALearnerState:
    """Learner's practice history for PFA"""
    skill_id: str
    successes: float = 0.0      # Can be fractional due to decay
    failures: float = 0.0       # Can be fractional due to decay
    raw_successes: int = 0      # Raw count without decay
    raw_failures: int = 0       # Raw count without decay
    last_practice: Optional[datetime] = None
    total_practices: int = 0
    recent_streak: int = 0      # Current streak (positive=correct, negative=incorrect)
    
    def to_dict(self) -> Dict:
        return {
            "skill_id": self.skill_id,
            "successes": self.successes,
            "failures": self.failures,
            "raw_successes": self.raw_successes,
            "raw_failures": self.raw_failures,
            "last_practice": self.last_practice.isoformat() if self.last_practice else None,
            "total_practices": self.total_practices,
            "recent_streak": self.recent_streak,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "PFALearnerState":
        return cls(
            skill_id=data["skill_id"],
            successes=data.get("successes", 0.0),
            failures=data.get("failures", 0.0),
            raw_successes=data.get("raw_successes", 0),
            raw_failures=data.get("raw_failures", 0),
            last_practice=datetime.fromisoformat(data["last_practice"]) if data.get("last_practice") else None,
            total_practices=data.get("total_practices", 0),
            recent_streak=data.get("recent_streak", 0),
        )


class PerformanceFactorAnalysis:
    """
    Performance Factor Analysis for learning curve modeling
    
    PFA provides interpretable predictions based on:
    - Skill difficulty
    - Practice history (successes and failures)
    - Memory decay over time
    
    Usage:
        pfa = PerformanceFactorAnalysis()
        pfa.initialize_skill("multiplication")
        prob = pfa.predict("student_1", "multiplication")
        pfa.update("student_1", "multiplication", correct=True)
    """
    
    def __init__(self):
        self.parameters: Dict[str, PFAParameters] = {}
        self.learner_states: Dict[str, Dict[str, PFALearnerState]] = {}
        self.global_stats = {
            "total_updates": 0,
            "total_learners": 0,
            "total_skills": 0,
        }
    
    def initialize_skill(
        self,
        skill_id: str,
        beta: float = 0.0,
        gamma: float = 0.3,
        rho: float = -0.15,
        decay: float = 0.95
    ):
        """
        Initialize PFA parameters for a skill
        
        Args:
            skill_id: Unique skill identifier
            beta: Difficulty (0 = neutral, >0 = harder, <0 = easier)
            gamma: Success learning rate (typically 0.2-0.5)
            rho: Failure learning rate (typically -0.1 to -0.3)
            decay: Memory decay per day (0.9-1.0)
        """
        self.parameters[skill_id] = PFAParameters(beta, gamma, rho, decay)
        self.global_stats["total_skills"] = len(self.parameters)
        logger.debug(f"Initialized PFA skill: {skill_id}")
    
    def get_skill_params(self, skill_id: str) -> PFAParameters:
        """Get parameters for a skill, using defaults if not found"""
        return self.parameters.get(skill_id, PFAParameters())
    
    def get_learner_state(
        self,
        learner_id: str,
        skill_id: str
    ) -> PFALearnerState:
        """Get or create learner state for a skill"""
        if learner_id not in self.learner_states:
            self.learner_states[learner_id] = {}
            self.global_stats["total_learners"] = len(self.learner_states)
        
        if skill_id not in self.learner_states[learner_id]:
            self.learner_states[learner_id][skill_id] = PFALearnerState(
                skill_id=skill_id
            )
        
        return self.learner_states[learner_id][skill_id]
    
    def _apply_decay(
        self,
        state: PFALearnerState,
        params: PFAParameters,
        current_time: Optional[datetime] = None
    ) -> Tuple[float, float]:
        """
        Apply memory decay to success/failure counts
        
        Returns:
            Tuple of (decayed_successes, decayed_failures)
        """
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        
        s = state.successes
        f = state.failures
        
        if state.last_practice:
            days_elapsed = (current_time - state.last_practice).total_seconds() / 86400
            if days_elapsed > 0:
                decay_factor = params.decay ** days_elapsed
                s *= decay_factor
                f *= decay_factor
        
        return s, f
    
    def predict(
        self,
        learner_id: str,
        skill_id: str,
        apply_decay: bool = True,
        current_time: Optional[datetime] = None
    ) -> float:
        """
        Predict probability of correctness
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to predict
            apply_decay: Apply memory decay based on time
            current_time: Current time for decay calculation
        
        Returns:
            Probability of correct response (0-1)
        """
        params = self.get_skill_params(skill_id)
        state = self.get_learner_state(learner_id, skill_id)
        
        if apply_decay:
            s, f = self._apply_decay(state, params, current_time)
        else:
            s = state.successes
            f = state.failures
        
        # PFA logistic function
        logit = params.beta + params.gamma * s + params.rho * f
        
        # Clip to prevent overflow
        logit = np.clip(logit, -20, 20)
        
        prob = 1 / (1 + np.exp(-logit))
        
        return float(prob)
    
    def update(
        self,
        learner_id: str,
        skill_id: str,
        correct: bool,
        timestamp: Optional[datetime] = None
    ) -> float:
        """
        Update learner state with practice outcome
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill practiced
            correct: Whether response was correct
            timestamp: Time of practice (default: now)
        
        Returns:
            Updated probability of mastery
        """
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)
        
        params = self.get_skill_params(skill_id)
        state = self.get_learner_state(learner_id, skill_id)
        
        # Apply decay to existing counts before update
        s_decayed, f_decayed = self._apply_decay(state, params, timestamp)
        
        # Update counts
        if correct:
            state.successes = s_decayed + 1
            state.raw_successes += 1
            state.recent_streak = max(1, state.recent_streak + 1) if state.recent_streak >= 0 else 1
        else:
            state.failures = f_decayed + 1
            state.raw_failures += 1
            state.recent_streak = min(-1, state.recent_streak - 1) if state.recent_streak <= 0 else -1
        
        state.total_practices += 1
        state.last_practice = timestamp
        
        self.global_stats["total_updates"] += 1
        
        # Return updated probability
        return self.predict(learner_id, skill_id, apply_decay=False)
    
    def train_parameters(
        self,
        training_data: List[Tuple[str, str, bool, int, int]],
        max_iterations: int = 1000
    ) -> Dict[str, PFAParameters]:
        """
        Train PFA parameters using Maximum Likelihood Estimation
        
        Args:
            training_data: List of (learner_id, skill_id, correct, successes, failures)
            max_iterations: Maximum optimization iterations
        
        Returns:
            Optimized parameters per skill
        """
        # Group by skill
        skill_data: Dict[str, List[Tuple[bool, int, int]]] = {}
        for learner_id, skill_id, correct, s, f in training_data:
            if skill_id not in skill_data:
                skill_data[skill_id] = []
            skill_data[skill_id].append((correct, s, f))
        
        # Optimize parameters for each skill
        for skill_id, data in skill_data.items():
            if len(data) < 10:
                logger.warning(f"Insufficient data for skill {skill_id}, using defaults")
                self.initialize_skill(skill_id)
                continue
            
            # Define loss function (negative log-likelihood)
            # Use default parameter to capture current data value
            def loss(params, skill_data=data):
                beta, gamma, rho = params
                log_likelihood = 0
                
                for correct, s, f in skill_data:
                    logit = beta + gamma * s + rho * f
                    logit = np.clip(logit, -20, 20)
                    prob = 1 / (1 + np.exp(-logit))
                    
                    # Clip to avoid log(0)
                    prob = np.clip(prob, 1e-10, 1 - 1e-10)
                    
                    if correct:
                        log_likelihood += np.log(prob)
                    else:
                        log_likelihood += np.log(1 - prob)
                
                return -log_likelihood  # Minimize negative log-likelihood
            
            # Initial parameters
            x0 = [0.0, 0.3, -0.15]
            
            # Optimize
            try:
                result = minimize(
                    loss,
                    x0,
                    method='L-BFGS-B',
                    bounds=[(-5, 5), (0.01, 2), (-2, -0.01)],
                    options={'maxiter': max_iterations}
                )
                
                if result.success:
                    beta, gamma, rho = result.x
                    self.initialize_skill(skill_id, beta, gamma, rho)
                    logger.info(f"Trained PFA for {skill_id}: β={beta:.3f}, γ={gamma:.3f}, ρ={rho:.3f}")
                else:
                    self.initialize_skill(skill_id)
                    logger.warning(f"Optimization failed for {skill_id}, using defaults")
            except Exception as e:
                self.initialize_skill(skill_id)
                logger.warning(f"Error training {skill_id}: {e}")
        
        return self.parameters
    
    def estimate_practices_needed(
        self,
        learner_id: str,
        skill_id: str,
        target_mastery: float = 0.8,
        assumed_success_rate: float = 0.8
    ) -> int:
        """
        Estimate how many successful practices needed to reach target mastery
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to estimate
            target_mastery: Target probability (default 0.8)
            assumed_success_rate: Assumed future success rate
        
        Returns:
            Estimated number of additional practices needed
        """
        params = self.get_skill_params(skill_id)
        state = self.get_learner_state(learner_id, skill_id)
        
        # Current decayed state
        s, f = self._apply_decay(state, params)
        
        # Target logit
        target_logit = np.log(target_mastery / (1 - target_mastery))
        
        # Current logit
        current_logit = params.beta + params.gamma * s + params.rho * f
        
        if current_logit >= target_logit:
            return 0  # Already at target
        
        # Estimate practices needed
        # Assuming success_rate of practices will be correct:
        # Each practice adds: gamma * success_rate + rho * (1 - success_rate)
        logit_per_practice = params.gamma * assumed_success_rate + params.rho * (1 - assumed_success_rate)
        
        if logit_per_practice <= 0:
            return 100  # Can't reach target with current parameters
        
        practices_needed = (target_logit - current_logit) / logit_per_practice
        
        return max(0, int(np.ceil(practices_needed)))
    
    def get_learning_curve(
        self,
        learner_id: str,
        skill_id: str,
        max_practices: int = 20,
        assumed_success_rate: float = 0.75
    ) -> List[Tuple[int, float]]:
        """
        Generate learning curve showing projected mastery vs practice count
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to project
            max_practices: Number of future practices to simulate
            assumed_success_rate: Assumed success rate for projections
        
        Returns:
            List of (practice_count, mastery_probability) tuples
        """
        params = self.get_skill_params(skill_id)
        state = self.get_learner_state(learner_id, skill_id)
        
        curve = []
        s, f = self._apply_decay(state, params)
        
        for i in range(max_practices + 1):
            logit = params.beta + params.gamma * s + params.rho * f
            logit = np.clip(logit, -20, 20)
            prob = 1 / (1 + np.exp(-logit))
            
            curve.append((state.total_practices + i, float(prob)))
            
            # Simulate next practice
            rng = np.random.default_rng(seed=42 + i)
            if rng.random() < assumed_success_rate:
                s += 1
            else:
                f += 1
        
        return curve
    
    def get_all_mastery(self, learner_id: str) -> Dict[str, float]:
        """Get mastery probabilities for all skills a learner has practiced"""
        if learner_id not in self.learner_states:
            return {}
        
        return {
            skill_id: self.predict(learner_id, skill_id)
            for skill_id in self.learner_states[learner_id]
        }
    
    def get_weakest_skills(
        self,
        learner_id: str,
        n: int = 5,
        min_practices: int = 1
    ) -> List[Tuple[str, float]]:
        """
        Get learner's weakest skills
        
        Args:
            learner_id: Learner identifier
            n: Number of skills to return
            min_practices: Minimum practices to consider
        
        Returns:
            List of (skill_id, mastery_probability) sorted by mastery
        """
        if learner_id not in self.learner_states:
            return []
        
        skills = []
        for skill_id, state in self.learner_states[learner_id].items():
            if state.total_practices >= min_practices:
                prob = self.predict(learner_id, skill_id)
                skills.append((skill_id, prob))
        
        skills.sort(key=lambda x: x[1])
        return skills[:n]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get PFA model statistics"""
        return {
            **self.global_stats,
            "skills_with_params": len(self.parameters),
            "skill_difficulties": {
                skill_id: params.beta
                for skill_id, params in self.parameters.items()
            },
        }
    
    def save_model(self, filepath: str):
        """Save PFA model to disk"""
        with open(filepath, 'wb') as f:
            pickle.dump({
                'parameters': {k: v.to_dict() for k, v in self.parameters.items()},
                'learner_states': {
                    lid: {sid: s.to_dict() for sid, s in states.items()}
                    for lid, states in self.learner_states.items()
                },
                'global_stats': self.global_stats,
            }, f)
        logger.info(f"PFA model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load PFA model from disk"""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.parameters = {
            k: PFAParameters.from_dict(v)
            for k, v in data['parameters'].items()
        }
        self.learner_states = {
            lid: {sid: PFALearnerState.from_dict(s) for sid, s in states.items()}
            for lid, states in data['learner_states'].items()
        }
        self.global_stats = data.get('global_stats', self.global_stats)
        logger.info(f"PFA model loaded from {filepath}")
