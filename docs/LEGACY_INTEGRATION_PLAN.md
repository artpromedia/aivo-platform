# Legacy Platform Integration Plan

## Overview

This document outlines the integration strategy for bringing features from the legacy AIVO Agentic AI Platform into the current AIVO Platform. The legacy platform contains sophisticated Python models and services that can significantly enhance our learning capabilities.

## Source Repository

- **Legacy Repo**: https://github.com/artpromedia/aivo-agentic-ai-platform.git
- **Key Location**: `services/api-gateway/app/` (Python FastAPI services)

---

## High-Priority Features for Integration

### 1. Student Brain AI

**Source**: `services/api-gateway/app/models/ai_learning.py`

**What it does**:
- Creates a personalized AI model for each student (1-to-1 with Student)
- Tracks learning style, reading/math levels, attention span
- Stores adaptive learning profile discovered over time
- Configurable AI model (Llama 3.1, quantization settings)

**Integration Steps**:
1. Create Prisma schema for `student_brains` table in `learner-model-svc`
2. Add StudentBrain service class in TypeScript
3. Integrate with existing `ml-recommendation-svc`
4. Add brain initialization during student onboarding
5. Connect to adaptive activity generation

**Estimated Effort**: Medium (2-3 sprints)

---

### 2. Analytics Service with ROI Tracking

**Source**: `services/api-gateway/app/services/analytics_service.py`

**Key Capabilities**:
- Performance aggregation with k-anonymity protection (minimum 5 students)
- Intervention tracking and effectiveness evaluation
- ROI calculation (costs vs. benefits)
- Predictive at-risk student identification
- Board report generation

**Integration Steps**:
1. Add k-anonymity enforcement to existing `analytics-svc`
2. Create new `intervention` and `roi_metric` tables
3. Build ROI calculation service
4. Implement board report generation
5. Add predictive model for at-risk detection

**Estimated Effort**: Medium-High (3-4 sprints)

---

### 3. Learning Session Management

**Source**: `services/api-gateway/app/models/ai_learning.py` (LearningSession, AdaptiveActivity)

**Features**:
- Tracks individual learning sessions with metrics
- Questions attempted/correct tracking
- Time in flow state measurement
- Frustration event detection
- Links to IEP progress updates

**Integration Steps**:
1. Enhance existing session tracking in `engagement-svc`
2. Add flow state detection algorithm
3. Implement frustration event detection
4. Connect to IEP goal progress

**Estimated Effort**: Medium (2-3 sprints)

---

### 4. Special Needs Support Services

**Source**: Multiple services in `services/api-gateway/app/services/`

#### 4.1 Autism Support
- Evidence-based accommodations
- Visual supports, predictable routines
- Social story generation
- Sensory considerations

#### 4.2 ADHD Support
- Executive function tools
- Gamification with achievements
- Micro-breaks scheduling
- Attention reward systems

#### 4.3 Dyslexia Intervention
- Multi-sensory learning approaches
- Phoneme awareness training
- Decodable text practice
- Progress monitoring

**Integration Steps**:
1. Create `disability-support-svc` microservice
2. Port Python service logic to TypeScript/Fastify
3. Integrate with content generation pipeline
4. Add accommodation settings to student profile
5. Connect to adaptive activity selection

**Estimated Effort**: High (4-5 sprints)

---

### 5. Emotion Recognition Service

**Source**: `services/api-gateway/app/services/emotion_recognition_service.py`

**Features**:
- 20+ emotions categorized (basic, social, self-conscious, cognitive)
- Mastery tracking per emotion
- Adaptive difficulty (5 levels)
- Scenario generation with distractors
- Recommendation engine for next emotions

**Integration Steps**:
1. Add emotion vocabulary to `sel-svc`
2. Implement mastery tracking
3. Create emotion scenario generator
4. Build recommendation algorithm
5. Connect to SEL curriculum

**Estimated Effort**: Medium (2-3 sprints)

---

### 6. Model Monitoring & Drift Detection

**Source**: `services/api-gateway/app/services/model_monitoring.py`

**Capabilities**:
- Statistical drift detection (Mann-Whitney U tests)
- Cohen's d effect size analysis
- Anomaly detection via z-scores
- Automatic recalibration triggers
- Performance dashboards

**Integration Steps**:
1. Enhance existing `model-registry-svc`
2. Add drift detection algorithms
3. Implement anomaly alerting
4. Create recalibration task system
5. Build monitoring dashboard

**Estimated Effort**: Medium (2-3 sprints)

---

### 7. Work-Based Learning & Transition Services

**Source**: Multiple services for vocational training

**Features**:
- Employer partnership management
- Job shadowing with reflection
- Internship placement tracking
- Job coaching with support-fading
- IDEA 2004 compliance

**Integration Steps**:
1. Create `transition-svc` microservice
2. Add employer/partnership entities
3. Build work experience tracking
4. Implement support-fading algorithm
5. Create transition planning workflows

**Estimated Effort**: High (4-5 sprints)

---

### 8. Self-Determination Curriculum

**Source**: `services/api-gateway/app/services/self_determination_service.py`

**Wehmeyer Model Components**:
1. Self-awareness
2. Choice-making
3. Goal-setting
4. Planning
5. Problem-solving
6. Self-advocacy
7. Self-regulation
8. Self-evaluation
9. Self-reinforcement
10. Decision-making
11. Self-knowledge

**Integration Steps**:
1. Add self-determination module to `sel-svc`
2. Create curriculum content structure
3. Implement progress tracking per component
4. Build student-led goal setting
5. Add decision-making logs

**Estimated Effort**: Medium-High (3-4 sprints)

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Platform                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ web-learner │  │learner-model│  │ml-recommendation-svc│  │
│  │   (Next.js) │  │    -svc     │  │     (Python)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                    ┌─────▼─────┐                             │
│                    │   NATS    │                             │
│                    │ JetStream │                             │
│                    └─────┬─────┘                             │
│                          │                                   │
│  ┌───────────────────────┼───────────────────────────────┐  │
│  │            NEW SERVICES TO INTEGRATE                   │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │student-brain │  │  analytics   │  │  disability │  │  │
│  │  │     -svc     │  │   -enhanced  │  │  support-svc│  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  emotion-    │  │  transition  │  │model-monitor│  │  │
│  │  │  recognition │  │     -svc     │  │    -svc     │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Migrations Required

### New Schemas

1. **ai_learning schema**
   - `student_brains` - 1-to-1 with students
   - `learning_sessions` - session tracking
   - `adaptive_activities` - individual activities

2. **analytics schema**
   - `performance_aggregates` - k-anonymity protected
   - `interventions` - intervention tracking
   - `intervention_evaluations` - effectiveness data
   - `roi_metrics` - ROI calculations
   - `predictive_models` - model metadata
   - `student_predictions` - at-risk predictions
   - `board_reports` - generated reports

3. **disability_support schema**
   - `autism_accommodations`
   - `adhd_support_plans`
   - `dyslexia_interventions`
   - `speech_progress`

4. **transition schema**
   - `employer_partnerships`
   - `work_experiences`
   - `job_coaching_sessions`
   - `transition_plans`

---

## API Endpoints to Add

### Student Brain API
```
POST   /api/v1/students/:id/brain          # Initialize brain
GET    /api/v1/students/:id/brain          # Get brain profile
PATCH  /api/v1/students/:id/brain          # Update brain
POST   /api/v1/students/:id/brain/assess   # Run assessment
```

### Analytics API
```
POST   /api/v1/analytics/aggregate         # Create aggregate
GET    /api/v1/analytics/roi               # Get ROI metrics
POST   /api/v1/interventions               # Create intervention
GET    /api/v1/predictions/at-risk         # Get at-risk students
POST   /api/v1/reports/board               # Generate board report
```

### Learning Session API
```
POST   /api/v1/sessions                    # Start session
PATCH  /api/v1/sessions/:id                # Update session
POST   /api/v1/sessions/:id/end            # End session
GET    /api/v1/sessions/:id/metrics        # Get session metrics
```

---

## Testing Strategy

1. **Unit Tests**: Port existing Python tests to Vitest
2. **Integration Tests**: Test service interactions via NATS
3. **E2E Tests**: Playwright tests for new UI components
4. **Load Tests**: Verify k-anonymity under concurrent load

---

## Compliance Considerations

- **FERPA**: Ensure data minimization in all new services
- **COPPA**: Verify parental consent workflows for under-13
- **GDPR**: Implement soft delete for all new entities
- **IDEA 2004**: Validate transition service compliance

---

## Rollout Plan

### Phase 1: Foundation (Weeks 1-4)
- Student Brain AI basic integration
- Learning session tracking
- Database migrations

### Phase 2: Analytics (Weeks 5-8)
- Enhanced analytics with k-anonymity
- ROI tracking
- Board reports

### Phase 3: Special Needs (Weeks 9-14)
- Disability support services
- Emotion recognition
- SEL enhancements

### Phase 4: Transition (Weeks 15-18)
- Work-based learning
- Self-determination curriculum
- Transition planning

### Phase 5: Optimization (Weeks 19-22)
- Model monitoring
- Drift detection
- Performance tuning

---

## Key Contacts

- **Legacy Codebase Owner**: Review Python services for business logic
- **ML Team**: Coordinate on model integration
- **Compliance Team**: Validate FERPA/COPPA/GDPR requirements
- **QA Team**: Test plan review

---

## Appendix: Legacy Service Inventory

| Service | File | Status | Priority |
|---------|------|--------|----------|
| StudentBrain | ai_learning.py | Ready | High |
| AnalyticsService | analytics_service.py | Ready | High |
| EmotionRecognition | emotion_recognition_service.py | Ready | Medium |
| AutismSupport | autism_service.py | Ready | Medium |
| ADHDSupport | adhd_service.py | Ready | Medium |
| DyslexiaIntervention | dyslexia_service.py | Ready | Medium |
| SelfDetermination | self_determination_service.py | Ready | Medium |
| WorkBasedLearning | vocational_service.py | Ready | Low |
| ModelMonitoring | model_monitoring.py | Ready | Low |
| ContentGenerator | content_generator.py | Ready | High |
| AIService | ai_service.py | Ready | High |

---

*Document created: 2026-01-19*
*Last updated: 2026-01-19*
