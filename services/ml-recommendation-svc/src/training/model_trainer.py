"""
Model Training Pipeline

Handles training, validation, and deployment of risk prediction models.
Includes cross-validation, hyperparameter tuning, and bias evaluation.

IMPORTANT: Training data must be reviewed for representative sampling across
all demographic groups before training. See docs/ai/model-fairness.md
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
import hashlib
import json
import logging
import pickle

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import (
    cross_val_score,
    StratifiedKFold,
    GridSearchCV,
    train_test_split,
)
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)

logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for model training"""
    model_name: str = "student_risk_model"
    model_version: str = "1.0.0"
    
    # Data split
    test_size: float = 0.2
    validation_size: float = 0.15
    random_state: int = 42
    
    # Cross-validation
    cv_folds: int = 5
    
    # Hyperparameter grid
    param_grid: dict = field(default_factory=lambda: {
        "n_estimators": [100, 200, 300],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.05, 0.1, 0.2],
        "min_samples_split": [10, 20],
        "min_samples_leaf": [5, 10],
        "subsample": [0.8, 1.0],
    })
    
    # Performance thresholds
    min_auc: float = 0.75
    min_recall: float = 0.80  # Prioritize catching at-risk students
    max_fpr: float = 0.30     # Limit false positives
    
    # Fairness thresholds
    max_disparity: float = 0.20  # Max difference between groups
    min_ratio: float = 0.80      # 80% rule for adverse impact
    
    # Paths
    model_dir: str = "models"
    data_dir: str = "data"


@dataclass
class TrainingMetrics:
    """Metrics from model training"""
    accuracy: float
    precision: float
    recall: float
    f1: float
    auc_roc: float
    confusion_matrix: list[list[int]]
    classification_report: dict
    cv_scores: list[float]
    cv_mean: float
    cv_std: float
    
    # Fairness metrics
    fairness_metrics: dict[str, Any] = field(default_factory=dict)
    
    # Training metadata
    training_samples: int = 0
    test_samples: int = 0
    feature_count: int = 0
    training_time_seconds: float = 0.0


@dataclass
class ModelArtifact:
    """A trained model artifact ready for deployment"""
    model_id: str
    model_version: str
    created_at: datetime
    metrics: TrainingMetrics
    config: TrainingConfig
    feature_names: list[str]
    scaler_path: str
    model_path: str
    calibrator_path: Optional[str]
    
    # Approval status
    approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    
    # Deployment status
    deployed: bool = False
    deployed_at: Optional[datetime] = None


class RiskModelTrainer:
    """
    Training pipeline for student risk prediction model.
    
    This trainer implements:
    1. Stratified train/test splitting
    2. Cross-validation for robust evaluation
    3. Hyperparameter tuning via grid search
    4. Probability calibration for reliable confidence scores
    5. Fairness evaluation across demographic groups
    6. Model versioning and artifact management
    """
    
    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        self.model: Optional[GradientBoostingClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.calibrator: Optional[CalibratedClassifierCV] = None
        self.feature_names: list[str] = []
        
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: list[str],
        demographic_data: Optional[dict[str, np.ndarray]] = None,
    ) -> ModelArtifact:
        """
        Train a new risk prediction model.
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Binary labels (1 = at-risk, 0 = not at-risk)
            feature_names: Names of features for explainability
            demographic_data: Optional dict mapping demographic attribute to array
                              Used for fairness evaluation
        
        Returns:
            ModelArtifact with trained model and metrics
        """
        import time
        start_time = time.time()
        
        logger.info(f"Starting model training with {X.shape[0]} samples, {X.shape[1]} features")
        self.feature_names = feature_names
        
        # Validate data
        self._validate_training_data(X, y, demographic_data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config.test_size,
            random_state=self.config.random_state,
            stratify=y,
        )
        
        # Scale features
        self.scaler = StandardScaler()
        x_train_scaled = self.scaler.fit_transform(X_train)
        x_test_scaled = self.scaler.transform(X_test)
        
        # Hyperparameter tuning with cross-validation
        logger.info("Running hyperparameter search...")
        best_params = self._hyperparameter_search(x_train_scaled, y_train)
        
        # Train final model with best params
        logger.info(f"Training final model with params: {best_params}")
        self.model = GradientBoostingClassifier(
            **best_params,
            learning_rate=0.1,
            random_state=self.config.random_state,
        )
        self.model.fit(x_train_scaled, y_train)
        
        # Calibrate probabilities for reliable confidence scores
        logger.info("Calibrating probabilities...")
        self.calibrator = CalibratedClassifierCV(
            self.model,
            method="isotonic",
            cv="prefit",
        )
        self.calibrator.fit(x_train_scaled, y_train)
        
        # Evaluate on test set
        logger.info("Evaluating model performance...")
        metrics = self._evaluate_model(x_test_scaled, y_test)
        
        # Evaluate fairness if demographic data provided
        if demographic_data:
            # Split demographic data same way as features
            demo_test = {}
            for attr, values in demographic_data.items():
                _, demo_test[attr], _, _ = train_test_split(
                    values, y,
                    test_size=self.config.test_size,
                    random_state=self.config.random_state,
                    stratify=y,
                )
            
            fairness_metrics = self._evaluate_fairness(
                x_test_scaled, y_test, demo_test
            )
            metrics.fairness_metrics = fairness_metrics
        
        # Complete metrics
        metrics.training_samples = len(X_train)
        metrics.test_samples = len(X_test)
        metrics.feature_count = X.shape[1]
        metrics.training_time_seconds = time.time() - start_time
        
        # Cross-validation scores
        cv_scores = cross_val_score(
            self.model, x_train_scaled, y_train,
            cv=self.config.cv_folds,
            scoring="roc_auc",
        )
        metrics.cv_scores = cv_scores.tolist()
        metrics.cv_mean = cv_scores.mean()
        metrics.cv_std = cv_scores.std()
        
        logger.info(f"Training complete. AUC: {metrics.auc_roc:.4f}, "
                   f"CV Mean: {metrics.cv_mean:.4f} (+/- {metrics.cv_std:.4f})")
        
        # Save artifacts
        artifact = self._save_artifacts(metrics)
        
        # Validate against thresholds
        self._validate_model_quality(metrics)
        
        return artifact
    
    def _validate_training_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        demographic_data: Optional[dict[str, np.ndarray]],
    ) -> None:
        """Validate training data quality and representation"""
        # Check for NaN/Inf
        if np.any(np.isnan(X)) or np.any(np.isinf(X)):
            raise ValueError("Training data contains NaN or Inf values")
        
        # Check class balance
        positive_rate = y.mean()
        if positive_rate < 0.05 or positive_rate > 0.95:
            logger.warning(f"Class imbalance detected: {positive_rate:.2%} positive rate")
        
        # Check sample size
        if len(y) < 1000:
            logger.warning(f"Small training set: {len(y)} samples. Model may not generalize well.")
        
        # Check demographic representation
        if demographic_data:
            for attr, values in demographic_data.items():
                unique, counts = np.unique(values, return_counts=True)
                for group, count in zip(unique, counts):
                    if count < 50:
                        logger.warning(
                            f"Low representation for {attr}={group}: {count} samples. "
                            "Fairness metrics may be unreliable."
                        )
    
    def _hyperparameter_search(
        self,
        X: np.ndarray,
        y: np.ndarray,
    ) -> dict[str, Any]:
        """Find best hyperparameters using grid search with cross-validation"""
        # Use stratified k-fold for class balance
        cv = StratifiedKFold(
            n_splits=self.config.cv_folds,
            shuffle=True,
            random_state=self.config.random_state,
        )
        
        base_model = GradientBoostingClassifier(
            random_state=self.config.random_state,
        )
        
        # For faster training, use a smaller param grid for initial search
        quick_grid = {
            "n_estimators": [100, 200],
            "max_depth": [3, 5],
            "learning_rate": [0.1],
            "min_samples_split": [10],
            "min_samples_leaf": [5],
        }
        
        grid_search = GridSearchCV(
            base_model,
            quick_grid,
            cv=cv,
            scoring="roc_auc",
            n_jobs=-1,
            verbose=1,
        )
        
        grid_search.fit(X, y)
        
        logger.info(f"Best CV score: {grid_search.best_score_:.4f}")
        return grid_search.best_params_
    
    def _evaluate_model(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
    ) -> TrainingMetrics:
        """Evaluate model on test set"""
        y_pred = self.model.predict(X_test)
        y_proba = self.calibrator.predict_proba(X_test)[:, 1]
        
        return TrainingMetrics(
            accuracy=accuracy_score(y_test, y_pred),
            precision=precision_score(y_test, y_pred, zero_division=0),
            recall=recall_score(y_test, y_pred, zero_division=0),
            f1=f1_score(y_test, y_pred, zero_division=0),
            auc_roc=roc_auc_score(y_test, y_proba),
            confusion_matrix=confusion_matrix(y_test, y_pred).tolist(),
            classification_report=classification_report(y_test, y_pred, output_dict=True),
            cv_scores=[],
            cv_mean=0.0,
            cv_std=0.0,
        )
    
    def _evaluate_fairness(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        demographic_data: dict[str, np.ndarray],
    ) -> dict[str, Any]:
        """Evaluate fairness across demographic groups"""
        y_pred = self.model.predict(X_test)
        y_proba = self.calibrator.predict_proba(X_test)[:, 1]
        
        fairness_results = {}
        
        for attr, groups in demographic_data.items():
            unique_groups = np.unique(groups)
            
            if len(unique_groups) < 2:
                continue
            
            group_metrics = {}
            
            for group in unique_groups:
                mask = groups == group
                if mask.sum() < 10:
                    continue
                
                group_y = y_test[mask]
                group_pred = y_pred[mask]
                group_proba = y_proba[mask]
                
                # Selection rate (demographic parity)
                selection_rate = group_pred.mean()
                
                # True positive rate (equal opportunity)
                tpr = recall_score(group_y, group_pred, zero_division=0)
                
                # False positive rate
                tn = ((group_y == 0) & (group_pred == 0)).sum()
                fp = ((group_y == 0) & (group_pred == 1)).sum()
                fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
                
                # Average predicted probability (calibration)
                avg_proba = group_proba.mean()
                
                group_metrics[str(group)] = {
                    "n_samples": int(mask.sum()),
                    "selection_rate": float(selection_rate),
                    "true_positive_rate": float(tpr),
                    "false_positive_rate": float(fpr),
                    "avg_predicted_probability": float(avg_proba),
                }
            
            # Calculate disparities
            if len(group_metrics) >= 2:
                selection_rates = [m["selection_rate"] for m in group_metrics.values()]
                tprs = [m["true_positive_rate"] for m in group_metrics.values()]
                fprs = [m["false_positive_rate"] for m in group_metrics.values()]
                
                fairness_results[attr] = {
                    "groups": group_metrics,
                    "selection_rate_disparity": max(selection_rates) - min(selection_rates),
                    "tpr_disparity": max(tprs) - min(tprs),
                    "fpr_disparity": max(fprs) - min(fprs),
                    "disparate_impact_ratio": min(selection_rates) / max(selection_rates)
                        if max(selection_rates) > 0 else 0,
                    "passes_80_percent_rule": (
                        min(selection_rates) / max(selection_rates) >= 0.8
                        if max(selection_rates) > 0 else True
                    ),
                }
        
        return fairness_results
    
    def _validate_model_quality(self, metrics: TrainingMetrics) -> None:
        """Validate model meets quality thresholds"""
        issues = []
        
        if metrics.auc_roc < self.config.min_auc:
            issues.append(
                f"AUC ({metrics.auc_roc:.4f}) below threshold ({self.config.min_auc})"
            )
        
        if metrics.recall < self.config.min_recall:
            issues.append(
                f"Recall ({metrics.recall:.4f}) below threshold ({self.config.min_recall}). "
                "Model may miss at-risk students."
            )
        
        # Check fairness
        for attr, fairness in metrics.fairness_metrics.items():
            if fairness.get("selection_rate_disparity", 0) > self.config.max_disparity:
                issues.append(
                    f"High selection rate disparity for {attr}: "
                    f"{fairness['selection_rate_disparity']:.4f}"
                )
            
            if not fairness.get("passes_80_percent_rule", True):
                issues.append(
                    f"Fails 80% rule for {attr}: disparate impact ratio = "
                    f"{fairness['disparate_impact_ratio']:.4f}"
                )
        
        if issues:
            logger.warning(
                "Model quality issues detected:\n" + "\n".join(f"  - {i}" for i in issues)
            )
    
    def _save_artifacts(self, metrics: TrainingMetrics) -> ModelArtifact:
        """Save model artifacts to disk"""
        # Create model directory
        model_dir = Path(self.config.model_dir)
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate model ID
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        model_id = f"{self.config.model_name}_{self.config.model_version}_{timestamp}"
        
        artifact_dir = model_dir / model_id
        artifact_dir.mkdir(parents=True, exist_ok=True)
        
        # Save scaler
        scaler_path = artifact_dir / "scaler.pkl"
        with open(scaler_path, "wb") as f:
            pickle.dump(self.scaler, f)
        
        # Save model
        model_path = artifact_dir / "model.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(self.model, f)
        
        # Save calibrator
        calibrator_path = artifact_dir / "calibrator.pkl"
        with open(calibrator_path, "wb") as f:
            pickle.dump(self.calibrator, f)
        
        # Save metadata
        artifact = ModelArtifact(
            model_id=model_id,
            model_version=self.config.model_version,
            created_at=datetime.now(timezone.utc),
            metrics=metrics,
            config=self.config,
            feature_names=self.feature_names,
            scaler_path=str(scaler_path),
            model_path=str(model_path),
            calibrator_path=str(calibrator_path),
        )
        
        metadata_path = artifact_dir / "metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(self._artifact_to_dict(artifact), f, indent=2, default=str)
        
        logger.info(f"Model artifacts saved to {artifact_dir}")
        return artifact
    
    def _artifact_to_dict(self, artifact: ModelArtifact) -> dict:
        """Convert artifact to dictionary for JSON serialization"""
        return {
            "model_id": artifact.model_id,
            "model_version": artifact.model_version,
            "created_at": artifact.created_at.isoformat(),
            "feature_names": artifact.feature_names,
            "scaler_path": artifact.scaler_path,
            "model_path": artifact.model_path,
            "calibrator_path": artifact.calibrator_path,
            "metrics": {
                "accuracy": artifact.metrics.accuracy,
                "precision": artifact.metrics.precision,
                "recall": artifact.metrics.recall,
                "f1": artifact.metrics.f1,
                "auc_roc": artifact.metrics.auc_roc,
                "cv_mean": artifact.metrics.cv_mean,
                "cv_std": artifact.metrics.cv_std,
                "training_samples": artifact.metrics.training_samples,
                "test_samples": artifact.metrics.test_samples,
                "feature_count": artifact.metrics.feature_count,
                "training_time_seconds": artifact.metrics.training_time_seconds,
                "fairness_metrics": artifact.metrics.fairness_metrics,
            },
            "approved": artifact.approved,
            "deployed": artifact.deployed,
        }
    
    def load_model(self, model_dir: str) -> None:
        """Load a trained model from disk"""
        model_path = Path(model_dir)
        
        with open(model_path / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        
        with open(model_path / "model.pkl", "rb") as f:
            self.model = pickle.load(f)
        
        with open(model_path / "calibrator.pkl", "rb") as f:
            self.calibrator = pickle.load(f)
        
        with open(model_path / "metadata.json") as f:
            metadata = json.load(f)
            self.feature_names = metadata.get("feature_names", [])
        
        logger.info(f"Model loaded from {model_dir}")


class TrainingDataPreparer:
    """
    Prepares training data from historical student records.
    
    Creates labeled dataset where:
    - y=1: Student fell significantly behind within 30 days
    - y=0: Student maintained or improved performance
    """
    
    def __init__(self, db_connection: Any):
        self.db = db_connection
    
    async def prepare_training_data(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime,
        outcome_window_days: int = 30,
    ) -> tuple[np.ndarray, np.ndarray, list[str], dict[str, np.ndarray]]:
        """
        Prepare training data from historical records.
        
        Returns:
            X: Feature matrix
            y: Binary labels (1 = became at-risk)
            feature_names: List of feature names
            demographic_data: Dict mapping demographic attribute to array
        """
        # This would query the database for historical student data
        # For each student at each point in time, we compute:
        # 1. Features as of that date
        # 2. Outcome: did they fall behind in the next N days?
        
        # Placeholder - actual implementation would query Prisma
        raise NotImplementedError(
            "Training data preparation requires database implementation. "
            "See docs/ai/training-pipeline.md for details."
        )
