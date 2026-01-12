# Post-Launch Priorities

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Status:** Deferred to Dedicated Sprints

---

## Overview

This document identifies feature implementations that are **not addressed** in the current launch scope due to their larger scope and complexity. These items are better suited for dedicated sprints following the initial platform launch.

All features listed here have been analyzed and planned in the [Missing Features Implementation Plan](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md). This document serves as a summary and quick reference for stakeholders.

---

## Deferred Features

The following features require significant development effort (4+ weeks each) and are scheduled for post-launch implementation:

### Category 1: Enhanced Homework & Accessibility Tools

| Feature | Current State | Effort | Priority |
|---------|---------------|--------|----------|
| **Photo OCR** | Partial - upload exists, no OCR processing | Medium (2-3 weeks) | High |
| **Writing Pad** | Partial - motor accommodations exist, no AI writing assistance | Medium (3-4 weeks) | Medium |
| **Executive Function Tools** | Partial - session management exists, no explicit EF coaching | Large (4-6 weeks) | Medium |
| **GDPR Data Rights** | Partial - consent management exists, export/delete not implemented | Medium (2 weeks) | High (Compliance) |

### Category 2: Game-Based Learning & Specialized Therapy

| Feature | Current State | Effort | Priority |
|---------|---------------|--------|----------|
| **Focus Break Mini-Games** | Not implemented - break reminders exist, no playable games | Large (3-4 weeks) | High |
| **Brain Training** | Not implemented - no cognitive training automation | Large (2-3 weeks) | Medium |
| **Speech Therapy Integration** | Not implemented - SPEECH domain exists in taxonomy only | Large (6-8 weeks) | Medium |
| **Teacher PD Tracking** | Not implemented - no professional development service | Medium (3-4 weeks) | Low-Medium |

---

## Feature Details

### Photo OCR

**Business Value:** Enables students to photograph homework problems for AI-assisted step-by-step guidance.

**Current State:**
- Homework Helper service accepts IMAGE/PDF source types
- Storage bucket is configured
- Expects pre-extracted `rawText` - **no actual OCR processing**

**Implementation Requirements:**
- OCR integration service (Google Cloud Vision API or AWS Textract)
- Handwritten text recognition support
- Math equation detection with LaTeX conversion
- Mobile camera capture with image preprocessing

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.1](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#21-homework-helper---photo-upload--ocr-)

---

### Writing Pad with AI Assistance

**Business Value:** Provides motor-impaired and neurodiverse students with AI-powered writing support.

**Current State:**
- Motor accommodations exist (handwriting alternatives)
- Word prediction from static word lists
- **No AI-powered writing assistance**

**Implementation Requirements:**
- Writing Assistant Agent in AI Orchestrator
- Canvas/Drawing component for freeform input
- Stroke and shape recognition
- Real-time grammar and sentence suggestions
- Dyslexia-friendly formatting options

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.3](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#23-writing-pad-with-ai-assistance-)

---

### Executive Function Tools

**Business Value:** Supports students with ADHD and executive function challenges with task management and planning.

**Current State:**
- Session/transition management exists
- Predictability engine for routines
- **No explicit task management or EF coaching**

**Implementation Requirements:**
- New `executive-function-svc` microservice
- Task breakdown and visual scheduling
- Time estimation coaching
- Priority management and working memory supports
- Planning Coach AI Agent
- Database models for `LearnerTask` and `VisualSchedule`

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.4](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#24-executive-function-support-)

---

### GDPR Data Subject Rights

**Business Value:** Ensures compliance with GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability).

**Current State:**
- Consent management implemented
- DSR service exists with basic structure
- **Data export and deletion not fully implemented**

**Implementation Requirements:**
- Aggregate user data export across all services
- JSON/CSV export package generation
- Cascade delete across all services with anonymization option
- 30-day grace period workflow
- Parent-facing UI for data requests

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.5](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#25-gdpr-data-subject-rights-)

---

### Focus Break Mini-Games

**Business Value:** Provides age-appropriate, calming activities during focus breaks to help students reset and return to learning.

**Current State:**
- Gamification system exists (XP, achievements, streaks)
- Break reminders implemented
- **No actual playable games**

**Implementation Requirements:**
- New `game-library-svc` microservice
- Game types: breathing games, simple puzzles, movement games, sensory games
- Integration with focus service for break triggering
- Age and accessibility filtering
- XP rewards on completion

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.1 Phase 2](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#phase-2-focus-break-mini-games-3-4-weeks)

---

### Brain Training Module

**Business Value:** Provides personalized cognitive skill development through structured brain training exercises.

**Current State:**
- **No brain training automation exists**
- Skill tracking available through learner model

**Implementation Requirements:**
- Daily brain training recommendations
- Cognitive skill progression tracking
- Personalized difficulty adjustment
- Categories: working memory, attention/focus, processing speed, cognitive flexibility
- Progress reports and analytics

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.1 Phase 3](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#phase-3-brain-training-module-2-3-weeks)

---

### Speech Therapy Integration

**Business Value:** Enables speech-language pathologists (SLPs) to deliver and track therapy sessions through the platform.

**Current State:**
- SPEECH domain exists in skill taxonomy
- **No actual speech therapy features**

**Implementation Requirements:**
- New `speech-therapy-svc` microservice
- Audio recording/playback infrastructure
- Speech-to-text integration
- Pronunciation analysis API
- Articulation, fluency, and language activities
- Therapist dashboard for goal setting and progress monitoring
- Parent view for home practice assignments
- Secure audio storage (HIPAA-adjacent requirements)

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.2](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#32-speech-therapy-integration-)

---

### Teacher Professional Development Tracking

**Business Value:** Allows districts to manage and track teacher professional development requirements and completion.

**Current State:**
- **No PD tracking service exists**
- Teacher planning features available but not PD-specific

**Implementation Requirements:**
- New `professional-dev-svc` microservice
- PD program and module management
- Teacher enrollment and progress tracking
- Compliance tracking and reporting
- Certificate management
- District admin UI for requirements and assignments
- Teacher portal for viewing and completing programs

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.3](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#33-teacher-professional-development-tracking-)

---

## Implementation Phases

These post-launch features are organized into implementation phases based on priority and dependencies:

### Phase 1: High Priority (Post-Launch Weeks 1-6)
- Photo OCR (High business value, enables core homework helper functionality)
- GDPR Data Rights (Compliance requirement for EU market expansion)
- Game Library Service foundation (Enables subsequent mini-games)

### Phase 2: Medium Priority (Post-Launch Weeks 7-12)
- Focus Break Mini-Games (Builds on game library service)
- Writing Pad with AI Assistance (Neurodiverse support enhancement)
- Executive Function Tools (High value for ADHD student population)

### Phase 3: Lower Priority (Post-Launch Weeks 13-20)
- Brain Training Module (Builds on game library service)
- Speech Therapy Integration (Specialized market segment)
- Teacher PD Tracking (District value-add feature)

---

## Resource Requirements

| Phase | Duration | Backend Dev | Frontend Dev | Design | QA |
|-------|----------|-------------|--------------|--------|-----|
| Phase 1 | 6 weeks | 2 FTE | 1.5 FTE | 0.5 FTE | 1 FTE |
| Phase 2 | 6 weeks | 2 FTE | 2 FTE | 1 FTE | 1 FTE |
| Phase 3 | 8 weeks | 2.5 FTE | 2 FTE | 1 FTE | 1.5 FTE |

---

## Shared Infrastructure Dependencies

Several features share common infrastructure requirements that should be implemented once:

### Audio Processing Pipeline
- **Required for:** Speech therapy, pronunciation scoring
- **Options:** AWS Transcribe, Google Speech-to-Text, Azure Speech

### OCR/Vision API
- **Required for:** Homework photo upload
- **Options:** Google Cloud Vision, AWS Textract, Azure Computer Vision

### Game Engine/Framework
- **Required for:** Mini-games, brain training
- **Options:** Flame (Flutter), Rive, Unity (WebGL export)

---

## Decision Rationale

These features are deferred to post-launch sprints for the following reasons:

1. **Scope Complexity**: Each feature requires 2-8 weeks of dedicated development effort
2. **New Microservices**: Several features require entirely new backend services
3. **Third-Party Integrations**: OCR, speech analysis, and audio processing require external API integrations
4. **Specialized Expertise**: Speech therapy and cognitive training features may require domain expert consultation
5. **Launch Focus**: Core platform functionality and enterprise readiness take precedence for initial launch

---

## Next Steps

1. **Stakeholder Review**: Present post-launch roadmap to product and engineering leadership
2. **Sprint Planning**: Allocate dedicated sprints for each phase following successful launch
3. **Technical Spikes**: Conduct technical spikes for third-party integrations (OCR, Speech APIs)
4. **Resource Allocation**: Confirm FTE availability for each phase
5. **User Research**: Gather user feedback on priority ordering based on actual usage patterns

---

## Related Documents

- [Missing Features Implementation Plan](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md) - Detailed implementation specifications
- [Enterprise QA Audit Report](../ENTERPRISE_QA_AUDIT_REPORT.md) - Current platform readiness status
- [Neurodiverse Accessibility Features](./neurodiverse/) - Existing accessibility documentation
- [Game-Based Learning](./platform/) - Existing gamification documentation

---

*Document maintained by: Product Engineering Team*
*Review Schedule: Quarterly or after each phase completion*
