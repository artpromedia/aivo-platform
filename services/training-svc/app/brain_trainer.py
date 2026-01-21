"""
Brain Trainer Module

Implements personalized brain model training for each learner.
Trains learner-specific models based on their learning history and curriculum.

This module provides:
1. Base Brain Model - Foundation model trained on aggregate learner data
2. Personalized Brain Clone - Fine-tuned model for individual learners
3. Curriculum Alignment - Training on curriculum-specific content
4. Continuous Learning - Incremental updates as learner progresses
"""

import asyncio
import hashlib
import json
import pickle
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import numpy as np
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class BrainTrainingConfig:
    """Configuration for brain model training."""
    
    # Model identification
    model_name: str = "learner_brain_model"
    model_version: str = "1.0.0"
    
    # Training parameters
    learning_rate: float = 0.01
    epochs: int = 50
    batch_size: int = 32
    early_stopping_patience: int = 5
    
    # Knowledge Tracing parameters (BKT)
    bkt_p_init: float = 0.0  # Prior probability of knowing skill
    bkt_p_learn: float = 0.1  # Probability of learning per opportunity
    bkt_p_guess: float = 0.2  # Probability of guessing correctly
    bkt_p_slip: float = 0.1  # Probability of careless error
    
    # Personalization parameters
    personalization_strength: float = 0.3  # How much to personalize from base
    min_interactions_for_training: int = 10
    
    # Curriculum alignment
    curriculum_weight: float = 0.7  # Weight for curriculum-aligned skills
    
    # Storage paths
    models_dir: str = "models/brains"
    checkpoints_dir: str = "models/checkpoints"


@dataclass
class LearnerInteraction:
    """A single learning interaction for training."""
    
    learner_id: str
    skill_id: str
    activity_id: str
    correct: bool
    response_time_ms: int
    hints_used: int
    attempts: int
    timestamp: datetime
    difficulty: float = 0.5
    curriculum_aligned: bool = True


@dataclass 
class TrainingDataset:
    """Dataset for brain training."""
    
    interactions: List[LearnerInteraction] = field(default_factory=list)
    learner_ids: set = field(default_factory=set)
    skill_ids: set = field(default_factory=set)
    
    def add_interaction(self, interaction: LearnerInteraction):
        """Add an interaction to the dataset."""
        self.interactions.append(interaction)
        self.learner_ids.add(interaction.learner_id)
        self.skill_ids.add(interaction.skill_id)
    
    @property
    def size(self) -> int:
        return len(self.interactions)
    
    def get_learner_interactions(self, learner_id: str) -> List[LearnerInteraction]:
        """Get all interactions for a specific learner."""
        return [i for i in self.interactions if i.learner_id == learner_id]
    
    def get_skill_interactions(self, skill_id: str) -> List[LearnerInteraction]:
        """Get all interactions for a specific skill."""
        return [i for i in self.interactions if i.skill_id == skill_id]


@dataclass
class SkillParameters:
    """Learned parameters for a skill (BKT model)."""
    
    skill_id: str
    p_init: float = 0.0
    p_learn: float = 0.1
    p_guess: float = 0.2
    p_slip: float = 0.1
    difficulty: float = 0.5
    avg_response_time: float = 0.0
    sample_count: int = 0


@dataclass
class LearnerBrainModel:
    """Personalized brain model for a learner."""
    
    model_id: str
    learner_id: str
    version: str
    created_at: datetime
    updated_at: datetime
    
    # Skill-specific parameters
    skill_params: Dict[str, SkillParameters] = field(default_factory=dict)
    
    # Learner characteristics
    learning_rate_factor: float = 1.0  # Multiplier for p_learn
    guess_tendency: float = 0.0  # Adjustment to p_guess
    slip_tendency: float = 0.0  # Adjustment to p_slip
    preferred_difficulty: float = 0.5  # Optimal difficulty level
    avg_response_time_factor: float = 1.0  # Speed relative to average
    
    # Curriculum alignment
    curriculum_standards: List[str] = field(default_factory=list)
    curriculum_skill_weights: Dict[str, float] = field(default_factory=dict)
    
    # Performance metrics
    overall_accuracy: float = 0.0
    total_interactions: int = 0
    training_loss: float = 0.0


class BrainTrainer:
    """
    Trainer for personalized learner brain models.
    
    Implements a hierarchical training approach:
    1. Train base model on aggregate data
    2. Clone and personalize for each learner
    3. Continuously update with new interactions
    """
    
    def __init__(self, config: Optional[BrainTrainingConfig] = None):
        self.config = config or BrainTrainingConfig()
        self.base_model: Optional[Dict[str, SkillParameters]] = None
        self.learner_models: Dict[str, LearnerBrainModel] = {}
        
        # Ensure directories exist
        Path(self.config.models_dir).mkdir(parents=True, exist_ok=True)
        Path(self.config.checkpoints_dir).mkdir(parents=True, exist_ok=True)
    
    # ══════════════════════════════════════════════════════════════════════════
    # BASE MODEL TRAINING
    # ══════════════════════════════════════════════════════════════════════════
    
    async def train_base_model(
        self,
        dataset: TrainingDataset,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, SkillParameters]:
        """
        Train the base brain model on aggregate learner data.
        
        Uses Expectation-Maximization to fit BKT parameters for each skill.
        
        Args:
            dataset: Training dataset with learner interactions
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary of skill parameters
        """
        logger.info(
            "training_base_model",
            dataset_size=dataset.size,
            skills_count=len(dataset.skill_ids),
            learners_count=len(dataset.learner_ids),
        )
        
        skill_params: Dict[str, SkillParameters] = {}
        total_skills = len(dataset.skill_ids)
        
        for idx, skill_id in enumerate(dataset.skill_ids):
            # Get interactions for this skill
            skill_interactions = dataset.get_skill_interactions(skill_id)
            
            if len(skill_interactions) < self.config.min_interactions_for_training:
                # Use default parameters for sparse skills
                skill_params[skill_id] = SkillParameters(skill_id=skill_id)
                continue
            
            # Fit BKT parameters using EM algorithm
            params = await self._fit_bkt_parameters(skill_id, skill_interactions)
            skill_params[skill_id] = params
            
            # Report progress
            if progress_callback:
                progress = (idx + 1) / total_skills
                await progress_callback(progress, f"Training skill {idx + 1}/{total_skills}")
        
        self.base_model = skill_params
        
        logger.info(
            "base_model_trained",
            skills_trained=len(skill_params),
        )
        
        return skill_params
    
    def _fit_bkt_parameters(
        self,
        skill_id: str,
        interactions: List[LearnerInteraction],
    ) -> SkillParameters:
        """
        Fit BKT parameters for a skill using Expectation-Maximization.
        
        EM algorithm for BKT:
        E-step: Estimate P(learned) for each interaction given current params
        M-step: Update params to maximize likelihood of observations
        """
        # Initialize parameters
        params = {
            'p_init': self.config.bkt_p_init,
            'p_learn': self.config.bkt_p_learn,
            'p_guess': self.config.bkt_p_guess,
            'p_slip': self.config.bkt_p_slip,
        }
        
        # Prepare learner sequences
        learner_sequences = self._prepare_learner_sequences(interactions)
        
        # Run EM iterations
        for _ in range(self.config.epochs):
            params = self._em_iteration(params, learner_sequences)
        
        # Calculate skill statistics
        avg_response_time = np.mean([i.response_time_ms for i in interactions])
        avg_difficulty = np.mean([i.difficulty for i in interactions])
        
        return SkillParameters(
            skill_id=skill_id,
            p_init=params['p_init'],
            p_learn=params['p_learn'],
            p_guess=params['p_guess'],
            p_slip=params['p_slip'],
            difficulty=avg_difficulty,
            avg_response_time=avg_response_time,
            sample_count=len(interactions),
        )

    def _prepare_learner_sequences(
        self, interactions: List[LearnerInteraction]
    ) -> Dict[str, List[LearnerInteraction]]:
        """Group and sort interactions by learner."""
        learner_sequences: Dict[str, List[LearnerInteraction]] = {}
        for interaction in interactions:
            if interaction.learner_id not in learner_sequences:
                learner_sequences[interaction.learner_id] = []
            learner_sequences[interaction.learner_id].append(interaction)
        
        # Sort each sequence by timestamp
        for learner_id in learner_sequences:
            learner_sequences[learner_id].sort(key=lambda x: x.timestamp)
        
        return learner_sequences

    def _em_iteration(
        self,
        params: Dict[str, float],
        learner_sequences: Dict[str, List[LearnerInteraction]]
    ) -> Dict[str, float]:
        """Run one EM iteration and return updated parameters."""
        # E-step: compute expected knowledge states
        accumulators = self._e_step(params, learner_sequences)
        
        # M-step: update parameters
        return self._m_step(params, accumulators)

    def _e_step(
        self,
        params: Dict[str, float],
        learner_sequences: Dict[str, List[LearnerInteraction]]
    ) -> Dict[str, float]:
        """E-step: Estimate knowledge states and accumulate statistics."""
        accumulators = {
            'total_p_init': 0.0,
            'total_p_learn': 0.0,
            'count_init': 0,
            'count_transitions': 0,
            'count_correct_unknown': 0.0,
            'count_incorrect_known': 0.0,
            'count_correct_known': 0.0,
            'count_incorrect_unknown': 0.0,
        }
        
        for learner_id, sequence in learner_sequences.items():
            p_known = params['p_init']
            
            for interaction in sequence:
                # Calculate observation probabilities
                if interaction.correct:
                    p_obs_given_known = 1 - params['p_slip']
                    p_obs_given_unknown = params['p_guess']
                else:
                    p_obs_given_known = params['p_slip']
                    p_obs_given_unknown = 1 - params['p_guess']
                
                # Calculate P(known | observation)
                p_obs = p_known * p_obs_given_known + (1 - p_known) * p_obs_given_unknown
                p_known_given_obs = (p_known * p_obs_given_known) / max(p_obs, 1e-10)
                
                # Accumulate for M-step
                self._accumulate_counts(
                    accumulators, interaction, p_known_given_obs, params['p_learn']
                )
                
                # Learning transition
                p_learned = p_known_given_obs + (1 - p_known_given_obs) * params['p_learn']
                accumulators['count_transitions'] += 1
                p_known = p_learned
            
            # First interaction contributes to p_init estimate
            accumulators['total_p_init'] += params['p_init']
            accumulators['count_init'] += 1
        
        return accumulators

    def _accumulate_counts(
        self,
        accumulators: Dict[str, float],
        interaction: LearnerInteraction,
        p_known_given_obs: float,
        p_learn: float
    ) -> None:
        """Accumulate counts for M-step parameter updates."""
        if interaction.correct:
            accumulators['count_correct_known'] += p_known_given_obs
            accumulators['count_correct_unknown'] += 1 - p_known_given_obs
        else:
            accumulators['count_incorrect_known'] += p_known_given_obs
            accumulators['count_incorrect_unknown'] += 1 - p_known_given_obs
        
        # Accumulate learning probability
        if accumulators['count_transitions'] > 0:
            accumulators['total_p_learn'] += (
                (p_known_given_obs + (1 - p_known_given_obs) * p_learn - p_known_given_obs) 
                / max(1 - p_known_given_obs, 1e-10)
            )

    def _m_step(
        self, old_params: Dict[str, float], accumulators: Dict[str, float]
    ) -> Dict[str, float]:
        """M-step: Update parameters to maximize likelihood."""
        params = old_params.copy()
        
        # Update p_init
        if accumulators['count_init'] > 0:
            params['p_init'] = max(0.001, min(0.999, 
                accumulators['total_p_init'] / accumulators['count_init']
            ))
        
        # Update p_learn
        if accumulators['count_transitions'] > 0:
            params['p_learn'] = max(0.001, min(0.999, 
                accumulators['total_p_learn'] / accumulators['count_transitions']
            ))
        
        # Update p_guess
        total_unknown = accumulators['count_correct_unknown'] + accumulators['count_incorrect_unknown']
        if total_unknown > 0:
            params['p_guess'] = max(0.001, min(0.999, 
                accumulators['count_correct_unknown'] / total_unknown
            ))
        
        # Update p_slip
        total_known = accumulators['count_correct_known'] + accumulators['count_incorrect_known']
        if total_known > 0:
            params['p_slip'] = max(0.001, min(0.999,
                accumulators['count_incorrect_known'] / total_known
            ))
        
        return params
    
    # ══════════════════════════════════════════════════════════════════════════
    # LEARNER BRAIN CLONING & PERSONALIZATION
    # ══════════════════════════════════════════════════════════════════════════
    
    async def clone_brain_for_learner(
        self,
        learner_id: str,
        curriculum_standards: Optional[List[str]] = None,
        learner_interactions: Optional[List[LearnerInteraction]] = None,
    ) -> LearnerBrainModel:
        """
        Clone the base brain model and personalize for a specific learner.
        
        Args:
            learner_id: Unique learner identifier
            curriculum_standards: List of applicable curriculum standards
            learner_interactions: Historical interactions for personalization
            
        Returns:
            Personalized LearnerBrainModel
        """
        if not self.base_model:
            # Initialize with default parameters if no base model
            self.base_model = {}
        
        model_id = f"brain_{learner_id}_{uuid4().hex[:8]}"
        now = datetime.now(tz=timezone.utc)
        
        # Clone base skill parameters
        skill_params = {}
        for skill_id, base_params in self.base_model.items():
            skill_params[skill_id] = SkillParameters(
                skill_id=skill_id,
                p_init=base_params.p_init,
                p_learn=base_params.p_learn,
                p_guess=base_params.p_guess,
                p_slip=base_params.p_slip,
                difficulty=base_params.difficulty,
                avg_response_time=base_params.avg_response_time,
                sample_count=0,  # Reset for learner-specific tracking
            )
        
        # Create learner model
        learner_model = LearnerBrainModel(
            model_id=model_id,
            learner_id=learner_id,
            version=self.config.model_version,
            created_at=now,
            updated_at=now,
            skill_params=skill_params,
            curriculum_standards=curriculum_standards or [],
        )
        
        # Personalize if we have historical interactions
        if learner_interactions and len(learner_interactions) >= self.config.min_interactions_for_training:
            learner_model = await self._personalize_brain(
                learner_model, learner_interactions
            )
        
        self.learner_models[learner_id] = learner_model
        
        logger.info(
            "brain_cloned",
            learner_id=learner_id,
            model_id=model_id,
            skills_count=len(skill_params),
            curriculum_standards=curriculum_standards,
        )
        
        return learner_model
    
    def _personalize_brain(
        self,
        model: LearnerBrainModel,
        interactions: List[LearnerInteraction],
    ) -> LearnerBrainModel:
        """
        Personalize brain model based on learner's historical interactions.
        
        Adjusts BKT parameters based on individual learning patterns.
        """
        # Sort by timestamp
        interactions.sort(key=lambda x: x.timestamp)
        
        # Calculate learner characteristics
        response_times = [i.response_time_ms for i in interactions]
        accuracies = [1.0 if i.correct else 0.0 for i in interactions]
        hints_used = [i.hints_used for i in interactions]
        
        # Learning rate factor (faster learners show rapid improvement)
        if len(accuracies) >= 5:
            early_accuracy = np.mean(accuracies[:len(accuracies)//3])
            late_accuracy = np.mean(accuracies[-(len(accuracies)//3):])
            improvement = late_accuracy - early_accuracy
            model.learning_rate_factor = 1.0 + (improvement * 2.0)  # Scale improvement
            model.learning_rate_factor = max(0.5, min(2.0, model.learning_rate_factor))
        
        # Guess tendency (high accuracy with hints suggests guessing)
        avg_hints = np.mean(hints_used) if hints_used else 0
        if avg_hints > 2:
            model.guess_tendency = min(0.1, avg_hints * 0.02)
        
        # Response time factor
        base_avg_time = 5000  # 5 seconds baseline
        model.avg_response_time_factor = np.mean(response_times) / base_avg_time
        
        # Preferred difficulty
        successful_difficulties = [i.difficulty for i in interactions if i.correct]
        if successful_difficulties:
            model.preferred_difficulty = np.mean(successful_difficulties)
        
        # Update skill-specific parameters
        skill_interactions: Dict[str, List[LearnerInteraction]] = {}
        for interaction in interactions:
            if interaction.skill_id not in skill_interactions:
                skill_interactions[interaction.skill_id] = []
            skill_interactions[interaction.skill_id].append(interaction)
        
        for skill_id, skill_data in skill_interactions.items():
            if skill_id not in model.skill_params:
                model.skill_params[skill_id] = SkillParameters(skill_id=skill_id)
            
            params = model.skill_params[skill_id]
            
            # Personalize p_learn based on learning rate factor
            params.p_learn = min(0.5, params.p_learn * model.learning_rate_factor)
            
            # Adjust guess/slip based on tendencies
            params.p_guess = min(0.4, params.p_guess + model.guess_tendency)
            params.p_slip = min(0.3, params.p_slip + model.slip_tendency)
            
            params.sample_count = len(skill_data)
        
        # Update overall stats
        model.overall_accuracy = np.mean(accuracies)
        model.total_interactions = len(interactions)
        model.updated_at = datetime.now(tz=timezone.utc)
        
        return model
    
    # ══════════════════════════════════════════════════════════════════════════
    # CURRICULUM-ALIGNED TRAINING
    # ══════════════════════════════════════════════════════════════════════════
    
    def align_with_curriculum(
        self,
        model: LearnerBrainModel,
        curriculum_skills: List[str],
        skill_weights: Optional[Dict[str, float]] = None,
    ) -> LearnerBrainModel:
        """
        Align brain model with curriculum-specific skills.
        
        Prioritizes curriculum-aligned skills in learning recommendations.
        """
        model.curriculum_standards = curriculum_skills
        
        if skill_weights:
            model.curriculum_skill_weights = skill_weights
        else:
            # Default equal weights for curriculum skills
            model.curriculum_skill_weights = {
                skill: self.config.curriculum_weight for skill in curriculum_skills
            }
        
        # Ensure all curriculum skills have parameters
        for skill_id in curriculum_skills:
            if skill_id not in model.skill_params:
                # Use base model params if available, else defaults
                if self.base_model and skill_id in self.base_model:
                    base = self.base_model[skill_id]
                    model.skill_params[skill_id] = SkillParameters(
                        skill_id=skill_id,
                        p_init=base.p_init,
                        p_learn=base.p_learn,
                        p_guess=base.p_guess,
                        p_slip=base.p_slip,
                    )
                else:
                    model.skill_params[skill_id] = SkillParameters(skill_id=skill_id)
        
        model.updated_at = datetime.now(tz=timezone.utc)
        
        logger.info(
            "curriculum_aligned",
            learner_id=model.learner_id,
            curriculum_skills=len(curriculum_skills),
        )
        
        return model
    
    # ══════════════════════════════════════════════════════════════════════════
    # INCREMENTAL UPDATES
    # ══════════════════════════════════════════════════════════════════════════
    
    def update_brain(
        self,
        learner_id: str,
        interaction: LearnerInteraction,
    ) -> Optional[LearnerBrainModel]:
        """
        Incrementally update brain model with new interaction.
        
        Uses online learning to update parameters without full retraining.
        """
        if learner_id not in self.learner_models:
            return None
        
        model = self.learner_models[learner_id]
        skill_id = interaction.skill_id
        
        # Ensure skill exists in model
        if skill_id not in model.skill_params:
            if self.base_model and skill_id in self.base_model:
                base = self.base_model[skill_id]
                model.skill_params[skill_id] = SkillParameters(
                    skill_id=skill_id,
                    p_init=base.p_init,
                    p_learn=base.p_learn,
                    p_guess=base.p_guess,
                    p_slip=base.p_slip,
                )
            else:
                model.skill_params[skill_id] = SkillParameters(skill_id=skill_id)
        
        params = model.skill_params[skill_id]
        
        # Online update using exponential moving average
        alpha = self.config.learning_rate
        
        # Update based on outcome
        if interaction.correct:
            # Successful - slight decrease in guess probability
            params.p_guess = (1 - alpha) * params.p_guess + alpha * 0.1
            # Increase p_learn if solved quickly
            if interaction.response_time_ms < params.avg_response_time:
                params.p_learn = min(0.5, params.p_learn * 1.05)
        else:
            # Failed - adjust slip based on hints
            if interaction.hints_used == 0:
                params.p_slip = (1 - alpha) * params.p_slip + alpha * 0.15
        
        # Update response time average
        params.avg_response_time = (
            0.9 * params.avg_response_time + 0.1 * interaction.response_time_ms
        )
        params.sample_count += 1
        
        # Update model stats
        model.total_interactions += 1
        model.overall_accuracy = (
            (model.overall_accuracy * (model.total_interactions - 1) + 
             (1.0 if interaction.correct else 0.0)) / model.total_interactions
        )
        model.updated_at = datetime.now(tz=timezone.utc)
        
        return model
    
    # ══════════════════════════════════════════════════════════════════════════
    # MODEL PERSISTENCE
    # ══════════════════════════════════════════════════════════════════════════
    
    def save_model(self, learner_id: str) -> Optional[str]:
        """Save learner brain model to disk."""
        if learner_id not in self.learner_models:
            return None
        
        model = self.learner_models[learner_id]
        model_path = Path(self.config.models_dir) / f"{model.model_id}.pkl"
        
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        
        logger.info("model_saved", learner_id=learner_id, path=str(model_path))
        return str(model_path)
    
    def load_model(self, learner_id: str, model_id: str) -> Optional[LearnerBrainModel]:
        """Load learner brain model from disk."""
        model_path = Path(self.config.models_dir) / f"{model_id}.pkl"
        
        if not model_path.exists():
            return None
        
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        
        self.learner_models[learner_id] = model
        logger.info("model_loaded", learner_id=learner_id, model_id=model_id)
        return model
    
    def export_model_as_dict(self, learner_id: str) -> Optional[Dict[str, Any]]:
        """Export learner brain model as dictionary for API responses."""
        if learner_id not in self.learner_models:
            return None
        
        model = self.learner_models[learner_id]
        
        return {
            "model_id": model.model_id,
            "learner_id": model.learner_id,
            "version": model.version,
            "created_at": model.created_at.isoformat(),
            "updated_at": model.updated_at.isoformat(),
            "skill_params": {
                skill_id: {
                    "p_init": params.p_init,
                    "p_learn": params.p_learn,
                    "p_guess": params.p_guess,
                    "p_slip": params.p_slip,
                    "difficulty": params.difficulty,
                    "sample_count": params.sample_count,
                }
                for skill_id, params in model.skill_params.items()
            },
            "learning_rate_factor": model.learning_rate_factor,
            "preferred_difficulty": model.preferred_difficulty,
            "overall_accuracy": model.overall_accuracy,
            "total_interactions": model.total_interactions,
            "curriculum_standards": model.curriculum_standards,
        }


# Global trainer instance
_trainer: Optional[BrainTrainer] = None


def get_brain_trainer() -> BrainTrainer:
    """Get global brain trainer instance."""
    global _trainer
    if _trainer is None:
        _trainer = BrainTrainer()
    return _trainer
