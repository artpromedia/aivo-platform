"""Multimodal Analytics Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from datetime import datetime

import numpy as np
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models import (
    FeatureFusioner,
    CrossModalAnalyzer,
    LearningStyleDetector,
    HolisticAnalyzer,
)
from app.services import (
    DataAggregator,
    InsightGenerator,
    EventIngestionService,
    PrivacyComplianceService,
    AnalyticsEngine,
    EngagementPredictor,
    ContentRecommender,
    AnomalyDetector,
    OutcomePredictor,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model instances
feature_fusioner = FeatureFusioner(fusion_method="attention")
cross_modal_analyzer = CrossModalAnalyzer()
learning_style_detector = LearningStyleDetector(model="vark")
holistic_analyzer = HolisticAnalyzer()
insight_generator = InsightGenerator()
data_aggregator = DataAggregator()

# Initialize new services
event_ingestion = EventIngestionService()
privacy_service = PrivacyComplianceService(strict_coppa=True)
analytics_engine = AnalyticsEngine()
engagement_predictor = EngagementPredictor()
content_recommender = ContentRecommender()
anomaly_detector = AnomalyDetector()
outcome_predictor = OutcomePredictor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Multimodal Analytics Service...")
    logger.info("Models loaded: FeatureFusioner, CrossModalAnalyzer, LearningStyleDetector, HolisticAnalyzer")
    logger.info("Services loaded: InsightGenerator, DataAggregator, EventIngestion, Privacy, Analytics, ML Models")
    yield
    logger.info("Shutting down Multimodal Analytics Service...")


app = FastAPI(
    title="Multimodal Analytics Service",
    description="""
Cross-modal learning analytics and insights.

## Features

- **Feature Fusion**: Combine signals from multiple modalities
- **Cross-Modal Correlation**: Find patterns across modalities
- **Learning Style Detection**: Infer learning preferences
- **Holistic Analysis**: Comprehensive learner insights
    """,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MultimodalInput(BaseModel):
    learner_id: str
    text_features: Optional[Dict[str, Any]] = None
    audio_features: Optional[Dict[str, Any]] = None
    video_features: Optional[Dict[str, Any]] = None
    interaction_features: Optional[Dict[str, Any]] = None


class AnalyticsRequest(BaseModel):
    learner_id: str
    time_range: Optional[str] = "7d"
    modalities: List[str] = ["text", "interaction"]
    data: Optional[Dict[str, Any]] = None


class InsightRequest(BaseModel):
    learner_id: str
    analytics_data: Optional[Dict[str, Any]] = None


# ============================================================================
# New Request/Response Models for Event Ingestion & Analytics
# ============================================================================

class EventData(BaseModel):
    """Single learning event data."""
    event_type: str = Field(description="Type of event (video_play, document_scroll, etc.)")
    student_id: str = Field(description="Student identifier")
    content_id: str = Field(description="Content identifier")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    device_type: Optional[str] = Field(default="unknown", description="Device type")
    duration_ms: Optional[int] = Field(default=None, description="Duration in milliseconds")
    position: Optional[float] = Field(default=None, description="Position in content (0-1)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class BatchEventRequest(BaseModel):
    """Batch event ingestion request."""
    events: List[EventData] = Field(description="List of events to ingest")
    validate_events: bool = Field(default=True, description="Whether to validate events")


class ConsentRequest(BaseModel):
    """Consent management request."""
    user_id: str
    consent_type: str = Field(description="Type of consent (analytics, personalization, etc.)")
    is_minor: bool = Field(default=False, description="Whether user is a minor (COPPA)")
    parent_guardian_id: Optional[str] = Field(default=None, description="Parent/guardian ID for minors")
    expires_in_days: Optional[int] = Field(default=None, description="Consent expiration period")


class PrivacyConfigRequest(BaseModel):
    """Privacy configuration request."""
    user_id: str
    is_minor: bool = False
    consent_required: bool = True
    consents: Dict[str, bool] = Field(default_factory=dict)
    data_retention: str = "90d"
    anonymize_by_default: bool = False


class ContentAnalyticsRequest(BaseModel):
    """Request for content analytics."""
    content_id: str
    time_range: Optional[str] = "30d"
    include_events: bool = False


class RecommendationRequest(BaseModel):
    """Request for content recommendations."""
    student_id: str
    available_content: List[Dict[str, Any]] = Field(default_factory=list)
    learning_objectives: Optional[List[str]] = None
    limit: int = 5


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "healthy", "service": "multimodal-analytics-svc"}


# ============================================================================
# Event Ingestion Endpoints
# ============================================================================

@app.post("/api/v1/events/ingest")
async def ingest_events(request: BatchEventRequest) -> Dict[str, Any]:
    """
    Ingest learning events from multiple sources.
    
    Supports:
    - Video interaction events (play, pause, seek, complete)
    - Audio engagement signals
    - Document interaction tracking
    - Assessment response patterns
    - Multi-device session stitching
    
    Optimized for high throughput (10K+ events/second).
    """
    logger.info(f"Ingesting batch of {len(request.events)} events")
    
    try:
        # Convert to dicts
        events_data = [e.model_dump() for e in request.events]
        
        # Ingest batch
        result = await event_ingestion.ingest_batch(
            events=events_data,
            validate=request.validate_events,
        )
        
        return {
            "status": "success",
            "total_events": result.total_events,
            "successful": result.successful,
            "failed": result.failed,
            "sessions_updated": result.sessions_updated,
            "processing_time_ms": result.processing_time_ms,
            "throughput_events_per_sec": result.throughput_events_per_sec,
            "errors": result.errors,
        }
    except Exception as e:
        logger.error(f"Event ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")


@app.post("/api/v1/events/single")
async def ingest_single_event(event: EventData) -> Dict[str, Any]:
    """Ingest a single learning event."""
    logger.info(f"Ingesting single event: {event.event_type} for student {event.student_id}")
    
    try:
        result = await event_ingestion.ingest_event(event.model_dump())
        
        return {
            "status": "success" if result.success else "failed",
            "events_ingested": result.events_ingested,
            "session_id": result.session_id,
            "warnings": result.warnings,
            "errors": result.errors,
        }
    except Exception as e:
        logger.error(f"Single event ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")


@app.get("/api/v1/events/metrics")
async def get_ingestion_metrics() -> Dict[str, Any]:
    """Get event ingestion metrics."""
    metrics = event_ingestion.get_metrics()
    return {
        "status": "success",
        "metrics": metrics,
    }


# ============================================================================
# Content Analytics Endpoints
# ============================================================================

@app.get("/api/v1/content/{content_id}/analytics")
async def get_content_analytics(
    content_id: str = Path(description="Content identifier"),
    time_range: str = Query(default="30d", description="Time range for analytics"),
) -> Dict[str, Any]:
    """
    Get analytics for specific content.
    
    Returns:
    - Engagement scoring by content type
    - Attention analysis (video watch patterns)
    - Content effectiveness metrics
    - Student interaction patterns
    """
    logger.info(f"Getting analytics for content {content_id}")
    
    try:
        # Get events for this content
        events = event_ingestion.get_content_events(content_id)
        
        if not events:
            return {
                "status": "no_data",
                "content_id": content_id,
                "message": "No events found for this content",
                "analytics": None,
            }
        
        # Compute engagement
        engagement = analytics_engine.compute_engagement(
            [e.__dict__ if hasattr(e, '__dict__') else e for e in events],
            time_period=time_range,
        )
        
        # Analyze attention (for video/audio)
        attention = analytics_engine.analyze_attention(
            [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
        )
        
        # Compute effectiveness
        effectiveness = analytics_engine.compute_content_effectiveness(
            content_id,
            [e.__dict__ if hasattr(e, '__dict__') else e for e in events],
        )
        
        return {
            "status": "success",
            "content_id": content_id,
            "time_range": time_range,
            "total_events": len(events),
            "unique_students": len(set(e.student_id if hasattr(e, 'student_id') else e.get('student_id', '') for e in events)),
            "engagement": {
                "score": engagement.score,
                "level": engagement.level,
                "components": engagement.components,
                "confidence": engagement.confidence,
            },
            "attention": {
                "completion_rate": attention.completion_rate,
                "average_watch_percent": attention.average_watch_time_percent,
                "rewatch_rate": attention.rewatch_rate,
                "skip_rate": attention.skip_rate,
                "attention_score": attention.attention_score,
                "attention_drops": attention.attention_drops[:5],
                "peak_attention_points": attention.peak_attention_points[:5],
            },
            "effectiveness": {
                "score": effectiveness.effectiveness_score,
                "completion_rate": effectiveness.completion_rate,
                "learning_outcome_correlation": effectiveness.learning_outcome_correlation,
                "student_satisfaction": effectiveness.student_satisfaction,
                "difficulty_alignment": effectiveness.difficulty_alignment,
                "recommendations": effectiveness.recommendations,
            },
        }
    except Exception as e:
        logger.error(f"Content analytics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


# ============================================================================
# Student Engagement Endpoints
# ============================================================================

@app.get("/api/v1/students/{student_id}/engagement")
async def get_student_engagement(
    student_id: str = Path(description="Student identifier"),
    time_range: str = Query(default="30d", description="Time range for analysis"),
    include_recommendations: bool = Query(default=True, description="Include recommendations"),
) -> Dict[str, Any]:
    """
    Get engagement analytics for a student.
    
    Returns:
    - Overall engagement score
    - Engagement by content type
    - Engagement trends
    - Cross-modal learning correlations
    - At-risk indicators
    - Personalized recommendations
    """
    logger.info(f"Getting engagement for student {student_id}")
    
    try:
        # Get student events
        events = event_ingestion.get_student_events(student_id)
        
        if not events:
            return {
                "status": "no_data",
                "student_id": student_id,
                "message": "No events found for this student",
                "engagement": None,
            }
        
        # Convert events to dicts
        events_data = [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
        
        # Compute engagement profile
        profile = analytics_engine.compute_student_engagement_profile(
            student_id, events_data
        )
        
        # Check for anomalies
        anomalies = analytics_engine.detect_anomalies(events_data, student_id)
        
        # Get sessions
        sessions = event_ingestion.get_student_sessions(student_id, limit=10)
        
        response = {
            "status": "success",
            "student_id": student_id,
            "time_range": time_range,
            "total_events": len(events),
            "profile": {
                "overall_engagement": profile.overall_engagement,
                "engagement_by_content_type": profile.engagement_by_content_type,
                "engagement_trend": profile.engagement_trend,
                "peak_engagement_times": profile.peak_engagement_times,
                "preferred_content_types": profile.preferred_content_types,
                "at_risk_indicators": profile.at_risk_indicators,
            },
            "sessions": [
                {
                    "session_id": s.session_id,
                    "start_time": s.start_time.isoformat() if hasattr(s.start_time, 'isoformat') else str(s.start_time),
                    "devices_used": s.devices_used,
                    "events_count": s.events_count,
                    "content_count": len(s.content_accessed),
                }
                for s in sessions[:5]
            ],
            "anomalies": anomalies[:3] if anomalies else [],
        }
        
        if include_recommendations:
            response["recommendations"] = profile.recommendations
        
        return response
    except Exception as e:
        logger.error(f"Student engagement failed: {e}")
        raise HTTPException(status_code=500, detail=f"Engagement error: {str(e)}")


# ============================================================================
# Reports Endpoints
# ============================================================================

@app.get("/api/v1/reports/content-effectiveness")
async def get_content_effectiveness_report(
    time_range: str = Query(default="30d", description="Time range"),
    content_type: Optional[str] = Query(default=None, description="Filter by content type"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum items"),
) -> Dict[str, Any]:
    """
    Get content effectiveness report.
    
    Returns ranked list of content by effectiveness with:
    - Engagement metrics
    - Completion rates
    - Learning outcome correlations
    - Improvement recommendations
    """
    logger.info(f"Generating content effectiveness report")
    
    try:
        # Get all content IDs from events
        metrics = event_ingestion.get_metrics()
        
        # In production, would query actual content database
        # For now, aggregate from events
        content_reports = []
        
        # Get sample content analytics
        # This would iterate through actual content in production
        sample_content_ids = ["content_1", "content_2", "content_3"]
        
        for content_id in sample_content_ids:
            events = event_ingestion.get_content_events(content_id)
            if events:
                events_data = [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
                effectiveness = analytics_engine.compute_content_effectiveness(
                    content_id, events_data
                )
                content_reports.append({
                    "content_id": content_id,
                    "content_type": effectiveness.content_type,
                    "effectiveness_score": effectiveness.effectiveness_score,
                    "engagement_score": effectiveness.engagement_score,
                    "completion_rate": effectiveness.completion_rate,
                    "student_satisfaction": effectiveness.student_satisfaction,
                    "recommendations": effectiveness.recommendations,
                })
        
        # Sort by effectiveness
        content_reports.sort(key=lambda x: x["effectiveness_score"], reverse=True)
        
        # Add rankings
        for i, report in enumerate(content_reports):
            report["rank"] = i + 1
        
        return {
            "status": "success",
            "time_range": time_range,
            "content_type_filter": content_type,
            "total_content_analyzed": len(content_reports),
            "content_reports": content_reports[:limit],
            "summary": {
                "avg_effectiveness": np.mean([r["effectiveness_score"] for r in content_reports]) if content_reports else 0,
                "avg_completion": np.mean([r["completion_rate"] for r in content_reports]) if content_reports else 0,
                "top_performing_type": content_reports[0]["content_type"] if content_reports else None,
            },
        }
    except Exception as e:
        logger.error(f"Content effectiveness report failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report error: {str(e)}")


# ============================================================================
# Insights & Recommendations Endpoints
# ============================================================================

@app.get("/api/v1/insights/recommendations")
async def get_recommendations(
    student_id: str = Query(description="Student identifier"),
    limit: int = Query(default=5, ge=1, le=20, description="Maximum recommendations"),
) -> Dict[str, Any]:
    """
    Get personalized content recommendations.
    
    Uses ML models to predict:
    - Content relevance
    - Engagement likelihood
    - Learning outcome optimization
    """
    logger.info(f"Generating recommendations for student {student_id}")
    
    try:
        # Get student events
        events = event_ingestion.get_student_events(student_id)
        events_data = [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
        
        # Get student profile
        profile = analytics_engine.compute_student_engagement_profile(
            student_id, events_data
        )
        
        # Sample available content (would come from content service in production)
        available_content = [
            {"id": "video_intro_math", "type": "video", "topics": ["math", "algebra"], "difficulty": 0.3},
            {"id": "doc_advanced_calc", "type": "document", "topics": ["math", "calculus"], "difficulty": 0.7},
            {"id": "quiz_algebra", "type": "assessment", "topics": ["math", "algebra"], "difficulty": 0.5},
            {"id": "video_physics_101", "type": "video", "topics": ["physics", "mechanics"], "difficulty": 0.4},
            {"id": "interactive_chem", "type": "interactive", "topics": ["chemistry"], "difficulty": 0.5},
        ]
        
        # Get recommendations
        recommendations = analytics_engine.generate_content_recommendations(
            student_id,
            profile,
            available_content,
            limit=limit,
        )
        
        # Predict engagement for top recommendations
        recommendation_results = []
        for rec in recommendations:
            prediction = engagement_predictor.predict(
                student_id=student_id,
                content_id=rec.content_id,
                content_type=rec.content_type,
                student_profile={
                    "engagement_by_content_type": profile.engagement_by_content_type,
                    "engagement_trend": profile.engagement_trend,
                },
            )
            
            recommendation_results.append({
                "content_id": rec.content_id,
                "content_type": rec.content_type,
                "relevance_score": rec.relevance_score,
                "predicted_engagement": rec.predicted_engagement,
                "ml_predicted_engagement": prediction.predicted_score,
                "ml_confidence": prediction.confidence,
                "reasoning": rec.reasoning,
                "priority": rec.priority,
            })
        
        return {
            "status": "success",
            "student_id": student_id,
            "recommendations": recommendation_results,
            "student_profile_summary": {
                "overall_engagement": profile.overall_engagement,
                "engagement_trend": profile.engagement_trend,
                "preferred_content_types": profile.preferred_content_types,
            },
        }
    except Exception as e:
        logger.error(f"Recommendations failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@app.post("/api/v1/insights/predict-outcome")
async def predict_learning_outcome(
    student_id: str = Query(description="Student identifier"),
) -> Dict[str, Any]:
    """
    Predict learning outcomes for a student.
    
    Uses ML models to predict:
    - Success probability
    - Risk factors
    - Recommended interventions
    """
    logger.info(f"Predicting outcome for student {student_id}")
    
    try:
        # Get student data
        events = event_ingestion.get_student_events(student_id)
        events_data = [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
        
        # Get engagement profile
        profile = analytics_engine.compute_student_engagement_profile(
            student_id, events_data
        )
        
        # Predict outcome
        prediction = outcome_predictor.predict(
            student_id=student_id,
            engagement_data={
                "overall_engagement": profile.overall_engagement,
                "engagement_trend": profile.engagement_trend,
                "at_risk_indicators": profile.at_risk_indicators,
            },
        )
        
        return {
            "status": "success",
            "student_id": student_id,
            "prediction": {
                "outcome": prediction.outcome,
                "probability": prediction.probability,
                "confidence_interval": prediction.confidence_interval,
                "risk_factors": prediction.risk_factors,
                "protective_factors": prediction.protective_factors,
                "recommended_interventions": prediction.interventions,
            },
        }
    except Exception as e:
        logger.error(f"Outcome prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/v1/insights/detect-anomalies")
async def detect_anomalies(
    student_id: str = Query(description="Student identifier"),
    content_id: Optional[str] = Query(default=None, description="Optional content filter"),
) -> Dict[str, Any]:
    """
    Detect anomalies in learning behavior.
    
    Identifies potential:
    - Cheating indicators
    - Unusual patterns
    - Account sharing
    """
    logger.info(f"Detecting anomalies for student {student_id}")
    
    try:
        # Get student events
        events = event_ingestion.get_student_events(student_id)
        events_data = [e.__dict__ if hasattr(e, '__dict__') else e for e in events]
        
        # Detect anomalies
        result = anomaly_detector.detect(
            events=events_data,
            student_id=student_id,
            content_id=content_id,
        )
        
        return {
            "status": "success",
            "student_id": student_id,
            "content_id": content_id,
            "anomaly_detection": {
                "is_anomaly": result.is_anomaly,
                "anomaly_score": result.anomaly_score,
                "anomaly_type": result.anomaly_type,
                "risk_level": result.risk_level,
                "indicators": result.indicators,
                "confidence": result.confidence,
                "recommended_action": result.recommended_action,
            },
        }
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


# ============================================================================
# Privacy & Compliance Endpoints
# ============================================================================

@app.post("/api/v1/privacy/consent")
async def manage_consent(request: ConsentRequest) -> Dict[str, Any]:
    """
    Grant or manage user consent for data collection.
    
    Supports:
    - COPPA-compliant consent for minors
    - Parent/guardian verification
    - Consent expiration
    """
    logger.info(f"Managing consent for user {request.user_id}")
    
    try:
        consent = privacy_service.grant_consent(
            user_id=request.user_id,
            consent_type=request.consent_type,
            is_minor=request.is_minor,
            parent_guardian_id=request.parent_guardian_id,
            expires_in_days=request.expires_in_days,
        )
        
        return {
            "status": "success",
            "consent": {
                "user_id": consent.user_id,
                "consent_type": consent.consent_type,
                "granted": consent.granted,
                "timestamp": consent.timestamp.isoformat(),
                "expires_at": consent.expires_at.isoformat() if consent.expires_at else None,
                "is_minor": consent.is_minor,
                "parent_guardian_verified": consent.parent_guardian_id is not None,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Consent management failed: {e}")
        raise HTTPException(status_code=500, detail=f"Consent error: {str(e)}")


@app.delete("/api/v1/privacy/consent/{user_id}/{consent_type}")
async def revoke_consent(
    user_id: str = Path(description="User identifier"),
    consent_type: str = Path(description="Type of consent to revoke"),
) -> Dict[str, Any]:
    """Revoke user consent."""
    logger.info(f"Revoking consent {consent_type} for user {user_id}")
    
    revoked = privacy_service.revoke_consent(user_id, consent_type)
    
    return {
        "status": "success" if revoked else "not_found",
        "user_id": user_id,
        "consent_type": consent_type,
        "revoked": revoked,
    }


@app.get("/api/v1/privacy/consent/{user_id}")
async def get_user_consents(
    user_id: str = Path(description="User identifier"),
) -> Dict[str, Any]:
    """Get all consent records for a user."""
    consents = privacy_service.get_user_consents(user_id)
    
    return {
        "status": "success",
        "user_id": user_id,
        "consents": {
            ctype: {
                "granted": c.granted,
                "timestamp": c.timestamp.isoformat(),
                "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                "is_minor": c.is_minor,
            }
            for ctype, c in consents.items()
        },
    }


@app.post("/api/v1/privacy/config")
async def set_privacy_config(request: PrivacyConfigRequest) -> Dict[str, Any]:
    """Set privacy configuration for a user."""
    logger.info(f"Setting privacy config for user {request.user_id}")
    
    try:
        config = privacy_service.set_privacy_config(
            user_id=request.user_id,
            config=request.model_dump(),
        )
        
        return {
            "status": "success",
            "config": {
                "user_id": config.user_id,
                "is_minor": config.is_minor,
                "consent_required": config.consent_required,
                "data_retention": config.data_retention,
                "anonymize_by_default": config.anonymize_by_default,
                "parent_consent_required": config.parent_consent_required,
            },
        }
    except Exception as e:
        logger.error(f"Privacy config failed: {e}")
        raise HTTPException(status_code=500, detail=f"Config error: {str(e)}")


@app.get("/api/v1/privacy/compliance/{user_id}")
async def get_compliance_report(
    user_id: str = Path(description="User identifier"),
) -> Dict[str, Any]:
    """Get compliance report for a user."""
    logger.info(f"Generating compliance report for user {user_id}")
    
    try:
        report = privacy_service.generate_compliance_report(user_id)
        
        return {
            "status": "success",
            "report": {
                "user_id": report.user_id,
                "is_compliant": report.is_compliant,
                "coppa_compliant": report.coppa_compliant,
                "gdpr_compliant": report.gdpr_compliant,
                "issues": report.issues,
                "recommendations": report.recommendations,
                "last_audit": report.last_audit.isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Compliance report failed: {e}")
        raise HTTPException(status_code=500, detail=f"Compliance error: {str(e)}")


@app.post("/api/v1/privacy/anonymize")
async def anonymize_data(
    data: Dict[str, Any],
    user_id: Optional[str] = Query(default=None, description="User ID for consistent pseudonymization"),
    level: str = Query(default="standard", description="Anonymization level (minimal, standard, strict)"),
) -> Dict[str, Any]:
    """Anonymize data for analytics."""
    logger.info(f"Anonymizing data with level {level}")
    
    try:
        anonymized, result = privacy_service.anonymize_data(
            data=data,
            user_id=user_id,
            level=level,
        )
        
        return {
            "status": "success",
            "anonymized_data": anonymized,
            "anonymization_result": {
                "original_fields_count": result.original_fields_count,
                "anonymized_fields_count": result.anonymized_fields_count,
                "removed_fields": result.removed_fields,
                "pseudonymized_fields": result.pseudonymized_fields,
                "anonymous_id": result.anonymous_id,
                "compliance_level": result.compliance_level,
            },
        }
    except Exception as e:
        logger.error(f"Anonymization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Anonymization error: {str(e)}")


@app.delete("/api/v1/privacy/data/{user_id}")
async def delete_user_data(
    user_id: str = Path(description="User identifier"),
) -> Dict[str, Any]:
    """Delete user data (right to erasure)."""
    logger.info(f"Deleting data for user {user_id}")
    
    try:
        result = privacy_service.delete_user_data(user_id)
        
        return {
            "status": "success",
            "deletion_result": result,
        }
    except Exception as e:
        logger.error(f"Data deletion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Deletion error: {str(e)}")


@app.post("/api/v1/privacy/retention/enforce")
async def enforce_retention(
    user_id: str = Query(description="User identifier"),
) -> Dict[str, Any]:
    """Enforce data retention policies."""
    logger.info(f"Enforcing retention for user {user_id}")
    
    try:
        result = privacy_service.enforce_retention(user_id)
        
        return {
            "status": "success",
            "retention": result,
        }
    except Exception as e:
        logger.error(f"Retention enforcement failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retention error: {str(e)}")


@app.post("/api/v1/fusion/combine")
async def combine_features(input_data: MultimodalInput) -> Dict[str, Any]:
    """Fuse features from multiple modalities."""
    logger.info(f"combine_features called for learner {input_data.learner_id}")

    # Collect available modality features
    features = {}
    modalities_present = []

    if input_data.text_features:
        modalities_present.append("text")
        # Convert dict to numpy array for fusion
        text_values = _extract_numeric_values(input_data.text_features)
        if text_values:
            features["text"] = np.array(text_values)

    if input_data.audio_features:
        modalities_present.append("audio")
        audio_values = _extract_numeric_values(input_data.audio_features)
        if audio_values:
            features["audio"] = np.array(audio_values)

    if input_data.video_features:
        modalities_present.append("video")
        video_values = _extract_numeric_values(input_data.video_features)
        if video_values:
            features["video"] = np.array(video_values)

    if input_data.interaction_features:
        modalities_present.append("interaction")
        interaction_values = _extract_numeric_values(input_data.interaction_features)
        if interaction_values:
            features["interaction"] = np.array(interaction_values)

    if not features:
        return {
            "status": "no_features",
            "message": "No valid numeric features provided for fusion",
            "learner_id": input_data.learner_id,
            "modalities_received": modalities_present,
            "fused_features": None,
            "fusion_method": "none",
        }

    try:
        # Perform feature fusion
        fused_result = feature_fusioner.fuse(features)

        return {
            "status": "success",
            "learner_id": input_data.learner_id,
            "modalities_received": modalities_present,
            "modalities_fused": fused_result.modalities_used,
            "fused_features": fused_result.embedding.tolist(),
            "modality_weights": fused_result.modality_weights,
            "confidence": fused_result.confidence,
            "fusion_method": fused_result.fusion_method,
        }
    except Exception as e:
        logger.error(f"Feature fusion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feature fusion failed: {str(e)}")


@app.post("/api/v1/correlation/analyze")
async def analyze_correlation(request: AnalyticsRequest) -> Dict[str, Any]:
    """Analyze cross-modal correlations."""
    logger.info(f"analyze_correlation called for learner {request.learner_id}")

    # Use provided data or empty dict
    modality_data = request.data or {}

    # If no data provided, return informative response
    if not modality_data:
        return {
            "status": "no_data",
            "message": "No modality data provided for correlation analysis",
            "learner_id": request.learner_id,
            "time_range": request.time_range,
            "modalities": request.modalities,
            "correlations": [],
            "patterns_detected": [],
            "note": "Provide data in the 'data' field for analysis",
        }

    try:
        # Analyze correlations
        correlations = cross_modal_analyzer.analyze_correlations(modality_data)

        # Detect patterns
        patterns = cross_modal_analyzer.detect_patterns(modality_data)

        # Compute consistency
        consistency = cross_modal_analyzer.compute_consistency(modality_data)

        return {
            "status": "success",
            "learner_id": request.learner_id,
            "time_range": request.time_range,
            "modalities": request.modalities,
            "correlations": [
                {
                    "modality_a": c.modality_a,
                    "modality_b": c.modality_b,
                    "correlation": c.correlation,
                    "lag": c.lag,
                    "significance": c.significance,
                    "type": c.correlation_type,
                }
                for c in correlations
            ],
            "patterns_detected": [
                {
                    "type": p.pattern_type,
                    "description": p.description,
                    "confidence": p.confidence,
                    "modalities": p.modalities_involved,
                    "evidence": p.evidence,
                }
                for p in patterns
            ],
            "consistency": {
                "overall": consistency.overall_consistency,
                "pairwise": consistency.pairwise_consistency,
                "inconsistent_modalities": consistency.inconsistent_modalities,
                "recommendations": consistency.recommendations,
            },
        }
    except Exception as e:
        logger.error(f"Correlation analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Correlation analysis failed: {str(e)}")


@app.post("/api/v1/learning-style/detect")
async def detect_learning_style(request: AnalyticsRequest) -> Dict[str, Any]:
    """Detect learner's learning style preferences."""
    logger.info(f"detect_learning_style called for learner {request.learner_id}")

    # Use provided behavioral data
    behavioral_data = request.data or {}

    try:
        # Detect learning style
        style = learning_style_detector.detect_learning_style(behavioral_data)

        # Analyze preferences if data available
        preferences = learning_style_detector.analyze_preferences(behavioral_data)

        # Predict optimal modality
        optimal = learning_style_detector.predict_optimal_modality(style)

        return {
            "status": "success",
            "learner_id": request.learner_id,
            "detected_style": style.primary_style,
            "secondary_style": style.secondary_style,
            "multimodal": style.multimodal,
            "style_preferences": {
                "visual": style.visual,
                "auditory": style.auditory,
                "reading_writing": style.reading_writing,
                "kinesthetic": style.kinesthetic,
            },
            "confidence": style.confidence,
            "modality_preferences": [
                {
                    "modality": p.modality,
                    "preference_score": p.preference_score,
                    "engagement_level": p.engagement_level,
                    "effectiveness_score": p.effectiveness_score,
                }
                for p in preferences
            ],
            "optimal_modality": {
                "recommended": optimal.recommended_modality,
                "confidence": optimal.confidence,
                "scores": optimal.modality_scores,
                "reasoning": optimal.reasoning,
                "content_suggestions": optimal.content_suggestions,
            },
        }
    except Exception as e:
        logger.error(f"Learning style detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Learning style detection failed: {str(e)}")


@app.post("/api/v1/analysis/holistic")
async def holistic_analysis(request: AnalyticsRequest) -> Dict[str, Any]:
    """Generate holistic learner analysis."""
    logger.info(f"holistic_analysis called for learner {request.learner_id}")

    # Use provided multimodal data
    multimodal_data = request.data or {}

    try:
        # Generate holistic profile
        profile = holistic_analyzer.analyze(
            learner_id=request.learner_id,
            data_sources=request.modalities,
            multimodal_data=multimodal_data,
        )

        # Identify patterns
        patterns = holistic_analyzer.identify_patterns(profile)

        # Compute insights
        insights = holistic_analyzer.compute_insights(profile, patterns)

        return {
            "status": "success",
            "learner_id": request.learner_id,
            "time_range": request.time_range,
            "analysis": {
                "overall_score": profile.overall_score,
                "confidence": profile.confidence,
                "cognitive_profile": profile.cognitive_profile,
                "emotional_profile": profile.emotional_profile,
                "behavioral_profile": profile.behavioral_profile,
                "strengths": profile.strengths,
                "growth_areas": profile.growth_areas,
                "recommendations": profile.recommendations,
            },
            "patterns": [
                {
                    "type": p.pattern_type,
                    "description": p.description,
                    "impact": p.impact,
                    "frequency": p.frequency,
                    "evidence": p.evidence,
                    "recommendations": p.recommendations,
                }
                for p in patterns
            ],
            "insights": [
                {
                    "category": i.category,
                    "insight": i.insight,
                    "priority": i.priority,
                    "action_items": i.action_items,
                    "expected_impact": i.expected_impact,
                    "confidence": i.confidence,
                }
                for i in insights
            ],
            "data_sources_analyzed": len(request.modalities),
        }
    except Exception as e:
        logger.error(f"Holistic analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Holistic analysis failed: {str(e)}")


@app.post("/api/v1/insights/generate")
async def generate_insights(request: InsightRequest) -> Dict[str, Any]:
    """Generate actionable insights from multimodal data."""
    logger.info(f"generate_insights called for learner {request.learner_id}")

    # Use provided analytics data
    analytics_data = request.analytics_data or {}

    try:
        # Generate insights
        insights = insight_generator.generate_insights(analytics_data)

        # Identify anomalies
        anomalies = insight_generator.identify_anomalies(analytics_data)

        # Predict outcomes
        predictions = insight_generator.predict_outcomes(analytics_data)

        return {
            "status": "success",
            "learner_id": request.learner_id,
            "insights": [
                {
                    "category": i.category,
                    "finding": i.finding,
                    "confidence": i.confidence,
                    "priority": i.priority,
                    "impact_score": i.impact_score,
                    "action_items": i.action_items,
                    "evidence": i.evidence,
                }
                for i in insights
            ],
            "anomalies": [
                {
                    "type": a.anomaly_type,
                    "metric": a.metric,
                    "severity": a.severity,
                    "description": a.description,
                    "value": a.value,
                    "expected_range": a.expected_range,
                }
                for a in anomalies
            ],
            "predictions": [
                {
                    "outcome_type": p.outcome_type,
                    "prediction": p.prediction,
                    "probability": p.probability,
                    "confidence_interval": p.confidence_interval,
                    "contributing_factors": p.contributing_factors,
                    "recommendations": p.recommendations,
                }
                for p in predictions
            ],
            "actionable_recommendations": _extract_top_recommendations(insights, predictions),
            "ai_insights_available": True,
        }
    except Exception as e:
        logger.error(f"Insight generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")


def _extract_numeric_values(data: Dict[str, Any]) -> List[float]:
    """Extract numeric values from a dictionary."""
    values = []
    for key, value in data.items():
        if isinstance(value, (int, float)):
            values.append(float(value))
        elif isinstance(value, list):
            for v in value:
                if isinstance(v, (int, float)):
                    values.append(float(v))
    return values


def _extract_top_recommendations(insights: List, predictions: List) -> List[str]:
    """Extract top recommendations from insights and predictions."""
    recommendations = []

    # Get high-priority insight actions
    for insight in insights:
        if insight.priority == "high" and insight.action_items:
            recommendations.extend(insight.action_items[:2])

    # Get prediction recommendations
    for prediction in predictions:
        if prediction.probability < 0.5 or prediction.prediction in ["at_risk", "needs_support"]:
            recommendations.extend(prediction.recommendations[:2])

    # Deduplicate and limit
    seen = set()
    unique_recs = []
    for rec in recommendations:
        if rec not in seen:
            seen.add(rec)
            unique_recs.append(rec)
            if len(unique_recs) >= 5:
                break

    # Add generic recommendation if none found
    if not unique_recs:
        unique_recs = [
            "Continue monitoring learner progress through standard metrics",
            "Review performance data periodically",
            "Gather feedback directly from the learner",
        ]

    return unique_recs


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
