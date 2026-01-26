"""
Knowledge Tracing Ensemble
Combines BKT, DKT, and PFA for robust predictions

Uses weighted voting based on:
- Model confidence
- Data availability (interaction count)
- Historical accuracy

Strategy:
- Use BKT for learners with short history (<10 interactions)
- Use PFA for learners with medium history (10-49 interactions)
- Use DKT for learners with long history (50+ interactions)
- Weighted ensemble when multiple models available
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Import model implementations
try:
    from app.models.bkt_model import BayesianKnowledgeTracing
except ImportError:
    BayesianKnowledgeTracing = None
    logger.warning("BKT model not available")

try:
    from app.models.dkt_model import DeepKnowledgeTracing, DKTInteraction
except ImportError:
    DeepKnowledgeTracing = None
    DKTInteraction = None
    logger.warning("DKT model not available")

try:
    from app.models.pfa_model import PerformanceFactorAnalysis
except ImportError:
    PerformanceFactorAnalysis = None
    logger.warning("PFA model not available")


@dataclass
class EnsemblePrediction:
    """Combined prediction from multiple models"""
    skill_id: str
    mastery_probability: float
    confidence: float
    model_votes: Dict[str, float]  # model_name -> probability
    recommended_model: str
    interaction_count: int
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "skill_id": self.skill_id,
            "mastery_probability": self.mastery_probability,
            "confidence": self.confidence,
            "model_votes": self.model_votes,
            "recommended_model": self.recommended_model,
            "interaction_count": self.interaction_count,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class ModelPerformance:
    """Track model performance for dynamic weighting"""
    correct_predictions: int = 0
    total_predictions: int = 0
    cumulative_error: float = 0.0
    
    @property
    def accuracy(self) -> float:
        if self.total_predictions == 0:
            return 0.5
        return self.correct_predictions / self.total_predictions
    
    @property
    def mean_error(self) -> float:
        if self.total_predictions == 0:
            return 0.5
        return self.cumulative_error / self.total_predictions


class KnowledgeTracingEnsemble:
    """
    Ensemble of knowledge tracing models for robust mastery prediction
    
    This ensemble:
    1. Automatically selects the best model based on data availability
    2. Combines predictions using weighted voting
    3. Tracks model performance for adaptive weighting
    4. Provides confidence estimates
    
    Usage:
        ensemble = KnowledgeTracingEnsemble(num_skills=100)
        prediction = ensemble.predict("learner_1", "skill_5")
        ensemble.update("learner_1", "skill_5", correct=True)
    """
    
    # Thresholds for model selection
    BKT_MAX_INTERACTIONS = 10
    PFA_MAX_INTERACTIONS = 50
    
    def __init__(
        self,
        num_skills: int = 1000,
        use_bkt: bool = True,
        use_dkt: bool = True,
        use_pfa: bool = True,
        device: str = "cpu"
    ):
        """
        Initialize ensemble with specified models
        
        Args:
            num_skills: Number of skills (for DKT)
            use_bkt: Include BKT model
            use_dkt: Include DKT model
            use_pfa: Include PFA model
            device: Device for DKT (cpu/cuda)
        """
        self.num_skills = num_skills
        self.models: Dict[str, Any] = {}
        
        # Initialize available models
        if use_bkt and BayesianKnowledgeTracing:
            self.models['bkt'] = BayesianKnowledgeTracing()
            logger.info("BKT model initialized")
        
        if use_dkt and DeepKnowledgeTracing:
            self.models['dkt'] = DeepKnowledgeTracing(
                num_skills=num_skills,
                device=device
            )
            logger.info("DKT model initialized")
        
        if use_pfa and PerformanceFactorAnalysis:
            self.models['pfa'] = PerformanceFactorAnalysis()
            logger.info("PFA model initialized")
        
        # Base weights for models
        self.base_weights = {
            'bkt': 0.3,
            'dkt': 0.4,
            'pfa': 0.3
        }
        
        # Track model performance
        self.model_performance: Dict[str, ModelPerformance] = {
            name: ModelPerformance() for name in self.models
        }
        
        # Track interaction counts per learner
        self.interaction_counts: Dict[str, int] = {}
        
        # Track interaction history per learner (for DKT)
        self.learner_histories: Dict[str, List[Dict]] = {}
        
        # Skill name to ID mapping (for DKT)
        self.skill_to_id: Dict[str, int] = {}
        self.next_skill_id = 0
    
    def _get_skill_id(self, skill_name: str) -> int:
        """Convert skill name to numeric ID for DKT"""
        if skill_name not in self.skill_to_id:
            self.skill_to_id[skill_name] = self.next_skill_id % self.num_skills
            self.next_skill_id += 1
        return self.skill_to_id[skill_name]
    
    def initialize_skill(self, skill_id: str, **kwargs):
        """Initialize skill parameters in all models"""
        if 'bkt' in self.models:
            self.models['bkt'].initialize_skill(skill_id, **kwargs)
        
        if 'pfa' in self.models:
            pfa_kwargs = {k: v for k, v in kwargs.items() 
                         if k in ['beta', 'gamma', 'rho', 'decay']}
            self.models['pfa'].initialize_skill(skill_id, **pfa_kwargs)
        
        # DKT doesn't need explicit skill initialization
        self._get_skill_id(skill_id)
    
    def predict(
        self,
        learner_id: str,
        skill_id: str,
        history: Optional[List[Dict]] = None
    ) -> EnsemblePrediction:
        """
        Get ensemble prediction for mastery probability
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill to predict
            history: Optional interaction history
        
        Returns:
            Ensemble prediction with model breakdown
        """
        predictions = {}
        num_interactions = self.interaction_counts.get(learner_id, 0)
        
        # Use provided history or cached history
        if history is None:
            history = self.learner_histories.get(learner_id, [])
        
        # BKT prediction
        if 'bkt' in self.models:
            try:
                bkt_prob = self.models['bkt'].get_mastery(learner_id, skill_id)
                predictions['bkt'] = bkt_prob
            except Exception as e:
                logger.debug(f"BKT prediction failed: {e}")
        
        # DKT prediction (requires sufficient history)
        if 'dkt' in self.models and len(history) >= 5:
            try:
                skill_num_id = self._get_skill_id(skill_id)
                
                # Convert history to DKTInteraction format
                dkt_history = []
                for h in history[-200:]:  # Use last 200 interactions
                    h_skill_id = self._get_skill_id(h.get('skill_id', skill_id))
                    dkt_history.append(DKTInteraction(
                        skill_id=h_skill_id,
                        correct=h.get('correct', False),
                        timestamp=datetime.fromisoformat(h['timestamp']) if 'timestamp' in h else datetime.utcnow()
                    ))
                
                if dkt_history:
                    dkt_prob = self.models['dkt'].predict(
                        learner_id,
                        skill_num_id,
                        dkt_history
                    )
                    predictions['dkt'] = dkt_prob
            except Exception as e:
                logger.debug(f"DKT prediction failed: {e}")
        
        # PFA prediction
        if 'pfa' in self.models:
            try:
                pfa_prob = self.models['pfa'].predict(learner_id, skill_id)
                predictions['pfa'] = pfa_prob
            except Exception as e:
                logger.debug(f"PFA prediction failed: {e}")
        
        # Handle case with no predictions
        if not predictions:
            return EnsemblePrediction(
                skill_id=skill_id,
                mastery_probability=0.5,
                confidence=0.0,
                model_votes={},
                recommended_model='none',
                interaction_count=num_interactions
            )
        
        # Calculate weighted average
        total_weight = 0.0
        weighted_sum = 0.0
        
        for model_name, prob in predictions.items():
            weight = self._get_dynamic_weight(model_name, num_interactions)
            weighted_sum += weight * prob
            total_weight += weight
        
        ensemble_prob = weighted_sum / total_weight if total_weight > 0 else 0.5
        
        # Calculate confidence based on model agreement
        confidence = self._calculate_confidence(predictions, num_interactions)
        
        # Recommend best model for this scenario
        recommended = self._recommend_model(num_interactions)
        
        return EnsemblePrediction(
            skill_id=skill_id,
            mastery_probability=float(ensemble_prob),
            confidence=float(confidence),
            model_votes=predictions,
            recommended_model=recommended,
            interaction_count=num_interactions
        )
    
    def _get_dynamic_weight(self, model_name: str, num_interactions: int) -> float:
        """
        Get dynamic weight for model based on data availability and performance
        
        Model suitability by interaction count:
        - BKT: Best for <10 interactions (uses priors effectively)
        - PFA: Best for 10-50 interactions (learning curve modeling)
        - DKT: Best for 50+ interactions (neural network needs data)
        """
        base_weight = self.base_weights.get(model_name, 0.33)
        
        # Adjust weight based on data availability
        if model_name == 'bkt':
            if num_interactions < self.BKT_MAX_INTERACTIONS:
                data_weight = 1.5
            elif num_interactions < self.PFA_MAX_INTERACTIONS:
                data_weight = 0.8
            else:
                data_weight = 0.5
        
        elif model_name == 'pfa':
            if num_interactions < self.BKT_MAX_INTERACTIONS:
                data_weight = 0.7
            elif num_interactions < self.PFA_MAX_INTERACTIONS:
                data_weight = 1.3
            else:
                data_weight = 0.9
        
        elif model_name == 'dkt':
            if num_interactions < self.BKT_MAX_INTERACTIONS:
                data_weight = 0.3
            elif num_interactions < self.PFA_MAX_INTERACTIONS:
                data_weight = 0.9
            else:
                data_weight = 1.5
        else:
            data_weight = 1.0
        
        # Adjust based on historical performance
        performance = self.model_performance.get(model_name)
        if performance and performance.total_predictions >= 10:
            perf_weight = 0.5 + performance.accuracy  # 0.5 to 1.5 range
        else:
            perf_weight = 1.0
        
        return base_weight * data_weight * perf_weight
    
    def _calculate_confidence(
        self,
        predictions: Dict[str, float],
        num_interactions: int
    ) -> float:
        """
        Calculate confidence in ensemble prediction
        
        Confidence is higher when:
        - Models agree with each other
        - More data is available
        - More models contribute predictions
        """
        if len(predictions) == 0:
            return 0.0
        
        # Agreement factor (inverse of variance)
        if len(predictions) > 1:
            variance = np.var(list(predictions.values()))
            agreement = 1.0 / (1.0 + variance * 10)
        else:
            agreement = 0.7
        
        # Data availability factor
        data_factor = min(1.0, num_interactions / 50)
        
        # Model coverage factor
        coverage = len(predictions) / len(self.models) if self.models else 0
        
        # Combined confidence
        confidence = 0.4 * agreement + 0.3 * data_factor + 0.3 * coverage
        
        return float(confidence)
    
    def _recommend_model(self, num_interactions: int) -> str:
        """Recommend which single model to use based on data availability"""
        if num_interactions < self.BKT_MAX_INTERACTIONS:
            if 'bkt' in self.models:
                return 'bkt'
        elif num_interactions < self.PFA_MAX_INTERACTIONS:
            if 'pfa' in self.models:
                return 'pfa'
        else:
            if 'dkt' in self.models:
                return 'dkt'
        
        # Fallback to first available model
        if self.models:
            return list(self.models.keys())[0]
        return 'none'
    
    def update(
        self,
        learner_id: str,
        skill_id: str,
        correct: bool,
        timestamp: Optional[datetime] = None
    ) -> EnsemblePrediction:
        """
        Update all models with new interaction
        
        Args:
            learner_id: Learner identifier
            skill_id: Skill practiced
            correct: Whether response was correct
            timestamp: Time of interaction
        
        Returns:
            Updated ensemble prediction
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Get prediction before update (for performance tracking)
        pre_prediction = self.predict(learner_id, skill_id)
        
        # Track performance of each model
        for model_name, predicted_prob in pre_prediction.model_votes.items():
            perf = self.model_performance[model_name]
            perf.total_predictions += 1
            
            # Consider prediction correct if prob > 0.5 and actual correct, or vice versa
            predicted_correct = predicted_prob > 0.5
            if predicted_correct == correct:
                perf.correct_predictions += 1
            
            # Track calibration error
            perf.cumulative_error += abs(predicted_prob - float(correct))
        
        # Track interaction count
        if learner_id not in self.interaction_counts:
            self.interaction_counts[learner_id] = 0
        self.interaction_counts[learner_id] += 1
        
        # Add to learner history
        if learner_id not in self.learner_histories:
            self.learner_histories[learner_id] = []
        
        self.learner_histories[learner_id].append({
            'skill_id': skill_id,
            'correct': correct,
            'timestamp': timestamp.isoformat(),
        })
        
        # Keep only recent history
        if len(self.learner_histories[learner_id]) > 500:
            self.learner_histories[learner_id] = self.learner_histories[learner_id][-500:]
        
        # Update each model
        if 'bkt' in self.models:
            try:
                self.models['bkt'].update(learner_id, skill_id, correct)
            except Exception as e:
                logger.debug(f"BKT update failed: {e}")
        
        if 'pfa' in self.models:
            try:
                self.models['pfa'].update(learner_id, skill_id, correct, timestamp)
            except Exception as e:
                logger.debug(f"PFA update failed: {e}")
        
        if 'dkt' in self.models:
            try:
                skill_num_id = self._get_skill_id(skill_id)
                interaction = DKTInteraction(
                    skill_id=skill_num_id,
                    correct=correct,
                    timestamp=timestamp
                )
                self.models['dkt'].update(learner_id, interaction)
            except Exception as e:
                logger.debug(f"DKT update failed: {e}")
        
        # Return updated prediction
        return self.predict(learner_id, skill_id)
    
    def get_all_mastery(self, learner_id: str) -> Dict[str, EnsemblePrediction]:
        """Get mastery predictions for all skills a learner has practiced"""
        history = self.learner_histories.get(learner_id, [])
        
        # Get unique skills
        skills = set(h['skill_id'] for h in history)
        
        return {
            skill_id: self.predict(learner_id, skill_id)
            for skill_id in skills
        }
    
    def get_optimal_skill(
        self,
        learner_id: str,
        candidate_skills: List[str],
        target_mastery: float = 0.7
    ) -> Optional[str]:
        """
        Find optimal skill to practice next
        
        Selects skill closest to but below target mastery
        (Zone of Proximal Development)
        """
        best_skill = None
        best_distance = float('inf')
        
        for skill_id in candidate_skills:
            prediction = self.predict(learner_id, skill_id)
            prob = prediction.mastery_probability
            
            # Prefer skills just below target (in ZPD)
            if prob < target_mastery:
                distance = target_mastery - prob
                if distance < best_distance:
                    best_distance = distance
                    best_skill = skill_id
        
        # If all skills above target, return the one furthest below
        if best_skill is None and candidate_skills:
            best_skill = min(
                candidate_skills,
                key=lambda s: self.predict(learner_id, s).mastery_probability
            )
        
        return best_skill
    
    def train_dkt(
        self,
        training_data: List[Dict],
        **kwargs
    ) -> Dict[str, List[float]]:
        """
        Train DKT model on historical data
        
        Args:
            training_data: List of learner sequences
            **kwargs: Training parameters (num_epochs, batch_size, etc.)
        
        Returns:
            Training history
        """
        if 'dkt' not in self.models:
            logger.warning("DKT model not available")
            return {}
        
        from app.models.dkt_model import DKTSequence
        
        # Convert training data to DKT sequences
        sequences = []
        for seq_data in training_data:
            interactions = []
            for item in seq_data.get('interactions', []):
                skill_num_id = self._get_skill_id(item['skill_id'])
                interactions.append(DKTInteraction(
                    skill_id=skill_num_id,
                    correct=item['correct'],
                    timestamp=datetime.fromisoformat(item['timestamp']) if 'timestamp' in item else datetime.utcnow()
                ))
            
            if interactions:
                sequences.append(DKTSequence(
                    learner_id=seq_data['learner_id'],
                    interactions=interactions
                ))
        
        if sequences:
            return self.models['dkt'].train(sequences, **kwargs)
        
        return {}
    
    def get_stats(self) -> Dict[str, Any]:
        """Get ensemble statistics"""
        stats = {
            "models_available": list(self.models.keys()),
            "total_learners": len(self.interaction_counts),
            "total_interactions": sum(self.interaction_counts.values()),
            "model_performance": {},
        }
        
        # Model performance stats
        for model_name, perf in self.model_performance.items():
            stats["model_performance"][model_name] = {
                "accuracy": perf.accuracy,
                "mean_error": perf.mean_error,
                "total_predictions": perf.total_predictions,
            }
        
        # Individual model stats
        for model_name, model in self.models.items():
            if hasattr(model, 'get_stats'):
                stats[f"{model_name}_stats"] = model.get_stats()
        
        return stats
    
    def save_models(self, base_path: str):
        """Save all models to disk"""
        import os
        os.makedirs(base_path, exist_ok=True)
        
        for model_name, model in self.models.items():
            if hasattr(model, 'save_model'):
                filepath = os.path.join(base_path, f"{model_name}_model.pt")
                model.save_model(filepath)
        
        # Save ensemble state
        import pickle
        ensemble_path = os.path.join(base_path, "ensemble_state.pkl")
        with open(ensemble_path, 'wb') as f:
            pickle.dump({
                'interaction_counts': self.interaction_counts,
                'learner_histories': self.learner_histories,
                'skill_to_id': self.skill_to_id,
                'next_skill_id': self.next_skill_id,
                'model_performance': {
                    name: (perf.correct_predictions, perf.total_predictions, perf.cumulative_error)
                    for name, perf in self.model_performance.items()
                },
            }, f)
        
        logger.info(f"Ensemble models saved to {base_path}")
    
    def load_models(self, base_path: str):
        """Load all models from disk"""
        import os
        
        for model_name, model in self.models.items():
            if hasattr(model, 'load_model'):
                filepath = os.path.join(base_path, f"{model_name}_model.pt")
                if os.path.exists(filepath):
                    model.load_model(filepath)
        
        # Load ensemble state
        import pickle
        ensemble_path = os.path.join(base_path, "ensemble_state.pkl")
        if os.path.exists(ensemble_path):
            with open(ensemble_path, 'rb') as f:
                state = pickle.load(f)
            
            self.interaction_counts = state.get('interaction_counts', {})
            self.learner_histories = state.get('learner_histories', {})
            self.skill_to_id = state.get('skill_to_id', {})
            self.next_skill_id = state.get('next_skill_id', 0)
            
            # Restore model performance
            for name, (correct, total, error) in state.get('model_performance', {}).items():
                if name in self.model_performance:
                    self.model_performance[name].correct_predictions = correct
                    self.model_performance[name].total_predictions = total
                    self.model_performance[name].cumulative_error = error
        
        logger.info(f"Ensemble models loaded from {base_path}")
