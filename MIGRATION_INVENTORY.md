# Migration Inventory: aivo-agentic-ai-learning-app → aivo-platform

## Overview
- **Source Repository**: artpromedia/aivo-agentic-ai-learning-app (Vite + React + Next.js)
- **Target Repository**: artpromedia/aivo-platform (Next.js + Turbo monorepo)
- **Migration Date**: January 2026
- **Status**: Sprint 0 - Foundation & Audit

---

## Feature Inventory Summary

| Category | Source Count | Target Count | Gap | Priority |
|----------|--------------|--------------|-----|----------|
| Web Applications | 7 | 9 | +2 (more in target) | - |
| Mobile Applications | 1 | 3 | +2 (more in target) | - |
| Python Services | 5 | 1 | -4 (need to migrate) | P0 |
| Learner Components | 50+ | Partial | Varies | P0-P2 |
| Assessment System | Complete | Partial | High | P0 |
| AI/ML Services | 4 | 1 | -3 (need to migrate) | P0 |

---

## Applications (apps/)

### Source: aivo-agentic-ai-learning-app

| Application | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|-------------|-------------------|--------|------------|----------|-----------------|-------|
| Learner App | /apps/learner-app | Complete | High | P0 | /apps/web-learner | Core learner experience |
| Teacher Portal | /apps/teacher-portal | Complete | Medium | P1 | /apps/web-teacher | Teacher dashboard |
| Parent Portal | /apps/parent-portal | Complete | Medium | P1 | /apps/web-parent | Parent dashboard |
| District Portal | /apps/district-portal | Complete | Medium | P1 | /apps/web-district | District admin |
| Admin Portal | /apps/admin-portal | Complete | High | P0 | /apps/web-platform-admin | Platform admin |
| Mobile Learner | /apps/mobile-learner | Complete | High | P2 | /apps/mobile-learner | Flutter app |
| API Service | /apps/api | Complete | Medium | P1 | N/A (integrated) | API routes |
| API Gateway Backend | /apps/api-gateway-backend | Complete | Medium | P0 | /services/api-gateway | Python FastAPI |
| Auth Service Backend | /apps/auth-service-backend | Partial | Medium | P1 | /services/auth-svc | Auth handling |
| Web App | /apps/web | Complete | Medium | P2 | N/A | Vite wrapper |

---

## Learner App Components (apps/learner-app/src/components/)

### FocusMonitor & Brain Games

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| FocusMonitor | /components/FocusMonitor/FocusMonitor.tsx | Complete | High | P0 | /apps/web-learner/src/components/FocusMonitor | Core focus tracking |
| GameBreakModal | /components/FocusMonitor/GameBreakModal.tsx | Complete | Medium | P0 | Same | Break interruption modal |
| BreathingExercise | /components/FocusMonitor/games/BreathingExercise.tsx | Complete | Medium | P0 | Same | Calming game |
| MemoryMatchGame | /components/FocusMonitor/games/MemoryMatchGame.tsx | Complete | Medium | P0 | Same | Memory training |
| ShapeSorterGame | /components/FocusMonitor/games/ShapeSorterGame.tsx | Complete | Medium | P1 | Same | Visual processing |
| CodeBreakingGame | /components/FocusMonitor/games/CodeBreakingGame.tsx | Complete | Medium | P1 | Same | Logic training |
| ReactionTimeGame | /components/FocusMonitor/games/ReactionTimeGame.tsx | Complete | Medium | P1 | Same | Attention training |
| CountingGame | /components/FocusMonitor/games/CountingGame.tsx | Complete | Low | P1 | Same | Number skills |
| SimonSaysGame | /components/FocusMonitor/games/SimonSaysGame.tsx | Complete | Medium | P1 | Same | Memory/attention |
| LogicPuzzleGame | /components/FocusMonitor/games/LogicPuzzleGame.tsx | Complete | Medium | P2 | Same | Reasoning |
| WordScrambleGame | /components/FocusMonitor/games/WordScrambleGame.tsx | Complete | Medium | P2 | Same | Language |
| MathSpeedGame | /components/FocusMonitor/games/MathSpeedGame.tsx | Complete | Medium | P2 | Same | Math fluency |

### MiniGames

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| ReactionGame | /components/MiniGames/ReactionGame.tsx | Complete | Medium | P1 | /apps/web-learner/src/components/MiniGames | Quick games |
| PatternGame | /components/MiniGames/PatternGame.tsx | Complete | Medium | P1 | Same | Pattern recognition |
| BreathingGame | /components/MiniGames/BreathingGame.tsx | Complete | Low | P0 | Same | Regulation |
| MemoryGame | /components/MiniGames/MemoryGame.tsx | Complete | Medium | P1 | Same | Working memory |
| SortingGame | /components/MiniGames/SortingGame.tsx | Complete | Medium | P1 | Same | Categorization |

### Executive Function

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| VisualSchedule | /components/ExecutiveFunction/VisualSchedule.tsx | Complete | High | P0 | /apps/web-learner/src/components/ExecutiveFunction | Task organization |
| TaskBreakdown | /components/ExecutiveFunction/TaskBreakdown.tsx | Complete | Medium | P0 | Same | Task chunking |
| VisualTimer | /components/ExecutiveFunction/VisualTimer.tsx | Complete | Medium | P0 | Same | Time management |
| FirstThenBoard | /components/ExecutiveFunction/FirstThenBoard.tsx | Complete | Medium | P0 | Same | Sequencing |

### Self-Regulation

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| CalmingSpace | /components/SelfRegulation/CalmingSpace.tsx | Complete | High | P0 | /apps/web-learner/src/components/SelfRegulation | Sensory break |
| EmotionCheckIn | /components/SelfRegulation/EmotionCheckIn.tsx | Complete | Medium | P0 | Same | Emotion tracking |
| RegulationActivity | /components/SelfRegulation/RegulationActivity.tsx | Complete | Medium | P0 | Same | Calming activities |

### Sensory Profile

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| SensoryProfileSetup | /components/SensoryProfile/SensoryProfileSetup.tsx | Complete | High | P0 | /apps/web-learner/src/components/SensoryProfile | Sensory preferences |

### Writing & Drawing

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| WritingPad | /components/WritingPad/WritingPad.tsx | Complete | High | P0 | /apps/web-learner/src/components/WritingPad | Digital writing |
| DrawPad | /components/WritingPad/DrawPad.tsx | Complete | Medium | P0 | Same | Drawing canvas |

### Game Picker

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| GamePicker | /components/GamePicker/GamePicker.tsx | Complete | High | P0 | /apps/web-learner/src/components/GamePicker | Game selection UI |

### Lessons

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| ProgressTracker | /components/lesson/ProgressTracker.tsx | Complete | Medium | P0 | /apps/web-learner/src/components/lesson | Progress display |
| VideoLesson | /components/lesson/VideoLesson.tsx | Complete | Medium | P1 | Same | Video player |
| LearningGame | /components/lesson/LearningGame.tsx | Complete | Medium | P1 | Same | Interactive lessons |
| PracticeExercises | /components/lesson/PracticeExercises.tsx | Complete | Medium | P1 | Same | Practice mode |

### Core Components

| Feature | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| PWAInstallPrompt | /components/PWAInstallPrompt.tsx | Complete | Low | P2 | /apps/web-learner/src/components | PWA install |
| ExplainableModelCloning | /components/ExplainableModelCloning.tsx | Complete | High | P0 | Same | AI model personalization |
| ProgressRing | /components/ProgressRing.tsx | Complete | Low | P1 | Same | Progress visualization |
| ThemeSwitcher | /components/ThemeSwitcher.tsx | Complete | Low | P1 | Same | Theme toggle |
| EncouragementBanner | /components/EncouragementBanner.tsx | Complete | Low | P1 | Same | Motivational UI |
| AskParentHelp | /components/AskParentHelp.tsx | Complete | Medium | P0 | Same | Parent assistance |
| LearnerProtectedRoute | /components/LearnerProtectedRoute.tsx | Complete | Medium | P0 | Same | Auth routing |
| GradeBasedThemeSync | /components/GradeBasedThemeSync.tsx | Complete | Low | P1 | Same | Theme by grade |
| OfflineIndicator | /components/OfflineIndicator.tsx | Complete | Low | P1 | Same | Offline status |
| ExitConfirmation | /components/ExitConfirmation.tsx | Complete | Low | P1 | Same | Exit dialog |
| OnboardingGuard | /components/OnboardingGuard.tsx | Complete | Medium | P0 | Same | Onboarding flow |
| SubjectCard | /components/SubjectCard.tsx | Complete | Low | P1 | Same | Subject display |
| ConnectivityBanner | /components/ConnectivityBanner/ConnectivityBanner.tsx | Complete | Low | P1 | Same | Network status |

---

## Learner App Pages (apps/learner-app/src/pages/)

| Page | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|------|-------------------|--------|------------|----------|-----------------|-------|
| Home | /pages/Home.tsx | Complete | Medium | P0 | /apps/web-learner/src/app/home | Dashboard |
| Login | /pages/Login.tsx | Complete | Medium | P0 | /apps/web-learner/src/app/login | Auth page |
| SubjectSelection | /pages/SubjectSelection.tsx | Complete | Medium | P0 | /apps/web-learner/src/app/subjects | Subject picker |
| NewBaselineAssessment | /pages/NewBaselineAssessment.tsx | Complete | High | P0 | /apps/web-learner/src/app/baseline | Initial assessment |
| HomeworkHelper | /pages/HomeworkHelper.tsx | Complete | High | P0 | /apps/web-learner/src/app/homework | Homework AI |
| Rewards | /pages/Rewards.tsx | Complete | Medium | P1 | /apps/web-learner/src/app/rewards | Gamification |
| ModelCloning | /pages/ModelCloning.tsx | Complete | High | P0 | /apps/web-learner/src/app/model-cloning | AI personalization |
| ActivityPage | /pages/ActivityPage.tsx | Complete | Medium | P1 | /apps/web-learner/src/app/activity | Activity log |
| ExecutiveFunction | /pages/ExecutiveFunction.tsx | Complete | High | P0 | /apps/web-learner/src/app/executive-function | EF tools |

### Subject Pages - K-5

| Subject | Location (Source) | Status | Priority | Notes |
|---------|-------------------|--------|----------|-------|
| Math (K-5) | /pages/subjects/k5/Math.tsx | Complete | P1 | Elementary math |
| Reading (K-5) | /pages/subjects/k5/Reading.tsx | Complete | P1 | Elementary reading |
| Writing (K-5) | /pages/subjects/k5/Writing.tsx | Complete | P1 | Elementary writing |
| Science (K-5) | /pages/subjects/k5/Science.tsx | Complete | P1 | Elementary science |
| Social Studies (K-5) | /pages/subjects/k5/SocialStudies.tsx | Complete | P1 | Elementary social studies |
| Art (K-5) | /pages/subjects/k5/Art.tsx | Complete | P2 | Elementary art |
| Music (K-5) | /pages/subjects/k5/Music.tsx | Complete | P2 | Elementary music |
| PE (K-5) | /pages/subjects/k5/PE.tsx | Complete | P2 | Elementary PE |
| Health (K-5) | /pages/subjects/k5/Health.tsx | Complete | P2 | Elementary health |
| Technology (K-5) | /pages/subjects/k5/Technology.tsx | Complete | P2 | Elementary tech |

### Subject Pages - Middle School

| Subject | Location (Source) | Status | Priority | Notes |
|---------|-------------------|--------|----------|-------|
| Math (MS) | /pages/subjects/ms/Math.tsx | Complete | P1 | Middle school math |
| ELA (MS) | /pages/subjects/ms/ELA.tsx | Complete | P1 | Middle school ELA |
| Science (MS) | /pages/subjects/ms/Science.tsx | Complete | P1 | Middle school science |
| Social Studies (MS) | /pages/subjects/ms/SocialStudies.tsx | Complete | P1 | Middle school social studies |
| Arts (MS) | /pages/subjects/ms/Arts.tsx | Complete | P2 | Middle school arts |
| PE/Health (MS) | /pages/subjects/ms/PEHealth.tsx | Complete | P2 | Middle school PE/health |
| Technology/CS (MS) | /pages/subjects/ms/TechnologyCS.tsx | Complete | P2 | Middle school CS |
| World Languages (MS) | /pages/subjects/ms/WorldLanguages.tsx | Complete | P2 | Middle school languages |

### Subject Pages - High School

| Subject | Location (Source) | Status | Priority | Notes |
|---------|-------------------|--------|----------|-------|
| Science (HS) | /pages/subjects/hs/Science.tsx | Complete | P1 | High school science |
| Computer Science (HS) | /pages/subjects/hs/ComputerScience.tsx | Complete | P1 | High school CS |
| World Languages (HS) | /pages/subjects/hs/WorldLanguages.tsx | Complete | P2 | High school languages |

---

## Python Services (services/)

### Source: aivo-agentic-ai-learning-app

| Service | Location (Source) | Status | Complexity | Priority | Target Location | Notes |
|---------|-------------------|--------|------------|----------|-----------------|-------|
| AI Inference Service | /services/ai-inference-service | Complete | High | P0 | /services/ai-inference-svc | Core AI inference (FastAPI) |
| API Gateway | /services/api-gateway | Complete | High | P0 | /services/api-gateway | Request routing |
| Auth Service | /services/auth-service | Complete | Medium | P1 | /services/auth-svc | JWT/OAuth |
| Curriculum Service | /services/curriculum-service | Complete | High | P0 | /services/curriculum-svc | Content management |
| Training Service | /services/training-service | Complete | High | P0 | /services/training-svc | Brain training models |

### Python Service Components

#### AI Inference Service (/services/ai-inference-service/)

| Component | Location | Status | Priority | Description |
|-----------|----------|--------|----------|-------------|
| Main App | /app/main.py | Complete | P0 | FastAPI entry point |
| API Routes | /app/api/ | Complete | P0 | REST endpoints |
| Models | /app/models/ | Complete | P0 | Data models |
| Schemas | /app/schemas/ | Complete | P0 | Pydantic schemas |
| Services | /app/services/ | Complete | P0 | Business logic |
| Utils | /app/utils/ | Complete | P0 | Helpers |
| Core Config | /app/core/ | Complete | P0 | Configuration |
| Agentic Layer | /app/agentic/ | Complete | P0 | AI agents |
| Migrations | /migrations/ | Complete | P0 | DB migrations |
| Tests | /tests/ | Complete | P0 | Unit tests |

#### API Gateway (/services/api-gateway/)

| Component | Location | Status | Priority | Description |
|-----------|----------|--------|----------|-------------|
| Main App | /app/main.py | Complete | P0 | FastAPI entry |
| Routers | /app/routers/ | Complete | P0 | Route handlers |
| Routes | /app/routes/ | Complete | P0 | Path definitions |
| Middleware | /app/middleware/ | Complete | P0 | Request middleware |
| Background Jobs | /app/background_jobs.py | Complete | P1 | Async tasks |
| Seeds | /app/seeds/ | Complete | P2 | Data seeding |

#### Curriculum Service (/services/curriculum-service/)

| Component | Location | Status | Priority | Description |
|-----------|----------|--------|----------|-------------|
| Main App | /app/ | Complete | P0 | Service logic |
| Models | /models/ | Complete | P0 | Curriculum models |
| Alembic Migrations | /alembic/ | Complete | P0 | DB schema |

#### Training Service (/services/training-service/)

| Component | Location | Status | Priority | Description |
|-----------|----------|--------|----------|-------------|
| Main App | /app/ | Complete | P0 | Training logic |
| Config | /config/ | Complete | P0 | Training configs |
| Scripts | /scripts/ | Complete | P1 | Training scripts |

---

## Packages (packages/)

### Source: aivo-agentic-ai-learning-app

| Package | Location (Source) | Status | Priority | Target Location | Notes |
|---------|-------------------|--------|----------|-----------------|-------|
| Auth | /packages/auth | Complete | P0 | /libs/ts-rbac (partial) | Auth utilities |
| UI Components | /packages/ui | Complete | P0 | /libs/ui-web | React components |
| Types | /packages/types | Complete | P0 | /libs/ts-types | TypeScript types |
| Utils | /packages/utils | Complete | P0 | /libs/ts-utils | Utility functions |
| Config | /packages/config | Complete | P1 | Root configs | Build configs |
| Tailwind Config | /packages/tailwind-config | Complete | P1 | /packages/database | CSS framework |
| TypeScript Config | /packages/typescript-config | Complete | P1 | Root tsconfig | TS settings |

---

## Configuration Files

| File | Source | Target | Migration Action |
|------|--------|--------|------------------|
| package.json | Root | Root | Merge dependencies |
| .env.example | Root | Root | Merge variables |
| .env.backend.example | Root | N/A | Migrate to services |
| docker-compose.yml | Implied | /docker | Create/update |
| turbo.json | Root | Root | Verify compatibility |
| tsconfig.json | Root | Root | Verify paths |
| vitest.config.ts | Root | Root | Verify test config |
| playwright.config.ts | Root | Root | Verify E2E config |

---

## Migration Priority Matrix

### P0 (Critical) - Must migrate first
1. AI Inference Service - Core AI functionality
2. Training Service - Brain training models
3. Curriculum Service - Content delivery
4. API Gateway - Request routing
5. FocusMonitor components - Core UX
6. Executive Function components - Learning support
7. Self-Regulation components - Emotional support
8. Baseline Assessment - Initial assessment flow
9. GamePicker - Activity selection
10. WritingPad - Digital writing tools

### P1 (Important) - Second wave
1. Auth Service - Authentication enhancements
2. MiniGames - Brain break activities
3. Subject pages (core subjects)
4. Lesson components - Content delivery
5. UI packages - Shared components
6. Type packages - Type definitions

### P2 (Nice to have) - Third wave
1. PWA features - Offline support
2. Elective subjects - Art, Music, etc.
3. Theme customization
4. Additional games
5. Mobile learner app enhancements

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Python service version conflicts | High | Medium | Create isolated Docker containers |
| React 19 vs React 18 differences | Medium | High | Test component compatibility |
| Vite to Next.js routing changes | Medium | High | Use app router conventions |
| State management differences | Medium | Medium | Gradual zustand integration |
| Testing framework conflicts | Low | Medium | Align on vitest configuration |

---

## Total Feature Count Summary

- **Total Components**: 50+
- **Total Pages**: 35+
- **Total Services**: 5 (Python)
- **Total Packages**: 7
- **Total Subject Areas**: 28

---

## Next Steps

1. [x] Complete feature inventory (this document)
2. [ ] Create dependency compatibility matrix
3. [ ] Create architecture mapping
4. [ ] Create API inventory
5. [ ] Set up Python services directory structure
6. [ ] Create Docker configurations
7. [ ] Implement API Gateway
8. [ ] Create testing suite
9. [ ] Validate migration
