# UI Component Gap Analysis

## Executive Summary

**Analysis Date:** January 19, 2026

This document compares UI components between the legacy learner app and the current platform to identify missing, partial, and complete components.

### Overall Status

| Category | Legacy Components | Current Components | Gap |
|----------|-------------------|-------------------|-----|
| Core UI | 30+ | 27 | 3 |
| Focus/Games | 12 | 3 | 9 |
| Self-Regulation | 6 | 0 | 6 |
| Executive Function | 5 | 0 | 5 |
| Homework Helper | 8 | 0 | 8 |
| Writing Tools | 4 | 0 | 4 |
| Sensory Profile | 3 | 0 | 3 |
| **Total** | **68** | **30** | **38** |

---

## Legacy Components Inventory

### Location: `apps/learner-app/src/components/`

```
apps/learner-app/src/components/
├── AskParentHelp.tsx
├── BigButton.tsx
├── ConnectivityBanner/
│   └── ConnectivityBanner.tsx
├── EncouragementBanner.tsx
├── ExecutiveFunction/
│   ├── FirstThenBoard.tsx
│   ├── TaskBreakdown.tsx
│   ├── VisualSchedule.tsx
│   └── VisualTimer.tsx
├── ExitConfirmation.tsx
├── ExplainableModelCloning.tsx
├── FocusMonitor/
│   ├── FocusMonitor.tsx
│   ├── GameBreakModal.tsx
│   └── games/
│       ├── BreathingExercise.tsx
│       ├── CodeBreakingGame.tsx
│       ├── CountingGame.tsx
│       ├── LogicPuzzleGame.tsx
│       ├── MathSpeedGame.tsx
│       ├── MemoryMatchGame.tsx
│       ├── ReactionTimeGame.tsx
│       ├── ShapeSorterGame.tsx
│       ├── SimonSaysGame.tsx
│       └── WordScrambleGame.tsx
├── GamePicker/
│   ├── GamePicker.tsx
│   └── GameCard.tsx
├── GradeBasedThemeSync.tsx
├── HomeworkHelper/
│   ├── HomeworkHelper.tsx
│   ├── HomeworkUpload.tsx
│   ├── HomeworkInbox.tsx
│   ├── HomeworkSession.tsx
│   ├── WorkProductInput.tsx
│   └── steps/
│       ├── UnderstandStep.tsx
│       ├── PlanStep.tsx
│       ├── SolveStep.tsx
│       └── CheckStep.tsx
├── LearnerProtectedRoute.tsx
├── MiniGames/
│   └── MiniGameWrapper.tsx
├── OfflineIndicator.tsx
├── OnboardingGuard.tsx
├── PWAInstallPrompt.tsx
├── PageWrapper.tsx
├── ProgressRing.tsx
├── RoleSelection.tsx
├── RouteTestWrapper.tsx
├── SelfRegulation/
│   ├── BreathingExercise.tsx
│   ├── CalmingSpace.tsx
│   ├── EmotionCheckIn.tsx
│   ├── RegulationActivity.tsx
│   └── SelfRegulationHub.tsx
├── SensoryProfile/
│   ├── AccessibilityPanel.tsx
│   ├── SensoryProfile.tsx
│   └── SensoryProfileSetup.tsx
├── SubjectCard.tsx
├── SubjectPage.tsx
├── ThemeSwitcher.tsx
├── WritingPad/
│   ├── DrawPad.tsx
│   ├── EssayBuilder.tsx
│   ├── WritingPad.tsx
│   └── HandwritingRecognition.tsx
├── baseline/
│   ├── BaselineItem.tsx
│   ├── BaselineProgress.tsx
│   └── DomainTransition.tsx
└── lesson/
    ├── LessonContent.tsx
    ├── LessonNavigation.tsx
    └── InteractiveLesson.tsx
```

---

## Current Components Inventory

### Location: `packages/ui/src/components/`

```
packages/ui/src/components/
├── Assessment/
│   ├── Assessment.stories.tsx
│   ├── Assessment.test.tsx
│   ├── AssessmentFlow.tsx
│   ├── AssessmentCard.tsx
│   ├── QuestionRenderer.tsx
│   ├── ProgressIndicator.tsx
│   └── GameBreak.tsx
├── FocusTimer/
│   ├── FocusModeSelector.tsx
│   ├── BreakActivities.tsx
│   ├── FocusTimer.stories.tsx
│   ├── FocusTimer.test.tsx
│   └── FocusTimer.tsx
├── GamePicker/
│   ├── GameCard.stories.tsx
│   ├── GamePicker.stories.tsx
│   ├── GameCard.tsx
│   ├── GamePicker.test.tsx
│   └── GamePicker.tsx
├── ProgressDashboard/
│   ├── AchievementBadge.tsx
│   ├── GoalProgress.tsx
│   ├── LearningCard.tsx
│   ├── ProgressDashboard.test.tsx
│   ├── ProgressDashboard.stories.tsx
│   ├── ProgressDashboard.tsx
│   └── StreakDisplay.tsx
└── SubjectCard/
    ├── SubjectCard.test.tsx
    ├── SubjectCard.stories.tsx
    └── SubjectCard.tsx
```

---

## Component Gap Matrix

### 1. Focus & Engagement Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **FocusMonitor** | ✅ `FocusMonitor.tsx` | 🔶 `FocusTimer.tsx` | Enhance | P0 | Medium |
| **GameBreakModal** | ✅ `GameBreakModal.tsx` | 🔶 `GameBreak.tsx` | Enhance | P0 | Low |
| **BreathingExercise** | ✅ `games/` | ❌ | Create | P0 | Medium |
| **MathSpeedGame** | ✅ `games/` | ❌ | Create | P0 | Medium |
| **SimonSaysGame** | ✅ `games/` | ❌ | Create | P0 | High |
| **MemoryMatchGame** | ✅ `games/` | ❌ | Create | P0 | Medium |
| **CountingGame** | ✅ `games/` | ❌ | Create | P0 | Low |
| **ReactionTimeGame** | ✅ `games/` | ❌ | Create | P1 | Medium |
| **ShapeSorterGame** | ✅ `games/` | ❌ | Create | P1 | Medium |
| **WordScrambleGame** | ✅ `games/` | ❌ | Create | P1 | Medium |
| **LogicPuzzleGame** | ✅ `games/` | ❌ | Create | P1 | High |
| **CodeBreakingGame** | ✅ `games/` | ❌ | Create | P2 | High |

### 2. Self-Regulation Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **SelfRegulationHub** | ✅ | ❌ | Create | P0 | Medium |
| **EmotionCheckIn** | ✅ | ❌ | Create | P0 | Medium |
| **RegulationActivity** | ✅ | ❌ | Create | P0 | Medium |
| **CalmingSpace** | ✅ | ❌ | Create | P0 | Medium |
| **BreathingExercise** | ✅ | ❌ | Create | P0 | Low |

### 3. Executive Function Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **VisualTimer** | ✅ | ❌ | Create | P0 | Medium |
| **VisualSchedule** | ✅ | ❌ | Create | P0 | High |
| **FirstThenBoard** | ✅ | ❌ | Create | P0 | Medium |
| **TaskBreakdown** | ✅ | ❌ | Create | P0 | Medium |

### 4. Homework Helper Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **HomeworkHelper** | ✅ | ❌ | Create | P0 | High |
| **HomeworkUpload** | ✅ | ❌ | Create | P0 | Medium |
| **HomeworkInbox** | ✅ | ❌ | Create | P1 | Medium |
| **HomeworkSession** | ✅ | ❌ | Create | P0 | High |
| **WorkProductInput** | ✅ | ❌ | Create | P0 | Medium |
| **UnderstandStep** | ✅ | ❌ | Create | P0 | Medium |
| **PlanStep** | ✅ | ❌ | Create | P0 | Medium |
| **SolveStep** | ✅ | ❌ | Create | P0 | Medium |
| **CheckStep** | ✅ | ❌ | Create | P0 | Medium |

### 5. Writing Tools Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **WritingPad** | ✅ | ❌ | Create | P1 | High |
| **DrawPad** | ✅ | ❌ | Create | P1 | High |
| **EssayBuilder** | ✅ | ❌ | Create | P1 | High |
| **HandwritingRecognition** | ✅ | ❌ | Create | P1 | Very High |

### 6. Sensory Profile Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **SensoryProfile** | ✅ | ❌ | Create | P0 | High |
| **SensoryProfileSetup** | ✅ | ❌ | Create | P0 | High |
| **AccessibilityPanel** | ✅ | ❌ | Create | P0 | Medium |

### 7. Navigation & UX Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **OnboardingGuard** | ✅ | ❌ | Create | P0 | Medium |
| **LearnerProtectedRoute** | ✅ | 🔶 | Enhance | P0 | Low |
| **ConnectivityBanner** | ✅ | ❌ | Create | P1 | Low |
| **OfflineIndicator** | ✅ | ❌ | Create | P1 | Low |
| **PWAInstallPrompt** | ✅ | ❌ | Create | P2 | Low |
| **ExitConfirmation** | ✅ | ❌ | Create | P1 | Low |
| **EncouragementBanner** | ✅ | ❌ | Create | P1 | Low |
| **AskParentHelp** | ✅ | ❌ | Create | P1 | Low |

### 8. Assessment Components

| Component | Legacy | Current | Action Required | Priority | Complexity |
|-----------|--------|---------|-----------------|----------|------------|
| **BaselineItem** | ✅ | 🔶 `QuestionRenderer` | Enhance | P0 | Medium |
| **BaselineProgress** | ✅ | 🔶 `ProgressIndicator` | Enhance | P0 | Low |
| **DomainTransition** | ✅ | ❌ | Create | P0 | Medium |

### 9. Complete Components (No Action Needed)

| Component | Legacy | Current | Status |
|-----------|--------|---------|--------|
| **GamePicker** | ✅ | ✅ | Complete |
| **GameCard** | ✅ | ✅ | Complete |
| **SubjectCard** | ✅ | ✅ | Complete |
| **ProgressRing** | ✅ | ✅ `ProgressDashboard` | Complete |
| **StreakDisplay** | ✅ (embedded) | ✅ | Complete |
| **AchievementBadge** | ✅ (embedded) | ✅ | Complete |

---

## Implementation Priority

### Sprint 8: Focus & Games (P0)

```typescript
// Create: packages/ui/src/components/FocusMonitor/
export * from './FocusMonitor'
export * from './GameBreakModal'
export * from './games/BreathingExercise'
export * from './games/MathSpeedGame'
export * from './games/SimonSaysGame'
export * from './games/MemoryMatchGame'
export * from './games/CountingGame'
```

**Estimated effort:** 3-4 days

### Sprint 9: Self-Regulation & Executive Function (P0)

```typescript
// Create: packages/ui/src/components/SelfRegulation/
export * from './SelfRegulationHub'
export * from './EmotionCheckIn'
export * from './RegulationActivity'
export * from './CalmingSpace'

// Create: packages/ui/src/components/ExecutiveFunction/
export * from './VisualTimer'
export * from './VisualSchedule'
export * from './FirstThenBoard'
export * from './TaskBreakdown'
```

**Estimated effort:** 5-6 days

### Sprint 10: Homework Helper (P0)

```typescript
// Create: packages/ui/src/components/HomeworkHelper/
export * from './HomeworkHelper'
export * from './HomeworkUpload'
export * from './HomeworkSession'
export * from './steps/UnderstandStep'
export * from './steps/PlanStep'
export * from './steps/SolveStep'
export * from './steps/CheckStep'
```

**Estimated effort:** 4-5 days

### Sprint 11: Sensory & Writing (P0/P1)

```typescript
// Create: packages/ui/src/components/SensoryProfile/
export * from './SensoryProfile'
export * from './SensoryProfileSetup'
export * from './AccessibilityPanel'

// Create: packages/ui/src/components/WritingPad/
export * from './WritingPad'
export * from './DrawPad'
```

**Estimated effort:** 4-5 days

---

## Component Architecture Recommendations

### 1. Use Compound Component Pattern

```typescript
// FocusMonitor compound component
export const FocusMonitor = {
  Root: FocusMonitorRoot,
  Display: FocusMonitorDisplay,
  Controls: FocusMonitorControls,
  BreakModal: GameBreakModal,
}

// Usage
<FocusMonitor.Root>
  <FocusMonitor.Display />
  <FocusMonitor.Controls />
  <FocusMonitor.BreakModal games={games} />
</FocusMonitor.Root>
```

### 2. Use Headless UI Pattern for Games

```typescript
// Game hook
export function useGame(config: GameConfig) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  // Game logic...
  return { state, actions }
}

// Game component
export function MemoryMatchGame() {
  const { state, actions } = useGame({ type: 'memory-match' })
  // Render game UI
}
```

### 3. Shared Animation Library

```typescript
// packages/ui/src/animations/
export const breathingAnimation = {
  inhale: { scale: 1.2, duration: 4000 },
  hold: { scale: 1.2, duration: 7000 },
  exhale: { scale: 1, duration: 8000 },
}

export const focusAnimations = {
  attentionPulse: keyframes`...`,
  breakPrompt: keyframes`...`,
}
```

### 4. Accessibility First

All new components must include:
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- High contrast support
- Reduced motion support

```typescript
export function VisualTimer({
  duration,
  ...props
}: VisualTimerProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Timer: ${formatTime(remaining)}`}
      {...props}
    >
      {/* Timer visualization */}
    </div>
  )
}
```

---

## Testing Requirements

### Unit Tests (Required)

```typescript
// Example: FocusMonitor.test.tsx
describe('FocusMonitor', () => {
  it('shows break modal after engagement drops', () => {})
  it('tracks focus events', () => {})
  it('is accessible', () => {})
})
```

### Storybook Stories (Required)

```typescript
// Example: FocusMonitor.stories.tsx
export default {
  title: 'Focus/FocusMonitor',
  component: FocusMonitor,
}

export const Default = {}
export const LowEngagement = { args: { engagement: 0.3 } }
export const BreakSuggested = { args: { showBreak: true } }
```

### Accessibility Tests (Required)

```typescript
// Include axe-core tests
it('has no accessibility violations', async () => {
  const { container } = render(<FocusMonitor />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Migration Strategy

### 1. Copy and Adapt

For straightforward components, copy from legacy and adapt:

```bash
# Copy component
cp legacy/apps/learner-app/src/components/EncouragementBanner.tsx \
   current/packages/ui/src/components/EncouragementBanner/

# Update imports, types, styling
```

### 2. Rewrite with New Patterns

For complex components, rewrite using current patterns:

- TypeScript strict mode
- Tailwind CSS (not inline styles)
- React Query for data
- Zustand for state
- Framer Motion for animations

### 3. Component Checklist

For each migrated component:

- [ ] TypeScript types defined
- [ ] Props interface documented
- [ ] Unit tests written (80%+ coverage)
- [ ] Storybook story created
- [ ] Accessibility tested (axe-core)
- [ ] Responsive design verified
- [ ] Dark mode support added
- [ ] i18n strings extracted

---

## Document Information

- **Version:** 1.0
- **Created:** January 19, 2026
- **Author:** Claude (Sprint 0 Analysis)
