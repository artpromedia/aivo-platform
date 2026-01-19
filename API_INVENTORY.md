# API Inventory: aivo-agentic-ai-learning-app Services

## Overview

This document catalogs all API endpoints from the source repository Python services to ensure complete migration coverage.

---

## Service Summary

| Service | Base URL | Port | Status | Endpoints |
|---------|----------|------|--------|-----------|
| API Gateway | `/api/v1` | 8000 | Active | 30+ |
| AI Inference | `/api/v1` | 8001 | Active | 25+ |
| Curriculum | `/api/v1` | 8003 | Partial | 5+ |
| Training | `/api/v1` | 8004 | Active | 10+ |
| Auth | `/api/v1` | 8002 | Active | 8+ |

---

## API Gateway Service

### Base URL: `http://localhost:8000/api/v1`

### Baseline Assessment Endpoints (`/baseline-assessment`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/start-session` | Start new baseline assessment session | `StartSessionRequest` | `StartSessionResponse` |
| POST | `/submit-response` | Submit assessment item response | `SubmitResponseRequest` | `SubmitResponseResponse` |
| POST | `/sessions/{session_id}/break` | Start a break during session | `BreakRequest` | `BreakResponse` |
| POST | `/sessions/{session_id}/break/{break_id}/end` | End a break | - | `BreakEndResponse` |
| GET | `/items/preview` | Preview available assessment items | Query params | `PreviewItemsResponse` |
| GET | `/sessions/{session_id}/status` | Get session status | - | `SessionStatusResponse` |
| GET | `/results/{session_id}` | Get assessment results | - | `AssessmentResults` |
| GET | `/learner/{learner_id}/accessibility-preferences` | Get learner accessibility preferences | - | `AccessibilityPreferences` |
| PUT | `/learner/{learner_id}/accessibility-preferences` | Update accessibility preferences | `AccessibilityPreferences` | `AccessibilityPreferences` |
| GET | `/session/{session_id}` | Get session details | - | `SessionStatusResponse` |
| POST | `/session/{session_id}/pause` | Pause assessment session | - | `PauseResponse` |
| POST | `/session/{session_id}/resume` | Resume paused session | - | `ResumeResponse` |
| GET | `/items/{domain}/{grade_band}` | Get items by domain and grade | - | `ItemsResponse` |
| POST | `/items/{item_id}/recalibrate` | Recalibrate single item | `RecalibrateRequest` | `RecalibrateResponse` |
| POST | `/items/batch-recalibrate` | Batch recalibrate items | `BatchRecalibrateRequest` | `BatchRecalibrateResponse` |
| GET | `/quality-report` | Get item quality report | - | `QualityReport` |
| GET | `/problematic-items` | Get problematic items list | - | `ProblematicItems` |
| GET | `/review-queue` | Get items pending review | - | `ReviewQueue` |
| POST | `/review/{review_id}/submit` | Submit item review | `ReviewSubmission` | `ReviewResponse` |

### Curriculum Endpoints (`/curriculum`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/standards` | Get all educational standards | Query params | `StandardsResponse` |
| GET | `/learners/{learner_id}/curriculum` | Get learner's curriculum | - | `CurriculumResponse` |
| GET | `/learners/{learner_id}/progress` | Get learner progress | - | `ProgressResponse` |
| GET | `/learners/{learner_id}/unassessed` | Get unassessed standards | - | `UnassessedResponse` |
| POST | `/items/{item_id}/standards` | Map item to standards | `StandardsMapping` | `MappingResponse` |

### Model Cloning Endpoints (`/model-cloning`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/learner/{learner_id}/status` | Get cloning status | - | `CloningStatusResponse` |
| POST | `/learner/{learner_id}/initiate` | Initiate model cloning | `InitiateCloneRequest` | `InitiateCloneResponse` |
| POST | `/learner/{learner_id}/progress` | Update cloning progress | `ProgressUpdate` | `ProgressResponse` |
| GET | `/learner/{learner_id}/history` | Get cloning history | - | `CloningHistory` |
| GET | `/learner/{learner_id}/metrics` | Get model metrics | - | `ModelMetrics` |
| GET | `/templates` | Get available model templates | - | `TemplatesResponse` |

### Personalized Brain Endpoints (`/personalized-brain`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/clone` | Clone base brain for learner | `CloneRequest` | `CloneResponse` |
| GET | `/status/{learner_id}` | Get brain status | - | `BrainStatusResponse` |
| POST | `/retrain/{learner_id}` | Trigger brain retraining | `RetrainRequest` | `RetrainResponse` |
| GET | `/milestones/{learner_id}` | Get learning milestones | - | `MilestonesResponse` |
| GET | `/performance/{learner_id}` | Get brain performance | - | `PerformanceResponse` |

### Auth Endpoints (`/auth`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/login` | User login | `LoginRequest` | `TokenResponse` |
| POST | `/register` | User registration | `RegisterRequest` | `UserResponse` |
| POST | `/refresh` | Refresh token | `RefreshRequest` | `TokenResponse` |
| POST | `/logout` | User logout | - | `LogoutResponse` |
| GET | `/me` | Get current user | - | `UserResponse` |
| PUT | `/me` | Update current user | `UpdateUserRequest` | `UserResponse` |
| POST | `/password/reset` | Request password reset | `ResetRequest` | `ResetResponse` |
| POST | `/password/change` | Change password | `ChangePasswordRequest` | `ChangePasswordResponse` |

---

## AI Inference Service

### Base URL: `http://localhost:8001/api/v1`

### Generate Endpoints (`/generate`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/generate` | Generate AI response | `InferenceRequest` | `InferenceResponse` |
| POST | `/hint` | Generate hint for question | `HintRequest` | `InferenceResponse` |
| POST | `/explanation` | Generate explanation | `ExplanationRequest` | `Dict[str, Any]` |
| POST | `/feedback` | Generate feedback | `FeedbackRequest` | `FeedbackResponse` |

### Brain Management Endpoints (`/brain`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/create` | Create new brain instance | `CreateBrainRequest` | `Dict` |
| GET | `/{brain_id}` | Get brain details | - | `Dict` |
| POST | `/{brain_id}/adapt` | Adapt brain to interaction | `AdaptRequest` | `AdaptResponse` |
| POST | `/{brain_id}/sync` | Sync brain state | `SyncRequest` | `SyncResponse` |
| GET | `/{brain_id}/metrics` | Get brain metrics | - | `MetricsResponse` |
| GET | `/{brain_id}/history` | Get interaction history | - | `HistoryResponse` |
| DELETE | `/{brain_id}` | Delete brain | - | `DeleteResponse` |
| GET | `/learner/{learner_id}/brains` | Get all brains for learner | - | `BrainsListResponse` |
| POST | `/create-district-aware` | Create district-aware brain | `DistrictBrainRequest` | `Dict` |

### Adapt Endpoints (`/adapt`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/brain` | Adapt brain model | `AdaptBrainRequest` | `Dict[str, Any]` |
| POST | `/record-interaction/{brain_id}` | Record learning interaction | `InteractionRequest` | `Dict[str, Any]` |

### Assessment Endpoints (`/assessments`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/check/{learner_id}` | Check if assessment due | - | `AssessmentDueResponse` |
| GET | `/schedule/learner/{learner_id}` | Get assessment schedule | - | `List[AssessmentScheduleResponse]` |
| POST | `/quick/submit` | Submit quick assessment | `QuickAssessmentRequest` | `AssessmentResultResponse` |
| GET | `/results/learner/{learner_id}` | Get learner results | - | `List[AssessmentResultResponse]` |
| GET | `/history/learner/{learner_id}` | Get assessment history | - | `AssessmentHistoryResponse` |
| POST | `/mark-overdue` | Mark assessments as overdue | `MarkOverdueRequest` | `MarkOverdueResponse` |
| POST | `/schedule/first/{learner_id}` | Schedule first assessment | - | `AssessmentScheduleResponse` |
| POST | `/comprehensive/create` | Create comprehensive assessment | `CreateComprehensiveRequest` | `CreateComprehensiveResponse` |
| POST | `/comprehensive/answer` | Submit comprehensive answer | `AnswerRequest` | `AnswerResponse` |
| POST | `/comprehensive/complete` | Complete comprehensive assessment | `CompleteRequest` | `CompleteResponse` |

---

## Training Service

### Base URL: `http://localhost:8003/api/v1`

### Training Job Endpoints (`/training`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/jobs` | Start training job | `TrainingJobCreate` | `TrainingJobStatus` |
| GET | `/jobs/{job_id}` | Get job status | - | `TrainingJobStatus` |
| GET | `/jobs` | List all jobs | Query params | `List[TrainingJobStatus]` |
| POST | `/jobs/{job_id}/cancel` | Cancel training job | - | `CancelResponse` |
| GET | `/models` | List trained models | - | `ModelsListResponse` |
| GET | `/models/{model_id}` | Get model details | - | `ModelDetailsResponse` |
| POST | `/models/{model_id}/deploy` | Deploy model | `DeployRequest` | `DeployResponse` |
| GET | `/models/{model_id}/metrics` | Get model metrics | - | `ModelMetricsResponse` |
| POST | `/retrain` | Trigger retraining | `RetrainRequest` | `RetrainResponse` |
| GET | `/config` | Get training config | - | `TrainingConfig` |

### Dataset Endpoints (`/datasets`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/` | List datasets | - | `DatasetsListResponse` |
| POST | `/` | Create dataset | `DatasetCreate` | `DatasetResponse` |
| GET | `/{dataset_id}` | Get dataset details | - | `DatasetResponse` |
| POST | `/{dataset_id}/validate` | Validate dataset | - | `ValidationResponse` |

---

## Curriculum Service

### Base URL: `http://localhost:8004/api/v1`

### Standards Endpoints (`/standards`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/` | List all standards | Query params | `StandardsListResponse` |
| GET | `/{standard_id}` | Get standard details | - | `StandardResponse` |
| GET | `/domain/{domain}` | Get standards by domain | - | `DomainStandardsResponse` |
| GET | `/grade/{grade_band}` | Get standards by grade | - | `GradeStandardsResponse` |

### District Endpoints (`/districts`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/` | List districts | - | `DistrictsListResponse` |
| GET | `/{district_id}` | Get district details | - | `DistrictResponse` |
| GET | `/{district_id}/curriculum` | Get district curriculum | - | `CurriculumResponse` |
| PUT | `/{district_id}/curriculum` | Update district curriculum | `CurriculumUpdate` | `CurriculumResponse` |

### Training Data Endpoints (`/training-data`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/` | List training data | Query params | `TrainingDataListResponse` |
| POST | `/` | Add training data | `TrainingDataCreate` | `TrainingDataResponse` |
| GET | `/{data_id}` | Get training data | - | `TrainingDataResponse` |
| POST | `/export` | Export training data | `ExportRequest` | `ExportResponse` |

---

## Auth Service

### Base URL: `http://localhost:8002/api/v1`

### Authentication Endpoints (`/auth`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/login` | User login | `LoginRequest` | `TokenResponse` |
| POST | `/register` | User registration | `RegisterRequest` | `UserResponse` |
| POST | `/refresh` | Refresh access token | `RefreshRequest` | `TokenResponse` |
| POST | `/logout` | User logout | `LogoutRequest` | `LogoutResponse` |
| POST | `/verify-email` | Verify email | `VerifyRequest` | `VerifyResponse` |
| POST | `/resend-verification` | Resend verification | `ResendRequest` | `ResendResponse` |

### User Endpoints (`/users`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/me` | Get current user | - | `UserResponse` |
| PUT | `/me` | Update current user | `UpdateUserRequest` | `UserResponse` |
| DELETE | `/me` | Delete account | - | `DeleteResponse` |

### Password Endpoints (`/password`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/forgot` | Request password reset | `ForgotRequest` | `ForgotResponse` |
| POST | `/reset` | Reset password | `ResetRequest` | `ResetResponse` |
| POST | `/change` | Change password | `ChangeRequest` | `ChangeResponse` |

---

## Common Response Models

### Health Check (All Services)

```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0",
  "timestamp": "2026-01-19T00:00:00Z"
}
```

### Error Response

```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2026-01-19T00:00:00Z"
}
```

### Pagination Response

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

---

## Authentication Headers

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

Optional headers:
- `X-Request-ID`: Request tracking ID
- `X-Learner-ID`: Current learner context
- `X-District-ID`: District context

---

## Rate Limiting

| Service | Rate Limit | Window |
|---------|------------|--------|
| API Gateway | 100 req | 1 min |
| AI Inference | 30 req | 1 min |
| Auth | 10 req | 1 min |
| Training | 5 req | 1 min |
| Curriculum | 50 req | 1 min |

---

## OpenAPI Documentation

Each service provides Swagger UI documentation:

| Service | Swagger URL | ReDoc URL |
|---------|-------------|-----------|
| API Gateway | http://localhost:8000/docs | http://localhost:8000/redoc |
| AI Inference | http://localhost:8001/docs | http://localhost:8001/redoc |
| Auth | http://localhost:8002/docs | http://localhost:8002/redoc |
| Training | http://localhost:8003/docs | http://localhost:8003/redoc |
| Curriculum | http://localhost:8004/docs | http://localhost:8004/redoc |

---

## Migration Checklist

### P0 - Critical APIs
- [ ] Baseline Assessment (all endpoints)
- [ ] AI Inference (generate, brain management)
- [ ] Auth (login, register, token refresh)
- [ ] Personalized Brain (clone, status, retrain)

### P1 - Important APIs
- [ ] Curriculum (standards, progress)
- [ ] Model Cloning (all endpoints)
- [ ] Assessment scheduling
- [ ] Training jobs

### P2 - Nice to Have
- [ ] Quality reports
- [ ] Review queue
- [ ] Batch operations
- [ ] Export functionality

---

## Integration Points with Target

| Source Endpoint | Target Service | Notes |
|-----------------|----------------|-------|
| `/baseline-assessment/*` | `baseline-svc` | Enhance existing |
| `/brain/*` | `ai-orchestrator` | Integrate with existing |
| `/generate/*` | `ml-recommendation-svc` | Extend capabilities |
| `/curriculum/*` | `curriculum-svc` | Add Python complement |
| `/training/*` | NEW `training-svc` | Create new service |
| `/auth/*` | `auth-svc` | Merge with existing |
