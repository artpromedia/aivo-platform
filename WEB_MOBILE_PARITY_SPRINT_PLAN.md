# AIVO Web-Mobile 100% Parity Sprint Plan

**Created:** January 27, 2026  
**Target Completion:** Q2 2026  
**Total Sprints:** 6 (2-week sprints)  
**Estimated Duration:** 12 weeks

---

## Executive Summary

This plan addresses all feature gaps identified in the Production Readiness Audit to achieve 100% feature parity between web-learner and mobile-learner applications.

### Gap Categories

| Category         | Direction      | Features                                                    |
| ---------------- | -------------- | ----------------------------------------------------------- |
| **Web → Mobile** | Port to Mobile | SEL, Study Skills, Executive Function, Visual Learning      |
| **Mobile → Web** | Port to Web    | Teams (full), Social Stories, Motor Skills, Offline Support |
| **Bug Fix**      | Mobile         | Teams navigation TODO                                       |

### Sprint Overview

| Sprint   | Focus                              | Duration | Complexity |
| -------- | ---------------------------------- | -------- | ---------- |
| Sprint 1 | Foundation & Teams Navigation Fix  | 2 weeks  | Low        |
| Sprint 2 | SEL + Social Stories Parity        | 2 weeks  | Medium     |
| Sprint 3 | Executive Function + Motor Skills  | 2 weeks  | High       |
| Sprint 4 | Study Skills + Visual Learning     | 2 weeks  | Medium     |
| Sprint 5 | Teams Full Feature + Offline (Web) | 2 weeks  | High       |
| Sprint 6 | Integration, Testing & Polish      | 2 weeks  | Medium     |

---

## Sprint 1: Foundation & Quick Wins

**Duration:** Weeks 1-2  
**Theme:** Infrastructure setup and low-hanging fruit

### Goals

- Set up shared component libraries for parity features
- Fix Teams navigation TODO (mobile)
- Establish API contracts for new features
- Create feature flags for gradual rollout

### Tasks

#### 1.1 Teams Navigation Fix (Mobile) - P2

**File:** `apps/mobile-learner/lib/screens/teams_screen.dart`  
**Effort:** 2 story points

```dart
// Current (line 178):
// TODO: Navigate to team search/create

// Target:
Navigator.push(context, MaterialPageRoute(
  builder: (context) => TeamSearchScreen(learnerId: _learnerId),
));
```

**Acceptance Criteria:**

- [ ] "Find a Team" button navigates to team search screen
- [ ] Team search screen allows searching existing teams
- [ ] Team creation flow accessible from search screen
- [ ] Back navigation works correctly

#### 1.2 Create Shared Feature Flag System

**Effort:** 3 story points

**Files to create:**

- `libs/flutter-common/lib/features/feature_flags.dart`
- `packages/feature-flags/src/index.ts` (web)

**Acceptance Criteria:**

- [ ] Feature flags can enable/disable parity features
- [ ] Flags configurable per environment
- [ ] Remote config support for gradual rollout

#### 1.3 API Contract Documentation

**Effort:** 3 story points

**Deliverables:**

- OpenAPI specs for SEL, Executive Function, Study Skills, Visual Learning
- Shared TypeScript/Dart types for Teams, Social Stories, Motor Skills

#### 1.4 Shared UI Component Audit

**Effort:** 2 story points

**Tasks:**

- Inventory existing shared components in `libs/flutter-common`
- Identify components needed for web parity features
- Document component mapping (Flutter ↔ React)

### Sprint 1 Deliverables

- [ ] Teams navigation working in mobile
- [ ] Feature flag infrastructure
- [ ] API contract documentation
- [ ] Component gap analysis document

---

## Sprint 2: SEL + Social Stories Parity

**Duration:** Weeks 3-4  
**Theme:** Emotional intelligence features

### Goals

- Port full SEL experience to mobile
- Port full Social Stories experience to web

### Tasks

#### 2.1 SEL Mobile Implementation

**Source:** `apps/web-learner/app/(learning)/sel/`  
**Target:** `apps/mobile-learner/lib/features/sel/`  
**Effort:** 8 story points

**Components to create:**

```
apps/mobile-learner/lib/features/sel/
├── sel_hub_screen.dart
├── emotion_check_in_screen.dart
├── coping_strategies_screen.dart
├── mindfulness_exercises_screen.dart
├── social_scenarios_screen.dart
├── feelings_journal_screen.dart
├── widgets/
│   ├── emotion_wheel.dart
│   ├── breathing_animation.dart
│   ├── mood_tracker.dart
│   └── coping_card.dart
└── providers/
    └── sel_provider.dart
```

**API Integration:**

- Connect to `services/sel-svc` endpoints
- Implement `SelApiClient` in `offline_api_clients.dart`

**Acceptance Criteria:**

- [ ] Emotion check-in with visual emotion wheel
- [ ] Coping strategies library with favorites
- [ ] Guided breathing exercises with animations
- [ ] Social scenario practice with feedback
- [ ] Feelings journal with mood tracking
- [ ] Offline support for core features
- [ ] Accessibility compliant (screen reader support)

#### 2.2 Social Stories Web Implementation

**Source:** `apps/mobile-learner/lib/social_stories/`  
**Target:** `apps/web-learner/app/(learning)/social-stories/`  
**Effort:** 8 story points

**Components to create:**

```
apps/web-learner/app/(learning)/social-stories/
├── page.tsx
├── [storyId]/
│   └── page.tsx
├── components/
│   ├── StoryCard.tsx
│   ├── StoryViewer.tsx
│   ├── StoryProgress.tsx
│   ├── InteractiveElement.tsx
│   └── ComprehensionCheck.tsx
└── hooks/
    └── useSocialStories.ts
```

**API Integration:**

- Create `lib/social-stories-api.ts`
- Connect to `services/content-svc/social-stories` endpoints

**Acceptance Criteria:**

- [ ] Story library with categories
- [ ] Interactive story viewer with audio support
- [ ] Progress tracking per story
- [ ] Comprehension checks after stories
- [ ] Personalized story recommendations
- [ ] Print-friendly view option

### Sprint 2 Deliverables

- [ ] Full SEL module in mobile app
- [ ] Full Social Stories module in web app
- [ ] Shared API clients for both features
- [ ] Unit tests with >80% coverage

---

## Sprint 3: Executive Function + Motor Skills

**Duration:** Weeks 5-6  
**Theme:** Cognitive and physical development

### Goals

- Port detailed Executive Function views to mobile
- Port Motor Skills exercises to web

### Tasks

#### 3.1 Executive Function Mobile Enhancement

**Source:** `apps/web-learner/app/(learning)/executive-function/`  
**Target:** `apps/mobile-learner/lib/features/executive_function/`  
**Effort:** 10 story points

**Current mobile state:** Basic functionality exists  
**Gap:** Missing detailed views, planning tools, and analytics

**Components to add:**

```
apps/mobile-learner/lib/features/executive_function/
├── planning/
│   ├── task_breakdown_screen.dart
│   ├── priority_matrix_screen.dart
│   └── time_estimation_screen.dart
├── organization/
│   ├── digital_binder_screen.dart
│   ├── assignment_tracker_screen.dart
│   └── resource_organizer_screen.dart
├── working_memory/
│   ├── memory_games_screen.dart
│   ├── chunking_practice_screen.dart
│   └── recall_exercises_screen.dart
├── cognitive_flexibility/
│   ├── perspective_taking_screen.dart
│   ├── problem_solving_screen.dart
│   └── adaptation_challenges_screen.dart
└── analytics/
    ├── ef_dashboard_screen.dart
    └── progress_insights_screen.dart
```

**Acceptance Criteria:**

- [ ] Task breakdown tool with visual decomposition
- [ ] Priority matrix (Eisenhower) with drag-drop
- [ ] Time estimation practice with feedback
- [ ] Digital binder for organizing materials
- [ ] Working memory games (3 varieties minimum)
- [ ] Cognitive flexibility exercises
- [ ] Analytics dashboard with trends
- [ ] Offline capability for core exercises

#### 3.2 Motor Skills Web Implementation

**Source:** `apps/mobile-learner/lib/motor_skills/`  
**Target:** `apps/web-learner/app/(learning)/motor-skills/`  
**Effort:** 8 story points

**Components to create:**

```
apps/web-learner/app/(learning)/motor-skills/
├── page.tsx
├── fine-motor/
│   ├── page.tsx
│   └── exercises/
│       ├── tracing/page.tsx
│       ├── drawing/page.tsx
│       └── typing/page.tsx
├── gross-motor/
│   ├── page.tsx
│   └── activities/
│       ├── movement-breaks/page.tsx
│       └── coordination/page.tsx
├── components/
│   ├── MotorSkillCard.tsx
│   ├── TracingCanvas.tsx
│   ├── DrawingPad.tsx
│   ├── MovementGuide.tsx
│   └── ProgressRing.tsx
└── hooks/
    └── useMotorSkills.ts
```

**Technical Considerations:**

- Canvas API for tracing/drawing exercises
- WebRTC for camera-based movement tracking (optional)
- Keyboard/mouse precision exercises

**Acceptance Criteria:**

- [ ] Fine motor exercises (tracing, drawing, typing)
- [ ] Gross motor movement breaks with video guides
- [ ] Progress tracking for each skill area
- [ ] Adaptive difficulty based on performance
- [ ] Sensory-friendly UI options
- [ ] Works with assistive devices

### Sprint 3 Deliverables

- [ ] Complete Executive Function module in mobile
- [ ] Complete Motor Skills module in web
- [ ] Cross-platform progress sync
- [ ] Performance benchmarks met

---

## Sprint 4: Study Skills + Visual Learning

**Duration:** Weeks 7-8  
**Theme:** Academic support tools

### Goals

- Port Study Skills to mobile
- Port Visual Learning to mobile

### Tasks

#### 4.1 Study Skills Mobile Implementation

**Source:** `apps/web-learner/app/(learning)/study-skills/`  
**Target:** `apps/mobile-learner/lib/features/study_skills/`  
**Effort:** 8 story points

**Components to create:**

```
apps/mobile-learner/lib/features/study_skills/
├── study_skills_hub_screen.dart
├── note_taking/
│   ├── cornell_notes_screen.dart
│   ├── mind_mapping_screen.dart
│   └── outline_method_screen.dart
├── test_prep/
│   ├── flashcard_creator_screen.dart
│   ├── practice_quiz_screen.dart
│   └── study_schedule_screen.dart
├── reading_strategies/
│   ├── sq3r_method_screen.dart
│   ├── annotation_tools_screen.dart
│   └── summarization_screen.dart
├── widgets/
│   ├── cornell_note_template.dart
│   ├── mind_map_canvas.dart
│   ├── flashcard_widget.dart
│   └── study_timer.dart
└── providers/
    └── study_skills_provider.dart
```

**Acceptance Criteria:**

- [ ] Cornell Notes template with sections
- [ ] Mind mapping tool with touch gestures
- [ ] Flashcard creator with spaced repetition
- [ ] Practice quiz generator
- [ ] Study schedule planner
- [ ] SQ3R reading method guide
- [ ] Annotation tools for documents
- [ ] Study session timer with breaks

#### 4.2 Visual Learning Mobile Implementation

**Source:** `apps/web-learner/app/(learning)/visual-learning/`  
**Target:** `apps/mobile-learner/lib/features/visual_learning/`  
**Effort:** 6 story points

**Components to create:**

```
apps/mobile-learner/lib/features/visual_learning/
├── visual_learning_hub_screen.dart
├── graphic_organizers/
│   ├── venn_diagram_screen.dart
│   ├── concept_map_screen.dart
│   ├── flowchart_screen.dart
│   └── timeline_screen.dart
├── visual_aids/
│   ├── color_coding_screen.dart
│   ├── icon_systems_screen.dart
│   └── visual_schedules_screen.dart
├── widgets/
│   ├── venn_diagram_widget.dart
│   ├── concept_map_canvas.dart
│   ├── flowchart_builder.dart
│   └── timeline_widget.dart
└── providers/
    └── visual_learning_provider.dart
```

**Acceptance Criteria:**

- [ ] Venn diagram creator (2-3 circles)
- [ ] Concept map with connections
- [ ] Flowchart builder with shapes
- [ ] Timeline creator
- [ ] Color coding tools
- [ ] Custom icon systems
- [ ] Export to image/PDF
- [ ] Template library

### Sprint 4 Deliverables

- [ ] Complete Study Skills module in mobile
- [ ] Complete Visual Learning module in mobile
- [ ] Shared templates library
- [ ] Export functionality working

---

## Sprint 5: Teams Full Feature + Offline (Web)

**Duration:** Weeks 9-10  
**Theme:** Collaboration and resilience

### Goals

- Port full Teams experience to web
- Implement Progressive Web App (PWA) offline for web

### Tasks

#### 5.1 Teams Web Full Implementation

**Source:** `apps/mobile-learner/lib/features/teams/`  
**Target:** `apps/web-learner/app/(learning)/teams/`  
**Effort:** 10 story points

**Current web state:** Basic team display  
**Gap:** Missing team creation, search, challenges, leaderboards

**Components to create:**

```
apps/web-learner/app/(learning)/teams/
├── page.tsx
├── create/page.tsx
├── search/page.tsx
├── [teamId]/
│   ├── page.tsx
│   ├── members/page.tsx
│   ├── challenges/page.tsx
│   ├── leaderboard/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── TeamCard.tsx
│   ├── TeamSearch.tsx
│   ├── TeamCreator.tsx
│   ├── MemberList.tsx
│   ├── ChallengeCard.tsx
│   ├── Leaderboard.tsx
│   ├── TeamChat.tsx
│   └── InviteModal.tsx
└── hooks/
    ├── useTeam.ts
    ├── useTeamSearch.ts
    └── useTeamChallenges.ts
```

**Acceptance Criteria:**

- [ ] Team search with filters
- [ ] Team creation wizard
- [ ] Team dashboard with stats
- [ ] Member management (invite, remove)
- [ ] Team challenges system
- [ ] Real-time leaderboard
- [ ] Team chat/messaging
- [ ] Team achievements/badges
- [ ] Privacy controls

#### 5.2 Web Offline Support (PWA)

**Target:** `apps/web-learner/`  
**Effort:** 8 story points

**Implementation:**

```
apps/web-learner/
├── public/
│   ├── manifest.json (update)
│   └── sw.js (service worker)
├── lib/
│   └── offline/
│       ├── service-worker-registration.ts
│       ├── offline-storage.ts
│       ├── sync-manager.ts
│       └── offline-indicator.tsx
└── components/
    └── OfflineBanner.tsx
```

**Features:**

- Service Worker for asset caching
- IndexedDB for data persistence
- Background sync for queued actions
- Offline indicator UI

**Acceptance Criteria:**

- [ ] App loads without network
- [ ] Previously viewed content available offline
- [ ] Offline indicator shown when disconnected
- [ ] Actions queued and synced when online
- [ ] Graceful degradation for online-only features
- [ ] Storage quota management
- [ ] Clear offline data option

### Sprint 5 Deliverables

- [ ] Full Teams module in web
- [ ] PWA offline support
- [ ] Background sync working
- [ ] Real-time features gracefully degrade

---

## Sprint 6: Integration, Testing & Polish

**Duration:** Weeks 11-12  
**Theme:** Quality assurance and release prep

### Goals

- End-to-end integration testing
- Performance optimization
- Accessibility audit
- Documentation completion

### Tasks

#### 6.1 Cross-Platform Integration Testing

**Effort:** 6 story points

**Test Scenarios:**

```
tests/e2e/parity/
├── sel.spec.ts
├── social-stories.spec.ts
├── executive-function.spec.ts
├── motor-skills.spec.ts
├── study-skills.spec.ts
├── visual-learning.spec.ts
├── teams.spec.ts
└── offline.spec.ts
```

**Acceptance Criteria:**

- [ ] All features work identically on web and mobile
- [ ] Data syncs correctly between platforms
- [ ] No regression in existing features
- [ ] Performance benchmarks met

#### 6.2 Accessibility Audit & Fixes

**Effort:** 4 story points

**Audit Areas:**

- Screen reader compatibility
- Keyboard navigation (web)
- Color contrast ratios
- Touch target sizes (mobile)
- Motion sensitivity options

**Acceptance Criteria:**

- [ ] WCAG 2.1 AA compliance
- [ ] VoiceOver/TalkBack tested
- [ ] Reduced motion mode available
- [ ] High contrast mode supported

#### 6.3 Performance Optimization

**Effort:** 4 story points

**Targets:**
| Metric | Web Target | Mobile Target |
|--------|------------|---------------|
| First Contentful Paint | <1.5s | <2s |
| Time to Interactive | <3s | <3.5s |
| Largest Contentful Paint | <2.5s | <3s |
| Bundle Size (new features) | <200KB | <150KB |

**Optimization Tasks:**

- Code splitting for new modules
- Image optimization
- Lazy loading implementation
- Cache strategy tuning

#### 6.4 Documentation & Training

**Effort:** 2 story points

**Deliverables:**

- Feature documentation in `/docs`
- API documentation updates
- User guides for new features
- QA test case documentation

### Sprint 6 Deliverables

- [ ] All E2E tests passing
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Release candidate ready

---

## Risk Register

| Risk                        | Probability | Impact | Mitigation                                 |
| --------------------------- | ----------- | ------ | ------------------------------------------ |
| API changes needed          | Medium      | High   | Early API contract lock in Sprint 1        |
| Canvas performance (mobile) | Medium      | Medium | Use Flutter CustomPainter, optimize redraw |
| Offline sync conflicts      | High        | Medium | Implement conflict resolution strategy     |
| Scope creep                 | High        | High   | Strict change control, feature flags       |
| Resource availability       | Medium      | High   | Cross-train team, documentation            |

---

## Success Metrics

| Metric            | Target           | Measurement               |
| ----------------- | ---------------- | ------------------------- |
| Feature Parity    | 100%             | Feature checklist audit   |
| Test Coverage     | >80%             | Jest/Flutter test reports |
| Performance       | Green Lighthouse | Lighthouse CI             |
| Accessibility     | WCAG 2.1 AA      | axe-core audit            |
| User Satisfaction | >4.5/5           | In-app feedback           |

---

## Resource Requirements

### Team Composition (Recommended)

- 2 Flutter developers (mobile)
- 2 React/Next.js developers (web)
- 1 Full-stack developer (APIs)
- 1 QA engineer
- 0.5 UX designer (shared)

### Infrastructure

- Feature flag service (LaunchDarkly/similar)
- E2E testing environment
- Performance monitoring (already have observability stack)

---

## Appendix A: Feature Parity Checklist

### Mobile → Web (Port to Web)

- [ ] Teams - Full feature set
- [ ] Social Stories - Complete module
- [ ] Motor Skills - All exercises
- [ ] Offline Support - PWA implementation

### Web → Mobile (Port to Mobile)

- [ ] SEL - Complete module
- [ ] Study Skills - All tools
- [ ] Executive Function - Detailed views
- [ ] Visual Learning - All organizers

### Bug Fixes

- [ ] Teams navigation TODO (mobile)

---

## Appendix B: API Endpoints Required

### New Endpoints

None required - all features use existing service APIs:

- `services/sel-svc` - SEL features
- `services/content-svc` - Social Stories
- `services/gamification-svc` - Teams
- `services/learner-model-svc` - Progress tracking

### Endpoint Enhancements

- `GET /api/v1/teams/search` - Add filtering params
- `POST /api/v1/offline/sync` - Batch sync endpoint

---

## Appendix C: Shared Components Map

| Flutter Component | React Component     | Feature         |
| ----------------- | ------------------- | --------------- |
| `EmotionWheel`    | `<EmotionWheel />`  | SEL             |
| `StoryViewer`     | `<StoryViewer />`   | Social Stories  |
| `MindMapCanvas`   | `<MindMapCanvas />` | Study Skills    |
| `TracingCanvas`   | `<TracingCanvas />` | Motor Skills    |
| `VennDiagram`     | `<VennDiagram />`   | Visual Learning |
| `TeamCard`        | `<TeamCard />`      | Teams           |
| `OfflineBanner`   | `<OfflineBanner />` | Offline         |

---

_Plan Version: 1.0_  
_Last Updated: January 27, 2026_  
_Next Review: Sprint 1 Retrospective_
