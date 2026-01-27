"""Multimodal Analytics Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models import (
    FeatureFusioner,
    CrossModalAnalyzer,
    LearningStyleDetector,
    HolisticAnalyzer,
)
from app.services import DataAggregator, InsightGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model instances
feature_fusioner = FeatureFusioner(fusion_method="attention")
cross_modal_analyzer = CrossModalAnalyzer()
learning_style_detector = LearningStyleDetector(model="vark")
holistic_analyzer = HolisticAnalyzer()
insight_generator = InsightGenerator()
data_aggregator = DataAggregator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Multimodal Analytics Service...")
    logger.info("Models loaded: FeatureFusioner, CrossModalAnalyzer, LearningStyleDetector, HolisticAnalyzer")
    logger.info("Services loaded: InsightGenerator, DataAggregator")
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


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "healthy", "service": "multimodal-analytics-svc"}


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
