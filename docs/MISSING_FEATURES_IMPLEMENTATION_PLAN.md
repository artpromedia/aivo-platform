# Missing Features Implementation Plan

## Executive Summary

After a comprehensive analysis of the aivo-platform codebase, I've assessed each requested feature against the existing implementation. This document categorizes features into three groups:

1. **Already Implemented** - Features that exist and are production-ready
2. **Partially Implemented** - Features with foundation code but missing key components
3. **Not Implemented** - Features requiring new development

---

## Feature Status Overview

| Category | Feature | Status | Effort |
|----------|---------|--------|--------|
| **Agentic AI Brain** | Virtual brain per student | ✅ Implemented | - |
| | Real-time adaptive learning | ✅ Implemented | - |
| | Memory persistence & context | ✅ Implemented | - |
| | Proactive intervention | ✅ Implemented | - |
| | Model cloning/personalization | ✅ Implemented | - |
| **Homework Helper** | Step-by-step AI guidance | ✅ Implemented | - |
| | Multi-subject support | ✅ Implemented | - |
| | Session history | ✅ Implemented | - |
| | Photo upload & OCR | ⚠️ Partial | Medium |
| | Parent monitoring | ❌ Missing | Medium |
| **Baseline Assessment** | AI-powered assessment | ✅ Implemented | - |
| | Adaptive questioning | ✅ Implemented | - |
| | Results dashboard | ✅ Implemented | - |
| | Learning path generation | ✅ Implemented | - |
| | Multi-provider AI | ✅ Implemented | - |
| **Neurodiverse Features** | Sensory accommodations | ✅ Implemented | - |
| | Focus monitoring | ✅ Implemented | - |
| | Self-regulation tools | ✅ Implemented | - |
| | Writing pad (motor) | ⚠️ Partial | Medium |
| | Executive function support | ⚠️ Partial | Large |
| | Speech therapy integration | ❌ Missing | Large |
| **Game-Based Learning** | XP/Achievements/Streaks | ✅ Implemented | - |
| | Challenges & Leaderboards | ✅ Implemented | - |
| | Age-appropriate game library | ❌ Missing | Large |
| | Focus break mini-games | ❌ Missing | Large |
| | Brain training automation | ❌ Missing | Large |
| **Parent Features** | Weekly digest emails | ✅ Implemented | - |
| | Progress visualization | ✅ Implemented | - |
| | Consent management | ✅ Implemented | - |
| | Multi-child dashboard | ✅ Implemented | - |
| | GDPR data subject rights | ⚠️ Partial | Medium |
| **District Features** | CSV bulk import | ✅ Implemented | - |
| | District-wide analytics | ✅ Implemented | - |
| | School management | ✅ Implemented | - |
| | Custom curriculum integration | ⚠️ Partial | Large |
| | Teacher PD tracking | ❌ Missing | Medium |
| **Content Creation** | Author portal | ✅ Implemented | - |
| | Content validation | ✅ Implemented | - |
| | Question quality checking | ✅ Implemented | - |
| | Review workflow | ✅ Implemented | - |
| | Interactive lesson builder | ⚠️ Partial | Medium |
| **Documentation** | Setup guides | ✅ Implemented | - |
| | API documentation | ✅ Implemented | - |
| | Testing frameworks | ✅ Implemented | - |

---

## Part 1: Already Implemented Features (No Action Required)

### 1.1 Agentic AI "Brain" System ✅

**Location:** `/services/learner-model-svc`

The platform has a sophisticated Virtual Brain implementation:

- **Virtual Brain per Student:** `VirtualBrain` model with skill graph, mastery tracking
- **Real-time Adaptive Learning:** Dual algorithm (BKT + PFA) with learning curve analysis
- **Memory Persistence:** Redis cache + PostgreSQL with practice outcomes, session context
- **Proactive Interventions:** Engagement detector with frustration/boredom/flow scoring, 8+ behavioral signals
- **Model Cloning:** `createPersonalized()` method adjusts parameters for ADHD, dyslexia, ASD, processing speed

### 1.2 Baseline Assessment System ✅

**Location:** `/services/baseline-svc`

Complete implementation with:
- 5 domains: ELA, MATH, SCIENCE, SPEECH, SEL
- 3 grade bands: K-5, 6-8, 9-12
- Adaptive questioning with AI metadata
- Assessment journey lifecycle
- Learning path generation via skill graph

### 1.3 Core Neurodiverse Features ✅

**Locations:** `/services/profile-svc`, `/services/focus-svc`, `/apps/mobile-learner`

- **Sensory Accommodations:** Noise/light sensitivity, color preferences, break needs
- **Focus Monitoring:** Real-time focus scoring, loss detection, intervention suggestions
- **Self-Regulation Tools:** 37+ regulation activities (breathing, grounding, movement)
- **Motor Accommodations:** Handwriting alternatives, tremor filtering, large touch targets

### 1.4 Parent Features ✅

**Location:** `/services/parent-svc`

- **Weekly Digest Emails:** Automated Sunday 6PM, multi-child, trend analysis
- **Progress Visualization:** Dashboard, PDF reports, skill progress charts
- **Consent Management:** COPPA/FERPA compliance, granular consent types
- **Multi-Child Dashboard:** Unified portal with per-child views

### 1.5 Content Creation Tools ✅

**Location:** `/services/content-authoring-svc`

- **Author Portal:** Learning Object CRUD with versioning
- **Content Validation:** 6-point QA engine (accessibility, policy, structure)
- **Question Quality:** Structure validation, choice count requirements
- **Review Workflow:** DRAFT → IN_REVIEW → APPROVED → PUBLISHED with audit trail

### 1.6 District Features (Core) ✅

**Locations:** `/services/sis-sync-svc`, `/services/analytics-svc`, `/apps/web-district`

- **CSV Bulk Import:** OneRoster CSV via SFTP, Clever, ClassLink support
- **District Analytics:** Enterprise dashboard, school comparison, at-risk identification
- **School Management:** Multi-tenant isolation, tenant configuration

---

## Part 2: Partially Implemented Features (Enhancement Required)

### 2.1 Homework Helper - Photo Upload & OCR ⚠️

**Current State:**
- Service accepts IMAGE/PDF source types
- Storage bucket configured
- Expects pre-extracted `rawText` - no actual OCR

**Implementation Plan:**

```
Effort: Medium (2-3 weeks)
Priority: High
Dependencies: Cloud Vision API or Tesseract
```

**Tasks:**

1. **Add OCR Integration Service** (`/services/homework-helper-svc/src/services/ocr.service.ts`)
   - Integrate Google Cloud Vision API or AWS Textract
   - Support for handwritten text recognition
   - Math equation detection (LaTeX conversion)
   - Multi-language OCR

2. **Update Upload Handler** (`/services/homework-helper-svc/src/routes/homework.ts`)
   - Add image preprocessing (rotation, contrast)
   - Extract text before calling AI scaffolder
   - Store both raw image and extracted text

3. **Mobile Integration** (`/apps/mobile-learner`)
   - Add camera capture with cropping
   - Image quality validation
   - Progress indicator during OCR

**Files to Create/Modify:**
```
services/homework-helper-svc/
├── src/services/ocr.service.ts         [NEW]
├── src/services/image-processor.ts     [NEW]
├── src/routes/homework.ts              [MODIFY]
└── package.json                        [ADD: @google-cloud/vision]
```

---

### 2.2 Homework Helper - Parent Monitoring ⚠️

**Current State:**
- No parent-facing endpoints
- Session data exists but not exposed to parents

**Implementation Plan:**

```
Effort: Medium (2 weeks)
Priority: High
Dependencies: parent-svc integration
```

**Tasks:**

1. **Add Parent API Routes** (`/services/homework-helper-svc/src/routes/parent.ts`)
   ```typescript
   GET /parent/:parentId/students/:studentId/homework-history
   GET /parent/:parentId/students/:studentId/homework/:homeworkId/details
   GET /parent/:parentId/students/:studentId/homework/summary
   ```

2. **Create Aggregate Views**
   - Weekly homework completion rates
   - Subject breakdown
   - Time spent on homework
   - Areas needing help (frequent hint usage)

3. **Add to Parent Dashboard** (`/apps/web-parent`)
   - Homework activity card
   - Drill-down to individual sessions
   - Subject performance trends

**Files to Create/Modify:**
```
services/homework-helper-svc/
├── src/routes/parent.ts                [NEW]
├── src/services/parent-analytics.ts    [NEW]
└── src/routes/index.ts                 [MODIFY - add parent routes]

apps/web-parent/
├── app/homework/page.tsx               [NEW]
└── components/HomeworkSummary.tsx      [NEW]
```

---

### 2.3 Writing Pad with AI Assistance ⚠️

**Current State:**
- Motor accommodations exist (handwriting alternatives)
- Word prediction from static word lists
- No AI-powered writing assistance

**Implementation Plan:**

```
Effort: Medium (3-4 weeks)
Priority: Medium
Dependencies: AI Orchestrator integration
```

**Tasks:**

1. **Create Writing Assistant Agent** (`/services/ai-orchestrator/src/agents/writing-assistant.ts`)
   - Grammar suggestions (age-appropriate)
   - Sentence completion
   - Writing prompts/scaffolds
   - Vocabulary enhancement

2. **Add Canvas/Drawing Component** (`/apps/mobile-learner/lib/writing/`)
   - Freeform drawing canvas
   - Stroke recognition
   - Shape detection
   - Save/export drawings

3. **Integrate AI Feedback**
   - Real-time suggestion overlay
   - Dyslexia-friendly formatting options
   - Text-to-speech for written content

**Files to Create:**
```
services/ai-orchestrator/
└── src/agents/writing-assistant.ts     [NEW]

apps/mobile-learner/lib/writing/
├── canvas_widget.dart                  [NEW]
├── stroke_recognizer.dart              [NEW]
├── ai_suggestion_overlay.dart          [NEW]
└── writing_assistant_service.dart      [NEW]
```

---

### 2.4 Executive Function Support ⚠️

**Current State:**
- Session/transition management exists
- Predictability engine for routines
- No explicit task management or EF coaching

**Implementation Plan:**

```
Effort: Large (4-6 weeks)
Priority: Medium
Dependencies: Focus service, AI Orchestrator
```

**Tasks:**

1. **Create Executive Function Service** (`/services/executive-function-svc/`)
   - Task breakdown assistance
   - Visual schedules
   - Time estimation coaching
   - Priority management
   - Working memory supports

2. **Add Task Management Module** (`/apps/mobile-learner/lib/tasks/`)
   - Visual task lists with progress
   - Timer/pomodoro integration
   - Task chunking visualization
   - Reward integration for completion

3. **Create Planning Coach Agent**
   - Personalized planning prompts
   - Strategy suggestions based on profile
   - Goal decomposition assistance

**Database Schema:**
```prisma
model LearnerTask {
  id            String   @id
  learnerId     String
  title         String
  description   String?
  priority      Int      @default(0)
  estimatedMins Int?
  actualMins    Int?
  status        TaskStatus
  parentTaskId  String?  // For subtasks
  dueDate       DateTime?
  completedAt   DateTime?
}

model VisualSchedule {
  id          String   @id
  learnerId   String
  date        DateTime
  blocks      Json     // Time blocks with activities
  completed   Boolean  @default(false)
}
```

---

### 2.5 GDPR Data Subject Rights ⚠️

**Current State:**
- Consent management implemented
- Data export/deletion documented but not coded

**Implementation Plan:**

```
Effort: Medium (2 weeks)
Priority: High (Compliance)
Dependencies: dsr-svc exists but needs enhancement
```

**Tasks:**

1. **Implement Data Export** (`/services/dsr-svc/`)
   - Aggregate all user data across services
   - Generate JSON/CSV export package
   - Include: profile, learning history, assessments, achievements
   - Async job with email notification

2. **Implement Data Deletion**
   - Cascade delete across all services
   - Anonymization option for analytics
   - 30-day grace period
   - Confirmation workflow

3. **Add Parent UI**
   - Data export request button
   - Deletion request with warnings
   - Request status tracking

**Files to Create/Modify:**
```
services/dsr-svc/
├── src/services/data-export.service.ts    [NEW/ENHANCE]
├── src/services/data-deletion.service.ts  [NEW]
├── src/jobs/export-job.ts                 [NEW]
└── prisma/schema.prisma                   [ADD: DataRequest model]
```

---

### 2.6 Custom Curriculum Integration ⚠️

**Current State:**
- Tenant can select curriculum standards (COMMON_CORE, etc.)
- No actual curriculum content management UI

**Implementation Plan:**

```
Effort: Large (4-6 weeks)
Priority: Medium
Dependencies: Content authoring service
```

**Tasks:**

1. **Create Curriculum Management Service** (`/services/curriculum-svc/`)
   - Curriculum unit/lesson organization
   - Scope and sequence management
   - Standards alignment matrix
   - Pacing guide configuration

2. **Add District Admin UI** (`/apps/web-district/app/curriculum/`)
   - Curriculum builder interface
   - Learning object assignment to units
   - Calendar/pacing view
   - Import from common formats

3. **Integration with Content Service**
   - Tag content with curriculum units
   - Filter learner content by curriculum
   - Progress tracking by curriculum unit

---

### 2.7 Interactive Lesson Builder ⚠️

**Current State:**
- JSON-based content structure
- CRUD for learning objects
- No visual/drag-drop builder UI

**Implementation Plan:**

```
Effort: Medium (3-4 weeks)
Priority: Medium
Dependencies: Content authoring service
```

**Tasks:**

1. **Create Visual Builder** (`/apps/web-author/app/builder/`)
   - Drag-drop block editor
   - Component library (text, image, video, quiz, activity)
   - Preview mode
   - Mobile preview

2. **Add Block Types**
   - Reading passage block
   - Interactive question blocks (all 11 types)
   - Media embed block
   - Activity block (external tools)

3. **Accessibility Panel**
   - Alt text entry
   - Reading level indicator
   - Accessibility checklist

---

## Part 3: Not Implemented Features (New Development)

### 3.1 Game-Based Learning System ❌

**Current State:**
- Gamification (XP, achievements, streaks) exists
- No actual playable games
- Break reminders exist but no mini-games

**Implementation Plan:**

```
Effort: Large (8-12 weeks)
Priority: High
Dependencies: New service + mobile integration
```

#### Phase 1: Game Library Service (3-4 weeks)

**Create** `/services/game-library-svc/`

```typescript
// Core Models
interface Game {
  id: string;
  title: string;
  description: string;
  type: 'FOCUS_BREAK' | 'BRAIN_TRAINING' | 'EDUCATIONAL' | 'REWARD';
  category: 'PUZZLE' | 'MEMORY' | 'REACTION' | 'PATTERN' | 'RELAXATION';
  minAge: number;
  maxAge: number;
  estimatedDuration: number; // minutes
  skillsTargeted: string[]; // cognitive skills
  accessibilityFeatures: string[];
  thumbnailUrl: string;
  gameData: Json; // Game-specific configuration
}

interface GameSession {
  id: string;
  learnerId: string;
  gameId: string;
  startedAt: DateTime;
  endedAt: DateTime?;
  score: number?;
  metrics: Json; // accuracy, speed, etc.
  contextType: 'BREAK' | 'REWARD' | 'PRACTICE';
}
```

**API Endpoints:**
```
GET  /games                           - List available games
GET  /games/:gameId                   - Game details
GET  /games/recommended/:learnerId    - Age/skill appropriate games
POST /games/:gameId/sessions          - Start game session
PATCH /games/sessions/:sessionId      - Update session (score, end)
GET  /learners/:learnerId/game-history - Learner's game history
```

**Game Picker Logic:**
- Filter by age (grade band)
- Filter by accessibility needs
- Rotate to prevent repetition
- Weight by cognitive benefit
- Time-of-day preferences

#### Phase 2: Focus Break Mini-Games (3-4 weeks)

**Create** `/apps/mobile-learner/lib/games/`

**Mini-Game Types:**

1. **Breathing Games**
   - Balloon inflation (sync with breathing)
   - Bubble popping (calm/focus)

2. **Simple Puzzles**
   - Pattern matching
   - Memory cards (low cognitive load)
   - Sorting games

3. **Movement Games**
   - Simon Says (physical movement prompts)
   - Dance/stretch follow-along

4. **Sensory Games**
   - Color mixing
   - Sound matching
   - Texture identification

**Integration Points:**
- Focus service triggers break suggestion
- Game picker selects appropriate game
- Session tracked for analytics
- XP awarded on completion

#### Phase 3: Brain Training Module (2-3 weeks)

**Features:**
- Daily brain training recommendations
- Cognitive skill progression tracking
- Personalized difficulty adjustment
- Progress reports

**Brain Training Categories:**
- Working memory exercises
- Attention/focus training
- Processing speed games
- Cognitive flexibility tasks

**Files to Create:**
```
services/game-library-svc/
├── prisma/schema.prisma
├── src/
│   ├── routes/games.ts
│   ├── routes/sessions.ts
│   ├── routes/recommendations.ts
│   ├── services/game-picker.service.ts
│   ├── services/brain-training.service.ts
│   └── services/analytics.service.ts
└── package.json

apps/mobile-learner/lib/games/
├── game_library_screen.dart
├── game_player_widget.dart
├── break_game_overlay.dart
├── brain_training/
│   ├── memory_game.dart
│   ├── pattern_game.dart
│   ├── reaction_game.dart
│   └── focus_game.dart
└── services/
    └── game_service.dart
```

---

### 3.2 Speech Therapy Integration ❌

**Current State:**
- SPEECH domain exists in skill taxonomy
- No actual speech therapy features

**Implementation Plan:**

```
Effort: Large (6-8 weeks)
Priority: Medium
Dependencies: Audio processing, SLP collaboration
```

#### Architecture

**Create** `/services/speech-therapy-svc/`

```typescript
// Core Models
interface SpeechSession {
  id: string;
  learnerId: string;
  therapistId: string?;
  sessionType: 'ARTICULATION' | 'FLUENCY' | 'LANGUAGE' | 'VOICE' | 'SOCIAL';
  targetSounds: string[];
  activities: SpeechActivity[];
  recordings: AudioRecording[];
  progress: SpeechProgress;
}

interface AudioRecording {
  id: string;
  sessionId: string;
  activityId: string;
  audioUrl: string;
  transcription: string?;
  analysis: SpeechAnalysis?;
}

interface SpeechAnalysis {
  targetSound: string;
  accuracy: number;
  fluencyScore: number;
  suggestions: string[];
}
```

#### Features

1. **Articulation Practice**
   - Target sound exercises
   - Word/sentence practice with recording
   - Visual feedback (waveforms)
   - AI pronunciation scoring

2. **Fluency Support**
   - Pacing tools (metronome)
   - Breathing exercises
   - Slow speech modeling
   - Progress tracking

3. **Language Activities**
   - Vocabulary building games
   - Sentence construction
   - Story sequencing
   - Social scenario practice

4. **Therapist Dashboard**
   - Goal setting (IEP-aligned)
   - Session planning
   - Progress monitoring
   - Recording review
   - Parent communication

5. **Parent View**
   - Home practice assignments
   - Progress summaries
   - Session recordings (with permission)

**Technical Requirements:**
- Audio recording/playback
- Speech-to-text integration
- Pronunciation analysis API
- Secure audio storage (HIPAA-adjacent)

**Files to Create:**
```
services/speech-therapy-svc/
├── prisma/schema.prisma
├── src/
│   ├── routes/sessions.ts
│   ├── routes/activities.ts
│   ├── routes/recordings.ts
│   ├── routes/therapist.ts
│   ├── services/speech-analysis.service.ts
│   ├── services/activity-generator.service.ts
│   └── services/progress-tracker.service.ts
└── package.json

apps/mobile-learner/lib/speech/
├── speech_session_screen.dart
├── recording_widget.dart
├── articulation_practice.dart
├── fluency_tools.dart
└── speech_service.dart

apps/web-teacher/app/speech-therapy/
├── page.tsx
├── session-planner.tsx
└── recording-review.tsx
```

---

### 3.3 Teacher Professional Development Tracking ❌

**Current State:**
- No PD tracking service
- Teacher planning exists but not PD

**Implementation Plan:**

```
Effort: Medium (3-4 weeks)
Priority: Low-Medium
Dependencies: Tenant service, Auth service
```

**Create** `/services/professional-dev-svc/`

```typescript
interface PDProgram {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: 'COURSE' | 'WORKSHOP' | 'CERTIFICATION' | 'SELF_PACED';
  hours: number;
  requirements: PDRequirement[];
  modules: PDModule[];
}

interface PDEnrollment {
  id: string;
  teacherId: string;
  programId: string;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  startedAt: DateTime;
  completedAt: DateTime?;
  hoursCompleted: number;
  certificateUrl: string?;
}

interface PDRequirement {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  hoursRequired: number;
  deadline: DateTime;
  isRecurring: boolean;
  recurrenceInterval: string?;
}
```

**Features:**

1. **District Admin**
   - Create PD requirements
   - Assign programs to teachers
   - Track compliance
   - Generate reports

2. **Teacher Portal**
   - View assigned programs
   - Track progress
   - Upload external certifications
   - View compliance status

3. **Reporting**
   - District-wide PD completion
   - Compliance dashboards
   - Hour tracking by category
   - Certificate management

**Files to Create:**
```
services/professional-dev-svc/
├── prisma/schema.prisma
├── src/
│   ├── routes/programs.ts
│   ├── routes/enrollments.ts
│   ├── routes/requirements.ts
│   ├── routes/reports.ts
│   └── services/compliance.service.ts
└── package.json

apps/web-district/app/professional-development/
├── page.tsx
├── programs/
├── requirements/
└── reports/

apps/web-teacher/app/professional-development/
├── page.tsx
└── components/
```

---

## Implementation Priority Matrix

### Phase 1: High Priority (Weeks 1-6)

| Feature | Effort | Business Value | Risk |
|---------|--------|----------------|------|
| Homework OCR | Medium | High | Low |
| Homework Parent Monitoring | Medium | High | Low |
| GDPR Data Rights | Medium | High (Compliance) | Medium |
| Game Library Service (Base) | Large | High | Medium |

### Phase 2: Medium Priority (Weeks 7-12)

| Feature | Effort | Business Value | Risk |
|---------|--------|----------------|------|
| Focus Break Mini-Games | Medium | High | Low |
| Writing AI Assistant | Medium | Medium | Low |
| Interactive Lesson Builder | Medium | Medium | Low |
| Executive Function Tools | Large | High | Medium |

### Phase 3: Lower Priority (Weeks 13-20)

| Feature | Effort | Business Value | Risk |
|---------|--------|----------------|------|
| Brain Training Module | Medium | Medium | Low |
| Speech Therapy Integration | Large | Medium | High |
| Custom Curriculum UI | Large | Medium | Medium |
| Teacher PD Tracking | Medium | Low-Medium | Low |

---

## Technical Considerations

### Shared Infrastructure Needs

1. **Audio Processing Pipeline**
   - Required for: Speech therapy, pronunciation scoring
   - Options: AWS Transcribe, Google Speech-to-Text, Azure Speech

2. **OCR/Vision API**
   - Required for: Homework photo upload
   - Options: Google Cloud Vision, AWS Textract, Azure Computer Vision

3. **Game Engine/Framework**
   - Required for: Mini-games, brain training
   - Options: Flame (Flutter), Rive, Unity (WebGL export)

4. **Real-time Communication**
   - Already exists: WebSocket in gamification-svc
   - Extend for: Game multiplayer, live therapy sessions

### Database Migrations

New services will need:
- Dedicated PostgreSQL schemas
- Migration to shared database or separate DBs
- Cross-service data access patterns

### Testing Strategy

1. **Unit Tests:** Vitest for all new services
2. **Integration Tests:** API endpoint testing
3. **E2E Tests:** Playwright for web, Flutter integration for mobile
4. **Accessibility Tests:** Automated a11y scanning

---

## Resource Estimates

| Phase | Duration | Backend Dev | Frontend Dev | Design | QA |
|-------|----------|-------------|--------------|--------|-----|
| Phase 1 | 6 weeks | 2 FTE | 1.5 FTE | 0.5 FTE | 1 FTE |
| Phase 2 | 6 weeks | 2 FTE | 2 FTE | 1 FTE | 1 FTE |
| Phase 3 | 8 weeks | 2.5 FTE | 2 FTE | 1 FTE | 1.5 FTE |

---

## Next Steps

1. **Review and prioritize** this plan with stakeholders
2. **Validate technical assumptions** with architecture team
3. **Create detailed tickets** for Phase 1 features
4. **Identify external dependencies** (OCR API, Game assets, etc.)
5. **Plan sprint allocation** based on team capacity

---

## Appendix: Existing Service Inventory

| Service | Purpose | Relevance |
|---------|---------|-----------|
| `learner-model-svc` | Virtual brain, adaptive learning | Foundation for EF support |
| `homework-helper-svc` | Homework scaffolding | Extend with OCR, parent view |
| `focus-svc` | Focus tracking, breaks | Integrate with games |
| `gamification-svc` | XP, achievements | Integrate game rewards |
| `parent-svc` | Parent portal | Add homework monitoring |
| `content-authoring-svc` | Content creation | Add visual builder |
| `dsr-svc` | Data subject rights | Implement export/delete |
| `ai-orchestrator` | AI agents | Add writing assistant |

