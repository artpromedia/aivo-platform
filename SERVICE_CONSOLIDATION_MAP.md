# AIVO Platform — Service Consolidation Map

> **Version:** 1.0  
> **Created:** 2026-02-16  
> **Branch:** `v2-consolidation`  
> **Total services audited:** 92 (71 Node.js + 20 Python + 1 Python module)

---

## Framework Audit Summary

| Framework                    | Count | Services                                                                     |
| ---------------------------- | :---: | ---------------------------------------------------------------------------- |
| Fastify                      |  67   | Majority of Node.js services (including 4 migrated from Express in Sprint 1) |
| Python/FastAPI               |  20   | AI/ML services                                                               |
| ~~Express~~                  |   0   | All migrated to Fastify in Sprint 1                                          |
| NestJS                       |   3   | `api-gateway`, `parent-svc`, `import-export-svc`                             |
| Hono                         |   1   | `translation-svc`                                                            |
| Python module (no framework) |   1   | `auth/` (SSO utility, not a service)                                         |

---

## Phase 1 — KEEP (Launch-Critical)

These services are required for the IEP & Communications Web App MVP.

| Service         | Framework | Disposition | Notes                                                                  |
| --------------- | --------- | :---------: | ---------------------------------------------------------------------- |
| `auth-svc`      | Fastify   |  **KEEP**   | Auth, JWT, MFA, SSO, RBAC                                              |
| `api-gateway`   | NestJS    |  **KEEP**   | Edge routing, PII detection, consent guards. Stays NestJS.             |
| `tenant-svc`    | Fastify   |  **KEEP**   | Multi-tenant isolation                                                 |
| `sis-sync-svc`  | Fastify   |  **KEEP**   | Clever/OneRoster sync                                                  |
| `iep-svc`       | Fastify   |  **KEEP**   | IEP CRUD, OCR upload, compliance timelines                             |
| `parent-svc`    | NestJS    |  **KEEP**   | Parent onboarding, messaging, reports. Migrate to Fastify in Sprint 2. |
| `profile-svc`   | Fastify   |  **KEEP**   | User profiles, accommodations                                          |
| `messaging-svc` | Fastify   |  **KEEP**   | Secure messaging                                                       |
| `audit-svc`     | Fastify   |  **KEEP**   | FERPA audit logging                                                    |
| `notify-svc`    | Fastify   |  **KEEP**   | Email, push, SMS notifications                                         |
| `reports-svc`   | Fastify   |  **KEEP**   | Compliance reports, CSV/PDF export                                     |
| `realtime-svc`  | Fastify   |  **KEEP**   | WebSocket for live updates                                             |

**Phase 1 KEEP total: 12 services**

---

## Phase 1 — MERGE (Combine Into Existing Services)

These services have overlapping domains and will be merged into a single service each.

### Compliance Domain ✅ DONE (Sprint 2)

```
compliance-svc (Fastify)  ← PRIMARY, absorbed:
  ✅ consent-svc (Fastify)   → modules/coppa/
  ✅ legal-hold-svc (Fastify) → modules/legal-hold/
  ✅ dsr-svc (Fastify)        → modules/dsr/
```

**Result:** 4 services → 1 service (`compliance-svc`)

### SIS Sync Domain

```
sis-sync-svc (Fastify)  ← PRIMARY, absorbs:
  + sync-svc (Fastify)
```

**Result:** 2 services → 1 service (`sis-sync-svc`)

### External Integrations Domain

```
integration-svc (Fastify)  ← PRIMARY, absorbs:
  + edfi-svc (Fastify)
```

**Result:** 2 services → 1 service (`integration-svc`)

**Post-merge Phase 1 total: 15 services → 12 services** (after merges complete)

---

## Phase 2 — FREEZE (No New Features, Code Intact)

These services are not needed for Phase 1 launch but contain valuable code for future phases. **No new features** should be added. Code remains intact for later activation or merging.

### Content Domain (later merge into `content-svc`)

| Service                    | Framework      | Notes                       |
| -------------------------- | -------------- | --------------------------- |
| `content-svc`              | Fastify        | Primary content service     |
| `content-authoring-svc`    | Fastify        | Content authoring tools     |
| `content-intelligence-svc` | Python/FastAPI | AI-powered content analysis |

### Session & Assessment Domain

| Service          | Framework | Notes                                          |
| ---------------- | --------- | ---------------------------------------------- |
| `session-svc`    | Fastify   | Learning sessions                              |
| `assessment-svc` | Fastify   | Assessments — migrated from Express (Sprint 1) |
| `baseline-svc`   | Fastify   | Baseline assessments                           |
| `goal-svc`       | Fastify   | Goal tracking                                  |

### Engagement Domain (later merge into `engagement-svc`)

| Service            | Framework | Notes                                           |
| ------------------ | --------- | ----------------------------------------------- |
| `engagement-svc`   | Fastify   | Primary engagement service                      |
| `gamification-svc` | Fastify   | Gamification — migrated from Express (Sprint 1) |
| `game-gen-svc`     | Fastify   | Game generation                                 |
| `game-library-svc` | Fastify   | Game library                                    |

### AI/ML Domain (later merge into `ai-svc`)

| Service                  | Framework      | Notes                                               |
| ------------------------ | -------------- | --------------------------------------------------- |
| `ai-orchestrator`        | Fastify        | AI orchestration                                    |
| `brain-engine`           | Python/FastAPI | Core AI engine                                      |
| `brain-orchestrator-svc` | Fastify        | AI orchestration — migrated from Express (Sprint 1) |

### Speech Domain (later merge into `speech-svc`)

| Service               | Framework      | Notes                |
| --------------------- | -------------- | -------------------- |
| `speech-therapy-svc`  | Fastify        | Speech therapy tools |
| `speech-analysis-svc` | Python/FastAPI | Speech analysis AI   |

### Neurodiversity Domain (later merge into `neurodiversity-svc`)

| Service                  | Framework      | Notes                      |
| ------------------------ | -------------- | -------------------------- |
| `sel-svc`                | Fastify        | Social-emotional learning  |
| `focus-svc`              | Fastify        | Focus/attention tracking   |
| `cognitive-load-svc`     | Python/FastAPI | Cognitive load analysis    |
| `executive-function-svc` | Fastify        | Executive function support |

### Individual Freeze

| Service                     | Framework      | Notes                                        |
| --------------------------- | -------------- | -------------------------------------------- |
| `learner-model-svc`         | Fastify        | Learner modeling                             |
| `personalization-svc`       | Fastify        | Personalization engine                       |
| `orchestrator-svc`          | Fastify        | General orchestration                        |
| `gradebook-svc`             | Fastify        | Gradebook — migrated from Express (Sprint 1) |
| `homework-helper-svc`       | Fastify        | Homework assistance                          |
| `curriculum-svc`            | Fastify        | Curriculum management (TS)                   |
| `curriculum-py-svc`         | Python/FastAPI | Curriculum management (Python)               |
| `knowledge-graph-svc`       | Python/FastAPI | Knowledge graph                              |
| `question-generation-svc`   | Python/FastAPI | AI question generation                       |
| `grading-engine`            | Python/FastAPI | AI grading                                   |
| `document-intelligence-svc` | Python/FastAPI | Document processing AI                       |
| `coursework-ingest-svc`     | Fastify        | Coursework ingestion                         |
| `embedded-tools-svc`        | Fastify        | Embedded tools                               |
| `life-skills-svc`           | Fastify        | Life skills content                          |
| `teacher-planning-svc`      | Fastify        | Teacher lesson planning                      |
| `search-svc`                | Fastify        | Search functionality                         |
| `writing-pad-svc`           | Fastify        | Writing tool                                 |
| `writing-assessment-svc`    | Python/FastAPI | Writing assessment AI                        |
| `translation-svc`           | Hono           | Translation — Hono framework                 |
| `retention-svc`             | Fastify        | Student retention                            |

**Phase 2 FREEZE total: 39 services**

---

## Phase 3 — DEFER (Do Not Deploy, Keep Code for Reference)

These services are not needed for Phase 1 or Phase 2. Code is preserved for future reference but should **not be deployed**.

| Service                    | Framework      | Notes                        |
| -------------------------- | -------------- | ---------------------------- |
| `marketplace-svc`          | Fastify        | Content marketplace          |
| `sandbox-svc`              | Fastify        | Code sandbox                 |
| `lti-svc`                  | Fastify        | LTI integration              |
| `scorm-svc`                | Fastify        | SCORM integration            |
| `import-export-svc`        | NestJS         | Data import/export           |
| `community-svc`            | Fastify        | Community features           |
| `peer-learning-svc`        | Python/FastAPI | Peer learning                |
| `collaboration-svc`        | Fastify        | Collaboration tools          |
| `professional-dev-svc`     | Fastify        | Professional development     |
| `training-svc`             | Python/FastAPI | Training content             |
| `billing-svc`              | Fastify        | Billing management           |
| `payments-svc`             | Fastify        | Payment processing           |
| `benchmarking-svc`         | Fastify        | Performance benchmarking     |
| `research-svc`             | Fastify        | Research tools               |
| `experimentation-svc`      | Fastify        | A/B testing                  |
| `device-mgmt-svc`          | Fastify        | Device management            |
| `model-trainer-svc`        | Fastify        | ML model training            |
| `model-registry-svc`       | Fastify        | ML model registry            |
| `model-monitoring-svc`     | Fastify        | ML model monitoring          |
| `ml-recommendation-svc`    | Python/FastAPI | ML recommendations           |
| `rl-tutoring-svc`          | Python/FastAPI | Reinforcement learning tutor |
| `multimodal-analytics-svc` | Python/FastAPI | Multimodal analytics         |
| `vision-analysis-svc`      | Python/FastAPI | Vision analysis AI           |
| `geolocation-svc`          | Fastify        | Geolocation services         |
| `residency-svc`            | Fastify        | Residency verification       |
| `approval-svc`             | Fastify        | Approval workflows           |
| `event-collector-svc`      | Fastify        | Event collection             |
| `analytics-svc`            | Fastify        | Analytics platform           |
| `accessibility-ai-svc`     | Python/FastAPI | Accessibility AI             |
| `specialized-support-svc`  | Python/FastAPI | Specialized support AI       |
| `python-api-gateway`       | Python/FastAPI | Python API gateway           |
| `ai-inference-svc`         | Python/FastAPI | AI inference                 |

**Phase 3 DEFER total: 32 services**

---

## Non-Service Entries

| Directory | Type           | Notes                                                    |
| --------- | -------------- | -------------------------------------------------------- |
| `auth/`   | Python module  | SSO utility (`sso_manager.py`), not a standalone service |
| `tests/`  | Test directory | Shared test infrastructure                               |

---

## Express Migration Targets (Sprint 1)

These 4 services use Express and are candidates for migration to Fastify:

| Service                  |   Phase    | Priority                             |
| ------------------------ | :--------: | ------------------------------------ |
| `assessment-svc`         | 2 (FREEZE) | Low — frozen, migrate when activated |
| `gradebook-svc`          | 2 (FREEZE) | Low — frozen, migrate when activated |
| `brain-orchestrator-svc` | 2 (FREEZE) | Low — frozen, migrate when activated |
| `gamification-svc`       | 2 (FREEZE) | Low — frozen, migrate when activated |

---

## NestJS Services

| Service             |   Phase   | Action                                                               |
| ------------------- | :-------: | -------------------------------------------------------------------- |
| `api-gateway`       | 1 (KEEP)  | **Stay NestJS** — decorator-based Guards are ideal for edge security |
| `parent-svc`        | 1 (KEEP)  | **Migrate to Fastify** in Sprint 2                                   |
| `import-export-svc` | 3 (DEFER) | No action needed — deferred                                          |

---

## Consolidation Summary

| Category                |      Before       |             After             |
| ----------------------- | :---------------: | :---------------------------: |
| Phase 1 KEEP            |        12         |              12               |
| Phase 1 MERGE sources   |         6         | 0 (merged into KEEP services) |
| Phase 2 FREEZE          |        39         |              39               |
| Phase 3 DEFER           |        32         |              32               |
| Non-service directories |         2         |               2               |
| **Total**               | **91 + 1 module** |   **85 services + merges**    |

### Net Result After Phase 1 Merges

- `compliance-svc` absorbs `consent-svc`, `legal-hold-svc`, `dsr-svc` → saves 3
- `sis-sync-svc` absorbs `sync-svc` → saves 1
- `integration-svc` absorbs `edfi-svc` → saves 1
- **Total savings: 5 services eliminated via merge**
