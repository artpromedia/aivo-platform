# Migration Roadmap: Legacy to Production Platform

## Executive Summary

**Document Version:** 1.0
**Created:** January 19, 2026
**Timeline:** 24 weeks (6 months)
**Target Completion:** July 2026

### Current State
- **Legacy Platform:** 100% feature complete (artpromedia/aivo-agentic-ai-learning-app)
- **Current Platform:** 85% feature complete (artpromedia/aivo-platform)
- **Gap:** 15% (primarily web-learner neurodiversity features)

### Goal
Achieve 100% feature parity while maintaining production stability and adding new capabilities.

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          6-MONTH MIGRATION ROADMAP                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Foundation (Weeks 1-4)                                             │
│ ├── Sprint 1: Onboarding & Navigation                                       │
│ └── Sprint 2: Assessment Enhancement                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Curriculum (Weeks 5-10)                                            │
│ ├── Sprint 3: K-5 Curriculum                                                │
│ ├── Sprint 4: Middle School Curriculum                                      │
│ └── Sprint 5: High School Curriculum                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: AI & Personalization (Weeks 11-14)                                 │
│ ├── Sprint 6: AI Brain System                                               │
│ └── Sprint 7: AI Tutoring & Homework                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Neurodiversity (Weeks 15-20)                                       │
│ ├── Sprint 8: Focus & Engagement                                            │
│ ├── Sprint 9: Self-Regulation & Executive Function                          │
│ └── Sprint 10: Sensory & Writing                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Polish & Launch (Weeks 21-24)                                      │
│ ├── Sprint 11: UX Polish                                                    │
│ └── Sprint 12: Mobile & Testing                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Weeks 1-4)

### Sprint 1: Onboarding & Navigation (Weeks 1-2)

**Objective:** Establish core learner experience foundation

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| OnboardingGuard implementation | Frontend | Pending | 8 |
| LearnerProtectedRoute enhancement | Frontend | Pending | 3 |
| Multi-step onboarding flow | Frontend | Pending | 13 |
| Baseline assessment integration | Full-stack | Pending | 13 |

**Deliverables:**
- [ ] Enforced onboarding flow for new learners
- [ ] Protected routes with proper auth checks
- [ ] Seamless baseline assessment entry
- [ ] Progress persistence across sessions

**Success Criteria:**
- 100% of new learners complete onboarding
- Zero navigation dead-ends
- <3s page load time

### Sprint 2: Assessment Enhancement (Weeks 3-4)

**Objective:** Complete dynamic assessment system

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| Dynamic assessment engine polish | Backend | Pending | 13 |
| Assessment results dashboard | Frontend | Pending | 8 |
| Pre-baseline training module | Full-stack | Pending | 8 |
| Domain transition tracking | Backend | Pending | 5 |
| DomainTransition component | Frontend | Pending | 5 |

**Deliverables:**
- [ ] Polished IRT-based assessment engine
- [ ] Visual results dashboard
- [ ] Pre-assessment practice mode
- [ ] Smooth domain transitions

**Success Criteria:**
- Assessment completion rate >90%
- Results accuracy validation
- Positive user feedback

---

## Phase 2: Curriculum (Weeks 5-10)

### Sprint 3: K-5 Curriculum (Weeks 5-6)

**Objective:** Complete elementary curriculum

| Subject | Current | Target | Story Points |
|---------|---------|--------|--------------|
| K-5 Math | 60% | 100% | 8 |
| K-5 Reading | 60% | 100% | 8 |
| K-5 Science | 40% | 100% | 8 |
| K-5 Writing | 40% | 100% | 8 |
| K-5 Theming | 50% | 100% | 5 |

**Deliverables:**
- [ ] Complete K-5 Math lessons and activities
- [ ] Complete K-5 Reading comprehension
- [ ] K-5 Science exploration modules
- [ ] K-5 Writing exercises
- [ ] Age-appropriate theming

### Sprint 4: Middle School Curriculum (Weeks 7-8)

**Objective:** Complete middle school curriculum

| Subject | Current | Target | Story Points |
|---------|---------|--------|--------------|
| K-5 Social Studies | 0% | 100% | 5 |
| K-5 Art & Music | 0% | 100% | 5 |
| MS Algebra | 50% | 100% | 8 |
| MS Geometry | 50% | 100% | 8 |
| MS Theming | 50% | 100% | 5 |

### Sprint 5: High School Curriculum (Weeks 9-10)

**Objective:** Complete high school curriculum

| Subject | Current | Target | Story Points |
|---------|---------|--------|--------------|
| MS Science | 0% | 100% | 8 |
| HS Calculus | 0% | 100% | 8 |
| HS Advanced Sciences | 0% | 100% | 8 |
| HS Theming | 0% | 100% | 5 |

---

## Phase 3: AI & Personalization (Weeks 11-14)

### Sprint 6: AI Brain System (Weeks 11-12)

**Objective:** Implement personalized AI learning

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| Personalized AI Brain integration | AI/ML | Pending | 13 |
| Real-time adaptive learning | AI/ML | Pending | 13 |
| Brain memory persistence | Backend | Pending | 8 |
| ExplainableModelCloning component | Frontend | Pending | 5 |

**Technical Details:**
- Integration with `learner-model-svc`
- Integration with `training-svc`
- Real-time WebSocket updates via `realtime-svc`
- Brain state persistence in PostgreSQL

**Deliverables:**
- [ ] Per-learner AI model creation
- [ ] Adaptive content difficulty
- [ ] Transparent AI explanations
- [ ] Persistent learning state

### Sprint 7: AI Tutoring & Homework (Weeks 13-14)

**Objective:** Complete AI-powered assistance

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| AI homework helper UI integration | Frontend | Pending | 8 |
| AI tutoring sessions | AI/ML | Pending | 8 |
| HomeworkHelper component | Frontend | Pending | 8 |
| HomeworkUpload component | Frontend | Pending | 5 |
| Homework step components (4) | Frontend | Pending | 8 |

**Component Architecture:**
```
HomeworkHelper/
├── HomeworkHelper.tsx      # Main container
├── HomeworkUpload.tsx      # Photo/file upload
├── HomeworkSession.tsx     # Session management
└── steps/
    ├── UnderstandStep.tsx  # Step 1: Comprehension
    ├── PlanStep.tsx        # Step 2: Strategy
    ├── SolveStep.tsx       # Step 3: Execution
    └── CheckStep.tsx       # Step 4: Verification
```

---

## Phase 4: Neurodiversity (Weeks 15-20)

### Sprint 8: Focus & Engagement (Weeks 15-16)

**Objective:** Implement focus monitoring and game breaks

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| FocusMonitor component (web) | Frontend | Pending | 8 |
| GameBreakModal component | Frontend | Pending | 5 |
| Mini-games library (5 games) | Frontend | Pending | 13 |
| Progress visualization | Frontend | Pending | 5 |
| Additional mini-games (4) | Frontend | Pending | 8 |

**Mini-Games to Implement:**
1. BreathingExercise - Guided breathing with animations
2. MathSpeedGame - Quick calculation challenges
3. SimonSaysGame - Memory and pattern recognition
4. MemoryMatchGame - Card matching game
5. CountingGame - Number sequencing
6. ReactionTimeGame - Reflexes training
7. ShapeSorterGame - Shape recognition
8. WordScrambleGame - Vocabulary building
9. LogicPuzzleGame - Problem solving

### Sprint 9: Self-Regulation & Executive Function (Weeks 17-18)

**Objective:** Complete neurodiversity support tools

| Component | Category | Story Points |
|-----------|----------|--------------|
| SelfRegulationHub | Self-Regulation | 5 |
| EmotionCheckIn | Self-Regulation | 5 |
| RegulationActivity | Self-Regulation | 5 |
| CalmingSpace | Self-Regulation | 5 |
| VisualTimer | Executive Function | 5 |
| VisualSchedule | Executive Function | 8 |
| FirstThenBoard | Executive Function | 5 |
| TaskBreakdown | Executive Function | 5 |

**Integration Points:**
- `sel-svc` for emotion tracking
- `executive-function-svc` for planning tools
- `focus-svc` for sensory accommodations

### Sprint 10: Sensory & Writing (Weeks 19-20)

**Objective:** Complete sensory profiles and writing tools

| Task | Owner | Status | Story Points |
|------|-------|--------|--------------|
| SensoryProfile component | Frontend | Pending | 8 |
| SensoryProfileSetup component | Frontend | Pending | 8 |
| AccessibilityPanel component | Frontend | Pending | 5 |
| WritingPad component | Frontend | Pending | 8 |
| DrawPad component | Frontend | Pending | 5 |

**Sensory Profile Categories:**
- Visual (contrast, brightness, colors)
- Auditory (volume, sound types)
- Motor (touch targets, animations)
- Cognitive (complexity, pace)

---

## Phase 5: Polish & Launch (Weeks 21-24)

### Sprint 11: UX Polish (Weeks 21-22)

**Objective:** Refine user experience

| Task | Priority | Story Points |
|------|----------|--------------|
| Theme customization polish | P0 | 5 |
| ConnectivityBanner component | P1 | 3 |
| OfflineIndicator component | P1 | 3 |
| PWAInstallPrompt component | P2 | 3 |
| ExitConfirmation component | P1 | 3 |
| EncouragementBanner component | P1 | 3 |
| AskParentHelp component | P1 | 3 |
| HomeworkInbox component | P1 | 5 |

### Sprint 12: Mobile & Testing (Weeks 23-24)

**Objective:** Complete mobile apps and QA

| Task | Priority | Story Points |
|------|----------|--------------|
| Mobile learner app completion | P0 | 8 |
| Mobile teacher app completion | P1 | 8 |
| End-to-end testing | P0 | 8 |
| Accessibility audit | P0 | 5 |

**Testing Coverage:**
- Unit tests: 80%+ coverage
- Integration tests: All API endpoints
- E2E tests: Critical user flows
- Accessibility: WCAG 2.1 AA compliance
- Performance: Lighthouse score >90

---

## Risk Management

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI integration complexity | Delayed Sprint 6-7 | Early prototyping, fallback to rules-based |
| Mini-games performance | Poor UX on low-end devices | Progressive enhancement, lazy loading |
| Cross-platform testing | Bugs in production | Automated testing, staged rollout |

### Medium Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Curriculum content volume | Delayed Sprint 3-5 | Prioritize core subjects |
| Third-party dependencies | Build failures | Lock versions, backup alternatives |
| Team capacity | Delayed delivery | Buffer time, prioritization |

---

## Success Metrics

### Feature Parity

| Portal | Current | Target | Deadline |
|--------|---------|--------|----------|
| Learner (Web) | 70% | 100% | Week 20 |
| Learner (Mobile) | 61% | 100% | Week 24 |
| Parent (Web) | 100% | 100% | - |
| Parent (Mobile) | 100% | 100% | - |
| Teacher (Web) | 90% | 100% | Week 22 |
| Teacher (Mobile) | 60% | 100% | Week 24 |
| District | 100% | 100% | - |
| Platform Admin | 100% | 100% | - |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >80% | Jest/Vitest |
| Lighthouse Score | >90 | Lighthouse CI |
| Accessibility | WCAG 2.1 AA | axe-core |
| Error Rate | <0.1% | Sentry |
| API Latency | <200ms p95 | Prometheus |

### User Experience

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding Completion | >95% | Analytics |
| Assessment Completion | >90% | Analytics |
| Session Duration | >20 min | Analytics |
| User Satisfaction | >4.5/5 | Surveys |

---

## Resource Requirements

### Team Structure

| Role | FTE | Responsibilities |
|------|-----|------------------|
| Frontend Engineers | 3 | UI components, web apps |
| Backend Engineers | 2 | Services, APIs |
| AI/ML Engineers | 1 | Brain system, models |
| QA Engineers | 1 | Testing, automation |
| UX Designer | 1 | Design, accessibility |

### Infrastructure

- Kubernetes cluster (scaled)
- PostgreSQL (production-grade)
- Redis cluster
- NATS streaming
- CDN for static assets

---

## Milestones

| Milestone | Date | Criteria |
|-----------|------|----------|
| M1: Foundation Complete | Week 4 | Sprint 1-2 delivered |
| M2: Curriculum Complete | Week 10 | Sprint 3-5 delivered |
| M3: AI System Live | Week 14 | Sprint 6-7 delivered |
| M4: Neurodiversity Complete | Week 20 | Sprint 8-10 delivered |
| M5: Production Ready | Week 24 | All sprints, QA passed |

---

## Appendix

### A. Technical Dependencies

```
Frontend:
- Next.js 15
- React 18
- TypeScript 5
- Tailwind CSS
- Zustand
- TanStack Query

Backend:
- Node.js 20
- Fastify
- Prisma
- PostgreSQL 16
- Redis 7

Mobile:
- Flutter 3.x
- Dart
- Riverpod
```

### B. Integration Points

| Service | Integration | Protocol |
|---------|-------------|----------|
| Auth | JWT + RBAC | REST/gRPC |
| AI | OpenAI/Anthropic | REST |
| Storage | S3/GCS | REST |
| Events | NATS | Pub/Sub |
| Search | Elasticsearch | REST |

### C. Documentation Links

- [PARITY_MATRIX.md](./PARITY_MATRIX.md)
- [API_PARITY_REPORT.md](./API_PARITY_REPORT.md)
- [DATABASE_PARITY.md](./DATABASE_PARITY.md)
- [COMPONENT_GAP_ANALYSIS.md](./COMPONENT_GAP_ANALYSIS.md)
- [MOBILE_APP_REQUIREMENTS.md](./MOBILE_APP_REQUIREMENTS.md)
- [SPRINT_ASSIGNMENTS.json](./SPRINT_ASSIGNMENTS.json)

---

## Document Information

- **Version:** 1.0
- **Created:** January 19, 2026
- **Author:** Claude (Sprint 0 Analysis)
- **Approved By:** [Pending]
- **Last Updated:** January 19, 2026
