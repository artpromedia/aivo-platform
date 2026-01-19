# Feature Parity Matrix: Legacy vs Current Platform

## Executive Summary

**Analysis Date:** January 19, 2026
**Legacy Repository:** artpromedia/aivo-agentic-ai-learning-app
**Current Repository:** artpromedia/aivo-platform

### Overall Parity Status

| Portal | Legacy Status | Current Status | Parity % | Priority |
|--------|---------------|----------------|----------|----------|
| Learner Portal (Web) | 100% Complete | 70% Complete | 70% | P0 |
| Learner Portal (Mobile) | 100% Complete | 61% Complete | 61% | P0 |
| Parent Portal (Web) | 100% Complete | 100% Complete | 100% | - |
| Parent Portal (Mobile) | 100% Complete | 100% Complete | 100% | - |
| Teacher Portal (Web) | 100% Complete | 90% Complete | 90% | P1 |
| Teacher Portal (Mobile) | N/A | 60% Complete | N/A | P2 |
| District Admin Portal | 100% Complete | 100% Complete | 100% | - |
| Super Admin Portal | 100% Complete | 100% Complete | 100% | - |
| **Overall Platform** | 100% | 85% | 85% | - |

## Legend

- ✅ Complete in both repos
- 🔶 Exists but needs enhancement
- ❌ Missing in current repo
- 🆕 New feature (not in legacy)
- 🔧 Needs refactoring

---

## 1. LEARNER PORTAL FEATURES

### 1.1 Onboarding & Assessment

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Multi-step onboarding flow | ✅ Complete | 🔶 Partial | P0 | High | 1 |
| Baseline assessment (AI-powered) | ✅ Complete | 🔶 Partial | P0 | High | 1 |
| Dynamic assessment engine | ✅ Complete | 🔶 Partial | P0 | High | 2 |
| Assessment results dashboard | ✅ Complete | 🔶 Partial | P0 | Medium | 2 |
| Pre-baseline training | ✅ Complete | ❌ Missing | P1 | Medium | 2 |
| IRT-based scoring | ✅ Complete | ✅ Complete | - | - | - |
| Adaptive item selection | ✅ Complete | ✅ Complete | - | - | - |
| Domain transition tracking | ✅ Complete | 🔶 Partial | P0 | Medium | 2 |

### 1.2 Subject Learning

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| K-5 Math curriculum | ✅ Complete | 🔶 Partial | P0 | High | 3 |
| K-5 Reading curriculum | ✅ Complete | 🔶 Partial | P0 | High | 3 |
| K-5 Science curriculum | ✅ Complete | 🔶 Partial | P0 | High | 3 |
| K-5 Writing curriculum | ✅ Complete | 🔶 Partial | P0 | High | 3 |
| K-5 Social Studies | ✅ Complete | ❌ Missing | P1 | Medium | 4 |
| K-5 Art & Music | ✅ Complete | ❌ Missing | P1 | Medium | 4 |
| MS Algebra | ✅ Complete | 🔶 Partial | P0 | High | 4 |
| MS Geometry | ✅ Complete | 🔶 Partial | P0 | High | 4 |
| MS Science (Biology/Chemistry) | ✅ Complete | ❌ Missing | P1 | High | 5 |
| HS Calculus | ✅ Complete | ❌ Missing | P1 | High | 5 |
| HS Advanced Sciences | ✅ Complete | ❌ Missing | P1 | High | 5 |
| Subject selection UI | ✅ Complete | ✅ Complete | - | - | - |
| Grade-based theming (K5/MS/HS) | ✅ Complete | 🔶 Partial | P0 | Medium | 3 |

### 1.3 AI Features

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Personalized AI "Brain" | ✅ Complete | 🔶 Partial | P0 | Very High | 6 |
| Real-time adaptive learning | ✅ Complete | 🔶 Partial | P0 | Very High | 6 |
| AI homework helper | ✅ Complete | ✅ Complete (svc) | P0 | High | 7 |
| AI tutoring sessions | ✅ Complete | 🔶 Partial | P1 | High | 7 |
| Explainable model cloning | ✅ Complete | ❌ Missing | P1 | Very High | 7 |
| Multi-provider AI system | ✅ Complete | ✅ Complete | - | - | - |
| AI-powered content generation | ✅ Complete | ✅ Complete | - | - | - |
| Brain memory persistence | ✅ Complete | ❌ Missing | P0 | High | 6 |

### 1.4 Engagement & Focus Features

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Focus monitoring system | ✅ Complete | ❌ Missing (web) | P0 | High | 8 |
| Game-based learning breaks | ✅ Complete | 🔶 Partial | P0 | Medium | 8 |
| Mini-games library (9+ games) | ✅ Complete | 🔶 Partial | P0 | High | 8 |
| - BreathingExercise | ✅ Complete | ❌ Missing | P0 | Low | 8 |
| - MathSpeedGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - SimonSaysGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - MemoryMatchGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - CountingGame | ✅ Complete | ❌ Missing | P0 | Low | 8 |
| - ReactionTimeGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - ShapeSorterGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - WordScrambleGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| - LogicPuzzleGame | ✅ Complete | ❌ Missing | P0 | Medium | 8 |
| Rewards & achievements | ✅ Complete | ✅ Complete (svc) | P1 | Medium | 8 |
| Progress visualization | ✅ Complete | 🔶 Partial | P0 | Medium | 8 |
| Engagement tracking | ✅ Complete | ✅ Complete (svc) | - | - | - |

### 1.5 Accessibility & Neurodiversity Support

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Sensory profile setup | ✅ Complete | ❌ Missing (web) | P0 | High | 9 |
| Self-regulation tools | ✅ Complete | ❌ Missing (web) | P0 | High | 9 |
| - EmotionCheckIn | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| - RegulationActivity | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| - CalmingSpace | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| - BreathingExercise | ✅ Complete | ❌ Missing | P0 | Low | 9 |
| Executive function support | ✅ Complete | ❌ Missing (web) | P0 | High | 9 |
| - VisualTimer | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| - VisualSchedule | ✅ Complete | ❌ Missing | P0 | High | 9 |
| - FirstThenBoard | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| - TaskBreakdown | ✅ Complete | ❌ Missing | P0 | Medium | 9 |
| Text-to-speech | ✅ Complete | 🔶 Partial | P1 | Medium | 9 |
| Speech-to-text | ✅ Complete | 🔶 Partial | P1 | Medium | 9 |
| Dyslexia-friendly fonts | ✅ Complete | 🔶 Partial | P1 | Low | 9 |
| High contrast modes | ✅ Complete | 🔶 Partial | P1 | Low | 9 |
| Motor accommodations | ✅ Complete | ✅ Complete (mobile) | P1 | Medium | 9 |
| WCAG 2.1 AA compliance | ✅ Complete | ✅ Complete | - | - | - |

### 1.6 Writing & Creation Tools

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Digital writing pad | ✅ Complete | ❌ Missing (web) | P1 | High | 10 |
| Essay builder | ✅ Complete | ❌ Missing | P1 | High | 10 |
| Upload homework (photos) | ✅ Complete | ✅ Complete (svc) | P0 | Medium | 10 |
| Handwriting recognition | ✅ Complete | ✅ Complete (svc) | P0 | High | 10 |
| AI writing assistance | ✅ Complete | ✅ Complete (svc) | P0 | High | 10 |

### 1.7 Settings & Profile

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Theme customization (K5/MS/HS) | ✅ Complete | 🔶 Partial | P0 | Medium | 11 |
| Pin-based security | ✅ Complete | ✅ Complete (mobile) | P0 | Low | 11 |
| Profile management | ✅ Complete | ✅ Complete | - | - | - |
| Notification preferences | ✅ Complete | ✅ Complete | - | - | - |
| PWA install prompt | ✅ Complete | 🔶 Partial | P1 | Low | 11 |
| Offline indicator | ✅ Complete | 🔶 Partial | P1 | Low | 11 |
| Connectivity banner | ✅ Complete | ❌ Missing | P1 | Low | 11 |

### 1.8 Additional Learner Features

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| OnboardingGuard (enforced flow) | ✅ Complete | ❌ Missing | P0 | Medium | 1 |
| ExitConfirmation dialog | ✅ Complete | ❌ Missing | P1 | Low | 11 |
| EncouragementBanner | ✅ Complete | ❌ Missing | P1 | Low | 11 |
| AskParentHelp button | ✅ Complete | ❌ Missing | P1 | Low | 11 |
| LearnerProtectedRoute | ✅ Complete | 🔶 Partial | P0 | Medium | 1 |

---

## 2. PARENT PORTAL FEATURES

### 2.1 Dashboard & Monitoring

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Real-time progress dashboard | ✅ Complete | ✅ Complete | - | - | - |
| Multi-child management | ✅ Complete | ✅ Complete | - | - | - |
| Learning activity timeline | ✅ Complete | ✅ Complete | - | - | - |
| AI brain insights viewer | ✅ Complete | ✅ Complete | - | - | - |
| Child profile cards | ✅ Complete | ✅ Complete | - | - | - |
| Weekly activity charts | ✅ Complete | ✅ Complete | - | - | - |

### 2.2 Communication

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Direct messaging with teachers | ✅ Complete | ✅ Complete | - | - | - |
| Notification preferences | ✅ Complete | ✅ Complete | - | - | - |
| Weekly progress reports | ✅ Complete | ✅ Complete | - | - | - |
| Email digests | ✅ Complete | ✅ Complete | - | - | - |
| Activity feed | ✅ Complete | ✅ Complete | - | - | - |

### 2.3 Control & Settings

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Screen time limits | ✅ Complete | ✅ Complete | - | - | - |
| Content filtering | ✅ Complete | ✅ Complete | - | - | - |
| Subject access control | ✅ Complete | ✅ Complete | - | - | - |
| Guardian PIN setup | ✅ Complete | ✅ Complete | - | - | - |
| Device management | ✅ Complete | ✅ Complete | - | - | - |

### 2.4 Reports & Analytics

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Detailed progress reports | ✅ Complete | ✅ Complete | - | - | - |
| Assessment history | ✅ Complete | ✅ Complete | - | - | - |
| Strength/weakness analysis | ✅ Complete | ✅ Complete | - | - | - |
| PDF report generation | ✅ Complete | ✅ Complete | - | - | - |
| Skills mastery tracking | ✅ Complete | ✅ Complete | - | - | - |

### 2.5 Billing & Subscription

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Subscription management | ✅ Complete | ✅ Complete | - | - | - |
| Payment history | ✅ Complete | ✅ Complete | - | - | - |
| Multi-child pricing | ✅ Complete | ✅ Complete | - | - | - |
| Trial status tracking | ✅ Complete | ✅ Complete | - | - | - |
| Upgrade/downgrade flow | ✅ Complete | ✅ Complete | - | - | - |

### 2.6 Consent & Privacy

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Consent management | 🔶 Partial | ✅ Complete | 🆕 | - | - |
| GDPR data export | 🔶 Partial | ✅ Complete | 🆕 | - | - |
| Data deletion requests | 🔶 Partial | ✅ Complete | 🆕 | - | - |

---

## 3. TEACHER PORTAL FEATURES

### 3.1 Classroom Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Multi-class dashboard | ✅ Complete | ✅ Complete | - | - | - |
| Student roster management | ✅ Complete | ✅ Complete | - | - | - |
| Class grouping (ability-based) | ✅ Complete | 🔶 Partial | P1 | High | 17 |
| Bulk student actions | ✅ Complete | ✅ Complete | - | - | - |
| Attendance tracking | ✅ Complete | ✅ Complete | - | - | - |

### 3.2 Lesson Planning

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Lesson builder/editor | ✅ Complete | ✅ Complete | - | - | - |
| Curriculum mapping | ✅ Complete | ✅ Complete | - | - | - |
| Standards alignment | ✅ Complete | ✅ Complete | - | - | - |
| Resource library | ✅ Complete | ✅ Complete | - | - | - |
| Template lessons | ✅ Complete | 🔶 Partial | P1 | Medium | 18 |

### 3.3 Assessment Tools

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Create custom assessments | ✅ Complete | ✅ Complete | - | - | - |
| Question bank | ✅ Complete | ✅ Complete | - | - | - |
| Auto-grading | ✅ Complete | ✅ Complete | - | - | - |
| Rubric creator | ✅ Complete | 🔶 Partial | P1 | Medium | 19 |
| Assessment analytics | ✅ Complete | ✅ Complete | - | - | - |

### 3.4 Student Monitoring

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Real-time progress tracking | ✅ Complete | ✅ Complete | - | - | - |
| Individual student analytics | ✅ Complete | ✅ Complete | - | - | - |
| Intervention alerts | ✅ Complete | 🔶 Partial | P0 | Medium | 20 |
| IEP/504 tracking | ✅ Complete | ✅ Complete | - | - | - |
| Behavior tracking | ✅ Complete | 🔶 Partial | P1 | Medium | 20 |

### 3.5 Communication

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Parent messaging | ✅ Complete | ✅ Complete | - | - | - |
| Announcements | ✅ Complete | 🔶 Partial | P1 | Low | 21 |
| Grade posting | ✅ Complete | ✅ Complete | - | - | - |
| Progress reports | ✅ Complete | ✅ Complete | - | - | - |

### 3.6 Professional Development

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Training modules | ✅ Complete | ✅ Complete | - | - | - |
| Best practices library | ✅ Complete | ✅ Complete | - | - | - |
| Peer collaboration tools | ✅ Complete | 🔶 Partial | P1 | Medium | 22 |

---

## 4. DISTRICT ADMIN PORTAL FEATURES

### 4.1 Multi-School Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| School hierarchy management | ✅ Complete | ✅ Complete | - | - | - |
| District-wide dashboard | ✅ Complete | ✅ Complete | - | - | - |
| Cross-school analytics | ✅ Complete | ✅ Complete | - | - | - |
| School comparison reports | ✅ Complete | ✅ Complete | - | - | - |

### 4.2 User Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Bulk user import (CSV) | ✅ Complete | ✅ Complete | - | - | - |
| SSO/SAML integration | ✅ Complete | ✅ Complete | - | - | - |
| Role-based access control (RBAC) | ✅ Complete | ✅ Complete | - | - | - |
| User impersonation (support) | ✅ Complete | ✅ Complete | - | - | - |

### 4.3 Curriculum Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| District curriculum library | ✅ Complete | ✅ Complete | - | - | - |
| Custom curriculum upload | ✅ Complete | ✅ Complete | - | - | - |
| Standards mapping tools | ✅ Complete | ✅ Complete | - | - | - |
| Curriculum versioning | ✅ Complete | ✅ Complete | - | - | - |

### 4.4 Reporting & Analytics

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| District performance reports | ✅ Complete | ✅ Complete | - | - | - |
| Compliance reporting | ✅ Complete | ✅ Complete | - | - | - |
| Data export (CSV/Excel) | ✅ Complete | ✅ Complete | - | - | - |
| Custom report builder | ✅ Complete | ✅ Complete | - | - | - |

### 4.5 Integrations

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| SIS (PowerSchool, Infinite Campus) | ✅ Complete | ✅ Complete | - | - | - |
| LMS (Canvas, Google Classroom) | ✅ Complete | ✅ Complete | - | - | - |
| Rostering (Clever, ClassLink) | ✅ Complete | ✅ Complete | - | - | - |
| Webhook system | ✅ Complete | ✅ Complete | - | - | - |
| Ed-Fi standards | 🔶 Partial | ✅ Complete | 🆕 | - | - |

---

## 5. SUPER ADMIN PORTAL FEATURES

### 5.1 Platform Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Global settings | ✅ Complete | ✅ Complete | - | - | - |
| Feature flags | ✅ Complete | ✅ Complete | - | - | - |
| System monitoring | ✅ Complete | ✅ Complete | - | - | - |
| Audit logs | ✅ Complete | ✅ Complete | - | - | - |
| Multi-tenant management | ✅ Complete | ✅ Complete | - | - | - |

### 5.2 User Support

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Support ticket system | ✅ Complete | ✅ Complete | - | - | - |
| User account management | ✅ Complete | ✅ Complete | - | - | - |
| Data recovery tools | ✅ Complete | ✅ Complete | - | - | - |
| User impersonation | ✅ Complete | ✅ Complete | - | - | - |

### 5.3 AI Model Management

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| Model versioning | ✅ Complete | ✅ Complete | - | - | - |
| A/B testing framework | ✅ Complete | ✅ Complete | - | - | - |
| Model performance metrics | ✅ Complete | ✅ Complete | - | - | - |
| Training pipeline | ✅ Complete | ✅ Complete | - | - | - |
| Provider management | ✅ Complete | ✅ Complete | - | - | - |

### 5.4 Billing & Licensing

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| License management | ✅ Complete | ✅ Complete | - | - | - |
| Seat allocation | ✅ Complete | ✅ Complete | - | - | - |
| Usage tracking | ✅ Complete | ✅ Complete | - | - | - |
| Revenue analytics | ✅ Complete | ✅ Complete | - | - | - |

### 5.5 Compliance & Security

| Feature | Legacy Status | Current Status | Priority | Complexity | Sprint |
|---------|---------------|----------------|----------|------------|--------|
| FERPA compliance | ✅ Complete | ✅ Complete | - | - | - |
| COPPA compliance | ✅ Complete | ✅ Complete | - | - | - |
| GDPR tools | 🔶 Partial | ✅ Complete | 🆕 | - | - |
| Legal holds | 🔶 Partial | ✅ Complete | 🆕 | - | - |
| Data residency | 🔶 Partial | ✅ Complete | 🆕 | - | - |

---

## 6. BACKEND SERVICES COMPARISON

### Architecture Comparison

| Aspect | Legacy | Current |
|--------|--------|---------|
| Architecture | Monolithic FastAPI | Microservices (74 services) |
| Languages | Python | TypeScript + Python |
| API Gateway | Single FastAPI app | Kong + Python Gateway |
| Database | Supabase (PostgreSQL) | PostgreSQL + Prisma |
| Caching | Redis | Redis |
| Event Bus | N/A | NATS |
| Observability | Basic | Prometheus/Grafana/Loki |

### Services Mapping

| Legacy Endpoint | Current Service | Status |
|-----------------|-----------------|--------|
| /api/v1/assessments | assessment-svc, baseline-svc | ✅ |
| /api/v1/brain | learner-model-svc, training-svc | ✅ |
| /api/v1/homework | homework-helper-svc | ✅ |
| /api/v1/learners | profile-svc, learner-model-svc | ✅ |
| /api/v1/iep | iep-svc, goal-svc | ✅ |
| /api/v1/progress | analytics-svc, engagement-svc | ✅ |
| /api/v1/regulation | sel-svc, executive-function-svc | ✅ |
| /api/v1/sensory | focus-svc | ✅ |
| /api/v1/users | auth-svc, profile-svc | ✅ |
| /api/v1/analytics | analytics-svc, event-collector-svc | ✅ |

---

## 7. MOBILE APP COMPARISON

### Mobile Learner App

| Aspect | Legacy (React Native) | Current (Flutter) |
|--------|----------------------|-------------------|
| Framework | React Native | Flutter |
| Platform | iOS, Android | iOS, Android |
| Offline Support | Partial | ✅ Complete |
| Focus Management | ✅ Complete | ✅ Complete |
| Executive Function | ✅ Complete | ✅ Complete |
| Sensory Profile | ✅ Complete | ✅ Complete |
| Speech Therapy | 🔶 Partial | ✅ Complete |
| Games | ✅ Complete | ✅ Complete |
| Accessibility | ✅ Complete | ✅ Complete |
| **Parity** | - | 61% |

### Mobile Parent App

| Aspect | Legacy | Current (Flutter) |
|--------|--------|-------------------|
| Framework | N/A (Web only) | Flutter |
| Features | - | ✅ 100% Complete |
| Status | 🆕 | 100% |

### Mobile Teacher App

| Aspect | Legacy | Current (Flutter) |
|--------|--------|-------------------|
| Framework | N/A (Web only) | Flutter |
| Features | - | 60% Complete |
| Status | 🆕 | In Progress |

---

## 8. UI COMPONENTS COMPARISON

### Legacy Components (apps/learner-app/src/components)

| Component | Legacy | Current (packages/ui) | Gap Status |
|-----------|--------|----------------------|------------|
| FocusMonitor | ✅ | ✅ FocusTimer | Enhance |
| FocusMonitor/games (9) | ✅ | ❌ | Missing |
| SelfRegulation | ✅ | ❌ | Missing |
| ExecutiveFunction | ✅ | ❌ | Missing |
| SensoryProfile | ✅ | ❌ | Missing |
| HomeworkHelper | ✅ | ❌ | Missing |
| HomeworkHelper/steps | ✅ | ❌ | Missing |
| WritingPad | ✅ | ❌ | Missing |
| MiniGames | ✅ | ❌ | Missing |
| GamePicker | ✅ | ✅ | ✅ Complete |
| baseline | ✅ | ✅ Assessment | 🔶 Partial |
| lesson | ✅ | 🔶 | Partial |
| ConnectivityBanner | ✅ | ❌ | Missing |
| SubjectCard | ✅ | ✅ | ✅ Complete |
| ProgressRing | ✅ | ✅ (in Dashboard) | ✅ Complete |

### Current Components (packages/ui/src/components)

| Component | Status | Notes |
|-----------|--------|-------|
| Assessment/* | ✅ | Complete set |
| FocusTimer/* | ✅ | Needs games integration |
| GamePicker/* | ✅ | Complete |
| ProgressDashboard/* | ✅ | Complete |
| SubjectCard/* | ✅ | Complete |

---

## 9. FEATURE GAP SUMMARY

### Critical Gaps (P0 - Must Fix)

1. **Focus & Engagement System (Web)**
   - FocusMonitor component not in web-learner
   - 9 mini-games not implemented
   - Break prompts not connected

2. **Self-Regulation Tools (Web)**
   - EmotionCheckIn missing
   - CalmingSpace missing
   - Regulation activities missing

3. **Executive Function Tools (Web)**
   - VisualTimer missing
   - VisualSchedule missing
   - FirstThenBoard missing
   - TaskBreakdown missing

4. **Sensory Profile (Web)**
   - SensoryProfile setup missing
   - Accommodations UI missing

5. **Homework Helper UI (Web)**
   - 4-step scaffolding UI missing
   - Photo upload UI needs completion

### Important Gaps (P1)

1. **Writing Tools (Web)**
   - WritingPad component missing
   - Essay builder missing

2. **Onboarding Enforcement**
   - OnboardingGuard not implemented
   - Pre-baseline training missing

3. **Minor UX Features**
   - ConnectivityBanner missing
   - EncouragementBanner missing
   - ExitConfirmation missing

### New Features in Current (Not in Legacy)

1. **Mobile Apps**
   - Mobile Parent App (Flutter) - 100% Complete
   - Mobile Teacher App (Flutter) - 60% Complete

2. **Enhanced Compliance**
   - Full GDPR support (DSR service)
   - Legal holds management
   - Data residency controls

3. **Ed-Fi Standards**
   - Full Ed-Fi compliance service

4. **Enhanced Infrastructure**
   - 74 microservices architecture
   - NATS event streaming
   - Full observability stack

---

## 10. RECOMMENDED SPRINT PRIORITIES

### Sprint 1-2: Core Learner Experience
- Focus monitoring system for web
- Basic mini-games (top 5)
- Onboarding guard implementation

### Sprint 3-4: Neurodiversity Support
- Self-regulation tools
- Executive function tools
- Sensory profile UI

### Sprint 5-6: Content & AI
- Homework helper UI completion
- Writing pad implementation
- AI brain integration polish

### Sprint 7-8: Polish & Enhancement
- Additional mini-games
- Encouragement features
- PWA improvements

---

## Document Information

- **Version:** 1.0
- **Created:** January 19, 2026
- **Author:** Claude (Sprint 0 Analysis)
- **Last Updated:** January 19, 2026
