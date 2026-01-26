"""
At-Risk Student Prediction Router

Provides REST endpoints for predicting and managing at-risk students:
- Individual risk predictions
- Batch predictions for schools/classes
- School-wide summaries
- Model training and management
"""

import time
from typing import Annotated, List, Dict, Any, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field

from src.models.risk_predictor import (
    AtRiskPredictor,
    StudentFeatures,
    RiskPrediction,
    RiskThresholds,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/at-risk", tags=["At-Risk Prediction"])


# Request/Response Models
class StudentFeaturesRequest(BaseModel):
    """Student features for risk prediction"""
    student_id: str = Field(..., description="Unique student identifier")
    
    # Academic
    avg_accuracy: float = Field(..., ge=0, le=1, description="Average accuracy (0-1)")
    accuracy_trend: float = Field(0.0, ge=-1, le=1, description="Accuracy trend (-1 to 1)")
    practice_frequency: float = Field(..., ge=0, description="Sessions per week")
    skills_mastered: int = Field(0, ge=0, description="Count of mastered skills")
    skills_struggling: int = Field(0, ge=0, description="Count of struggling skills")
    grade_level: int = Field(5, ge=1, le=12, description="Student grade level")
    
    # Engagement
    avg_session_duration: float = Field(15.0, ge=0, description="Avg session minutes")
    session_consistency: float = Field(0.5, ge=0, le=1, description="Session time variance")
    total_practice_time: float = Field(0.0, ge=0, description="Total hours in 30 days")
    completion_rate: float = Field(0.8, ge=0, le=1, description="Activity completion rate")
    login_streak: int = Field(0, ge=0, description="Consecutive login days")
    
    # Behavioral
    avg_focus_score: float = Field(0.7, ge=0, le=1, description="Focus score (0-1)")
    frustration_events: int = Field(0, ge=0, description="Frustration count in 30 days")
    help_seeking_rate: float = Field(0.3, ge=0, le=1, description="Help requests per session")
    quit_rate: float = Field(0.0, ge=0, le=1, description="Early quit rate")
    
    # Temporal
    days_since_last_session: int = Field(0, ge=0, description="Days since last activity")
    longest_gap_days: int = Field(1, ge=0, description="Longest gap in 30 days")
    time_of_day_variance: float = Field(0.5, ge=0, le=1, description="Session time variance")
    
    # Support
    has_iep: bool = Field(False, description="Has IEP")
    accommodations_count: int = Field(0, ge=0, description="Number of accommodations")
    support_services: int = Field(0, ge=0, description="Number of support services")
    
    # Optional
    school_id: Optional[str] = Field(None, description="School identifier")
    teacher_id: Optional[str] = Field(None, description="Teacher identifier")


class RiskFactorResponse(BaseModel):
    """Risk factor with contribution"""
    factor: str
    contribution: float


class RiskPredictionResponse(BaseModel):
    """Risk prediction result"""
    student_id: str
    risk_score: float
    risk_level: str
    risk_factors: List[RiskFactorResponse]
    recommended_interventions: List[str]
    confidence: float
    timestamp: str
    model_version: str


class BatchPredictionRequest(BaseModel):
    """Request for batch predictions"""
    students: List[StudentFeaturesRequest]
    risk_threshold: Optional[float] = Field(None, ge=0, le=1, description="Filter threshold")


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions"""
    success: bool
    predictions: List[RiskPredictionResponse]
    total_students: int
    at_risk_count: int
    processing_time_ms: float


class SchoolSummaryResponse(BaseModel):
    """School-wide risk summary"""
    success: bool
    total_students: int
    risk_distribution: Dict[str, int]
    at_risk_count: int
    at_risk_rate: float
    avg_risk_score: float
    median_risk_score: float
    top_risk_factors: List[Dict[str, Any]]
    critical_students: List[str]


class TrainingDataItem(BaseModel):
    """Training data item"""
    features: StudentFeaturesRequest
    is_at_risk: bool


class TrainingRequest(BaseModel):
    """Request to train model"""
    training_data: List[TrainingDataItem]
    test_size: float = Field(0.2, ge=0.1, le=0.4)


class TrainingResponse(BaseModel):
    """Training response"""
    success: bool
    metrics: Dict[str, float]
    feature_importances: List[Dict[str, Any]]


class FeatureImportanceResponse(BaseModel):
    """Feature importance response"""
    success: bool
    features: List[Dict[str, Any]]


class ModelStatsResponse(BaseModel):
    """Model statistics response"""
    success: bool
    stats: Dict[str, Any]


def get_risk_predictor(request: Request) -> AtRiskPredictor:
    """Get risk predictor from app state"""
    predictor = getattr(request.app.state, 'risk_predictor', None)
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail="Risk predictor not initialized"
        )
    return predictor


def _convert_to_student_features(req: StudentFeaturesRequest) -> StudentFeatures:
    """Convert request to StudentFeatures"""
    return StudentFeatures(
        student_id=req.student_id,
        avg_accuracy=req.avg_accuracy,
        accuracy_trend=req.accuracy_trend,
        practice_frequency=req.practice_frequency,
        skills_mastered=req.skills_mastered,
        skills_struggling=req.skills_struggling,
        grade_level=req.grade_level,
        avg_session_duration=req.avg_session_duration,
        session_consistency=req.session_consistency,
        total_practice_time=req.total_practice_time,
        completion_rate=req.completion_rate,
        login_streak=req.login_streak,
        avg_focus_score=req.avg_focus_score,
        frustration_events=req.frustration_events,
        help_seeking_rate=req.help_seeking_rate,
        quit_rate=req.quit_rate,
        days_since_last_session=req.days_since_last_session,
        longest_gap_days=req.longest_gap_days,
        time_of_day_variance=req.time_of_day_variance,
        has_iep=req.has_iep,
        accommodations_count=req.accommodations_count,
        support_services=req.support_services,
        school_id=req.school_id,
        teacher_id=req.teacher_id,
    )


def _convert_prediction_to_response(pred: RiskPrediction) -> RiskPredictionResponse:
    """Convert RiskPrediction to response model"""
    return RiskPredictionResponse(
        student_id=pred.student_id,
        risk_score=pred.risk_score,
        risk_level=pred.risk_level,
        risk_factors=[
            RiskFactorResponse(factor=f, contribution=c)
            for f, c in pred.risk_factors
        ],
        recommended_interventions=pred.recommended_interventions,
        confidence=pred.confidence,
        timestamp=pred.timestamp.isoformat(),
        model_version=pred.model_version,
    )


@router.post("/predict", response_model=RiskPredictionResponse)
async def predict_risk(
    features: StudentFeaturesRequest,
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> RiskPredictionResponse:
    """
    Predict risk for a single student
    
    Returns risk score, level, contributing factors, and recommended interventions.
    """
    start_time = time.perf_counter()
    
    try:
        student_features = _convert_to_student_features(features)
        prediction = predictor.predict(student_features)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            "Generated risk prediction",
            student_id=features.student_id,
            risk_score=prediction.risk_score,
            risk_level=prediction.risk_level,
            processing_time_ms=processing_time,
        )
        
        return _convert_prediction_to_response(prediction)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Risk prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_risk_batch(
    request: BatchPredictionRequest,
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> BatchPredictionResponse:
    """
    Predict risk for multiple students
    
    Optionally filter results by risk threshold.
    Returns predictions sorted by risk score (highest first).
    """
    start_time = time.perf_counter()
    
    try:
        student_features = [
            _convert_to_student_features(s) for s in request.students
        ]
        
        predictions = predictor.batch_predict(
            student_features,
            risk_threshold=request.risk_threshold
        )
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        # Count at-risk (high + critical)
        at_risk_count = sum(
            1 for p in predictions
            if p.risk_level in ('high', 'critical')
        )
        
        logger.info(
            "Generated batch risk predictions",
            total_students=len(request.students),
            predictions_returned=len(predictions),
            at_risk_count=at_risk_count,
            processing_time_ms=processing_time,
        )
        
        return BatchPredictionResponse(
            success=True,
            predictions=[_convert_prediction_to_response(p) for p in predictions],
            total_students=len(request.students),
            at_risk_count=at_risk_count,
            processing_time_ms=processing_time,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Batch prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary", response_model=SchoolSummaryResponse)
async def get_school_summary(
    request: BatchPredictionRequest,
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> SchoolSummaryResponse:
    """
    Generate school-wide risk summary
    
    Provides aggregate statistics, risk distribution, and top risk factors.
    """
    try:
        student_features = [
            _convert_to_student_features(s) for s in request.students
        ]
        
        predictions = predictor.batch_predict(student_features)
        summary = predictor.get_school_summary(predictions)
        
        logger.info(
            "Generated school risk summary",
            total_students=summary['total_students'],
            at_risk_rate=summary['at_risk_rate'],
        )
        
        return SchoolSummaryResponse(
            success=True,
            **summary
        )
        
    except Exception as e:
        logger.exception("School summary failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train", response_model=TrainingResponse)
async def train_model(
    request: TrainingRequest,
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> TrainingResponse:
    """
    Train the risk prediction model
    
    Requires labeled training data (student features + at_risk labels).
    """
    try:
        if len(request.training_data) < 50:
            raise HTTPException(
                status_code=400,
                detail="Need at least 50 training samples"
            )
        
        training_data = [
            (_convert_to_student_features(item.features), item.is_at_risk)
            for item in request.training_data
        ]
        
        metrics = predictor.train(training_data, test_size=request.test_size)
        
        logger.info(
            "Trained risk predictor",
            samples=len(training_data),
            test_auc=metrics.get('test_auc'),
        )
        
        return TrainingResponse(
            success=True,
            metrics=metrics,
            feature_importances=predictor.get_feature_importance_report(),
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Training failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-importance", response_model=FeatureImportanceResponse)
async def get_feature_importance(
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> FeatureImportanceResponse:
    """
    Get feature importance rankings
    
    Shows which features contribute most to risk predictions.
    """
    try:
        if not predictor.is_trained:
            raise HTTPException(
                status_code=400,
                detail="Model not trained"
            )
        
        return FeatureImportanceResponse(
            success=True,
            features=predictor.get_feature_importance_report(),
        )
        
    except Exception as e:
        logger.exception("Feature importance retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=ModelStatsResponse)
async def get_model_stats(
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> ModelStatsResponse:
    """
    Get model statistics and configuration
    """
    try:
        return ModelStatsResponse(
            success=True,
            stats=predictor.get_stats(),
        )
        
    except Exception as e:
        logger.exception("Stats retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_model(
    path: str = Query("/app/models/risk_predictor.pkl"),
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)] = None,
) -> Dict[str, Any]:
    """
    Save trained model to disk
    """
    try:
        if not predictor.is_trained:
            raise HTTPException(
                status_code=400,
                detail="Model not trained - nothing to save"
            )
        
        predictor.save_model(path)
        
        logger.info("Saved risk predictor model", path=path)
        
        return {
            "success": True,
            "path": path,
            "message": "Model saved",
        }
        
    except Exception as e:
        logger.exception("Model save failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/load")
async def load_model(
    path: str = Query("/app/models/risk_predictor.pkl"),
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)] = None,
) -> Dict[str, Any]:
    """
    Load trained model from disk
    """
    try:
        predictor.load_model(path)
        
        logger.info("Loaded risk predictor model", path=path)
        
        return {
            "success": True,
            "path": path,
            "stats": predictor.get_stats(),
            "message": "Model loaded",
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model not found at {path}")
    except Exception as e:
        logger.exception("Model load failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thresholds")
async def get_thresholds(
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)],
) -> Dict[str, Any]:
    """
    Get risk level thresholds
    """
    return {
        "success": True,
        "thresholds": {
            "low_max": predictor.thresholds.low_max,
            "moderate_max": predictor.thresholds.moderate_max,
            "high_max": predictor.thresholds.high_max,
        },
        "interpretation": {
            "low": f"0.0 - {predictor.thresholds.low_max}",
            "moderate": f"{predictor.thresholds.low_max} - {predictor.thresholds.moderate_max}",
            "high": f"{predictor.thresholds.moderate_max} - {predictor.thresholds.high_max}",
            "critical": f"{predictor.thresholds.high_max} - 1.0",
        }
    }


@router.post("/thresholds")
async def update_thresholds(
    low_max: float = Query(0.3, ge=0, le=1),
    moderate_max: float = Query(0.5, ge=0, le=1),
    high_max: float = Query(0.7, ge=0, le=1),
    predictor: Annotated[AtRiskPredictor, Depends(get_risk_predictor)] = None,
) -> Dict[str, Any]:
    """
    Update risk level thresholds
    """
    if not (low_max < moderate_max < high_max):
        raise HTTPException(
            status_code=400,
            detail="Thresholds must be in order: low_max < moderate_max < high_max"
        )
    
    predictor.thresholds = RiskThresholds(
        low_max=low_max,
        moderate_max=moderate_max,
        high_max=high_max,
    )
    
    logger.info(
        "Updated risk thresholds",
        low_max=low_max,
        moderate_max=moderate_max,
        high_max=high_max,
    )
    
    return {
        "success": True,
        "message": "Thresholds updated",
        "thresholds": {
            "low_max": low_max,
            "moderate_max": moderate_max,
            "high_max": high_max,
        }
    }
