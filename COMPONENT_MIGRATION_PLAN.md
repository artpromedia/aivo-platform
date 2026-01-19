# AIVO Platform Component Migration Plan

## Sprint 2: Core UI Components & Design System Migration

### Migration Overview

**Source:** `/apps/web-learner/app/` (Next.js App Router components)
**Target:** `/packages/ui/` (Turborepo shared package)

### Component Inventory

| Component | Legacy Path | New Package | Complexity | Dependencies | Status |
|-----------|-------------|-------------|------------|--------------|--------|
| GamePicker | /apps/web-learner/app/(learning)/games/page.tsx | /packages/ui/src/components/GamePicker | Medium | Tailwind, lucide-react | Pending |
| BaselineAssessment | /apps/web-learner/app/baseline/assessment/page.tsx | /packages/ui/src/components/Assessment | High | Next.js Image, useRouter | Pending |
| FocusTimer | /apps/web-learner/app/(learning)/focus/components/FocusTimer.tsx | /packages/ui/src/components/FocusTimer | Medium | Custom hooks, Audio API | Pending |
| FocusStats | /apps/web-learner/app/(learning)/focus/components/FocusStats.tsx | /packages/ui/src/components/FocusStats | Low | Tailwind | Pending |
| ProgressDashboard | /apps/web-learner/app/(learning)/dashboard/page.tsx | /packages/ui/src/components/ProgressDashboard | Medium | Next.js Link | Pending |
| SubjectCard | N/A (extracted pattern) | /packages/ui/src/components/SubjectCard | Low | Tailwind | Pending |
| GameCard | /apps/web-learner/app/(learning)/games/page.tsx | /packages/ui/src/components/GameCard | Low | Tailwind | Pending |
| AssessmentCard | Extracted from baseline | /packages/ui/src/components/AssessmentCard | Medium | Tailwind | Pending |
| ProgressIndicator | Extracted pattern | /packages/ui/src/components/ProgressIndicator | Low | Tailwind, SVG | Pending |
| BreakActivities | /apps/web-learner/app/(learning)/focus/components/BreakActivities.tsx | /packages/ui/src/components/BreakActivities | Low | Tailwind | Pending |

### P0 Components (Critical Path)

1. **GamePicker** - Game selection UI with difficulty filters
2. **BaselineAssessment** - Multi-phase assessment flow
3. **FocusTimer** - Pomodoro/custom timer with modes
4. **ProgressDashboard** - Learning progress visualization
5. **SubjectCard** - Subject/topic selection cards

### Architecture Decisions

1. **Styling:** Tailwind CSS with AIVO design system CSS variables
2. **Client Components:** Use `'use client'` directive for interactive components
3. **No framer-motion:** Current codebase uses CSS transitions instead
4. **State:** React hooks (useState, useEffect, useCallback)
5. **Data Fetching:** Native fetch API (no react-query)

### Design System Variables

```css
--aivo-brand-primary
--aivo-brand-navy
--aivo-teal-50, --aivo-teal-100, --aivo-teal-400, --aivo-teal-500
--aivo-purple-50, --aivo-purple-100, --aivo-purple-500
--aivo-neutral-200, --aivo-neutral-500, --aivo-neutral-600
```

### Migration Strategy

1. **Extract reusable components** from page-level components
2. **Create shared types** in `/packages/ui/src/types/`
3. **Use CSS modules** for component-specific styling
4. **Export components** from package index
5. **Add Storybook stories** for documentation
6. **Write unit tests** with Vitest + Testing Library

### Package Structure

```
/packages/ui/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── GamePicker/
│   │   │   ├── index.ts
│   │   │   ├── GamePicker.tsx
│   │   │   ├── GamePicker.module.css
│   │   │   ├── GamePicker.stories.tsx
│   │   │   ├── GamePicker.test.tsx
│   │   │   └── types.ts
│   │   ├── FocusTimer/
│   │   ├── ProgressDashboard/
│   │   ├── Assessment/
│   │   └── SubjectCard/
│   ├── hooks/
│   │   └── index.ts
│   ├── utils/
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── .storybook/
│   ├── main.ts
│   └── preview.ts
└── vitest.config.ts
```

### Acceptance Criteria

- [ ] All P0 components migrated to new repo
- [ ] Components working in Storybook
- [ ] Unit tests passing (>80% coverage)
- [ ] Visual regression tests created
- [ ] CSS modules properly converted
- [ ] Components exported from @aivo/ui package
- [ ] Learner app using new shared components
- [ ] No Vite-specific code remains

### Testing Checklist

```bash
# Build UI package
cd packages/ui
pnpm build

# Run tests
pnpm test

# Start Storybook
pnpm storybook

# Visual regression
pnpm test-storybook

# Check learner app
cd ../../apps/web-learner
pnpm dev
```

### Notes

- Existing UI library at `/libs/ui-web/` (@aivo/ui-web) has ~75+ components
- New `/packages/ui/` package complements with learner-specific components
- Accessibility components available from `/packages/a11y/` (@aivo/a11y)
- Grade-based theming system available (explorer, navigator, innovator, architect)
