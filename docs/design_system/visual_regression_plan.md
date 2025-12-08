# Visual Regression Plan

## Overview

We will maintain low-drift visuals by combining web screenshot testing and Flutter golden tests. Initial steps are manual hooks; we can automate as tool capacity allows.

## Web (Next.js)

- **Playwright smoke captures** (future script `pnpm playwright:regress`): capture `/design-system` for each grade band and with a11y toggles (dyslexia + high contrast + reduced motion). Store baselines per band/flag.
- **Chromatic alternative**: if Storybook is enabled, run Chromatic against a story bundle with grade-band and a11y variants.
- **Critical pages to watch**:
  1. Learner Today’s Plan (all grade bands, high-contrast on/off).
  2. Parent dashboard home (primary cards/widgets).
  3. District analytics card and KPI panels (surface/background/text contrast).

## Flutter (mobile)

- **Golden tests**: add goldens for key widgets in `apps/mobile-learner` using `flutter test --update-goldens` for:
  - Today’s Plan header and task list (per band).
  - Session completion card.
  - DesignSystemGalleryScreen samples with dyslexia font on/off.
- **Device matrix**: run at least phone portrait @2x and small tablet @2x to catch layout shifts.

## Workflow suggestions

- Take baselines on main after visual sign-off.
- On PRs, run Playwright/Chromatic/goldens in CI; block merges on diff size/approval.
- Keep fixtures deterministic (mock dates/data, disable animations via reduced-motion flag).
- Store artifacts per band/flag in a clear folder naming scheme, e.g., `web/g6_8/high-contrast` or `flutter/k5/dyslexia`.
