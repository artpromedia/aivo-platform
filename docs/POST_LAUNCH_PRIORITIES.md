# Post-Launch Priorities

**Document Version:** 2.0
**Last Updated:** January 14, 2026
**Status:** REVISED - Most Features Now Implemented

---

## Overview

~~This document identifies feature implementations that are **not addressed** in the current launch scope due to their larger scope and complexity. These items are better suited for dedicated sprints following the initial platform launch.~~

**UPDATE (January 14, 2026):** The majority of previously deferred features have been **successfully implemented** and are now production-ready. This document has been updated to reflect current implementation status.

All features listed here have been analyzed and planned in the [Missing Features Implementation Plan](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md). This document serves as a summary and quick reference for stakeholders.

---

## Feature Status Summary

### ✅ IMPLEMENTED (Production Ready)

The following features were previously marked as "post-launch" but have been **completed**:

| Feature                            | Implementation Status                              | Service/Location                                           |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| **Photo OCR**                      | ✅ COMPLETE - Multi-provider OCR with math support | `services/homework-helper-svc/src/services/ocr.service.ts` |
| **Writing Pad with AI Assistance** | ✅ COMPLETE - Full AI writing assistant service    | `services/writing-pad-svc/`                                |
| **Focus Break Mini-Games**         | ✅ COMPLETE - 15+ playable mini-games              | `services/focus-svc/src/games/`                            |
| **Speech Therapy Integration**     | ✅ COMPLETE - Full therapy service with recordings | `services/speech-therapy-svc/`                             |

### ⚠️ REMAINING DEFERRED FEATURES

The following features still require implementation:

| Feature                      | Current State                                                      | Effort             | Priority          |
| ---------------------------- | ------------------------------------------------------------------ | ------------------ | ----------------- |
| **Executive Function Tools** | Partial - session management exists, no explicit EF coaching       | Large (4-6 weeks)  | Medium            |
| **GDPR Data Rights**         | Partial - consent management exists, export/delete not implemented | Medium (2 weeks)   | High (Compliance) |
| **Teacher PD Tracking**      | Not implemented - no professional development service              | Medium (3-4 weeks) | Low-Medium        |

---

## Implemented Feature Details (Now Production Ready)

### ✅ Photo OCR

**Business Value:** Enables students to photograph homework problems for AI-assisted step-by-step guidance.

**Implementation Status:** ✅ **COMPLETE**

**Implemented Features:**

- ✅ Multi-provider OCR support (Google Cloud Vision, AWS Textract, Tesseract, Mathpix)
- ✅ Handwritten text recognition with confidence scoring
- ✅ Math equation detection with LaTeX conversion
- ✅ Automatic provider fallback for reliability
- ✅ Bounding box detection for text regions
- ✅ Language detection and multi-language support
- ✅ Integration with homework helper service pipeline

**Service Location:** `services/homework-helper-svc/src/services/ocr.service.ts` (620 lines)

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.1](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#21-homework-helper---photo-upload--ocr-)

---

### ✅ Writing Pad with AI Assistance

**Business Value:** Provides motor-impaired and neurodiverse students with AI-powered writing support.

**Implementation Status:** ✅ **COMPLETE**

**Implemented Features:**

- ✅ Dedicated `writing-pad-svc` microservice
- ✅ AI-powered grammar and spelling feedback
- ✅ Writing suggestions and prompts
- ✅ Content continuation assistance
- ✅ Encouragement and positive reinforcement
- ✅ Writing metrics calculation (word count, readability, etc.)
- ✅ Grade-level appropriate assistance
- ✅ Integration with AI Orchestrator WRITING_ASSISTANT agent
- ✅ Multiple writing types (CREATIVE, EXPOSITORY, PERSUASIVE, NARRATIVE)
- ✅ Dyslexia-friendly formatting support

**Service Location:** `services/writing-pad-svc/` (full microservice with 8 TypeScript files)

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 2.3](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#23-writing-pad-with-ai-assistance-)

---

### ✅ Focus Break Mini-Games

**Business Value:** Provides age-appropriate, calming activities during focus breaks to help students reset and return to learning.

**Implementation Status:** ✅ **COMPLETE**

**Implemented Features:**

- ✅ Comprehensive game library with 15+ mini-games
- ✅ 4 game categories: Cognitive, Relaxation, Physical, Creative
- ✅ Grade-level filtering (K-2, 3-5, 6-8, 9-12)
- ✅ Game types implemented:
  - Memory games with themes (shapes, colors, emojis, nature)
  - Pattern recognition games (visual, auditory, combined)
  - Breathing visualizers (box, triangle, star, wave, balloon patterns)
  - Tap rhythm games with audio/visual cues
  - Drawing prompts with creative exercises
  - Color matching games with difficulty levels
  - Sequence games (numbers, letters, shapes)
  - Focus spot meditation exercises
  - Counting games and shape tracing
- ✅ Accessibility features for neurodiverse learners
- ✅ Session tracking and progress recording
- ✅ XP rewards integration with gamification system
- ✅ Configurable duration (30-120 seconds per game)

**Service Location:** `services/focus-svc/src/games/` (game-library.ts: 575 lines, game-session.ts)

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.1 Phase 2](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#phase-2-focus-break-mini-games-3-4-weeks)

---

### ✅ Speech Therapy Integration

**Business Value:** Enables speech-language pathologists (SLPs) to deliver and track therapy sessions through the platform.

**Implementation Status:** ✅ **COMPLETE**

**Implemented Features:**

- ✅ Dedicated `speech-therapy-svc` microservice
- ✅ 6 session types: ARTICULATION, FLUENCY, LANGUAGE, VOICE, PRAGMATICS, PHONOLOGY
- ✅ Goal management with IEP integration
- ✅ Therapy session scheduling and tracking
- ✅ Recording upload and audio analysis
- ✅ Pronunciation assessment with phoneme-level feedback
- ✅ Azure Cognitive Services integration for speech analysis
- ✅ Progress tracking and reporting
- ✅ Home practice assignment system
- ✅ Parent practice logging with rating system
- ✅ Gamification integration (XP, achievements for therapy completion)
- ✅ 9 activity types for varied therapy exercises
- ✅ Complete REST API with routes for goals, sessions, recordings, home practice

**Service Location:** `services/speech-therapy-svc/` (full microservice with 11+ TypeScript files)

**Key Files:**

- `src/services/speech.service.ts` (1034 lines)
- `src/services/speech-gamification.service.ts` (302+ lines)
- Complete route handlers for all therapy features

**Reference:** [MISSING_FEATURES_IMPLEMENTATION_PLAN.md - Section 3.2](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md#32-speech-therapy-integration-)

---

## Remaining Deferred Feature Details

### ⚠️ Executive Function Tools

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

### ⚠️ GDPR Data Subject Rights

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

### ⚠️ Teacher Professional Development Tracking

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

## Implementation Status Update

### Originally Deferred (8 Features) → Now Complete (4 Features)

**50% of post-launch features were successfully implemented ahead of schedule:**

1. ✅ **Photo OCR** - COMPLETE (was: "no OCR processing" → now: multi-provider with math support)
2. ✅ **Writing Pad with AI** - COMPLETE (was: "no AI assistance" → now: full microservice)
3. ✅ **Focus Break Mini-Games** - COMPLETE (was: "no playable games" → now: 15+ games)
4. ✅ **Speech Therapy Integration** - COMPLETE (was: "taxonomy only" → now: full therapy service)
5. ⚠️ **Executive Function Tools** - Still deferred (4-6 weeks effort)
6. ⚠️ **GDPR Data Rights** - Still deferred (2 weeks effort, compliance priority)
7. ❌ **Brain Training Module** - Still deferred (leverages completed mini-games foundation)
8. ⚠️ **Teacher PD Tracking** - Still deferred (3-4 weeks effort)

---

## Revised Implementation Phases

~~These post-launch features are organized into implementation phases based on priority and dependencies:~~

**UPDATE:** With 4 major features now complete, the remaining work has been reorganized:

### Phase 1: Compliance & Core Tools (Post-Launch Weeks 1-4)

- ⚠️ GDPR Data Rights (2 weeks) - **HIGH PRIORITY** for EU compliance
- ⚠️ Executive Function Tools (4 weeks) - High value for ADHD population

### Phase 2: Optional Enhancements (Post-Launch Weeks 5-8)

- Brain Training Module (2-3 weeks) - Can now leverage completed mini-games library
- Teacher PD Tracking (3-4 weeks) - District value-add feature

~~### Phase 1: High Priority (Post-Launch Weeks 1-6)~~
~~- Photo OCR (High business value, enables core homework helper functionality)~~ ✅ COMPLETE
~~- GDPR Data Rights (Compliance requirement for EU market expansion)~~
~~- Game Library Service foundation (Enables subsequent mini-games)~~ ✅ COMPLETE

~~### Phase 2: Medium Priority (Post-Launch Weeks 7-12)~~
~~- Focus Break Mini-Games (Builds on game library service)~~ ✅ COMPLETE
~~- Writing Pad with AI Assistance (Neurodiverse support enhancement)~~ ✅ COMPLETE
~~- Executive Function Tools (High value for ADHD student population)~~

~~### Phase 3: Lower Priority (Post-Launch Weeks 13-20)~~
~~- Brain Training Module (Builds on game library service)~~
~~- Speech Therapy Integration (Specialized market segment)~~ ✅ COMPLETE
~~- Teacher PD Tracking (District value-add feature)~~

---

## Revised Resource Requirements

~~| Phase | Duration | Backend Dev | Frontend Dev | Design | QA |~~
~~|-------|----------|-------------|--------------|--------|-----|~~
~~| Phase 1 | 6 weeks | 2 FTE | 1.5 FTE | 0.5 FTE | 1 FTE |~~
~~| Phase 2 | 6 weeks | 2 FTE | 2 FTE | 1 FTE | 1 FTE |~~
~~| Phase 3 | 8 weeks | 2.5 FTE | 2 FTE | 1 FTE | 1.5 FTE |~~

**UPDATE:** With 50% of features now complete, resource requirements are significantly reduced:

| Phase                  | Duration | Backend Dev | Frontend Dev | Design   | QA      |
| ---------------------- | -------- | ----------- | ------------ | -------- | ------- |
| Phase 1 (Compliance)   | 4 weeks  | 1.5 FTE     | 1 FTE        | 0.25 FTE | 0.5 FTE |
| Phase 2 (Enhancements) | 4 weeks  | 1 FTE       | 1 FTE        | 0.5 FTE  | 0.5 FTE |

**Total Effort Saved:** ~16 weeks of development time due to completed implementations

---

## Shared Infrastructure Dependencies

Several features share common infrastructure requirements ~~that should be implemented once~~:

### Audio Processing Pipeline

- **Required for:** Speech therapy ~~, pronunciation scoring~~ ✅ **IMPLEMENTED**
- ~~**Options:** AWS Transcribe, Google Speech-to-Text, Azure Speech~~
- **Implementation:** Azure Cognitive Services integration complete

### OCR/Vision API

- **Required for:** Homework photo upload ✅ **IMPLEMENTED**
- ~~**Options:** Google Cloud Vision, AWS Textract, Azure Computer Vision~~
- **Implementation:** Multi-provider support (Google Vision, AWS Textract, Tesseract, Mathpix)

### Game Engine/Framework

- **Required for:** Mini-games ~~, brain training~~ ✅ **IMPLEMENTED**
- ~~**Options:** Flame (Flutter), Rive, Unity (WebGL export)~~
- **Implementation:** Native game library with 15+ games, ready for brain training expansion

---

## Decision Rationale

~~These features are deferred to post-launch sprints for the following reasons:~~

**ORIGINAL RATIONALE (Now Outdated):**
~~1. **Scope Complexity**: Each feature requires 2-8 weeks of dedicated development effort~~
~~2. **New Microservices**: Several features require entirely new backend services~~
~~3. **Third-Party Integrations**: OCR, speech analysis, and audio processing require external API integrations~~
~~4. **Specialized Expertise**: Speech therapy and cognitive training features may require domain expert consultation~~
~~5. **Launch Focus**: Core platform functionality and enterprise readiness take precedence for initial launch~~

**UPDATED RATIONALE (January 14, 2026):**

The **remaining** deferred features (Executive Function Tools, GDPR Data Rights, Teacher PD Tracking) are still deferred because:

1. **GDPR Compliance Complexity**: Data export/deletion requires careful cross-service orchestration
2. **Executive Function Coaching**: Requires domain expertise and extensive UX testing for ADHD populations
3. **Teacher PD Tracking**: Lower priority - can be addressed based on district demand
4. **Brain Training**: Foundation now complete (mini-games library), easier to implement post-launch

**Major Achievement:** 4 of the most complex features (OCR, Writing Pad, Mini-Games, Speech Therapy) were successfully implemented, representing ~16 weeks of saved post-launch effort.

---

## Next Steps

1. **~~Stakeholder Review~~: ~~Present post-launch roadmap to product and engineering leadership~~** ✅ **REVISED**: Present **updated** roadmap showing 50% completion
2. **Sprint Planning**: Allocate ~~dedicated sprints for each phase~~ **2 short sprints (4 weeks each)** for remaining features
3. **~~Technical Spikes~~: ~~Conduct technical spikes for third-party integrations (OCR, Speech APIs)~~** ✅ **COMPLETE**: All major integrations now implemented
4. **Resource Allocation**: Confirm ~~FTE availability for each phase~~ **reduced FTE needs** (1.5 FTE backend, 1 FTE frontend)
5. **User Research**: Gather user feedback on ~~priority ordering~~ **newly implemented features** and adjust remaining roadmap

---

## Related Documents

- [Missing Features Implementation Plan](./MISSING_FEATURES_IMPLEMENTATION_PLAN.md) - Detailed implementation specifications **(needs update to reflect completed features)**
- [Enterprise QA Audit Report](../ENTERPRISE_QA_AUDIT_REPORT.md) - Current platform readiness status
- [Neurodiverse Accessibility Features](./neurodiverse/) - Existing accessibility documentation
- [Game-Based Learning](./platform/) - Existing gamification documentation

---

_Document maintained by: Product Engineering Team_
_Review Schedule: Quarterly or after each phase completion_
_Last Major Update: January 14, 2026 - Revised to reflect 4 completed features_
