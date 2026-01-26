"""
At-Risk Student Prediction Model
Predicts students at risk of academic struggle using ML

This module implements a sophisticated early warning system that:
1. Analyzes multiple student signals (academic, engagement, behavioral)
2. Predicts risk of academic struggle using Gradient Boosting
3. Identifies specific risk factors for each student
4. Recommends personalized interventions
5. Supports batch predictions for school-wide screening

The model is designed to be interpretable, providing educators with
actionable insights rather than just a risk score.
"""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import roc_auc_score, precision_recall_curve, f1_score
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import pickle
import logging

logger = logging.getLogger(__name__)


@dataclass
class StudentFeatures:
    """
    Features for risk prediction
    
    Captures multiple dimensions of student performance and engagement
    to enable accurate early warning predictions.
    """
    student_id: str
    
    # Academic features
    avg_accuracy: float  # 0-1, overall accuracy across activities
    accuracy_trend: float  # Change over last 30 days (-1 to 1)
    practice_frequency: float  # Sessions per week
    skills_mastered: int  # Count of skills at >= 80% mastery
    skills_struggling: int  # Count of skills at < 50% mastery
    grade_level: int = 5  # Student's grade level
    
    # Engagement features
    avg_session_duration: float  # Minutes per session
    session_consistency: float  # Variance in session times (0-1, 0=consistent)
    total_practice_time: float  # Hours in last 30 days
    completion_rate: float  # % of started activities completed
    login_streak: int = 0  # Consecutive days logged in
    
    # Behavioral features
    avg_focus_score: float  # 0-1, attention/engagement during sessions
    frustration_events: int  # Count in last 30 days
    help_seeking_rate: float  # Hints/questions per session
    quit_rate: float = 0.0  # Rate of quitting activities early
    
    # Time-based features
    days_since_last_session: int  # Days since last activity
    longest_gap_days: int  # Longest gap between sessions in last 30 days
    time_of_day_variance: float = 0.5  # Variance in session times (0-1)
    
    # IEP/Support features
    has_iep: bool = False  # Has Individualized Education Program
    accommodations_count: int = 0  # Number of active accommodations
    support_services: int = 0  # Number of support services enrolled
    
    # Optional demographic features (for fairness analysis)
    school_id: Optional[str] = None
    teacher_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "student_id": self.student_id,
            "avg_accuracy": self.avg_accuracy,
            "accuracy_trend": self.accuracy_trend,
            "practice_frequency": self.practice_frequency,
            "skills_mastered": self.skills_mastered,
            "skills_struggling": self.skills_struggling,
            "grade_level": self.grade_level,
            "avg_session_duration": self.avg_session_duration,
            "session_consistency": self.session_consistency,
            "total_practice_time": self.total_practice_time,
            "completion_rate": self.completion_rate,
            "login_streak": self.login_streak,
            "avg_focus_score": self.avg_focus_score,
            "frustration_events": self.frustration_events,
            "help_seeking_rate": self.help_seeking_rate,
            "quit_rate": self.quit_rate,
            "days_since_last_session": self.days_since_last_session,
            "longest_gap_days": self.longest_gap_days,
            "time_of_day_variance": self.time_of_day_variance,
            "has_iep": self.has_iep,
            "accommodations_count": self.accommodations_count,
            "support_services": self.support_services,
            "school_id": self.school_id,
            "teacher_id": self.teacher_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StudentFeatures":
        """Create from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class RiskPrediction:
    """
    Risk assessment result
    
    Provides actionable risk information including score, level,
    contributing factors, and recommended interventions.
    """
    student_id: str
    risk_score: float  # 0-1, higher = more at risk
    risk_level: str  # low, moderate, high, critical
    risk_factors: List[Tuple[str, float]]  # (feature, contribution)
    recommended_interventions: List[str]
    confidence: float  # 0-1, confidence in prediction
    timestamp: datetime = field(default_factory=datetime.utcnow)
    model_version: str = "1.0.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "student_id": self.student_id,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "risk_factors": [
                {"factor": f, "contribution": c} 
                for f, c in self.risk_factors
            ],
            "recommended_interventions": self.recommended_interventions,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
            "model_version": self.model_version,
        }


@dataclass
class RiskThresholds:
    """Configurable risk level thresholds"""
    low_max: float = 0.3
    moderate_max: float = 0.5
    high_max: float = 0.7
    # Above high_max is critical


class AtRiskPredictor:
    """
    Gradient Boosting model for predicting at-risk students
    
    Uses multiple signals:
    - Academic performance (accuracy, mastery, trends)
    - Engagement patterns (session frequency, duration, consistency)
    - Behavioral indicators (focus, frustration, help-seeking)
    - Temporal patterns (gaps, consistency)
    - Support factors (IEP, accommodations)
    
    The model provides:
    - Risk scores (0-1 probability)
    - Risk levels (low/moderate/high/critical)
    - Interpretable risk factors
    - Personalized intervention recommendations
    """
    
    VERSION = "1.0.0"
    
    def __init__(
        self, 
        model_type: str = 'gradient_boosting',
        thresholds: Optional[RiskThresholds] = None
    ):
        self.model_type = model_type
        self.thresholds = thresholds or RiskThresholds()
        self.scaler = StandardScaler()
        
        if model_type == 'gradient_boosting':
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                min_samples_split=20,
                min_samples_leaf=10,
                subsample=0.8,
                random_state=42,
                validation_fraction=0.1,
                n_iter_no_change=10,
            )
        elif model_type == 'random_forest':
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=20,
                min_samples_leaf=10,
                class_weight='balanced',
                random_state=42,
                n_jobs=-1,
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        self.feature_names: List[str] = []
        self.feature_importances: Dict[str, float] = {}
        self.is_trained = False
        self.training_metrics: Dict[str, float] = {}
        
        # Risk factor thresholds for interpretability
        self.risk_thresholds = {
            'avg_accuracy': (0.6, 'below'),  # Below 60% is risky
            'accuracy_trend': (-0.1, 'below'),  # Declining trend
            'practice_frequency': (2.0, 'below'),  # Less than 2x/week
            'skills_struggling': (3, 'above'),  # More than 3 struggling skills
            'completion_rate': (0.7, 'below'),  # Below 70% completion
            'avg_focus_score': (0.6, 'below'),  # Low focus
            'frustration_events': (5, 'above'),  # More than 5 events
            'quit_rate': (0.3, 'above'),  # Quitting > 30% of activities
            'days_since_last_session': (7, 'above'),  # Gap > 7 days
            'longest_gap_days': (14, 'above'),  # Longest gap > 14 days
        }
        
        # Intervention recommendations by risk factor
        self.intervention_map = {
            'avg_accuracy': [
                "Provide additional scaffolding and guided practice",
                "Review foundational skills for gaps",
                "Consider prerequisite skill assessment",
            ],
            'accuracy_trend': [
                "Schedule check-in with teacher to address declining performance",
                "Review recent activities for difficulty spike",
                "Consider learning style assessment",
            ],
            'practice_frequency': [
                "Send engagement reminders and practice goals",
                "Create personalized practice schedule",
                "Increase gamification elements",
            ],
            'skills_struggling': [
                "Focus on skill remediation before new content",
                "Provide targeted skill-building activities",
                "Consider small group instruction",
            ],
            'completion_rate': [
                "Break activities into smaller, achievable chunks",
                "Increase motivation through rewards/badges",
                "Review activity difficulty alignment",
            ],
            'avg_focus_score': [
                "Implement focus breaks during sessions",
                "Use attention support strategies",
                "Consider environmental modifications",
            ],
            'frustration_events': [
                "Adjust difficulty level downward",
                "Provide more hints and support options",
                "Review for accessibility issues",
            ],
            'quit_rate': [
                "Investigate reasons for early activity termination",
                "Provide clearer instructions and expectations",
                "Consider shorter activity formats",
            ],
            'days_since_last_session': [
                "Re-engagement outreach: email, SMS notification",
                "Parent/guardian communication",
                "Consider barriers to access",
            ],
            'longest_gap_days': [
                "Review attendance patterns",
                "Check for external factors affecting engagement",
                "Coordinate with school counselor",
            ],
        }
    
    def _extract_feature_vector(self, features: StudentFeatures) -> np.ndarray:
        """Convert StudentFeatures to numpy array"""
        vector = np.array([
            features.avg_accuracy,
            features.accuracy_trend,
            features.practice_frequency,
            features.skills_mastered,
            features.skills_struggling,
            features.grade_level,
            features.avg_session_duration,
            features.session_consistency,
            features.total_practice_time,
            features.completion_rate,
            features.login_streak,
            features.avg_focus_score,
            features.frustration_events,
            features.help_seeking_rate,
            features.quit_rate,
            features.days_since_last_session,
            features.longest_gap_days,
            features.time_of_day_variance,
            float(features.has_iep),
            features.accommodations_count,
            features.support_services,
        ], dtype=np.float32)
        
        return vector
    
    def _get_feature_names(self) -> List[str]:
        """Get ordered list of feature names"""
        return [
            'avg_accuracy',
            'accuracy_trend',
            'practice_frequency',
            'skills_mastered',
            'skills_struggling',
            'grade_level',
            'avg_session_duration',
            'session_consistency',
            'total_practice_time',
            'completion_rate',
            'login_streak',
            'avg_focus_score',
            'frustration_events',
            'help_seeking_rate',
            'quit_rate',
            'days_since_last_session',
            'longest_gap_days',
            'time_of_day_variance',
            'has_iep',
            'accommodations_count',
            'support_services',
        ]
    
    def train(
        self,
        training_data: List[Tuple[StudentFeatures, bool]],
        test_size: float = 0.2,
    ) -> Dict[str, float]:
        """
        Train risk prediction model
        
        Args:
            training_data: List of (features, is_at_risk) tuples
            test_size: Fraction for test set
        
        Returns:
            Training and validation metrics
        """
        if len(training_data) < 50:
            raise ValueError("Need at least 50 samples for training")
        
        logger.info(f"Training risk predictor with {len(training_data)} samples")
        
        # Extract features and labels
        X = np.array([self._extract_feature_vector(feat) for feat, _ in training_data])
        y = np.array([int(label) for _, label in training_data])
        
        # Set feature names
        self.feature_names = self._get_feature_names()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Normalize features
        x_train_scaled = self.scaler.fit_transform(X_train)
        x_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(x_train_scaled, y_train)
        
        # Extract feature importances
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            self.feature_importances = {
                name: float(importance) 
                for name, importance in zip(self.feature_names, importances)
            }
        
        # Calculate metrics
        y_train_pred_proba = self.model.predict_proba(x_train_scaled)[:, 1]
        y_test_pred_proba = self.model.predict_proba(x_test_scaled)[:, 1]
        y_test_pred = self.model.predict(x_test_scaled)
        
        # Cross-validation on full training set
        x_scaled = self.scaler.transform(X)
        cv_scores = cross_val_score(
            self.model, x_scaled, y, cv=5, scoring='roc_auc'
        )
        
        # Find optimal threshold using precision-recall
        precision, recall, thresholds_pr = precision_recall_curve(y_test, y_test_pred_proba)
        f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
        optimal_idx = np.argmax(f1_scores)
        optimal_threshold = thresholds_pr[optimal_idx] if optimal_idx < len(thresholds_pr) else 0.5
        
        self.training_metrics = {
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'at_risk_rate_train': float(y_train.mean()),
            'at_risk_rate_test': float(y_test.mean()),
            'train_auc': float(roc_auc_score(y_train, y_train_pred_proba)),
            'test_auc': float(roc_auc_score(y_test, y_test_pred_proba)),
            'test_f1': float(f1_score(y_test, y_test_pred)),
            'cv_auc_mean': float(cv_scores.mean()),
            'cv_auc_std': float(cv_scores.std()),
            'optimal_threshold': float(optimal_threshold),
        }
        
        self.is_trained = True
        
        logger.info(
            f"Training complete: test_auc={self.training_metrics['test_auc']:.3f}, "
            f"cv_auc={self.training_metrics['cv_auc_mean']:.3f}"
        )
        
        return self.training_metrics
    
    def predict(self, features: StudentFeatures) -> RiskPrediction:
        """
        Predict risk for a student
        
        Args:
            features: Student feature set
        
        Returns:
            Risk prediction with interpretability
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() first.")
        
        # Extract and scale features
        X = self._extract_feature_vector(features).reshape(1, -1)
        x_scaled = self.scaler.transform(X)
        
        # Predict probability
        risk_prob = float(self.model.predict_proba(x_scaled)[0, 1])
        
        # Determine risk level
        risk_level = self._get_risk_level(risk_prob)
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(features, X[0])
        
        # Generate intervention recommendations
        interventions = self._recommend_interventions(risk_factors, features, risk_level)
        
        # Calculate confidence
        confidence = self._calculate_confidence(features)
        
        return RiskPrediction(
            student_id=features.student_id,
            risk_score=risk_prob,
            risk_level=risk_level,
            risk_factors=risk_factors,
            recommended_interventions=interventions,
            confidence=confidence,
            timestamp=datetime.now(timezone.utc),
            model_version=self.VERSION,
        )
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Determine risk level from score"""
        if risk_score < self.thresholds.low_max:
            return 'low'
        elif risk_score < self.thresholds.moderate_max:
            return 'moderate'
        elif risk_score < self.thresholds.high_max:
            return 'high'
        else:
            return 'critical'
    
    def _identify_risk_factors(
        self,
        features: StudentFeatures,
        feature_vector: np.ndarray
    ) -> List[Tuple[str, float]]:
        """
        Identify which features contribute most to risk
        
        Uses a combination of:
        1. Feature importance from the model
        2. Deviation from safe thresholds
        """
        risk_factors = []
        
        for feature_name, (threshold, direction) in self.risk_thresholds.items():
            if feature_name not in self.feature_names:
                continue
            
            idx = self.feature_names.index(feature_name)
            value = feature_vector[idx]
            importance = self.feature_importances.get(feature_name, 0.1)
            
            # Check if feature exceeds risk threshold
            is_risk_factor = False
            if direction == 'below' and value < threshold:
                is_risk_factor = True
                deviation = (threshold - value) / (threshold + 1e-10)
            elif direction == 'above' and value > threshold:
                is_risk_factor = True
                deviation = (value - threshold) / (threshold + 1e-10)
            else:
                continue
            
            if is_risk_factor:
                # Calculate contribution (importance * deviation)
                contribution = importance * min(deviation, 2.0)  # Cap deviation
                risk_factors.append((feature_name, float(contribution)))
        
        # Sort by contribution
        risk_factors.sort(key=lambda x: x[1], reverse=True)
        
        return risk_factors[:5]  # Top 5 factors
    
    def _recommend_interventions(
        self,
        risk_factors: List[Tuple[str, float]],
        features: StudentFeatures,
        risk_level: str
    ) -> List[str]:
        """Generate personalized intervention recommendations"""
        interventions = []
        used_categories = set()
        
        # Urgent interventions for critical cases
        if risk_level == 'critical':
            interventions.append(
                "🚨 CRITICAL: Immediate intervention required - "
                "schedule emergency support meeting"
            )
        
        # Urgent outreach for disengaged students
        if features.days_since_last_session > 14:
            interventions.append(
                "⚠️ URGENT: Student disengaged for 2+ weeks - "
                "immediate outreach needed (phone call, home visit)"
            )
        
        # Add interventions for top risk factors
        for factor_name, contribution in risk_factors[:3]:
            if factor_name in self.intervention_map and factor_name not in used_categories:
                # Get first intervention for this factor
                factor_interventions = self.intervention_map[factor_name]
                interventions.append(factor_interventions[0])
                used_categories.add(factor_name)
        
        # IEP-specific interventions
        if features.has_iep:
            if features.avg_accuracy < 0.5:
                interventions.append(
                    "📋 Review IEP accommodations - current supports may need adjustment"
                )
            if features.frustration_events > 5:
                interventions.append(
                    "📋 IEP review: Consider additional behavioral supports"
                )
        
        # Grade-level specific
        if features.grade_level <= 2 and features.avg_accuracy < 0.5:
            interventions.append(
                "👶 Early grades intervention: Focus on foundational literacy/numeracy"
            )
        
        # Limit to most important interventions
        return interventions[:5]
    
    def _calculate_confidence(self, features: StudentFeatures) -> float:
        """
        Calculate prediction confidence based on data quality
        
        Confidence is reduced when:
        - Few practice sessions (insufficient data)
        - Very recent account (not enough history)
        - Inconsistent engagement patterns
        """
        confidence = 1.0
        
        # Reduce confidence for limited practice data
        if features.practice_frequency < 1.0:
            confidence *= 0.7
        elif features.practice_frequency < 2.0:
            confidence *= 0.85
        
        # Reduce for very low total practice time
        if features.total_practice_time < 1.0:  # Less than 1 hour
            confidence *= 0.6
        elif features.total_practice_time < 3.0:  # Less than 3 hours
            confidence *= 0.8
        
        # Reduce for high session inconsistency
        if features.session_consistency > 0.8:
            confidence *= 0.85
        
        # Reduce for very recent data (might be anomaly)
        if features.days_since_last_session == 0 and features.total_practice_time < 2.0:
            confidence *= 0.9
        
        return max(0.3, confidence)  # Minimum 30% confidence
    
    def batch_predict(
        self,
        students: List[StudentFeatures],
        risk_threshold: Optional[float] = None
    ) -> List[RiskPrediction]:
        """
        Predict risk for multiple students
        
        Args:
            students: List of student features
            risk_threshold: Optional threshold to filter results
        
        Returns:
            List of predictions (optionally filtered)
        """
        predictions = [self.predict(features) for features in students]
        
        if risk_threshold is not None:
            predictions = [p for p in predictions if p.risk_score >= risk_threshold]
        
        # Sort by risk score (highest first)
        predictions.sort(key=lambda p: p.risk_score, reverse=True)
        
        return predictions
    
    def get_school_summary(
        self,
        predictions: List[RiskPrediction]
    ) -> Dict[str, Any]:
        """
        Generate school-wide risk summary
        
        Args:
            predictions: List of predictions for all students
        
        Returns:
            Summary statistics and insights
        """
        if not predictions:
            return {"error": "No predictions provided"}
        
        risk_scores = [p.risk_score for p in predictions]
        risk_levels = [p.risk_level for p in predictions]
        
        # Count by risk level
        level_counts = {
            'low': risk_levels.count('low'),
            'moderate': risk_levels.count('moderate'),
            'high': risk_levels.count('high'),
            'critical': risk_levels.count('critical'),
        }
        
        # Aggregate risk factors
        factor_counts: Dict[str, int] = {}
        for p in predictions:
            for factor, _ in p.risk_factors:
                factor_counts[factor] = factor_counts.get(factor, 0) + 1
        
        # Top risk factors across school
        top_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_students": len(predictions),
            "risk_distribution": level_counts,
            "at_risk_count": level_counts['high'] + level_counts['critical'],
            "at_risk_rate": (level_counts['high'] + level_counts['critical']) / len(predictions),
            "avg_risk_score": float(np.mean(risk_scores)),
            "median_risk_score": float(np.median(risk_scores)),
            "top_risk_factors": [
                {"factor": f, "student_count": c} 
                for f, c in top_factors
            ],
            "critical_students": [
                p.student_id for p in predictions 
                if p.risk_level == 'critical'
            ][:10],  # Top 10 critical
        }
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'feature_importances': self.feature_importances,
                'model_type': self.model_type,
                'training_metrics': self.training_metrics,
                'risk_thresholds': self.risk_thresholds,
                'thresholds': self.thresholds,
                'version': self.VERSION,
            }, f)
        
        logger.info(f"Saved risk predictor model to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.feature_importances = data['feature_importances']
        self.model_type = data['model_type']
        self.training_metrics = data.get('training_metrics', {})
        self.risk_thresholds = data.get('risk_thresholds', self.risk_thresholds)
        if 'thresholds' in data:
            self.thresholds = data['thresholds']
        self.is_trained = True
        
        logger.info(f"Loaded risk predictor model from {filepath}")
    
    def get_feature_importance_report(self) -> List[Dict[str, Any]]:
        """Get feature importance report"""
        if not self.feature_importances:
            return []
        
        sorted_features = sorted(
            self.feature_importances.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {
                "feature": name,
                "importance": importance,
                "rank": i + 1,
            }
            for i, (name, importance) in enumerate(sorted_features)
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get model statistics"""
        return {
            "model_type": self.model_type,
            "version": self.VERSION,
            "is_trained": self.is_trained,
            "feature_count": len(self.feature_names),
            "training_metrics": self.training_metrics,
            "thresholds": {
                "low_max": self.thresholds.low_max,
                "moderate_max": self.thresholds.moderate_max,
                "high_max": self.thresholds.high_max,
            },
        }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Create predictor
    predictor = AtRiskPredictor(model_type='gradient_boosting')
    
    # Simulate training data
    rng = np.random.default_rng(seed=42)
    training_data = []
    
    for i in range(1000):
        # Simulate diverse student profiles
        avg_accuracy = rng.uniform(0.3, 0.95)
        practice_freq = rng.uniform(0.5, 5.0)
        days_since = rng.integers(0, 30)
        completion = rng.uniform(0.4, 1.0)
        focus = rng.uniform(0.3, 0.95)
        
        features = StudentFeatures(
            student_id=f"student_{i}",
            avg_accuracy=avg_accuracy,
            accuracy_trend=rng.uniform(-0.2, 0.2),
            practice_frequency=practice_freq,
            skills_mastered=rng.integers(0, 20),
            skills_struggling=rng.integers(0, 10),
            grade_level=rng.integers(1, 12),
            avg_session_duration=rng.uniform(5, 30),
            session_consistency=rng.uniform(0.1, 1.0),
            total_practice_time=rng.uniform(1, 50),
            completion_rate=completion,
            login_streak=rng.integers(0, 30),
            avg_focus_score=focus,
            frustration_events=rng.integers(0, 15),
            help_seeking_rate=rng.uniform(0.1, 0.8),
            quit_rate=rng.uniform(0, 0.5),
            days_since_last_session=days_since,
            longest_gap_days=rng.integers(1, 21),
            time_of_day_variance=rng.uniform(0.1, 0.9),
            has_iep=rng.random() < 0.15,
            accommodations_count=rng.integers(0, 5),
            support_services=rng.integers(0, 3),
        )
        
        # Define "at-risk" as combination of low performance & engagement
        is_at_risk = (
            (avg_accuracy < 0.55 and practice_freq < 2.0) or
            days_since > 12 or
            (completion < 0.6 and focus < 0.5)
        )
        
        training_data.append((features, is_at_risk))
    
    # Train model
    print("Training At-Risk Predictor...")
    metrics = predictor.train(training_data)
    
    print("\n" + "=" * 60)
    print("Training Metrics")
    print("=" * 60)
    for key, value in metrics.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: {value}")
    
    print("\n" + "=" * 60)
    print("Feature Importances (Top 10)")
    print("=" * 60)
    for item in predictor.get_feature_importance_report()[:10]:
        print(f"  {item['rank']:2d}. {item['feature']}: {item['importance']:.4f}")
    
    # Test prediction on at-risk student
    test_student = StudentFeatures(
        student_id="test_student_001",
        avg_accuracy=0.48,
        accuracy_trend=-0.15,
        practice_frequency=1.2,
        skills_mastered=4,
        skills_struggling=7,
        grade_level=4,
        avg_session_duration=10.0,
        session_consistency=0.7,
        total_practice_time=6.0,
        completion_rate=0.58,
        login_streak=0,
        avg_focus_score=0.52,
        frustration_events=8,
        help_seeking_rate=0.7,
        quit_rate=0.35,
        days_since_last_session=11,
        longest_gap_days=14,
        time_of_day_variance=0.6,
        has_iep=True,
        accommodations_count=3,
        support_services=2,
    )
    
    prediction = predictor.predict(test_student)
    
    print("\n" + "=" * 60)
    print(f"Risk Assessment for {prediction.student_id}")
    print("=" * 60)
    print(f"Risk Score: {prediction.risk_score:.3f}")
    print(f"Risk Level: {prediction.risk_level.upper()}")
    print(f"Confidence: {prediction.confidence:.3f}")
    print("\nTop Risk Factors:")
    for factor, contribution in prediction.risk_factors:
        print(f"  • {factor}: {contribution:.3f}")
    print("\nRecommended Interventions:")
    for i, intervention in enumerate(prediction.recommended_interventions, 1):
        print(f"  {i}. {intervention}")
    
    # Test school summary
    print("\n" + "=" * 60)
    print("School-Wide Risk Summary")
    print("=" * 60)
    
    # Generate predictions for all training students
    all_predictions = predictor.batch_predict(
        [feat for feat, _ in training_data[:100]]
    )
    summary = predictor.get_school_summary(all_predictions)
    
    print(f"Total Students: {summary['total_students']}")
    print(f"At-Risk Rate: {summary['at_risk_rate']:.1%}")
    print(f"Average Risk Score: {summary['avg_risk_score']:.3f}")
    print("\nRisk Distribution:")
    for level, count in summary['risk_distribution'].items():
        pct = count / summary['total_students'] * 100
        print(f"  {level.capitalize()}: {count} ({pct:.1f}%)")
    print("\nTop School-Wide Risk Factors:")
    for item in summary['top_risk_factors']:
        print(f"  • {item['factor']}: {item['student_count']} students")
