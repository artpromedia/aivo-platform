# API Parity Analysis Report

## Executive Summary

**Analysis Date:** January 19, 2026

This document compares the API endpoints between the legacy monolithic backend and the current microservices architecture.

### Architecture Overview

| Aspect | Legacy | Current |
|--------|--------|---------|
| **Architecture** | Single FastAPI monolith | 74 microservices |
| **Location** | `apps/api-gateway-backend/` | `services/*/` |
| **API Gateway** | Direct FastAPI | Kong + Python Gateway |
| **Database** | Supabase (PostgreSQL) | PostgreSQL with Prisma |
| **ORM** | SQLAlchemy 2.0 | Prisma (TS) + SQLAlchemy (Python) |
| **Auth** | JWT + Supabase Auth | JWT + Custom Auth Service |

---

## Legacy API Endpoints

### File Structure
```
apps/api-gateway-backend/
├── app/
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       └── endpoints/
│   │           ├── analytics.py
│   │           ├── assessments.py
│   │           ├── brain.py
│   │           ├── health.py
│   │           ├── homework.py
│   │           ├── iep.py
│   │           ├── learners.py
│   │           ├── progress.py
│   │           ├── regulation.py
│   │           ├── sensory.py
│   │           └── users.py
│   ├── core/
│   ├── models/
│   ├── schemas/
│   └── services/
```

### Endpoint Mapping

#### Authentication (`/api/v1/auth`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/auth/login` | POST | auth-svc | `/api/v1/auth/login` | ✅ |
| `/auth/register` | POST | auth-svc | `/api/v1/auth/register` | ✅ |
| `/auth/refresh` | POST | auth-svc | `/api/v1/auth/refresh` | ✅ |
| `/auth/logout` | POST | auth-svc | `/api/v1/auth/logout` | ✅ |
| `/auth/verify` | GET | auth-svc | `/api/v1/auth/verify` | ✅ |
| `/auth/reset-password` | POST | auth-svc | `/api/v1/auth/password/reset` | ✅ |

#### Users (`/api/v1/users`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/users/me` | GET | profile-svc | `/api/v1/profile/me` | ✅ |
| `/users/{id}` | GET | profile-svc | `/api/v1/profile/{id}` | ✅ |
| `/users/{id}` | PUT | profile-svc | `/api/v1/profile/{id}` | ✅ |
| `/users/{id}` | DELETE | profile-svc | `/api/v1/profile/{id}` | ✅ |
| `/users/` | GET | profile-svc | `/api/v1/profile/list` | ✅ |
| `/users/create` | POST | profile-svc | `/api/v1/profile/create` | ✅ |

#### Learners (`/api/v1/learners`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/learners/{id}` | GET | learner-model-svc | `/api/v1/learners/{id}` | ✅ |
| `/learners/{id}/profile` | GET | learner-model-svc | `/api/v1/learners/{id}/profile` | ✅ |
| `/learners/{id}/brain-state` | GET | learner-model-svc | `/api/v1/learners/{id}/brain` | ✅ |
| `/learners/{id}/preferences` | GET/PUT | personalization-svc | `/api/v1/preferences/{id}` | ✅ |
| `/learners/{id}/achievements` | GET | gamification-svc | `/api/v1/achievements/{id}` | ✅ |

#### Assessments (`/api/v1/assessments`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/assessments/baseline/start` | POST | baseline-svc | `/api/v1/baseline/start` | ✅ |
| `/assessments/baseline/item` | GET | baseline-svc | `/api/v1/baseline/item` | ✅ |
| `/assessments/baseline/respond` | POST | baseline-svc | `/api/v1/baseline/respond` | ✅ |
| `/assessments/baseline/complete` | POST | baseline-svc | `/api/v1/baseline/complete` | ✅ |
| `/assessments/baseline/results` | GET | baseline-svc | `/api/v1/baseline/results/{id}` | ✅ |
| `/assessments/` | GET | assessment-svc | `/api/v1/assessments/` | ✅ |
| `/assessments/{id}` | GET | assessment-svc | `/api/v1/assessments/{id}` | ✅ |
| `/assessments/create` | POST | assessment-svc | `/api/v1/assessments/create` | ✅ |
| `/assessments/{id}/submit` | POST | assessment-svc | `/api/v1/assessments/{id}/submit` | ✅ |

#### Brain/AI (`/api/v1/brain`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/brain/{learner_id}/state` | GET | learner-model-svc | `/api/v1/brain/{id}/state` | ✅ |
| `/brain/{learner_id}/train` | POST | training-svc | `/api/v1/training/{id}/start` | ✅ |
| `/brain/{learner_id}/inference` | POST | ai-inference-svc | `/api/v1/inference/predict` | ✅ |
| `/brain/{learner_id}/recommendations` | GET | ml-recommendation-svc | `/api/v1/recommendations/{id}` | ✅ |
| `/brain/clone` | POST | model-trainer-svc | `/api/v1/model/clone` | ✅ |
| `/brain/providers` | GET | ai-orchestrator | `/api/v1/ai/providers` | ✅ |

#### Homework (`/api/v1/homework`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/homework/upload` | POST | homework-helper-svc | `/api/v1/homework/upload` | ✅ |
| `/homework/sessions` | GET | homework-helper-svc | `/api/v1/homework/sessions` | ✅ |
| `/homework/sessions/{id}` | GET | homework-helper-svc | `/api/v1/homework/sessions/{id}` | ✅ |
| `/homework/analyze` | POST | homework-helper-svc | `/api/v1/homework/analyze` | ✅ |
| `/homework/guidance` | POST | homework-helper-svc | `/api/v1/homework/guidance` | ✅ |
| `/homework/step/{step}` | POST | homework-helper-svc | `/api/v1/homework/step/{step}` | ✅ |

#### IEP (`/api/v1/iep`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/iep/{student_id}` | GET | iep-svc | `/api/v1/iep/{id}` | ✅ |
| `/iep/{student_id}` | POST | iep-svc | `/api/v1/iep/create` | ✅ |
| `/iep/{student_id}` | PUT | iep-svc | `/api/v1/iep/{id}` | ✅ |
| `/iep/{student_id}/goals` | GET | goal-svc | `/api/v1/goals/{student_id}` | ✅ |
| `/iep/{student_id}/goals` | POST | goal-svc | `/api/v1/goals/create` | ✅ |
| `/iep/{student_id}/progress` | GET | iep-svc | `/api/v1/iep/{id}/progress` | ✅ |
| `/iep/{student_id}/services` | GET | iep-svc | `/api/v1/iep/{id}/services` | ✅ |

#### Progress (`/api/v1/progress`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/progress/{learner_id}` | GET | analytics-svc | `/api/v1/progress/{id}` | ✅ |
| `/progress/{learner_id}/skills` | GET | engagement-svc | `/api/v1/skills/{id}` | ✅ |
| `/progress/{learner_id}/activities` | GET | engagement-svc | `/api/v1/activities/{id}` | ✅ |
| `/progress/{learner_id}/streaks` | GET | gamification-svc | `/api/v1/streaks/{id}` | ✅ |
| `/progress/report` | GET | reports-svc | `/api/v1/reports/progress` | ✅ |

#### Regulation (`/api/v1/regulation`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/regulation/emotions` | POST | sel-svc | `/api/v1/sel/emotions` | ✅ |
| `/regulation/checkin` | POST | sel-svc | `/api/v1/sel/checkin` | ✅ |
| `/regulation/activities` | GET | sel-svc | `/api/v1/sel/activities` | ✅ |
| `/regulation/calming` | GET | sel-svc | `/api/v1/sel/calming` | ✅ |

#### Sensory (`/api/v1/sensory`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/sensory/profile` | GET | focus-svc | `/api/v1/focus/sensory/profile` | ✅ |
| `/sensory/profile` | PUT | focus-svc | `/api/v1/focus/sensory/profile` | ✅ |
| `/sensory/accommodations` | GET | focus-svc | `/api/v1/focus/accommodations` | ✅ |
| `/sensory/breaks` | GET | focus-svc | `/api/v1/focus/breaks` | ✅ |
| `/sensory/games` | GET | game-library-svc | `/api/v1/games/list` | ✅ |

#### Analytics (`/api/v1/analytics`)

| Legacy Endpoint | Method | Current Service | Current Endpoint | Status |
|-----------------|--------|-----------------|------------------|--------|
| `/analytics/events` | POST | event-collector-svc | `/api/v1/events` | ✅ |
| `/analytics/dashboard` | GET | analytics-svc | `/api/v1/analytics/dashboard` | ✅ |
| `/analytics/reports` | GET | reports-svc | `/api/v1/reports` | ✅ |
| `/analytics/export` | GET | import-export-svc | `/api/v1/export` | ✅ |

---

## Current Services (74 Microservices)

### Core Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| api-gateway | 3000 | Kong Gateway | `/api/*` |
| python-api-gateway | 8000 | Python FastAPI Gateway | `/api/v1/*` |
| auth-svc | 3001 | Authentication | `/api/v1/auth/*` |
| profile-svc | 3002 | User Profiles | `/api/v1/profile/*` |

### Learning Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| assessment-svc | 3010 | Assessments | `/api/v1/assessments/*` |
| baseline-svc | 3011 | Baseline Testing | `/api/v1/baseline/*` |
| curriculum-svc | 3012 | Curriculum | `/api/v1/curriculum/*` |
| content-svc | 3013 | Content Delivery | `/api/v1/content/*` |
| learner-model-svc | 3014 | Learner Models | `/api/v1/learners/*` |
| personalization-svc | 3015 | Personalization | `/api/v1/personalization/*` |

### AI Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| ai-orchestrator | 3020 | AI Coordination | `/api/v1/ai/*` |
| ai-inference-svc | 3021 | AI Inference | `/api/v1/inference/*` |
| ml-recommendation-svc | 3022 | ML Recommendations | `/api/v1/recommendations/*` |
| model-trainer-svc | 3023 | Model Training | `/api/v1/training/*` |
| model-registry-svc | 3024 | Model Registry | `/api/v1/models/*` |

### Engagement Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| gamification-svc | 3030 | XP/Rewards | `/api/v1/gamification/*` |
| engagement-svc | 3031 | Engagement Tracking | `/api/v1/engagement/*` |
| focus-svc | 3032 | Focus Management | `/api/v1/focus/*` |
| game-library-svc | 3033 | Games Library | `/api/v1/games/*` |
| retention-svc | 3034 | Retention | `/api/v1/retention/*` |

### Support Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| homework-helper-svc | 3040 | Homework Help | `/api/v1/homework/*` |
| writing-pad-svc | 3041 | Writing Assistance | `/api/v1/writing/*` |
| speech-therapy-svc | 3042 | Speech Therapy | `/api/v1/speech/*` |
| executive-function-svc | 3043 | EF Tools | `/api/v1/ef/*` |
| sel-svc | 3044 | SEL | `/api/v1/sel/*` |

### IEP & Goals

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| iep-svc | 3050 | IEP Management | `/api/v1/iep/*` |
| goal-svc | 3051 | Goal Tracking | `/api/v1/goals/*` |

### Analytics & Reporting

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| analytics-svc | 3060 | Analytics | `/api/v1/analytics/*` |
| reports-svc | 3061 | Reporting | `/api/v1/reports/*` |
| event-collector-svc | 3062 | Events | `/api/v1/events/*` |

### Communication

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| messaging-svc | 3070 | Messaging | `/api/v1/messages/*` |
| notify-svc | 3071 | Notifications | `/api/v1/notifications/*` |
| realtime-svc | 3072 | WebSocket | `/ws/*` |

### Integration Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| integration-svc | 3080 | Integrations | `/api/v1/integrations/*` |
| sis-sync-svc | 3081 | SIS Sync | `/api/v1/sis/*` |
| lti-svc | 3082 | LTI | `/api/v1/lti/*` |
| scorm-svc | 3083 | SCORM | `/api/v1/scorm/*` |
| edfi-svc | 3084 | Ed-Fi | `/api/v1/edfi/*` |

### Admin Services

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| tenant-svc | 3090 | Multi-tenancy | `/api/v1/tenants/*` |
| billing-svc | 3091 | Billing | `/api/v1/billing/*` |
| audit-svc | 3092 | Audit Logs | `/api/v1/audit/*` |
| compliance-svc | 3093 | Compliance | `/api/v1/compliance/*` |

### Compliance Services (New)

| Service | Port | Purpose | API Base |
|---------|------|---------|----------|
| consent-svc | 3100 | Consent Management | `/api/v1/consent/*` |
| dsr-svc | 3101 | Data Subject Rights | `/api/v1/dsr/*` |
| legal-hold-svc | 3102 | Legal Holds | `/api/v1/legal/*` |
| residency-svc | 3103 | Data Residency | `/api/v1/residency/*` |

---

## API Parity Summary

### Complete Parity (100%)

- ✅ Authentication APIs
- ✅ User/Profile APIs
- ✅ Assessment APIs
- ✅ IEP APIs
- ✅ Analytics APIs
- ✅ AI/Brain APIs
- ✅ Homework APIs
- ✅ Progress APIs

### Enhanced in Current

- 🆕 Compliance APIs (GDPR, Legal Holds)
- 🆕 Ed-Fi Standards APIs
- 🆕 Enhanced Multi-tenant APIs
- 🆕 Marketplace APIs
- 🆕 Advanced Billing APIs

### API Response Format Comparison

**Legacy Format:**
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Current Format:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-19T...",
    "requestId": "uuid"
  }
}
```

### Authentication Changes

| Aspect | Legacy | Current |
|--------|--------|---------|
| Token Type | JWT (HS256) | JWT (RS256) |
| Refresh | Cookie-based | Header-based |
| MFA | Basic | Full TOTP/FIDO2 |
| SSO | SAML only | SAML, OAuth2, OIDC |

---

## Recommendations

### 1. Frontend Integration Updates

The web-learner app needs to update API calls to use new service endpoints:

```typescript
// Legacy
const response = await api.get('/api/v1/assessments/baseline/start');

// Current (through gateway)
const response = await api.get('/api/v1/baseline/start');
```

### 2. Service Discovery

Use Kong API Gateway for routing:
- All requests go through `/api/*`
- Gateway handles service discovery
- No direct service calls from frontend

### 3. Error Handling

Current services use standardized error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [...]
  }
}
```

---

## Document Information

- **Version:** 1.0
- **Created:** January 19, 2026
- **Author:** Claude (Sprint 0 Analysis)
