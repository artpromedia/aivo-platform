"""
Tests for Multimodal Analytics Service

Comprehensive test suite covering:
- Event ingestion pipeline
- Analytics calculations
- Privacy compliance
- ML models
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.event_ingestion import (
    EventIngestionService,
    LearningEvent,
    SessionInfo,
    EventType,
)
from app.services.privacy_compliance import (
    PrivacyComplianceService,
    ConsentRecord,
    PrivacyConfig,
)
from app.services.analytics_engine import (
    AnalyticsEngine,
    EngagementScore,
    AttentionMetrics,
    ContentEffectiveness,
)
from app.services.ml_models import (
    EngagementPredictor,
    ContentRecommender,
    AnomalyDetector,
    OutcomePredictor,
)


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


@pytest.fixture
def event_service():
    """Event ingestion service fixture."""
    return EventIngestionService()


@pytest.fixture
def privacy_service():
    """Privacy compliance service fixture."""
    return PrivacyComplianceService(strict_coppa=True)


@pytest.fixture
def analytics_engine():
    """Analytics engine fixture."""
    return AnalyticsEngine()


@pytest.fixture
def sample_events():
    """Sample learning events."""
    base_time = datetime.utcnow()
    return [
        {
            "event_type": "video_play",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time - timedelta(minutes=30)).isoformat(),
            "duration_ms": 120000,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "video_pause",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time - timedelta(minutes=28)).isoformat(),
            "duration_ms": 5000,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "video_complete",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time - timedelta(minutes=20)).isoformat(),
            "duration_ms": 600000,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "document_open",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": (base_time - timedelta(minutes=15)).isoformat(),
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "document_scroll",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": (base_time - timedelta(minutes=14)).isoformat(),
            "position": 0.5,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "assessment_answer",
            "student_id": "student_001",
            "content_id": "quiz_001",
            "timestamp": (base_time - timedelta(minutes=5)).isoformat(),
            "duration_ms": 30000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"correct": True},
        },
    ]


# ============================================================================
# API Endpoint Tests
# ============================================================================

class TestHealthEndpoint:
    """Tests for health endpoint."""
    
    def test_health_returns_healthy(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "multimodal-analytics-svc"


class TestEventIngestionEndpoints:
    """Tests for event ingestion endpoints."""
    
    def test_ingest_single_event(self, client):
        """Test single event ingestion."""
        event = {
            "event_type": "video_play",
            "student_id": "test_student",
            "content_id": "test_video",
            "device_type": "desktop",
        }
        
        response = client.post("/api/v1/events/single", json=event)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["events_ingested"] == 1
    
    def test_ingest_batch_events(self, client, sample_events):
        """Test batch event ingestion."""
        request = {
            "events": sample_events,
            "validate_events": True,
        }
        
        response = client.post("/api/v1/events/ingest", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["total_events"] == len(sample_events)
        assert data["successful"] > 0
        assert "throughput_events_per_sec" in data
    
    def test_ingest_invalid_event(self, client):
        """Test ingestion with invalid event."""
        event = {
            "event_type": "video_play",
            # Missing required fields
        }
        
        response = client.post("/api/v1/events/single", json=event)
        # Should fail validation
        assert response.status_code == 422
    
    def test_get_ingestion_metrics(self, client):
        """Test getting ingestion metrics."""
        response = client.get("/api/v1/events/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "total_ingested" in data["metrics"]


class TestContentAnalyticsEndpoints:
    """Tests for content analytics endpoints."""
    
    def test_get_content_analytics_no_data(self, client):
        """Test content analytics with no data."""
        response = client.get("/api/v1/content/unknown_content/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "no_data"
    
    def test_get_content_analytics(self, client, sample_events):
        """Test content analytics after ingestion."""
        # First ingest events
        client.post("/api/v1/events/ingest", json={
            "events": sample_events,
            "validate_events": True,
        })
        
        # Then get analytics
        response = client.get("/api/v1/content/video_001/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "engagement" in data or data["status"] == "no_data"


class TestStudentEngagementEndpoints:
    """Tests for student engagement endpoints."""
    
    def test_get_student_engagement_no_data(self, client):
        """Test student engagement with no data."""
        response = client.get("/api/v1/students/unknown_student/engagement")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "no_data"
    
    def test_get_student_engagement(self, client, sample_events):
        """Test student engagement after ingestion."""
        # First ingest events
        client.post("/api/v1/events/ingest", json={
            "events": sample_events,
            "validate_events": True,
        })
        
        response = client.get("/api/v1/students/student_001/engagement")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


class TestReportsEndpoints:
    """Tests for reports endpoints."""
    
    def test_get_content_effectiveness_report(self, client):
        """Test content effectiveness report."""
        response = client.get("/api/v1/reports/content-effectiveness")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "content_reports" in data
        assert "summary" in data


class TestInsightsEndpoints:
    """Tests for insights endpoints."""
    
    def test_get_recommendations(self, client):
        """Test recommendations endpoint."""
        response = client.get("/api/v1/insights/recommendations?student_id=test_student")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "recommendations" in data
    
    def test_predict_outcome(self, client):
        """Test outcome prediction endpoint."""
        response = client.post("/api/v1/insights/predict-outcome?student_id=test_student")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "prediction" in data
    
    def test_detect_anomalies(self, client, sample_events):
        """Test anomaly detection endpoint."""
        # First ingest some events
        client.post("/api/v1/events/ingest", json={
            "events": sample_events,
            "validate_events": True,
        })
        
        response = client.post("/api/v1/insights/detect-anomalies?student_id=student_001")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "anomaly_detection" in data
    
    def test_detect_anomalies_no_events(self, client):
        """Test anomaly detection with no events."""
        response = client.post("/api/v1/insights/detect-anomalies?student_id=unknown_student")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        # With no events, should return low risk
        assert data["anomaly_detection"]["is_anomaly"] is False


class TestPrivacyEndpoints:
    """Tests for privacy endpoints."""
    
    def test_grant_consent(self, client):
        """Test granting consent."""
        request = {
            "user_id": "test_user",
            "consent_type": "analytics",
            "is_minor": False,
        }
        
        response = client.post("/api/v1/privacy/consent", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["consent"]["granted"] is True
    
    def test_grant_consent_minor_without_parent(self, client):
        """Test granting consent for minor without parent."""
        request = {
            "user_id": "minor_user",
            "consent_type": "analytics",
            "is_minor": True,
            # Missing parent_guardian_id
        }
        
        response = client.post("/api/v1/privacy/consent", json=request)
        assert response.status_code == 400
    
    def test_grant_consent_minor_with_parent(self, client):
        """Test granting consent for minor with parent."""
        request = {
            "user_id": "minor_user",
            "consent_type": "analytics",
            "is_minor": True,
            "parent_guardian_id": "parent_001",
        }
        
        response = client.post("/api/v1/privacy/consent", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["consent"]["parent_guardian_verified"] is True
    
    def test_get_user_consents(self, client):
        """Test getting user consents."""
        # First grant consent
        client.post("/api/v1/privacy/consent", json={
            "user_id": "consent_test_user",
            "consent_type": "analytics",
            "is_minor": False,
        })
        
        response = client.get("/api/v1/privacy/consent/consent_test_user")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "consents" in data
    
    def test_revoke_consent(self, client):
        """Test revoking consent."""
        # First grant consent
        client.post("/api/v1/privacy/consent", json={
            "user_id": "revoke_test_user",
            "consent_type": "analytics",
            "is_minor": False,
        })
        
        response = client.delete("/api/v1/privacy/consent/revoke_test_user/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["revoked"] is True
    
    def test_set_privacy_config(self, client):
        """Test setting privacy config."""
        request = {
            "user_id": "config_test_user",
            "is_minor": False,
            "consent_required": True,
            "data_retention": "90d",
            "anonymize_by_default": True,
        }
        
        response = client.post("/api/v1/privacy/config", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["config"]["anonymize_by_default"] is True
    
    def test_get_compliance_report(self, client):
        """Test getting compliance report."""
        response = client.get("/api/v1/privacy/compliance/test_user")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "report" in data
        assert "coppa_compliant" in data["report"]
    
    def test_anonymize_data(self, client):
        """Test data anonymization."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "score": 85,
            "content_id": "video_001",
        }
        
        response = client.post(
            "/api/v1/privacy/anonymize?level=standard",
            json=data,
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        assert "anonymized_data" in result
        assert result["anonymized_data"]["name"] == "***"
    
    def test_delete_user_data(self, client):
        """Test deleting user data."""
        response = client.delete("/api/v1/privacy/data/delete_test_user")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
    
    def test_enforce_retention(self, client):
        """Test enforcing retention policy."""
        response = client.post("/api/v1/privacy/retention/enforce?user_id=retention_user")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "retention" in data


# ============================================================================
# Event Ingestion Service Unit Tests
# ============================================================================

class TestEventIngestionService:
    """Unit tests for EventIngestionService."""
    
    @pytest.mark.asyncio
    async def test_ingest_single_event(self, event_service):
        """Test ingesting a single event."""
        event = {
            "event_type": "video_play",
            "student_id": "test_student",
            "content_id": "test_content",
        }
        
        result = await event_service.ingest_event(event)
        assert result.success is True
        assert result.events_ingested == 1
    
    @pytest.mark.asyncio
    async def test_ingest_batch(self, event_service, sample_events):
        """Test ingesting a batch of events."""
        result = await event_service.ingest_batch(sample_events)
        assert result.successful > 0
        assert result.throughput_events_per_sec > 0
    
    @pytest.mark.asyncio
    async def test_duplicate_detection(self, event_service):
        """Test duplicate event detection."""
        event = {
            "event_type": "video_play",
            "student_id": "dup_student",
            "content_id": "dup_content",
            "event_id": "unique_event_123",
        }
        
        # First ingestion
        result1 = await event_service.ingest_event(event)
        assert result1.events_ingested == 1
        
        # Second ingestion (duplicate)
        result2 = await event_service.ingest_event(event)
        assert result2.events_ingested == 0
        assert "Duplicate" in result2.warnings[0]
    
    @pytest.mark.asyncio
    async def test_session_stitching(self, event_service):
        """Test multi-device session stitching."""
        base_time = datetime.utcnow()
        
        # Event from desktop
        event1 = {
            "event_type": "video_play",
            "student_id": "stitch_student",
            "content_id": "stitch_content",
            "device_type": "desktop",
            "timestamp": base_time.isoformat(),
        }
        
        # Event from mobile within session gap
        event2 = {
            "event_type": "video_pause",
            "student_id": "stitch_student",
            "content_id": "stitch_content",
            "device_type": "mobile",
            "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
        }
        
        result1 = await event_service.ingest_event(event1)
        result2 = await event_service.ingest_event(event2)
        
        # Should be same session
        assert result1.session_id == result2.session_id
        
        # Session should have multiple devices
        session = event_service.get_session(result1.session_id)
        assert "desktop" in session.devices_used
        assert "mobile" in session.devices_used
    
    @pytest.mark.asyncio
    async def test_validation_errors(self, event_service):
        """Test event validation errors."""
        invalid_event = {
            "event_type": "video_play",
            # Missing student_id and content_id
        }
        
        result = await event_service.ingest_event(invalid_event)
        assert result.success is False
        assert len(result.errors) > 0
    
    def test_get_student_events(self, event_service):
        """Test getting student events."""
        events = event_service.get_student_events("nonexistent_student")
        assert events == []
    
    def test_get_metrics(self, event_service):
        """Test getting metrics."""
        metrics = event_service.get_metrics()
        assert "total_ingested" in metrics
        assert "total_duplicates" in metrics


# ============================================================================
# Privacy Compliance Service Unit Tests
# ============================================================================

class TestPrivacyComplianceService:
    """Unit tests for PrivacyComplianceService."""
    
    def test_anonymize_data_standard(self, privacy_service):
        """Test standard data anonymization."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "score": 85,
            "content_id": "video_001",
        }
        
        anonymized, result = privacy_service.anonymize_data(data, level="standard")
        
        assert anonymized["name"] == "***"
        assert anonymized["email"] == "***@***.***"
        assert anonymized["score"] == 85  # Non-PII preserved
        assert "anonymous_id" in anonymized
        assert len(result.pseudonymized_fields) > 0
    
    def test_anonymize_data_strict(self, privacy_service):
        """Test strict data anonymization."""
        data = {
            "name": "John Doe",
            "phone": "123-456-7890",
            "score": 85,
            "precise_location": "40.7128,-74.0060",
        }
        
        anonymized, result = privacy_service.anonymize_data(data, level="strict")
        
        assert "name" not in anonymized
        assert "phone" not in anonymized
        assert "precise_location" not in anonymized
        assert anonymized["score"] == 85
    
    def test_grant_consent(self, privacy_service):
        """Test granting consent."""
        consent = privacy_service.grant_consent(
            user_id="test_user",
            consent_type="analytics",
            is_minor=False,
        )
        
        assert consent.granted is True
        assert consent.consent_type == "analytics"
    
    def test_coppa_requires_parent_consent(self, privacy_service):
        """Test COPPA requires parent consent for minors."""
        with pytest.raises(ValueError):
            privacy_service.grant_consent(
                user_id="minor_user",
                consent_type="analytics",
                is_minor=True,
                # Missing parent_guardian_id
            )
    
    def test_coppa_with_parent_consent(self, privacy_service):
        """Test COPPA consent with parent."""
        consent = privacy_service.grant_consent(
            user_id="minor_user",
            consent_type="analytics",
            is_minor=True,
            parent_guardian_id="parent_001",
        )
        
        assert consent.granted is True
        assert consent.parent_guardian_id == "parent_001"
    
    def test_check_consent(self, privacy_service):
        """Test checking consent."""
        # Grant consent
        privacy_service.grant_consent(
            user_id="consent_user",
            consent_type="analytics",
            is_minor=False,
        )
        
        assert privacy_service.check_consent("consent_user", "analytics") is True
        assert privacy_service.check_consent("consent_user", "marketing") is False
    
    def test_revoke_consent(self, privacy_service):
        """Test revoking consent."""
        # Grant then revoke
        privacy_service.grant_consent(
            user_id="revoke_user",
            consent_type="analytics",
            is_minor=False,
        )
        
        revoked = privacy_service.revoke_consent("revoke_user", "analytics")
        assert revoked is True
        assert privacy_service.check_consent("revoke_user", "analytics") is False
    
    def test_consent_expiration(self, privacy_service):
        """Test consent expiration."""
        consent = privacy_service.grant_consent(
            user_id="expire_user",
            consent_type="analytics",
            is_minor=False,
            expires_in_days=30,
        )
        
        assert consent.expires_at is not None
        assert consent.expires_at > datetime.utcnow()
    
    def test_coppa_compliance_check(self, privacy_service):
        """Test COPPA compliance check."""
        # Set up minor without parent consent
        privacy_service.set_privacy_config("minor_check", {
            "is_minor": True,
            "parent_consent_required": True,
        })
        
        is_compliant, issues = privacy_service.is_coppa_compliant("minor_check")
        assert is_compliant is False
        assert len(issues) > 0
    
    def test_delete_user_data(self, privacy_service):
        """Test deleting user data."""
        # First create some data
        privacy_service.grant_consent(
            user_id="delete_user",
            consent_type="analytics",
            is_minor=False,
        )
        
        result = privacy_service.delete_user_data("delete_user")
        assert result["status"] == "deleted"
        assert result["deleted_items"]["consents_deleted"] is True
    
    def test_enforcement_retention(self, privacy_service):
        """Test retention policy enforcement."""
        result = privacy_service.enforce_retention("retention_user")
        
        assert "retention_period" in result
        assert "data_expires_at" in result


# ============================================================================
# Analytics Engine Unit Tests
# ============================================================================

class TestAnalyticsEngine:
    """Unit tests for AnalyticsEngine."""
    
    def test_compute_engagement_empty(self, analytics_engine):
        """Test engagement computation with no events."""
        score = analytics_engine.compute_engagement([])
        assert score.score == 0.0
        assert score.level == "very_low"
    
    def test_compute_engagement(self, analytics_engine, sample_events):
        """Test engagement computation."""
        score = analytics_engine.compute_engagement(sample_events)
        assert 0 <= score.score <= 1
        assert score.level in ["very_low", "low", "moderate", "high", "very_high"]
        assert len(score.components) > 0
    
    def test_analyze_attention_empty(self, analytics_engine):
        """Test attention analysis with no events."""
        metrics = analytics_engine.analyze_attention([])
        assert metrics.attention_score == 0.0
    
    def test_analyze_attention(self, analytics_engine, sample_events):
        """Test attention analysis."""
        video_events = [e for e in sample_events if "video" in e["event_type"]]
        metrics = analytics_engine.analyze_attention(video_events)
        
        assert 0 <= metrics.attention_score <= 1
        assert 0 <= metrics.completion_rate <= 1
    
    def test_compute_content_effectiveness(self, analytics_engine, sample_events):
        """Test content effectiveness computation."""
        effectiveness = analytics_engine.compute_content_effectiveness(
            "video_001", sample_events
        )
        
        assert 0 <= effectiveness.effectiveness_score <= 1
        assert len(effectiveness.recommendations) > 0
    
    def test_compute_student_engagement_profile(self, analytics_engine, sample_events):
        """Test student engagement profile."""
        profile = analytics_engine.compute_student_engagement_profile(
            "student_001", sample_events
        )
        
        assert profile.student_id == "student_001"
        assert 0 <= profile.overall_engagement <= 1
        assert profile.engagement_trend in ["improving", "declining", "stable"]
    
    def test_detect_anomalies(self, analytics_engine, sample_events):
        """Test anomaly detection."""
        anomalies = analytics_engine.detect_anomalies(sample_events)
        assert isinstance(anomalies, list)


# ============================================================================
# ML Models Unit Tests
# ============================================================================

class TestEngagementPredictor:
    """Unit tests for EngagementPredictor."""
    
    def test_predict(self):
        """Test engagement prediction."""
        predictor = EngagementPredictor()
        
        prediction = predictor.predict(
            student_id="test_student",
            content_id="test_content",
            content_type="video",
        )
        
        assert 0 <= prediction.predicted_score <= 1
        assert 0 <= prediction.confidence <= 1
        assert len(prediction.factors) > 0
    
    def test_predict_with_profile(self):
        """Test prediction with student profile."""
        predictor = EngagementPredictor()
        
        profile = {
            "engagement_by_content_type": {"video": 0.8},
            "engagement_trend": "improving",
            "peak_engagement_hours": [10, 14],
        }
        
        prediction = predictor.predict(
            student_id="test_student",
            content_id="test_content",
            content_type="video",
            student_profile=profile,
        )
        
        assert prediction.predicted_score > 0.5  # Should be higher with good history
    
    def test_update_history(self):
        """Test updating history."""
        predictor = EngagementPredictor()
        predictor.update_history("student_1", 0.8)
        predictor.update_history("student_1", 0.7)
        
        # Should use history in predictions
        prediction = predictor.predict(
            student_id="student_1",
            content_id="content_1",
            content_type="video",
        )
        
        assert prediction.factors["historical_engagement"] == pytest.approx(0.75, 0.1)


class TestContentRecommender:
    """Unit tests for ContentRecommender."""
    
    def test_score_content(self):
        """Test content scoring."""
        recommender = ContentRecommender()
        
        content = [
            {"id": "video_1", "type": "video", "topics": ["math"], "difficulty": 0.5},
            {"id": "doc_1", "type": "document", "topics": ["math"], "difficulty": 0.3},
        ]
        
        profile = {
            "engagement_by_content_type": {"video": 0.8, "document": 0.5},
            "skill_level": 0.5,
        }
        
        scores = recommender.score_content(content, profile)
        
        assert len(scores) == 2
        assert scores[0].rank == 1  # Highest score first
        assert scores[0].score > scores[1].score


class TestAnomalyDetector:
    """Unit tests for AnomalyDetector."""
    
    def test_detect_no_events(self):
        """Test detection with no events."""
        detector = AnomalyDetector()
        
        result = detector.detect([], "test_student")
        
        assert result.is_anomaly is False
        assert result.anomaly_score == 0.0
    
    def test_detect_normal_behavior(self):
        """Test detection with normal behavior."""
        detector = AnomalyDetector()
        
        events = [
            {
                "event_type": "assessment_answer",
                "student_id": "normal_student",
                "content_id": "quiz_1",
                "duration_ms": 30000,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {"correct": True},
            }
            for _ in range(10)
        ]
        
        result = detector.detect(events, "normal_student")
        
        assert result.risk_level in ["low", "medium"]
    
    def test_detect_rapid_completion_anomaly(self):
        """Test detection of rapid completion anomaly."""
        detector = AnomalyDetector()
        
        events = [
            {
                "event_type": "video_complete",
                "student_id": "suspicious_student",
                "content_id": "video_1",
                "duration_ms": 1000,  # 1 second completion
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {"expected_duration_ms": 600000},  # 10 minutes expected
            }
        ]
        
        result = detector.detect(events, "suspicious_student")
        
        # Should flag as anomaly
        assert len(result.indicators) > 0


class TestOutcomePredictor:
    """Unit tests for OutcomePredictor."""
    
    def test_predict_success(self):
        """Test predicting successful outcome."""
        predictor = OutcomePredictor()
        
        prediction = predictor.predict(
            student_id="success_student",
            engagement_data={
                "overall_engagement": 0.8,
                "engagement_trend": "improving",
                "at_risk_indicators": [],
            },
            performance_data={
                "average_score": 0.85,
                "completion_rate": 0.9,
            },
        )
        
        assert prediction.outcome == "success"
        assert prediction.probability > 0.5
    
    def test_predict_at_risk(self):
        """Test predicting at-risk outcome."""
        predictor = OutcomePredictor()
        
        prediction = predictor.predict(
            student_id="at_risk_student",
            engagement_data={
                "overall_engagement": 0.3,
                "engagement_trend": "declining",
                "at_risk_indicators": ["Low engagement"],
            },
            performance_data={
                "average_score": 0.4,
                "completion_rate": 0.3,
            },
        )
        
        assert prediction.outcome in ["at_risk", "needs_support"]
        assert len(prediction.risk_factors) > 0
        assert len(prediction.interventions) > 0


# ============================================================================
# Integration Tests
# ============================================================================

class TestEndToEndFlow:
    """End-to-end integration tests."""
    
    def test_full_analytics_flow(self, client):
        """Test complete analytics flow from ingestion to insights."""
        # 1. Ingest events
        events = [
            {
                "event_type": "video_play",
                "student_id": "e2e_student",
                "content_id": "e2e_video",
                "duration_ms": 120000,
            },
            {
                "event_type": "video_complete",
                "student_id": "e2e_student",
                "content_id": "e2e_video",
                "duration_ms": 600000,
            },
        ]
        
        ingest_response = client.post("/api/v1/events/ingest", json={
            "events": events,
            "validate_events": True,
        })
        assert ingest_response.status_code == 200
        
        # 2. Get recommendations
        rec_response = client.get("/api/v1/insights/recommendations?student_id=e2e_student")
        assert rec_response.status_code == 200
        
        # 3. Predict outcome
        outcome_response = client.post("/api/v1/insights/predict-outcome?student_id=e2e_student")
        assert outcome_response.status_code == 200
    
    def test_privacy_aware_analytics(self, client):
        """Test analytics with privacy controls."""
        # 1. Set up privacy config
        client.post("/api/v1/privacy/config", json={
            "user_id": "privacy_student",
            "is_minor": True,
            "consent_required": True,
            "data_retention": "30d",
        })
        
        # 2. Grant consent with parent
        consent_response = client.post("/api/v1/privacy/consent", json={
            "user_id": "privacy_student",
            "consent_type": "analytics",
            "is_minor": True,
            "parent_guardian_id": "parent_001",
        })
        assert consent_response.status_code == 200
        
        # 3. Check compliance
        compliance_response = client.get("/api/v1/privacy/compliance/privacy_student")
        assert compliance_response.status_code == 200
        data = compliance_response.json()
        assert data["report"]["coppa_compliant"] is True
