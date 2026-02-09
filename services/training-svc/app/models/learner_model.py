"""
Learner Model Cloning with Federated Learning
Clones base brain model and personalizes for individual learners

This module implements:
1. Base Brain Model - Neural network trained on aggregate learner data
2. Personalized Brain Cloner - Clones and personalizes models for individuals
3. Federated Learning - Aggregates updates while preserving privacy
"""

import torch
import torch.nn as nn
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime, timezone
import numpy as np
from pathlib import Path
import json
import logging
import copy

logger = logging.getLogger(__name__)


@dataclass
class LearnerProfile:
    """Learner characteristics for model personalization"""
    learner_id: str
    grade_level: int
    learning_pace: float = 1.0  # Range: 0.5 (slow) to 1.5 (fast)
    preferred_modality: str = "visual"  # visual, auditory, kinesthetic
    attention_span_minutes: int = 15
    iep_accommodations: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)  # Skill IDs
    challenges: List[str] = field(default_factory=list)  # Skill IDs
    cognitive_load_capacity: float = 1.0  # 0-2 scale
    preferred_difficulty: float = 0.5  # 0-1 scale
    
    def to_dict(self) -> Dict:
        return {
            "learner_id": self.learner_id,
            "grade_level": self.grade_level,
            "learning_pace": self.learning_pace,
            "preferred_modality": self.preferred_modality,
            "attention_span_minutes": self.attention_span_minutes,
            "iep_accommodations": self.iep_accommodations,
            "strengths": self.strengths,
            "challenges": self.challenges,
            "cognitive_load_capacity": self.cognitive_load_capacity,
            "preferred_difficulty": self.preferred_difficulty,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "LearnerProfile":
        return cls(**data)


@dataclass
class InteractionHistory:
    """Learning interaction data for training"""
    skill_id: str
    correct: bool
    response_time_ms: int
    hints_used: int = 0
    difficulty: float = 0.5
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    attempts: int = 1
    engagement_score: float = 1.0  # 0-1 scale
    scaffolding_level: int = 0  # 0 = none, 1-3 = increasing support
    
    def to_dict(self) -> Dict:
        return {
            "skill_id": self.skill_id,
            "correct": self.correct,
            "response_time_ms": self.response_time_ms,
            "hints_used": self.hints_used,
            "difficulty": self.difficulty,
            "timestamp": self.timestamp.isoformat(),
            "attempts": self.attempts,
            "engagement_score": self.engagement_score,
            "scaffolding_level": self.scaffolding_level,
        }


class BaseBrainModel(nn.Module):
    """
    Base neural network model trained on aggregate learner data
    
    Architecture: Multi-layer perceptron with attention for skill prediction
    
    Input Features:
        - Skill embedding (learned representation of skill)
        - Context features (time, hints, difficulty, etc.)
        - Learner state features (pace, engagement, etc.)
    
    Output:
        - Probability of correct response
        - Predicted mastery level
        - Recommended difficulty adjustment
    """
    
    def __init__(
        self,
        num_skills: int,
        embedding_dim: int = 64,
        hidden_dim: int = 128,
        num_layers: int = 3,
        dropout_rate: float = 0.2,
        num_context_features: int = 8,
    ):
        super().__init__()
        
        self.num_skills = num_skills
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Skill embedding layer
        self.skill_embedding = nn.Embedding(num_skills, embedding_dim)
        
        # Learner state embedding (for personalization)
        self.learner_state_layer = nn.Linear(5, embedding_dim // 2)
        
        # Context feature processing
        self.context_layer = nn.Linear(num_context_features, embedding_dim // 2)
        
        # Attention mechanism for skill-context interaction
        self.attention = nn.MultiheadAttention(
            embed_dim=embedding_dim,
            num_heads=4,
            dropout=dropout_rate,
            batch_first=True
        )
        
        # MLP layers
        layers = []
        input_dim = embedding_dim * 2  # skill + context/state
        
        for _ in range(num_layers):
            layers.extend([
                nn.Linear(input_dim, hidden_dim),
                nn.LayerNorm(hidden_dim),
                nn.GELU(),  # Smoother activation for learning
                nn.Dropout(dropout_rate),
            ])
            input_dim = hidden_dim
        
        self.network = nn.Sequential(*layers)
        
        # Output heads
        self.correctness_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        self.mastery_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        self.difficulty_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Tanh()  # -1 to 1 for difficulty adjustment
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights using Xavier/Glorot initialization"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0, std=0.1)
    
    def forward(
        self, 
        skill_ids: torch.Tensor,
        context: torch.Tensor,
        learner_state: Optional[torch.Tensor] = None,
        return_all_outputs: bool = False
    ) -> torch.Tensor:
        """
        Forward pass
        
        Args:
            skill_ids: [batch_size] - Skill indices
            context: [batch_size, num_context_features] - Context features
            learner_state: [batch_size, 5] - Optional learner state features
            return_all_outputs: Whether to return all output heads
        
        Returns:
            If return_all_outputs=False: correctness probability [batch_size, 1]
            If return_all_outputs=True: (correctness, mastery, difficulty_adj)
        """
        batch_size = skill_ids.shape[0]
        
        # Get skill embeddings
        skill_emb = self.skill_embedding(skill_ids)  # [batch, embedding_dim]
        
        # Process context
        context_emb = self.context_layer(context)  # [batch, embedding_dim//2]
        
        # Process learner state if provided
        if learner_state is not None:
            state_emb = self.learner_state_layer(learner_state)  # [batch, embedding_dim//2]
        else:
            state_emb = torch.zeros(batch_size, self.embedding_dim // 2, device=skill_ids.device)
        
        # Combine context and state
        combined_context = torch.cat([context_emb, state_emb], dim=-1)  # [batch, embedding_dim]
        
        # Apply attention between skill and context
        skill_emb_expanded = skill_emb.unsqueeze(1)  # [batch, 1, embedding_dim]
        context_expanded = combined_context.unsqueeze(1)  # [batch, 1, embedding_dim]
        
        attended, _ = self.attention(
            skill_emb_expanded, 
            context_expanded, 
            context_expanded
        )
        attended = attended.squeeze(1)  # [batch, embedding_dim]
        
        # Concatenate for final processing
        x = torch.cat([skill_emb, attended], dim=-1)  # [batch, embedding_dim * 2]
        
        # Pass through MLP
        features = self.network(x)
        
        # Compute outputs
        correctness = self.correctness_head(features)
        
        if return_all_outputs:
            mastery = self.mastery_head(features)
            difficulty_adj = self.difficulty_head(features)
            return correctness, mastery, difficulty_adj
        
        return correctness
    
    def get_skill_embeddings(self) -> torch.Tensor:
        """Get all skill embeddings for analysis"""
        return self.skill_embedding.weight.detach()
    
    def find_similar_skills(self, skill_id: int, top_k: int = 5) -> List[Tuple[int, float]]:
        """Find skills similar to given skill based on embedding distance"""
        embeddings = self.get_skill_embeddings()
        query_emb = embeddings[skill_id]
        
        # Compute cosine similarity
        similarities = torch.nn.functional.cosine_similarity(
            query_emb.unsqueeze(0), 
            embeddings, 
            dim=1
        )
        
        # Get top-k (excluding self)
        similarities[skill_id] = -1  # Exclude self
        top_indices = torch.topk(similarities, top_k).indices.tolist()
        top_scores = torch.topk(similarities, top_k).values.tolist()
        
        return list(zip(top_indices, top_scores))


class PersonalizedBrainCloner:
    """
    Clones base brain model and personalizes for individual learners
    using federated learning approach
    
    Key Features:
    1. Model Cloning - Deep copy of base model for personalization
    2. Profile-Based Initialization - Adjust initial weights based on learner profile
    3. Local Fine-Tuning - Train on individual learner's data
    4. Federated Aggregation - Aggregate improvements while preserving privacy
    """
    
    def __init__(
        self,
        base_model_path: Optional[str] = None,
        num_skills: int = 1000,
        embedding_dim: int = 64,
        hidden_dim: int = 128,
        device: str = "cpu"
    ):
        self.device = torch.device(device)
        self.num_skills = num_skills
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        
        # Load or create base model
        if base_model_path and Path(base_model_path).exists():
            self.base_model = self._load_base_model(base_model_path)
        else:
            self.base_model = BaseBrainModel(
                num_skills=num_skills,
                embedding_dim=embedding_dim,
                hidden_dim=hidden_dim,
            )
        
        self.base_model.to(self.device)
        self.base_model.eval()
        
        # Cache for learner models
        self.learner_models: Dict[str, nn.Module] = {}
        self.learner_profiles: Dict[str, LearnerProfile] = {}
        self.training_history: Dict[str, List[Dict]] = {}
        
        # Random generator for reproducibility
        self._rng = np.random.default_rng(seed=42)
        
        logger.info(f"Initialized PersonalizedBrainCloner with {num_skills} skills")
    
    def _load_base_model(self, model_path: str) -> nn.Module:
        """Load pre-trained base model"""
        checkpoint = torch.load(model_path, map_location=self.device)
        
        model = BaseBrainModel(
            num_skills=checkpoint.get('num_skills', self.num_skills),
            embedding_dim=checkpoint.get('embedding_dim', self.embedding_dim),
            hidden_dim=checkpoint.get('hidden_dim', self.hidden_dim),
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()  # Set model to evaluation mode
        logger.info(f"Loaded base model from {model_path}")
        return model
    
    def clone_for_learner(
        self,
        learner_profile: LearnerProfile,
        personalization_strength: float = 0.3
    ) -> nn.Module:
        """
        Clone base model for a specific learner
        
        Args:
            learner_profile: Learner characteristics
            personalization_strength: How much to diverge from base (0-1)
        
        Returns:
            Personalized model instance
        """
        learner_id = learner_profile.learner_id
        
        # Check cache
        if learner_id in self.learner_models:
            logger.debug(f"Returning cached model for learner {learner_id}")
            return self.learner_models[learner_id]
        
        # Deep copy base model
        learner_model = copy.deepcopy(self.base_model)
        learner_model.to(self.device)
        
        # Apply learner-specific weight initialization
        self._personalize_weights(learner_model, learner_profile, personalization_strength)
        
        # Cache model and profile
        self.learner_models[learner_id] = learner_model
        self.learner_profiles[learner_id] = learner_profile
        self.training_history[learner_id] = []
        
        logger.info(f"Created personalized model for learner {learner_id}")
        return learner_model
    
    def _personalize_weights(
        self,
        model: nn.Module,
        profile: LearnerProfile,
        strength: float
    ):
        """
        Adjust model weights based on learner profile
        
        Personalization strategies:
        1. Boost embeddings for known strength skills
        2. Add exploration noise for challenge areas
        3. Adjust output bias based on learning pace
        4. Scale attention based on attention span
        """
        with torch.no_grad():
            # Get skill embeddings
            skill_emb = model.skill_embedding.weight
            
            # Boost embeddings for strength skills
            for skill_id in profile.strengths[:20]:
                idx = self._parse_skill_id(skill_id)
                if 0 <= idx < self.num_skills:
                    # Increase magnitude slightly
                    skill_emb[idx] *= (1 + strength * 0.2)
            
            # Add exploration noise for challenge areas
            for skill_id in profile.challenges[:20]:
                idx = self._parse_skill_id(skill_id)
                if 0 <= idx < self.num_skills:
                    noise = torch.randn_like(skill_emb[idx]) * strength * 0.1
                    skill_emb[idx] += noise
            
            # Adjust based on learning pace
            pace_factor = profile.learning_pace
            if hasattr(model, 'correctness_head'):
                # Adjust final layer bias based on pace
                for layer in model.correctness_head:
                    if isinstance(layer, nn.Linear) and layer.bias is not None:
                        layer.bias.data *= (0.8 + 0.4 * pace_factor)
            
            # Adjust attention based on cognitive load capacity
            if hasattr(model, 'attention'):
                # Scale attention weights
                for param in model.attention.parameters():
                    param.data *= (0.9 + 0.2 * profile.cognitive_load_capacity)
    
    def _parse_skill_id(self, skill_id: str) -> int:
        """Parse skill ID string to integer index"""
        try:
            if isinstance(skill_id, int):
                return skill_id
            if '_' in skill_id:
                return int(skill_id.split('_')[-1])
            return int(skill_id)
        except (ValueError, IndexError):
            return 0
    
    def fine_tune(
        self,
        learner_id: str,
        interactions: List[InteractionHistory],
        num_epochs: int = 5,
        learning_rate: float = 0.001,
        min_interactions: int = 10,
        early_stopping_patience: int = 3,
        validation_split: float = 0.2
    ) -> Dict[str, Any]:
        """
        Fine-tune learner model on their interaction history
        
        Args:
            learner_id: Learner identifier
            interactions: Learning interaction history
            num_epochs: Training epochs
            learning_rate: Learning rate for fine-tuning
            min_interactions: Minimum interactions required
            early_stopping_patience: Stop if no improvement for N epochs
            validation_split: Fraction of data for validation
        
        Returns:
            Training metrics dictionary
        """
        if len(interactions) < min_interactions:
            return {
                "status": "insufficient_data", 
                "samples": len(interactions),
                "required": min_interactions
            }
        
        # Get learner model
        model = self.learner_models.get(learner_id)
        if model is None:
            raise ValueError(f"Model not found for learner: {learner_id}. Call clone_for_learner first.")
        
        # Prepare training data
        x_skills, x_context, x_state, y = self._prepare_training_data(
            interactions, 
            self.learner_profiles.get(learner_id)
        )
        
        # Split into train/validation
        n_val = int(len(interactions) * validation_split)
        if n_val < 1:
            n_val = 1
        
        indices = torch.randperm(len(interactions))
        train_indices = indices[n_val:]
        val_indices = indices[:n_val]
        
        # Training setup
        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)
        criterion = nn.BCELoss()
        
        # Training loop with early stopping
        train_losses = []
        val_losses = []
        best_val_loss = float('inf')
        patience_counter = 0
        best_state = None
        
        for epoch in range(num_epochs):
            # Training step
            model.train()
            optimizer.zero_grad()
            
            train_skills = x_skills[train_indices]
            train_context = x_context[train_indices]
            train_state = x_state[train_indices] if x_state is not None else None
            train_labels = y[train_indices]
            
            predictions = model(train_skills, train_context, train_state).squeeze()
            train_loss = criterion(predictions, train_labels)
            
            train_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()
            
            train_losses.append(train_loss.item())
            
            # Validation step
            model.eval()
            with torch.no_grad():
                val_skills = x_skills[val_indices]
                val_context = x_context[val_indices]
                val_state = x_state[val_indices] if x_state is not None else None
                val_labels = y[val_indices]
                
                val_predictions = model(val_skills, val_context, val_state).squeeze()
                val_loss = criterion(val_predictions, val_labels)
                val_losses.append(val_loss.item())
            
            # Early stopping check
            if val_loss.item() < best_val_loss:
                best_val_loss = val_loss.item()
                best_state = copy.deepcopy(model.state_dict())
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    logger.info(f"Early stopping at epoch {epoch + 1}")
                    break
        
        # Restore best model
        if best_state is not None:
            model.load_state_dict(best_state)
        
        model.eval()
        
        # Calculate accuracy
        with torch.no_grad():
            all_predictions = model(x_skills, x_context, x_state).squeeze()
            accuracy = ((all_predictions > 0.5) == (y > 0.5)).float().mean().item()
        
        # Record training history
        training_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "num_samples": len(interactions),
            "num_epochs": len(train_losses),
            "final_train_loss": train_losses[-1],
            "final_val_loss": val_losses[-1] if val_losses else None,
            "best_val_loss": best_val_loss,
            "accuracy": accuracy,
        }
        self.training_history[learner_id].append(training_record)
        
        logger.info(
            f"Fine-tuned model for {learner_id}: "
            f"accuracy={accuracy:.3f}, val_loss={best_val_loss:.4f}"
        )
        
        return {
            "status": "success",
            "samples": len(interactions),
            "epochs_trained": len(train_losses),
            "train_losses": train_losses,
            "val_losses": val_losses,
            "best_val_loss": best_val_loss,
            "final_accuracy": accuracy,
        }
    
    def _prepare_training_data(
        self,
        interactions: List[InteractionHistory],
        profile: Optional[LearnerProfile] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, Optional[torch.Tensor], torch.Tensor]:
        """Convert interaction history to training tensors"""
        
        skill_ids = []
        contexts = []
        labels = []
        
        for interaction in interactions:
            # Extract skill ID number
            skill_num = self._parse_skill_id(interaction.skill_id)
            skill_ids.append(min(skill_num, self.num_skills - 1))
            
            # Context features (8 features)
            context = [
                min(interaction.response_time_ms / 30000.0, 2.0),  # Normalized response time
                interaction.hints_used / 5.0,  # Normalized hints
                interaction.attempts / 5.0,  # Normalized attempts
                interaction.difficulty,  # Already 0-1
                interaction.engagement_score,  # Already 0-1
                interaction.scaffolding_level / 3.0,  # Normalized scaffolding
                1.0 if interaction.correct else 0.0,  # Previous correctness signal
                self._rng.random() * 0.1,  # Small noise for regularization
            ]
            contexts.append(context)
            labels.append(1.0 if interaction.correct else 0.0)
        
        # Learner state features
        learner_state = None
        if profile is not None:
            state = [
                profile.learning_pace,
                profile.attention_span_minutes / 60.0,
                profile.cognitive_load_capacity,
                profile.preferred_difficulty,
                len(profile.iep_accommodations) / 10.0,
            ]
            learner_state = torch.tensor(
                [state] * len(interactions), 
                dtype=torch.float32
            ).to(self.device)
        
        return (
            torch.tensor(skill_ids, dtype=torch.long).to(self.device),
            torch.tensor(contexts, dtype=torch.float32).to(self.device),
            learner_state,
            torch.tensor(labels, dtype=torch.float32).to(self.device)
        )
    
    def predict_mastery(
        self,
        learner_id: str,
        skill_id: str,
        context: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Predict mastery and performance for a skill
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to predict
            context: Optional current learning context
        
        Returns:
            Dictionary with correctness probability, mastery estimate, and difficulty adjustment
        """
        model = self.learner_models.get(learner_id, self.base_model)
        profile = self.learner_profiles.get(learner_id)
        
        model.eval()
        
        skill_num = self._parse_skill_id(skill_id)
        skill_tensor = torch.tensor([skill_num], dtype=torch.long).to(self.device)
        
        # Default context if not provided
        if context is None:
            context = {}
        
        context_features = [
            context.get('response_time_ms', 5000) / 30000.0,
            context.get('hints_used', 0) / 5.0,
            context.get('attempts', 1) / 5.0,
            context.get('difficulty', 0.5),
            context.get('engagement', 1.0),
            context.get('scaffolding', 0) / 3.0,
            context.get('last_correct', 0.5),
            0.0,
        ]
        context_tensor = torch.tensor([context_features], dtype=torch.float32).to(self.device)
        
        # Learner state
        learner_state = None
        if profile is not None:
            state = [
                profile.learning_pace,
                profile.attention_span_minutes / 60.0,
                profile.cognitive_load_capacity,
                profile.preferred_difficulty,
                len(profile.iep_accommodations) / 10.0,
            ]
            learner_state = torch.tensor([state], dtype=torch.float32).to(self.device)
        
        with torch.no_grad():
            correctness, mastery, difficulty_adj = model(
                skill_tensor, 
                context_tensor, 
                learner_state,
                return_all_outputs=True
            )
        
        return {
            "correctness_probability": correctness.item(),
            "mastery_estimate": mastery.item(),
            "difficulty_adjustment": difficulty_adj.item(),
            "recommended_difficulty": max(0, min(1, 
                context.get('difficulty', 0.5) + difficulty_adj.item() * 0.2
            )),
        }
    
    def get_learning_trajectory(
        self,
        learner_id: str,
        skill_ids: List[str]
    ) -> Dict[str, List[float]]:
        """
        Predict mastery trajectory across multiple skills
        
        Args:
            learner_id: Learner identifier
            skill_ids: Skills to analyze
            
        Returns:
            Dictionary mapping skills to predicted mastery progressions
        """
        trajectories = {}
        
        for skill_id in skill_ids:
            predictions = []
            for difficulty in [0.3, 0.5, 0.7, 0.9]:
                pred = self.predict_mastery(
                    learner_id, 
                    skill_id,
                    context={"difficulty": difficulty}
                )
                predictions.append(pred["mastery_estimate"])
            trajectories[skill_id] = predictions
        
        return trajectories
    
    def save_learner_model(self, learner_id: str, save_path: str) -> None:
        """Save personalized model to disk"""
        model = self.learner_models.get(learner_id)
        if model is None:
            raise ValueError(f"Model not found for learner: {learner_id}")
        
        profile = self.learner_profiles.get(learner_id)
        history = self.training_history.get(learner_id, [])
        
        save_data = {
            'model_state_dict': model.state_dict(),
            'learner_id': learner_id,
            'num_skills': self.num_skills,
            'embedding_dim': self.embedding_dim,
            'hidden_dim': self.hidden_dim,
            'profile': profile.to_dict() if profile else None,
            'training_history': history,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        
        torch.save(save_data, save_path)
        logger.info(f"Saved model for learner {learner_id} to {save_path}")
    
    def load_learner_model(self, learner_id: str, load_path: str) -> nn.Module:
        """Load personalized model from disk"""
        checkpoint = torch.load(load_path, map_location=self.device)
        
        model = BaseBrainModel(
            num_skills=checkpoint.get('num_skills', self.num_skills),
            embedding_dim=checkpoint.get('embedding_dim', self.embedding_dim),
            hidden_dim=checkpoint.get('hidden_dim', self.hidden_dim),
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model.to(self.device)
        model.eval()
        
        self.learner_models[learner_id] = model
        
        if checkpoint.get('profile'):
            self.learner_profiles[learner_id] = LearnerProfile.from_dict(checkpoint['profile'])
        
        self.training_history[learner_id] = checkpoint.get('training_history', [])
        
        logger.info(f"Loaded model for learner {learner_id} from {load_path}")
        return model
    
    def aggregate_updates(
        self,
        learner_ids: List[str],
        aggregation_weight: float = 0.1,
        min_samples_required: int = 50
    ) -> Dict[str, Any]:
        """
        Federated Learning: Aggregate learner model updates back to base
        
        This preserves privacy by only sharing model weights, not raw data.
        
        Args:
            learner_ids: Learners to aggregate from
            aggregation_weight: Weight for aggregated updates (0-1)
            min_samples_required: Minimum training samples required for inclusion
        
        Returns:
            Aggregation statistics
        """
        if not learner_ids:
            return {"status": "no_learners", "aggregated": 0}
        
        # Filter to learners with sufficient training data
        eligible_learners = []
        for learner_id in learner_ids:
            history = self.training_history.get(learner_id, [])
            total_samples = sum(h.get('num_samples', 0) for h in history)
            if total_samples >= min_samples_required:
                eligible_learners.append(learner_id)
        
        if not eligible_learners:
            return {
                "status": "insufficient_data",
                "learners_checked": len(learner_ids),
                "eligible": 0,
                "required_samples": min_samples_required
            }
        
        # Collect and aggregate parameters
        aggregated_updates = 0
        with torch.no_grad():
            for name, base_param in self.base_model.named_parameters():
                # Collect parameters from eligible learners
                learner_params = []
                learner_weights = []
                
                for learner_id in eligible_learners:
                    model = self.learner_models.get(learner_id)
                    if model:
                        learner_param = dict(model.named_parameters())[name]
                        learner_params.append(learner_param.data.clone())
                        
                        # Weight by training samples
                        history = self.training_history.get(learner_id, [])
                        weight = sum(h.get('num_samples', 0) for h in history)
                        learner_weights.append(weight)
                
                if learner_params:
                    # Weighted average of learner parameters
                    total_weight = sum(learner_weights)
                    if total_weight > 0:
                        weighted_sum = torch.zeros_like(base_param.data)
                        for param, weight in zip(learner_params, learner_weights):
                            weighted_sum += param * (weight / total_weight)
                        
                        # Apply weighted update to base model
                        base_param.data = (
                            (1 - aggregation_weight) * base_param.data +
                            aggregation_weight * weighted_sum
                        )
                        aggregated_updates += 1
        
        logger.info(
            f"Aggregated updates from {len(eligible_learners)} learners "
            f"({aggregated_updates} parameter groups)"
        )
        
        return {
            "status": "success",
            "learners_aggregated": len(eligible_learners),
            "parameter_groups_updated": aggregated_updates,
            "aggregation_weight": aggregation_weight,
        }
    
    def save_base_model(self, save_path: str) -> None:
        """Save updated base model"""
        save_data = {
            'model_state_dict': self.base_model.state_dict(),
            'num_skills': self.num_skills,
            'embedding_dim': self.embedding_dim,
            'hidden_dim': self.hidden_dim,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        torch.save(save_data, save_path)
        logger.info(f"Saved base model to {save_path}")
    
    def get_model_stats(self, learner_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about model(s)"""
        if learner_id:
            model = self.learner_models.get(learner_id)
            if model is None:
                return {"error": f"Model not found for {learner_id}"}
            
            total_params = sum(p.numel() for p in model.parameters())
            trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
            
            return {
                "learner_id": learner_id,
                "total_parameters": total_params,
                "trainable_parameters": trainable_params,
                "training_history": self.training_history.get(learner_id, []),
                "profile": self.learner_profiles.get(learner_id).to_dict() 
                    if self.learner_profiles.get(learner_id) else None,
            }
        else:
            # Base model stats
            total_params = sum(p.numel() for p in self.base_model.parameters())
            return {
                "base_model_parameters": total_params,
                "num_learner_models": len(self.learner_models),
                "learner_ids": list(self.learner_models.keys()),
            }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Initialize cloner
    cloner = PersonalizedBrainCloner(
        num_skills=500,
        embedding_dim=64,
        hidden_dim=128,
        device="cpu"
    )
    
    # Create learner profile
    profile = LearnerProfile(
        learner_id="student_456",
        grade_level=3,
        learning_pace=0.8,
        preferred_modality="visual",
        attention_span_minutes=12,
        iep_accommodations=["extended_time", "visual_supports"],
        strengths=["skill_10", "skill_15", "skill_20"],
        challenges=["skill_50", "skill_55"],
    )
    
    # Clone model for learner
    learner_model = cloner.clone_for_learner(profile, personalization_strength=0.3)
    print(f"Created personalized model with {sum(p.numel() for p in learner_model.parameters())} parameters")
    
    # Generate some interaction history
    rng = np.random.default_rng(seed=42)
    interactions = []
    for _ in range(50):
        interactions.append(InteractionHistory(
            skill_id=f"skill_{rng.integers(0, 100)}",
            correct=rng.random() > 0.4,
            response_time_ms=int(rng.exponential(5000)),
            hints_used=rng.integers(0, 3),
            difficulty=rng.random(),
        ))
    
    # Fine-tune on interactions
    results = cloner.fine_tune(
        learner_id="student_456",
        interactions=interactions,
        num_epochs=10,
        learning_rate=0.001,
    )
    print(f"\nFine-tuning results: {json.dumps(results, indent=2)}")
    
    # Predict mastery
    prediction = cloner.predict_mastery(
        learner_id="student_456",
        skill_id="skill_25",
        context={"difficulty": 0.5, "hints_used": 1}
    )
    print(f"\nMastery prediction: {json.dumps(prediction, indent=2)}")
    
    # Get model stats
    stats = cloner.get_model_stats("student_456")
    print(f"\nModel stats: {json.dumps(stats, indent=2, default=str)}")
