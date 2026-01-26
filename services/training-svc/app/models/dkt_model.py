"""
Deep Knowledge Tracing (DKT)
Neural network approach to knowledge tracing using LSTM
Based on Piech et al. (2015) "Deep Knowledge Tracing"

Advantages over BKT:
- Learns patterns from data (no manual parameter tuning)
- Handles multiple skills simultaneously
- Captures temporal dependencies better
- Can incorporate additional context features
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@dataclass
class DKTInteraction:
    """Single learning interaction for DKT"""
    skill_id: int  # Numeric skill ID
    correct: bool
    timestamp: datetime = field(default_factory=datetime.utcnow)
    response_time_ms: Optional[int] = None
    hints_used: Optional[int] = None
    
    def to_dict(self) -> Dict:
        return {
            "skill_id": self.skill_id,
            "correct": self.correct,
            "timestamp": self.timestamp.isoformat(),
            "response_time_ms": self.response_time_ms,
            "hints_used": self.hints_used,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "DKTInteraction":
        return cls(
            skill_id=data["skill_id"],
            correct=data["correct"],
            timestamp=datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now(timezone.utc),
            response_time_ms=data.get("response_time_ms"),
            hints_used=data.get("hints_used"),
        )


@dataclass
class DKTSequence:
    """Sequence of interactions for one learner"""
    learner_id: str
    interactions: List[DKTInteraction]
    
    def to_dict(self) -> Dict:
        return {
            "learner_id": self.learner_id,
            "interactions": [i.to_dict() for i in self.interactions],
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "DKTSequence":
        return cls(
            learner_id=data["learner_id"],
            interactions=[DKTInteraction.from_dict(i) for i in data["interactions"]],
        )


class DKTDataset(Dataset):
    """
    PyTorch Dataset for DKT training
    
    Each sample is a sequence of (skill, correct) pairs
    """
    
    def __init__(
        self,
        sequences: List[DKTSequence],
        num_skills: int,
        max_seq_length: int = 200
    ):
        self.sequences = sequences
        self.num_skills = num_skills
        self.max_seq_length = max_seq_length
    
    def __len__(self) -> int:
        return len(self.sequences)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Returns:
            inputs: [seq_len, num_skills*2] - one-hot encoded (skill, correctness)
            targets: [seq_len, num_skills] - next skill mastery predictions
            mask: [seq_len] - padding mask
        """
        sequence = self.sequences[idx]
        seq_len = min(len(sequence.interactions), self.max_seq_length)
        
        # Initialize tensors
        inputs = torch.zeros(self.max_seq_length, self.num_skills * 2)
        targets = torch.zeros(self.max_seq_length, self.num_skills)
        mask = torch.zeros(self.max_seq_length)
        
        # Fill tensors
        for i in range(seq_len):
            interaction = sequence.interactions[i]
            skill_idx = interaction.skill_id % self.num_skills  # Ensure within bounds
            
            # Input encoding: one-hot for skill + correctness
            # First num_skills positions: skill one-hot (incorrect)
            # Next num_skills positions: skill one-hot (correct)
            if interaction.correct:
                inputs[i, skill_idx + self.num_skills] = 1  # Correct
            else:
                inputs[i, skill_idx] = 1  # Incorrect
            
            # Target: next interaction's correctness
            if i < seq_len - 1:
                next_interaction = sequence.interactions[i + 1]
                next_skill_idx = next_interaction.skill_id % self.num_skills
                targets[i, next_skill_idx] = float(next_interaction.correct)
            
            mask[i] = 1  # Valid position
        
        return inputs, targets, mask


class DKTModel(nn.Module):
    """
    Deep Knowledge Tracing LSTM Model
    
    Architecture:
    - Input: One-hot encoding of (skill, correctness)
    - LSTM: Captures temporal dependencies
    - Output: Probability of correctness for each skill
    """
    
    def __init__(
        self,
        num_skills: int,
        hidden_dim: int = 200,
        num_layers: int = 1,
        dropout: float = 0.2
    ):
        super().__init__()
        
        self.num_skills = num_skills
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Input dimension: num_skills * 2 (skill one-hot + correctness)
        input_dim = num_skills * 2
        
        # LSTM layer
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Output layer: predict probability for each skill
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_skills),
            nn.Sigmoid()  # Probability output
        )
    
    def forward(
        self,
        inputs: torch.Tensor,
        hidden: Optional[Tuple[torch.Tensor, torch.Tensor]] = None
    ) -> Tuple[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Forward pass
        
        Args:
            inputs: [batch_size, seq_len, num_skills*2]
            hidden: Optional LSTM hidden state
        
        Returns:
            predictions: [batch_size, seq_len, num_skills]
            hidden: Updated LSTM hidden state
        """
        # LSTM forward
        lstm_out, hidden = self.lstm(inputs, hidden)
        
        # Predict skill mastery
        predictions = self.fc(lstm_out)
        
        return predictions, hidden
    
    def init_hidden(self, batch_size: int, device: torch.device) -> Tuple[torch.Tensor, torch.Tensor]:
        """Initialize hidden state"""
        h0 = torch.zeros(self.num_layers, batch_size, self.hidden_dim).to(device)
        c0 = torch.zeros(self.num_layers, batch_size, self.hidden_dim).to(device)
        return (h0, c0)


class DeepKnowledgeTracing:
    """
    Deep Knowledge Tracing system for skill mastery prediction
    
    Usage:
        dkt = DeepKnowledgeTracing(num_skills=100)
        dkt.train(training_sequences)
        mastery = dkt.predict(learner_id, skill_id, history)
    """
    
    def __init__(
        self,
        num_skills: int,
        hidden_dim: int = 200,
        num_layers: int = 1,
        dropout: float = 0.2,
        device: str = "cpu"
    ):
        self.num_skills = num_skills
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.dropout = dropout
        self.device = torch.device(device)
        
        # Initialize model
        self.model = DKTModel(
            num_skills=num_skills,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout
        ).to(self.device)
        
        self.is_trained = False
        
        # Cache for learner states (hidden states for online prediction)
        self.learner_states: Dict[str, Tuple[torch.Tensor, torch.Tensor]] = {}
        
        # Cache for learner histories
        self.learner_histories: Dict[str, List[DKTInteraction]] = {}
        
        # Training metrics
        self.training_history: Dict[str, List[float]] = {}
    
    def train(
        self,
        sequences: List[DKTSequence],
        num_epochs: int = 20,
        batch_size: int = 32,
        learning_rate: float = 0.001,
        validation_split: float = 0.2,
        early_stopping_patience: int = 5
    ) -> Dict[str, List[float]]:
        """
        Train DKT model on learner sequences
        
        Args:
            sequences: List of learner interaction sequences
            num_epochs: Training epochs
            batch_size: Batch size
            learning_rate: Learning rate
            validation_split: Fraction for validation
            early_stopping_patience: Epochs to wait before early stopping
        
        Returns:
            Training history with losses and AUC
        """
        if len(sequences) < 2:
            logger.warning("Not enough sequences for training")
            return {'train_loss': [], 'val_loss': [], 'val_auc': []}
        
        # Shuffle and split data
        rng = np.random.default_rng(seed=42)
        rng.shuffle(sequences)
        split_idx = max(1, int(len(sequences) * (1 - validation_split)))
        train_sequences = sequences[:split_idx]
        val_sequences = sequences[split_idx:]
        
        # Create datasets
        train_dataset = DKTDataset(train_sequences, self.num_skills)
        val_dataset = DKTDataset(val_sequences, self.num_skills)
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=batch_size,
            shuffle=True,
            drop_last=False,
            num_workers=0
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=batch_size,
            shuffle=False,
            drop_last=False,
            num_workers=0
        )
        
        # Optimizer and loss
        optimizer = optim.Adam(self.model.parameters(), lr=learning_rate, weight_decay=1e-5)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3, factor=0.5)
        criterion = nn.BCELoss(reduction='none')
        
        # Training history
        history = {
            'train_loss': [],
            'val_loss': [],
            'val_auc': []
        }
        
        best_val_loss = float('inf')
        patience_counter = 0
        
        # Training loop
        for epoch in range(num_epochs):
            # Training phase
            self.model.train()
            train_losses = []
            
            for inputs, targets, mask in train_loader:
                inputs = inputs.to(self.device)
                targets = targets.to(self.device)
                mask = mask.to(self.device)
                
                # Forward pass
                predictions, _ = self.model(inputs)
                
                # Compute loss (only on valid positions)
                loss = criterion(predictions, targets)
                mask_expanded = mask.unsqueeze(-1).expand_as(loss)
                loss = (loss * mask_expanded).sum() / mask_expanded.sum().clamp(min=1)
                
                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                
                train_losses.append(loss.item())
            
            # Validation phase
            self.model.eval()
            val_losses = []
            all_preds = []
            all_targets = []
            
            with torch.no_grad():
                for inputs, targets, mask in val_loader:
                    inputs = inputs.to(self.device)
                    targets = targets.to(self.device)
                    mask = mask.to(self.device)
                    
                    predictions, _ = self.model(inputs)
                    
                    loss = criterion(predictions, targets)
                    mask_expanded = mask.unsqueeze(-1).expand_as(loss)
                    loss = (loss * mask_expanded).sum() / mask_expanded.sum().clamp(min=1)
                    val_losses.append(loss.item())
                    
                    # Collect predictions for AUC
                    for b in range(predictions.size(0)):
                        for t in range(int(mask[b].sum().item())):
                            all_preds.extend(predictions[b, t].cpu().numpy())
                            all_targets.extend(targets[b, t].cpu().numpy())
            
            # Calculate AUC
            try:
                from sklearn.metrics import roc_auc_score
                all_preds_np = np.array(all_preds)
                all_targets_np = np.array(all_targets)
                # Filter out invalid values
                valid_mask = (all_targets_np == 0) | (all_targets_np == 1)
                if valid_mask.sum() > 0:
                    auc = roc_auc_score(all_targets_np[valid_mask], all_preds_np[valid_mask])
                else:
                    auc = 0.5
            except Exception:
                auc = 0.5
            
            # Record history
            avg_train_loss = np.mean(train_losses) if train_losses else 0
            avg_val_loss = np.mean(val_losses) if val_losses else 0
            
            history['train_loss'].append(avg_train_loss)
            history['val_loss'].append(avg_val_loss)
            history['val_auc'].append(auc)
            
            # Learning rate scheduling
            scheduler.step(avg_val_loss)
            
            # Early stopping check
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    logger.info(f"Early stopping at epoch {epoch + 1}")
                    break
            
            if (epoch + 1) % 5 == 0:
                logger.info(f"Epoch {epoch+1}/{num_epochs}")
                logger.info(f"  Train Loss: {avg_train_loss:.4f}")
                logger.info(f"  Val Loss: {avg_val_loss:.4f}")
                logger.info(f"  Val AUC: {auc:.4f}")
        
        self.is_trained = True
        self.training_history = history
        return history
    
    def predict(
        self,
        learner_id: str,
        skill_id: int,
        history: Optional[List[DKTInteraction]] = None
    ) -> float:
        """
        Predict mastery probability for a skill given history
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to predict (numeric)
            history: Optional interaction history (if None, uses cached history)
        
        Returns:
            Probability of correctness (0-1)
        """
        if not self.is_trained:
            return 0.5  # Default if not trained
        
        # Use provided history or cached history
        if history is None:
            history = self.learner_histories.get(learner_id, [])
        
        if len(history) == 0:
            return 0.5  # No history to base prediction on
        
        self.model.eval()
        
        # Encode history
        seq_len = min(len(history), 200)
        inputs = torch.zeros(1, seq_len, self.num_skills * 2).to(self.device)
        
        for i in range(seq_len):
            interaction = history[-(seq_len - i)]  # Most recent interactions
            skill_idx = interaction.skill_id % self.num_skills
            
            if interaction.correct:
                inputs[0, i, skill_idx + self.num_skills] = 1
            else:
                inputs[0, i, skill_idx] = 1
        
        # Forward pass
        with torch.no_grad():
            predictions, hidden = self.model(inputs)
        
        # Cache hidden state for learner
        self.learner_states[learner_id] = (
            hidden[0].detach(),
            hidden[1].detach()
        )
        
        # Get prediction for target skill
        skill_idx = skill_id % self.num_skills
        prob = predictions[0, -1, skill_idx].item()
        
        return prob
    
    def update(
        self,
        learner_id: str,
        interaction: DKTInteraction
    ) -> float:
        """
        Update model with new interaction and return prediction
        
        This maintains learner history for online prediction
        """
        # Add to learner history
        if learner_id not in self.learner_histories:
            self.learner_histories[learner_id] = []
        
        self.learner_histories[learner_id].append(interaction)
        
        # Keep only recent history (max 500 interactions)
        if len(self.learner_histories[learner_id]) > 500:
            self.learner_histories[learner_id] = self.learner_histories[learner_id][-500:]
        
        # Make prediction using updated history
        prob = self.predict(learner_id, interaction.skill_id)
        
        return prob
    
    def predict_all_skills(
        self,
        learner_id: str,
        history: Optional[List[DKTInteraction]] = None
    ) -> Dict[int, float]:
        """
        Predict mastery for all skills
        
        Returns:
            Dictionary of skill_id -> probability
        """
        if not self.is_trained:
            return dict.fromkeys(range(self.num_skills), 0.5)
        
        if history is None:
            history = self.learner_histories.get(learner_id, [])
        
        if len(history) == 0:
            return dict.fromkeys(range(self.num_skills), 0.5)
        
        self.model.eval()
        
        # Encode history
        seq_len = min(len(history), 200)
        inputs = torch.zeros(1, seq_len, self.num_skills * 2).to(self.device)
        
        for i in range(seq_len):
            interaction = history[-(seq_len - i)]
            skill_idx = interaction.skill_id % self.num_skills
            
            if interaction.correct:
                inputs[0, i, skill_idx + self.num_skills] = 1
            else:
                inputs[0, i, skill_idx] = 1
        
        with torch.no_grad():
            predictions, _ = self.model(inputs)
        
        # Get predictions for all skills
        probs = predictions[0, -1].cpu().numpy()
        
        return {i: float(probs[i]) for i in range(self.num_skills)}
    
    def get_stats(self) -> Dict:
        """Get model statistics"""
        return {
            "num_skills": self.num_skills,
            "hidden_dim": self.hidden_dim,
            "num_layers": self.num_layers,
            "is_trained": self.is_trained,
            "learners_tracked": len(self.learner_histories),
            "total_interactions": sum(len(h) for h in self.learner_histories.values()),
            "training_history": self.training_history,
        }
    
    def save_model(self, filepath: str):
        """Save trained model"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'num_skills': self.num_skills,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers,
            'dropout': self.dropout,
            'is_trained': self.is_trained,
            'training_history': self.training_history,
        }, filepath)
        logger.info(f"DKT model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model"""
        checkpoint = torch.load(filepath, map_location=self.device)
        
        # Reinitialize model if architecture changed
        if checkpoint['num_skills'] != self.num_skills:
            self.num_skills = checkpoint['num_skills']
            self.model = DKTModel(
                num_skills=checkpoint['num_skills'],
                hidden_dim=checkpoint['hidden_dim'],
                num_layers=checkpoint['num_layers'],
                dropout=checkpoint['dropout']
            ).to(self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.is_trained = checkpoint['is_trained']
        self.training_history = checkpoint.get('training_history', {})
        logger.info(f"DKT model loaded from {filepath}")
    
    def clear_learner_cache(self, learner_id: str = None):
        """Clear cached learner states and histories"""
        if learner_id:
            self.learner_states.pop(learner_id, None)
            self.learner_histories.pop(learner_id, None)
        else:
            self.learner_states.clear()
            self.learner_histories.clear()
