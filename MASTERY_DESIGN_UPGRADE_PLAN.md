# AIVO Platform → Mastery Design System Upgrade Plan

**Date:** 2026-02-18  
**Reference Design:** [Mastery — E-Learning Online Course Website](https://www.figma.com/design/t9D6ksjaO6bZqsY80EpRso/Mastery----E-Learning-Online-Course-Website)  
**Author:** Enative (Envato Elements)  
**Target:** All 9 web apps + 3 mobile apps + shared design system  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Audit: Current vs. Mastery](#2-design-audit-current-vs-mastery)
3. [Phase 0 — Foundation: Design Tokens & System](#3-phase-0--foundation-design-tokens--system)
4. [Phase 1 — Shared Component Library](#4-phase-1--shared-component-library)
5. [Phase 2 — Marketing Site Redesign](#5-phase-2--marketing-site-redesign)
6. [Phase 3 — Learner App Redesign](#6-phase-3--learner-app-redesign)
7. [Phase 4 — Teacher & Parent Apps](#7-phase-4--teacher--parent-apps)
8. [Phase 5 — Admin & District Apps](#8-phase-5--admin--district-apps)
9. [Phase 6 — Mobile Apps (Flutter)](#9-phase-6--mobile-apps-flutter)
10. [Phase 7 — QA, Accessibility & Polish](#10-phase-7--qa-accessibility--polish)
11. [Risk Register & Mitigations](#11-risk-register--mitigations)
12. [Effort Estimates & Timeline](#12-effort-estimates--timeline)
13. [File-Level Change Inventory](#13-file-level-change-inventory)

---

## 1. Executive Summary

The **Mastery** Figma template is a modern, clean, professional E-Learning platform design characterized by:

- **Clean card-based layouts** with generous whitespace and soft shadows
- **Bold hero sections** with gradient overlays and illustration-forward design
- **Modern typography** using clean sans-serif fonts (Google Fonts) with strong hierarchy
- **Rounded, friendly UI** with large border-radius cards and pill-shaped buttons
- **Muted, professional color palette** with vibrant accent colors for CTAs
- **Course catalog grid** with progress indicators, ratings, thumbnails
- **Dashboard views** with sidebar navigation, stats cards, progress rings
- **Instructor/Author profiles** with course listings
- **Video player integration** and lesson navigation
- **Mobile-responsive** layouts

### Upgrade Scope

| Area | Apps Affected | Effort |
|------|:---:|:---:|
| Design Tokens & System | `libs/design-tokens`, `libs/ui-web` | 5 days |
| Shared Component Library | `libs/ui-web` (30+ components) | 12 days |
| Marketing Site (web-marketing) | 15+ pages, 6 sections | 10 days |
| Learner App (web-learner) | 20+ pages/routes | 12 days |
| Teacher App (web-teacher) | 15+ pages | 8 days |
| Parent App (web-parent) | 10+ pages | 6 days |
| Admin Apps (web-district, web-platform-admin) | 10+ pages each | 8 days |
| Author/Creator Apps | 10+ pages each | 6 days |
| Mobile Apps (Flutter) | 3 apps | 10 days |
| QA, Accessibility, Polish | All apps | 5 days |
| **Total** | **12 apps** | **~82 days** |

---

## 2. Design Audit: Current vs. Mastery

### 2.1 Typography

| Property | Current AIVO | Mastery Target | Change Required |
|----------|-------------|----------------|:---:|
| Primary Font | Nunito / Inter | **DM Sans** or **Plus Jakarta Sans** | ✅ Replace |
| Display Font | Space Grotesk (marketing) | **DM Sans Bold/ExtraBold** | ✅ Replace |
| Dyslexia Font | Atkinson Hyperlegible | Keep as fallback | — |
| Body Size | 15–18px (grade-scaled) | 16px base | ⚠️ Adjust |
| Heading Weight | 700–800 | 600–700 (cleaner) | ✅ Update |
| Letter Spacing | -0.02em displays | -0.01em to -0.02em | — Minor |
| Line Height | 1.1–1.4 | 1.4–1.6 (more open) | ✅ Update |

### 2.2 Color Palette

| Token | Current | Mastery Target | Change |
|-------|---------|----------------|:---:|
| Primary | `#7C3AED` (Purple) | `#4F46E5` (Indigo) or `#6366F1` | ✅ Shift |
| Primary Light | `#8B5CF6` | `#818CF8` | ✅ Update |
| Primary Dark | `#6D28D9` | `#4338CA` | ✅ Update |
| Secondary / Accent | `#FF6B6B` (Coral) | `#F97316` (Orange) or `#FB923C` | ✅ Replace |
| Success | `#10B981` | `#22C55E` | ⚠️ Minor |
| Warning | `#F59E0B` | `#EAB308` | — Keep |
| Error | `#EF4444` | `#EF4444` | — Same |
| Background | `#FAFAFA` | `#F8FAFC` (Slate-50) | ⚠️ Slight |
| Surface | `#FFFFFF` | `#FFFFFF` | — Same |
| Text Primary | `#1A1A2E` (Navy) | `#0F172A` (Slate-900) | ✅ Shift |
| Text Secondary | `#52525B` | `#475569` (Slate-600) | ✅ Shift |
| Text Muted | `#6B6B73` | `#94A3B8` (Slate-400) | ✅ Shift |
| Border | `#E4E4E7` | `#E2E8F0` (Slate-200) | ⚠️ Minor |
| Navy (brand) | `#1A1A2E` | `#1E293B` (Slate-800) | ✅ Shift |

### 2.3 Layout & Spacing

| Property | Current | Mastery Target | Change |
|----------|---------|----------------|:---:|
| Max Width | 1280px–1400px | 1280px (xl) | ⚠️ Minor |
| Section Padding | `py-16` to `py-24` | `py-20` to `py-28` (more generous) | ✅ Increase |
| Card Padding | `p-6` | `p-6` to `p-8` | ⚠️ Increase |
| Grid Gap | `gap-6` | `gap-6` to `gap-8` | ⚠️ Increase |
| Container Padding | `px-4` to `px-6` | `px-4` to `px-6` | — Same |

### 2.4 Components

| Component | Current | Mastery Target | Change |
|-----------|---------|----------------|:---:|
| Border Radius (cards) | 8–20px (grade-scaled) | 16–24px consistently | ✅ Standardize |
| Border Radius (buttons) | 8–20px (grade-scaled) | 12px or pill (999px) | ✅ Standardize |
| Shadows | `soft`, `raised`, `elevated` | Softer, more diffused | ✅ Update |
| Buttons | Gradient fills | Solid fills + subtle hover | ✅ Simplify |
| Cards | White/70 + backdrop-blur | Solid white + soft shadow | ✅ Clean up |
| Navigation | Simple top nav | Clean navbar with subtle bg | ✅ Redesign |
| Sidebar | N/A (some apps) | Collapsible icon sidebar | ✅ Add |
| Avatars | Basic circles | Bordered, status indicators | ✅ Update |
| Progress | Basic bars | Circular rings + linear | ✅ Add ring |
| Badges | Simple pills | Rounded with subtle bg | ⚠️ Update |
| Tables | Basic HTML | Zebra-striped, hover rows | ✅ Update |
| Modals | Basic overlays | Centered, rounded, blurred bg | ⚠️ Update |
| Tabs | Simple underline | Pill tabs / segment control | ✅ Update |
| Input Fields | Basic rounded | Larger, more padded, outlined | ✅ Update |

### 2.5 Patterns & Layouts

| Pattern | Current | Mastery Target | Action |
|---------|---------|----------------|:---:|
| Hero Section | Gradient bg + emoji mascot | Full-width illustration/image + gradient text overlay | ✅ Redesign |
| Course Cards | Feature cards (icon + text) | Thumbnail image + title + author + progress + rating | ✅ Create |
| Dashboard | Varies per app | Stats row + grid cards + sidebar | ✅ Standardize |
| Lesson View | Basic content page | Video player + sidebar navigation + progress | ✅ Create |
| Profile Page | Basic settings | Avatar + stats + course grid | ✅ Create |
| Category Filter | None prominent | Horizontal pill filter bar | ✅ Create |
| Search | Basic input | Expanded search with filters | ✅ Enhance |
| Footer | Multi-column links | Modern 4-column with newsletter CTA | ✅ Redesign |
| Empty States | Minimal | Illustrated empty states | ✅ Create |

---

## 3. Phase 0 — Foundation: Design Tokens & System

**Duration:** 5 days  
**Prerequisites:** Figma file exported / reference confirmed  

### 3.1 Update Design Tokens

**Files:**
- `libs/design-tokens/aivo-tokens.json`
- `libs/ui-web/src/tokens.json`

**Changes:**

#### 3.1.1 Typography Tokens

```json
{
  "brand": {
    "font": {
      "family": {
        "default": ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        "display": ["Plus Jakarta Sans", "DM Sans", "sans-serif"],
        "dyslexia_friendly": ["Atkinson Hyperlegible", "DM Sans", "sans-serif"]
      },
      "weight": {
        "regular": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      }
    }
  }
}
```

#### 3.1.2 Color Tokens

```json
{
  "brand": {
    "color": {
      "primary": "#4F46E5",
      "primaryLight": "#818CF8",
      "primaryDark": "#4338CA",
      "accent": "#F97316",
      "accentLight": "#FB923C",
      "navy": "#1E293B",
      "white": "#FFFFFF"
    }
  },
  "base": {
    "color": {
      "indigo": {
        "50": "#EEF2FF", "100": "#E0E7FF", "200": "#C7D2FE",
        "300": "#A5B4FC", "400": "#818CF8", "500": "#6366F1",
        "600": "#4F46E5", "700": "#4338CA", "800": "#3730A3", "900": "#312E81"
      },
      "slate": {
        "50": "#F8FAFC", "100": "#F1F5F9", "200": "#E2E8F0",
        "300": "#CBD5E1", "400": "#94A3B8", "500": "#64748B",
        "600": "#475569", "700": "#334155", "800": "#1E293B", "900": "#0F172A"
      },
      "orange": {
        "50": "#FFF7ED", "100": "#FFEDD5", "200": "#FED7AA",
        "300": "#FDBA74", "400": "#FB923C", "500": "#F97316",
        "600": "#EA580C", "700": "#C2410C", "800": "#9A3412", "900": "#7C2D12"
      }
    }
  }
}
```

#### 3.1.3 Spacing & Radius

```json
{
  "base": {
    "radius": {
      "xs": 4,
      "sm": 8,
      "md": 12,
      "lg": 16,
      "xl": 20,
      "2xl": 24,
      "pill": 999
    },
    "shadow": {
      "xs": { "color": "rgba(15, 23, 42, 0.04)", "x": 0, "y": 1, "blur": 2, "spread": 0 },
      "sm": { "color": "rgba(15, 23, 42, 0.06)", "x": 0, "y": 1, "blur": 3, "spread": 0 },
      "md": { "color": "rgba(15, 23, 42, 0.08)", "x": 0, "y": 4, "blur": 6, "spread": -1 },
      "lg": { "color": "rgba(15, 23, 42, 0.10)", "x": 0, "y": 10, "blur": 15, "spread": -3 },
      "xl": { "color": "rgba(15, 23, 42, 0.12)", "x": 0, "y": 20, "blur": 25, "spread": -5 }
    }
  }
}
```

#### 3.1.4 Grade Theme Updates

Update all four grade themes (explorer, navigator, scholar, scholarDark) to use the new indigo/slate palette:

| Theme | Old Primary | New Primary | Old Accent | New Accent |
|-------|-----------|------------|-----------|------------|
| Explorer | `#7C3AED` | `#6366F1` | `#F59E0B` | `#F97316` |
| Navigator | `#0891B2` | `#06B6D4` | `#10B981` | `#22C55E` |
| Scholar | `#1A1A2E` | `#1E293B` | `#7C3AED` | `#6366F1` |
| Scholar Dark | `#A78BFA` | `#A5B4FC` | `#7C3AED` | `#6366F1` |

### 3.2 Install New Fonts

**Files to update:**
- `apps/web-marketing/src/app/layout.tsx`
- `apps/web-learner/app/layout.tsx`
- `apps/web-teacher/src/app/layout.tsx`
- `apps/web-parent/src/app/layout.tsx`
- `apps/web-district/src/app/layout.tsx`
- `apps/web-platform-admin/src/app/layout.tsx`
- `apps/web-author/src/app/layout.tsx`
- `apps/web-creator/src/app/layout.tsx`

```tsx
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});
```

### 3.3 Update Tailwind Config (Base)

**File:** `libs/ui-web/src/tailwind/gradeThemePlugin.cjs`

Update the grade theme plugin to emit the new color tokens and font families.

**All 9 Tailwind configs** updated to reference new font variables.

### 3.4 Create CSS Custom Properties

**File:** `libs/ui-web/src/styles/mastery-theme.css`

```css
:root {
  /* Mastery Design System Variables */
  --mastery-primary: #4F46E5;
  --mastery-primary-light: #818CF8;
  --mastery-primary-dark: #4338CA;
  --mastery-accent: #F97316;
  --mastery-accent-light: #FB923C;
  --mastery-bg: #F8FAFC;
  --mastery-surface: #FFFFFF;
  --mastery-text: #0F172A;
  --mastery-text-secondary: #475569;
  --mastery-text-muted: #94A3B8;
  --mastery-border: #E2E8F0;
  --mastery-radius-card: 16px;
  --mastery-radius-button: 12px;
  --mastery-radius-input: 10px;
  --mastery-radius-pill: 999px;
  --mastery-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 6px -1px rgba(15, 23, 42, 0.04);
  --mastery-shadow-card-hover: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04);
  --mastery-shadow-elevated: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04);
  --mastery-font-sans: 'DM Sans', system-ui, sans-serif;
  --mastery-font-display: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
}
```

### Tasks — Phase 0

| # | Task | Files | Est. |
|---|------|-------|:---:|
| 0.1 | Update `aivo-tokens.json` — colors, fonts, radius, shadows | 2 files | 0.5d |
| 0.2 | Update `tokens.json` (ui-web copy) to match | 1 file | 0.5d |
| 0.3 | Create `mastery-theme.css` with CSS custom properties | 1 file | 0.5d |
| 0.4 | Update `gradeThemePlugin.cjs` to emit new tokens | 1 file | 1d |
| 0.5 | Update all 9 Tailwind configs for new fonts + colors | 9 files | 1d |
| 0.6 | Install Google Fonts in all 8 web app layouts | 8 files | 0.5d |
| 0.7 | Update `globals.css` in each app for base styles | 9 files | 1d |

---

## 4. Phase 1 — Shared Component Library

**Duration:** 12 days  
**Location:** `libs/ui-web/src/components/`

### 4.1 Update Existing Components

| Component | File | Changes |
|-----------|------|---------|
| `button.tsx` | `libs/ui-web/src/components/button.tsx` | New border-radius (12px/pill), indigo primary, remove gradients, add `outline` and `ghost` variants, larger padding |
| `card.tsx` | `libs/ui-web/src/components/card.tsx` | 16px radius, softer shadow, solid white bg (no backdrop-blur), hover elevation |
| `badge.tsx` | `libs/ui-web/src/components/badge.tsx` | Pill shape, subtle bg colors, smaller text |
| `heading.tsx` | `libs/ui-web/src/components/heading.tsx` | New font-family (DM Sans/Jakarta), updated weights |

### 4.2 Create New Components

These components are needed to match the Mastery design but don't exist yet:

| Component | Purpose | Est. |
|-----------|---------|:---:|
| **CourseCard** | Image thumbnail + title + author + progress bar + rating stars + price | 1d |
| **CourseGrid** | Responsive grid layout for course cards (2/3/4 columns) | 0.5d |
| **CategoryFilter** | Horizontal scrollable pill-tab filter bar | 0.5d |
| **StatsCard** | Icon + number + label + trend arrow (for dashboards) | 0.5d |
| **ProgressRing** | Circular SVG progress indicator with percentage | 0.5d |
| **Sidebar** | Collapsible icon sidebar with navigation items | 1d |
| **SidebarLayout** | Sidebar + content area layout wrapper | 0.5d |
| **Avatar** | User avatar with size variants, status indicator, fallback initials | 0.5d |
| **AvatarGroup** | Stacked avatar group (e.g., enrolled students) | 0.25d |
| **SearchBar** | Expanded search input with icon, filters dropdown, keyboard shortcut hint | 0.5d |
| **VideoPlayer** | Video embed wrapper with controls, progress, chapters | 1d |
| **LessonNav** | Sidebar lesson/chapter navigation with completion checkmarks | 0.5d |
| **RatingStars** | 1–5 star rating display and input | 0.25d |
| **EmptyState** | Illustrated empty state with title, description, CTA | 0.5d |
| **BreadcrumbNav** | Breadcrumb trail navigation | 0.25d |
| **Skeleton** | Skeleton loading placeholder (card, text, avatar variants) | 0.5d |
| **DataTable** | Zebra-striped, sortable, paginated table with hover rows | 1d |
| **Tabs** | Pill-style tab component (replaces underline tabs) | 0.5d |
| **Dropdown** | Clean dropdown menu with icons and descriptions | 0.5d |
| **Toast** | Notification toast with icon, colored left border | 0.25d |
| **Modal** | Centered modal with blurred backdrop, rounded corners | 0.5d |
| **Tooltip** | Clean tooltip with arrow | 0.25d |
| **Pagination** | Numbered pagination with prev/next | 0.25d |

### Tasks — Phase 1

| # | Task | Est. |
|---|------|:---:|
| 1.1 | Refactor `button.tsx` — new variants, sizes, colors | 1d |
| 1.2 | Refactor `card.tsx` — new shadows, radius, variants | 0.5d |
| 1.3 | Create `CourseCard` + `CourseGrid` components | 1.5d |
| 1.4 | Create `Sidebar` + `SidebarLayout` components | 1.5d |
| 1.5 | Create `StatsCard` + `ProgressRing` components | 1d |
| 1.6 | Create `CategoryFilter` + `SearchBar` components | 1d |
| 1.7 | Create `Avatar` + `AvatarGroup` components | 0.5d |
| 1.8 | Create `VideoPlayer` + `LessonNav` components | 1.5d |
| 1.9 | Create `DataTable` + `Pagination` components | 1.5d |
| 1.10 | Create `Tabs`, `Modal`, `Dropdown`, `Toast`, `Tooltip` | 1.5d |
| 1.11 | Create `EmptyState`, `Skeleton`, `BreadcrumbNav`, `RatingStars` | 1d |
| 1.12 | Update `index.ts` exports and write Storybook stories | 0.5d |

---

## 5. Phase 2 — Marketing Site Redesign (`web-marketing`)

**Duration:** 10 days  
**Impact:** Highest visibility — first thing users see

### 5.1 Navigation Redesign

**File:** `src/components/shared/navigation.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Background | Transparent | White with subtle shadow on scroll (`sticky bg-white/95 backdrop-blur shadow-sm`) |
| Logo | Purple horizontal | Indigo logo or dark logo on white |
| Links | Basic text | Medium-weight, hover underline animation, active indicator |
| CTA Button | Gradient purple | Solid indigo pill button: "Get Started Free" |
| Mobile Menu | Hamburger | Slide-in panel with full navigation |
| Layout | Left logo + right links | Left logo + center links + right CTA |

### 5.2 Hero Section Redesign

**File:** `src/components/marketing/hero/`

| Element | Current | Target |
|---------|---------|--------|
| Background | Blob gradients + floating shapes | Clean with subtle grid pattern or gradient mesh |
| Headline | Emoji-heavy, "Learning Adventure" | Professional: "Master New Skills With Expert-Led Courses" |
| Sub-headline | "Join your class with a code" | "Join thousands of learners. Start learning with world-class instruction." |
| CTA | Single gradient button | Primary CTA + ghost secondary: "Start Free Trial" + "Watch Demo" |
| Visual | Emoji mascot 🚀 | Hero illustration or screenshot mockup of the platform |
| Stats | None | Social proof row: "50K+ Students | 200+ Courses | 4.9★ Rating" |
| Layout | Centered single column | Split: Left text + Right image/illustration |

### 5.3 Features Section

**File:** `src/components/sections/features.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Layout | Icon + text cards | 2-column: Image left + feature list right (alternating) |
| Cards | Basic feature cards | Clean feature cards with subtle icon backgrounds |
| Icons | Emoji icons | Professional SVG icons (Lucide/Heroicons) |
| Content | Generic features | Specific: "AI Tutoring", "IEP Management", "Progress Tracking", "Parent Dashboard" |

### 5.4 Course Catalog Section (NEW)

**File:** `src/components/sections/courses.tsx` (CREATE)

- Grid of `CourseCard` components showing popular courses
- Category filter bar at top
- "View All Courses" CTA button
- 3-column grid on desktop, 1-column mobile

### 5.5 How It Works Section

**File:** `src/components/sections/how-it-works.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Layout | Steps list | Horizontal 3-step with connecting line |
| Steps | Basic numbered | Icon circles with step numbers + cards below |
| Content | Generic | "1. Create Account → 2. Choose Course → 3. Start Learning" |

### 5.6 Testimonials Section

**File:** `src/components/sections/testimonials.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Layout | Basic cards | Carousel/slider with avatar, name, role, quote |
| Design | Simple quotes | Card with quote marks, avatar, star rating, name + title |
| Navigation | None | Dot indicators + prev/next arrows |

### 5.7 Pricing Section

**File:** `src/components/sections/pricing.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Layout | Pricing cards | 3-tier cards with "Most Popular" badge on middle tier |
| Design | Basic tier cards | Clean cards with checkmark feature lists, highlighted CTA |
| Toggle | None | Monthly/Annual toggle with "Save 20%" badge |

### 5.8 CTA Section

**File:** `src/components/sections/cta.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Background | Gradient | Indigo gradient with pattern overlay |
| Content | Basic text + button | "Ready to Start Learning?" + email capture + CTA |

### 5.9 Footer Redesign

**File:** `src/components/shared/footer.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Layout | Multi-column | 4-column: Brand + Links + Links + Newsletter |
| Brand | Logo only | Logo + tagline + social icons |
| Bottom | Basic copyright | Copyright + legal links + language switcher |

### 5.10 New Pages

| Page | Current | Target |
|------|---------|--------|
| `courses/` | N/A | Full course catalog with grid, filters, search |
| `courses/[slug]/` | N/A | Course detail: hero, syllabus, instructor, reviews, CTA |
| `instructors/` | N/A | Instructor grid with bio cards |
| `for-schools/` | Exists but basic | Redesign with school-specific hero + features |

### Tasks — Phase 2

| # | Task | Est. |
|---|------|:---:|
| 2.1 | Redesign `navigation.tsx` — sticky, centered links, pill CTA | 1d |
| 2.2 | Redesign hero section — split layout, illustration, stats | 1.5d |
| 2.3 | Redesign `features.tsx` — alternating image/text, pro icons | 1d |
| 2.4 | Create `courses.tsx` section — course catalog grid | 1d |
| 2.5 | Redesign `how-it-works.tsx` — horizontal stepper | 0.5d |
| 2.6 | Redesign `testimonials.tsx` — carousel with avatars | 1d |
| 2.7 | Redesign `pricing.tsx` — 3-tier + toggle | 1d |
| 2.8 | Redesign `cta.tsx` — gradient bg + email capture | 0.5d |
| 2.9 | Redesign `footer.tsx` — 4-column + newsletter | 0.5d |
| 2.10 | Create course catalog page + course detail page | 1.5d |
| 2.11 | Update `tailwind.config.cjs` — new font/color tokens | 0.5d |

---

## 6. Phase 3 — Learner App Redesign (`web-learner`)

**Duration:** 12 days  
**Impact:** Primary user-facing dashboard

### 6.1 Layout System

**Current:** No sidebar, page-based navigation  
**Target:** Sidebar + top bar layout

**New structure:**
```
┌──────────────────────────────────────────┐
│ Logo  │  Search Bar         │ 🔔  👤    │  ← Top Bar
├───────┼──────────────────────────────────┤
│ 🏠    │                                  │
│ 📚    │    Main Content Area             │
│ 🎯    │                                  │  ← Sidebar + Content
│ 📊    │                                  │
│ ⚙️    │                                  │
└───────┴──────────────────────────────────┘
```

**Files:**
- `app/(learning)/layout.tsx` — Add `SidebarLayout` wrapper
- Create `components/learner-sidebar.tsx`
- Create `components/learner-topbar.tsx`

### 6.2 Dashboard Page

**File:** `app/(learning)/dashboard/page.tsx`

| Element | Current | Target |
|---------|---------|--------|
| Header | Basic greeting | "Welcome back, {name}!" + date |
| Stats Row | None | 4× `StatsCard`: Courses Enrolled, In Progress, Completed, Certificates |
| Continue Learning | None | Horizontal scroll of in-progress course cards with progress bars |
| Recommended | None | 3-column grid of recommended courses |
| Calendar/Schedule | None | Upcoming lessons/deadlines widget |

### 6.3 Course Catalog

**File:** `app/(learning)/courses/page.tsx`

| Element | Current | Exists? | Target |
|---------|---------|:---:|--------|
| Filter Bar | — | ❌ | `CategoryFilter` with grade/subject pills |
| Search | — | ❌ | `SearchBar` with autocomplete |
| Course Grid | — | ❌ | `CourseGrid` + `CourseCard` responsive grid |
| Pagination | — | ❌ | `Pagination` at bottom |

### 6.4 Course Detail / Lesson View

**File:** `app/(learning)/courses/[slug]/page.tsx`

| Element | Target |
|---------|--------|
| Hero | Course thumbnail banner + title + instructor + rating |
| Tabs | Overview / Curriculum / Reviews / Q&A |
| Sidebar | `LessonNav` with chapter sections, completion checks |
| Player | `VideoPlayer` embed (when watching a lesson) |
| Progress | `ProgressRing` showing overall course completion |

### 6.5 Other Pages

| Page | Changes |
|------|---------|
| `achievements/` | Card grid with badges, unlock dates, progress |
| `progress/` | Charts + `ProgressRing` per subject + data table |
| `profile/` | Avatar + stats + enrolled courses grid |
| Landing `page.tsx` | Redesign with Mastery aesthetic (remove emoji mascot) |
| `tutor/` | Chat interface matching Mastery clean aesthetic |

### Tasks — Phase 3

| # | Task | Est. |
|---|------|:---:|
| 3.1 | Create `SidebarLayout` + learner sidebar + topbar | 2d |
| 3.2 | Redesign dashboard — stats cards, continue learning, recommended | 2d |
| 3.3 | Create course catalog page with filters, search, grid | 2d |
| 3.4 | Create course detail page with tabs, lesson nav, player | 2d |
| 3.5 | Redesign achievements, progress, profile pages | 2d |
| 3.6 | Redesign landing page (`page.tsx`) — professional aesthetic | 1d |
| 3.7 | Update all existing pages to use new layout + components | 1d |

---

## 7. Phase 4 — Teacher & Parent Apps

**Duration:** Teacher: 8 days, Parent: 6 days (14 total)

### 7.1 Teacher App (`web-teacher`)

**Location:** `apps/web-teacher/src/`

| Area | Changes |
|------|---------|
| **Layout** | Add collapsible sidebar with: Dashboard, Students, IEPs, Classes, Assignments, Gradebook, Analytics, Settings |
| **Dashboard** | `StatsCard` grid (students, pending reviews, upcoming IEPs, at-risk alerts), class overview cards |
| **Student List** | `DataTable` with avatar, name, grade, IEP status, last activity, action buttons |
| **IEP View** | Clean tabs (Overview / Goals / Services / Progress / Documents), professional data display |
| **Progress Entry** | Redesigned form with cleaner inputs, larger touch targets, voice input button |
| **Gradebook** | `DataTable` with column sorting, inline editing, color-coded cells |
| **Analytics** | Clean charts with indigo/orange palette, `StatsCard` summary row |

| # | Task | Est. |
|---|------|:---:|
| 4.1 | Teacher sidebar + topbar + layout wrapper | 1.5d |
| 4.2 | Redesign teacher dashboard — stats cards, overview | 1.5d |
| 4.3 | Redesign student list — DataTable, filters | 1d |
| 4.4 | Redesign IEP views — tabs, clean forms | 1.5d |
| 4.5 | Redesign gradebook + analytics | 1.5d |
| 4.6 | Update all remaining pages to new design | 1d |

### 7.2 Parent App (`web-parent`)

**Location:** `apps/web-parent/src/`

| Area | Changes |
|------|---------|
| **Layout** | Clean sidebar: Dashboard, Children, Messages, Progress, IEPs, Meetings, Data Rights, Settings |
| **Dashboard** | Child selector (if multi-child) + stats cards + progress charts + recent activity |
| **Progress** | `ProgressRing` per subject + trend charts with indigo/orange palette |
| **Messages** | Clean message thread UI matching Mastery card aesthetic |
| **IEP Viewer** | Tabbed IEP view with glossary tooltips (keep existing, restyle) |
| **Meeting Prep** | Checklist card with clean checkboxes, agenda items |

| # | Task | Est. |
|---|------|:---:|
| 4.7 | Parent sidebar + topbar + layout wrapper | 1d |
| 4.8 | Redesign parent dashboard — child cards, stats | 1.5d |
| 4.9 | Redesign messages, progress, IEP views | 2d |
| 4.10 | Update remaining pages to new design | 1.5d |

---

## 8. Phase 5 — Admin & District Apps

**Duration:** 8 days

### 8.1 District Admin App (`web-district`)

| Area | Changes |
|------|---------|
| **Sidebar** | Dashboard, Schools, Compliance, Reports, SIS Sync, Users, Settings |
| **Dashboard** | Large stats cards (total students, IEP compliance %, at-risk, overdue) |
| **Compliance Panel** | Clean cards with `ProgressRing` for compliance %, sortable `DataTable` |
| **Reports** | Filter bar + `DataTable` + export dropdown |
| **SIS Sync** | Status cards with connection indicators |

### 8.2 Platform Admin App (`web-platform-admin`)

| Area | Changes |
|------|---------|
| **Sidebar** | Dashboard, Tenants, Users, Billing, System, Audit, Config |
| **Dashboard** | Platform-wide stats cards + system health indicators |
| **Tables** | All admin tables → `DataTable` component with consistent styling |

### 8.3 Author & Creator Apps

| App | Changes |
|------|---------|
| `web-author` | Content authoring with sidebar nav, clean editor chrome |
| `web-creator` | Course creation with sidebar nav, lesson builder, preview |

### Tasks — Phase 5

| # | Task | Est. |
|---|------|:---:|
| 5.1 | District sidebar + dashboard redesign | 1.5d |
| 5.2 | District compliance + reports + SIS pages | 1.5d |
| 5.3 | Platform admin sidebar + dashboard | 1d |
| 5.4 | Platform admin tables + management pages | 1d |
| 5.5 | Author app layout + key pages redesign | 1.5d |
| 5.6 | Creator app layout + key pages redesign | 1.5d |

---

## 9. Phase 6 — Mobile Apps (Flutter)

**Duration:** 10 days

### 9.1 Design Token Translation

**File:** `libs/design-tokens/aivo-tokens.json` → `libs/flutter-common/lib/theme/`

| Token Category | Flutter Implementation |
|---------------|----------------------|
| Colors | `MasteryColors` class with `Color` constants |
| Typography | `MasteryTypography` with `TextStyle` presets |
| Spacing | `MasterySpacing` with `double` constants |
| Radius | `MasteryRadius` with `BorderRadius` presets |
| Shadows | `MasteryShadows` with `BoxShadow` lists |

### 9.2 Flutter Component Updates

**Location:** `libs/flutter-common/lib/`

| Component | Changes |
|-----------|---------|
| Theme Data | Update `ThemeData` to match Mastery palette (indigo primary, orange accent) |
| App Bar | Clean white app bar with indigo accents |
| Bottom Nav | 4-tab bottom navigation with indigo active state |
| Cards | 16px radius, soft shadows, clean white bg |
| Buttons | Indigo primary, rounded 12px, clean pressed states |
| Course Card | Adapt web `CourseCard` to Flutter `Widget` |
| Progress Ring | Custom painter circular progress |

### 9.3 App-Specific Updates

| App | Key Changes |
|-----|------------|
| `mobile-learner` | Dashboard → course cards grid, sidebar → bottom nav, progress → ring indicators |
| `mobile-parent` | Dashboard with child progress, messages, IEP viewer — all Mastery-styled |
| `mobile-teacher` | Student list, progress entry, class overview — clean card UI |

### Tasks — Phase 6

| # | Task | Est. |
|---|------|:---:|
| 6.1 | Create `MasteryTheme` in flutter-common | 2d |
| 6.2 | Update flutter-common widgets (cards, buttons, nav) | 2d |
| 6.3 | Mobile learner — dashboard, course view, progress | 2.5d |
| 6.4 | Mobile parent — dashboard, messages, IEP view | 2d |
| 6.5 | Mobile teacher — students, progress entry | 1.5d |

---

## 10. Phase 7 — QA, Accessibility & Polish

**Duration:** 5 days

### 10.1 Accessibility Compliance

- [ ] All new components pass WCAG 2.2 AA
- [ ] Color contrast ratios verified (4.5:1 text, 3:1 large text, 3:1 UI elements)
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader testing (NVDA, VoiceOver)
- [ ] Focus indicators visible on all interactive elements
- [ ] `aria-live` regions for dynamic content
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] Touch targets ≥ 44px (web) / 48dp (Flutter)

### 10.2 Cross-Browser Testing

| Browser | Versions |
|---------|---------|
| Chrome | 120+ |
| Firefox | 120+ |
| Safari | 17+ |
| Edge | 120+ |
| Mobile Safari | iOS 16+ |
| Chrome Android | 120+ |

### 10.3 Performance Checklist

- [ ] Lighthouse scores ≥ 90 for all apps
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Font loading: `font-display: swap`, preconnect to Google Fonts
- [ ] Image optimization: WebP/AVIF, lazy loading, proper sizing
- [ ] Bundle size audit: No design system regression
- [ ] SSR/SSG for marketing pages

### 10.4 Visual Regression Testing

- [ ] Percy or Chromatic setup for component screenshots
- [ ] Baseline snapshots for all key pages
- [ ] Mobile viewport screenshots (375px, 390px, 414px)
- [ ] Tablet viewport screenshots (768px, 1024px)

### Tasks — Phase 7

| # | Task | Est. |
|---|------|:---:|
| 7.1 | WCAG 2.2 AA audit on all new/updated components | 1d |
| 7.2 | Cross-browser testing + fixes | 1d |
| 7.3 | Performance audit + optimization | 1d |
| 7.4 | Visual regression test setup + baseline | 1d |
| 7.5 | Final polish: animations, transitions, micro-interactions | 1d |

---

## 11. Risk Register & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|-----------|
| **Grade-band theming conflicts** — new Mastery tokens may clash with explorer/navigator/scholar themes | High | Medium | Update all 4 grade themes simultaneously in Phase 0; test with theme switcher |
| **Breaking existing functionality** — component API changes break app imports | High | High | Maintain backward-compatible component APIs; add deprecated props with console warnings |
| **Font loading regression** — DM Sans heavier than Nunito | Medium | Low | Use `font-display: swap`, subset fonts, preload critical weights only |
| **Accessibility regression** — new colors fail contrast | High | Medium | Run `axe-core` CI check on every PR; test new palette in Phase 0 before rollout |
| **Mobile app update velocity** — Flutter changes slower than web | Medium | Medium | Share design tokens from JSON → Dart auto-generation; phase mobile after web stabilizes |
| **Emoji removal backlash** — younger learners (Pre-K–5) expect playful design | Medium | Low | Keep emoji as optional grade-band enhancement in Explorer theme only |
| **Scope creep** — "while we're redesigning, let's also…" | High | High | Strict scope: visual redesign only, no new features, no backend changes |
| **Figma Premium access** — template requires Envato Elements subscription | Low | Medium | Download template once, export all assets, document all design decisions |

---

## 12. Effort Estimates & Timeline

### Sprint Plan (2-week sprints, 2 developers)

| Sprint | Phase | Focus | Days |
|:------:|:-----:|-------|:---:|
| **S1** (Wk 1–2) | Phase 0 + 1a | Design tokens + core components (Button, Card, Badge, Avatar, Tabs) | 10d |
| **S2** (Wk 3–4) | Phase 1b + 2a | Remaining components + Marketing nav/hero/features | 10d |
| **S3** (Wk 5–6) | Phase 2b + 3a | Marketing remaining pages + Learner layout/dashboard | 10d |
| **S4** (Wk 7–8) | Phase 3b + 4a | Learner remaining + Teacher app | 10d |
| **S5** (Wk 9–10) | Phase 4b + 5 | Parent app + Admin apps | 10d |
| **S6** (Wk 11–12) | Phase 6 | Mobile apps (Flutter) | 10d |
| **S7** (Wk 13–14) | Phase 7 | QA, accessibility, perf, polish | 10d |
| | | **Buffer** | 12d |
| | | **Total** | **82d** |

### Critical Path

```
Phase 0 (tokens) ─→ Phase 1 (components) ─→ Phase 2 (marketing) ─→ Phase 3 (learner)
                                           ├→ Phase 4 (teacher/parent)
                                           ├→ Phase 5 (admin apps)
                                           └→ Phase 6 (mobile) ──→ Phase 7 (QA)
```

Phases 2–6 can partially parallelize once Phase 1 core components are complete.

---

## 13. File-Level Change Inventory

### Design System Files (Phase 0 + 1)

| File | Action | Phase |
|------|:------:|:-----:|
| `libs/design-tokens/aivo-tokens.json` | MODIFY — new colors, fonts, radius, shadows | 0 |
| `libs/ui-web/src/tokens.json` | MODIFY — mirror design-tokens changes | 0 |
| `libs/ui-web/src/styles/mastery-theme.css` | CREATE — CSS custom properties | 0 |
| `libs/ui-web/src/styles/globals.css` | MODIFY — new base styles | 0 |
| `libs/ui-web/src/tailwind/gradeThemePlugin.cjs` | MODIFY — emit new tokens | 0 |
| `libs/ui-web/src/components/button.tsx` | MODIFY — new styles/variants | 1 |
| `libs/ui-web/src/components/card.tsx` | MODIFY — new shadows/radius | 1 |
| `libs/ui-web/src/components/badge.tsx` | MODIFY — pill shape | 1 |
| `libs/ui-web/src/components/heading.tsx` | MODIFY — new font families | 1 |
| `libs/ui-web/src/components/ui/course-card.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/course-grid.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/category-filter.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/stats-card.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/progress-ring.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/sidebar.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/sidebar-layout.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/avatar.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/avatar-group.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/search-bar.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/video-player.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/lesson-nav.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/rating-stars.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/empty-state.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/breadcrumb-nav.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/skeleton.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/data-table.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/tabs.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/dropdown.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/toast.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/modal.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/tooltip.tsx` | CREATE | 1 |
| `libs/ui-web/src/components/ui/pagination.tsx` | CREATE | 1 |
| `libs/ui-web/src/index.ts` | MODIFY — export new components | 1 |

### Marketing App Files (Phase 2)

| File | Action |
|------|:------:|
| `apps/web-marketing/tailwind.config.cjs` | MODIFY — new font/color tokens |
| `apps/web-marketing/src/app/layout.tsx` | MODIFY — new fonts, base styles |
| `apps/web-marketing/src/app/page.tsx` | MODIFY — add courses section |
| `apps/web-marketing/src/app/globals.css` | MODIFY — new base styles |
| `apps/web-marketing/src/components/shared/navigation.tsx` | MODIFY — full redesign |
| `apps/web-marketing/src/components/shared/footer.tsx` | MODIFY — full redesign |
| `apps/web-marketing/src/components/marketing/hero/` | MODIFY — full redesign |
| `apps/web-marketing/src/components/sections/features.tsx` | MODIFY — alternating layout |
| `apps/web-marketing/src/components/sections/how-it-works.tsx` | MODIFY — stepper design |
| `apps/web-marketing/src/components/sections/testimonials.tsx` | MODIFY — carousel |
| `apps/web-marketing/src/components/sections/pricing.tsx` | MODIFY — 3-tier + toggle |
| `apps/web-marketing/src/components/sections/cta.tsx` | MODIFY — gradient + email |
| `apps/web-marketing/src/components/sections/courses.tsx` | CREATE — course catalog |
| `apps/web-marketing/src/app/courses/page.tsx` | CREATE — catalog page |
| `apps/web-marketing/src/app/courses/[slug]/page.tsx` | CREATE — course detail |

### Learner App Files (Phase 3)

| File | Action |
|------|:------:|
| `apps/web-learner/tailwind.config.ts` | MODIFY |
| `apps/web-learner/app/layout.tsx` | MODIFY — new fonts |
| `apps/web-learner/app/page.tsx` | MODIFY — full redesign |
| `apps/web-learner/app/globals.css` | MODIFY |
| `apps/web-learner/app/(learning)/layout.tsx` | MODIFY — add sidebar layout |
| `apps/web-learner/components/learner-sidebar.tsx` | CREATE |
| `apps/web-learner/components/learner-topbar.tsx` | CREATE |
| `apps/web-learner/app/(learning)/dashboard/page.tsx` | MODIFY — stats + course cards |
| `apps/web-learner/app/(learning)/courses/page.tsx` | MODIFY — catalog grid |
| `apps/web-learner/app/(learning)/courses/[slug]/page.tsx` | CREATE — course detail |
| `apps/web-learner/app/(learning)/achievements/page.tsx` | MODIFY |
| `apps/web-learner/app/(learning)/progress/page.tsx` | MODIFY |
| `apps/web-learner/app/(learning)/profile/page.tsx` | MODIFY |

### Teacher App Files (Phase 4)

| File | Action |
|------|:------:|
| `apps/web-teacher/tailwind.config.ts` | MODIFY |
| `apps/web-teacher/src/app/layout.tsx` | MODIFY |
| `apps/web-teacher/src/components/teacher-sidebar.tsx` | CREATE |
| `apps/web-teacher/src/components/teacher-topbar.tsx` | CREATE |
| `apps/web-teacher/src/app/dashboard/` | MODIFY |
| `apps/web-teacher/src/app/students/` | MODIFY |
| `apps/web-teacher/src/app/iep/` | MODIFY |
| `apps/web-teacher/src/app/gradebook/` | MODIFY |
| `apps/web-teacher/src/app/analytics/` | MODIFY |

### Parent App Files (Phase 4)

| File | Action |
|------|:------:|
| `apps/web-parent/tailwind.config.ts` | MODIFY |
| `apps/web-parent/src/app/layout.tsx` | MODIFY |
| `apps/web-parent/src/components/parent-sidebar.tsx` | CREATE |
| `apps/web-parent/src/app/dashboard/` | MODIFY |
| `apps/web-parent/src/app/messages/` | MODIFY |
| `apps/web-parent/src/app/progress/` | MODIFY |
| `apps/web-parent/src/app/iep/` | MODIFY |

### Admin App Files (Phase 5)

| File | Action |
|------|:------:|
| `apps/web-district/tailwind.config.ts` | MODIFY |
| `apps/web-district/src/app/layout.tsx` | MODIFY |
| `apps/web-district/src/components/district-sidebar.tsx` | CREATE |
| `apps/web-district/src/app/dashboard/` | MODIFY |
| `apps/web-district/src/app/compliance/` | MODIFY |
| `apps/web-platform-admin/tailwind.config.ts` | MODIFY |
| `apps/web-platform-admin/src/app/layout.tsx` | MODIFY |
| `apps/web-platform-admin/src/components/admin-sidebar.tsx` | CREATE |

### Flutter Files (Phase 6)

| File | Action |
|------|:------:|
| `libs/flutter-common/lib/theme/mastery_theme.dart` | CREATE |
| `libs/flutter-common/lib/theme/mastery_colors.dart` | CREATE |
| `libs/flutter-common/lib/theme/mastery_typography.dart` | CREATE |
| `libs/flutter-common/lib/widgets/course_card.dart` | CREATE |
| `libs/flutter-common/lib/widgets/stats_card.dart` | CREATE |
| `libs/flutter-common/lib/widgets/progress_ring.dart` | CREATE |
| `libs/flutter-common/lib/widgets/sidebar.dart` | CREATE |
| `apps/mobile-learner/lib/` | MODIFY — multiple files |
| `apps/mobile-parent/lib/` | MODIFY — multiple files |
| `apps/mobile-teacher/lib/` | MODIFY — multiple files |

---

## Summary

| Metric | Value |
|--------|-------|
| **Total files to modify** | ~80 |
| **Total files to create** | ~45 |
| **Total developer-days** | ~82 (with buffer) |
| **Calendar weeks** (2 devs) | ~7 weeks |
| **Calendar weeks** (1 dev) | ~14 weeks |
| **Apps affected** | 12 (9 web + 3 mobile) |
| **Components to create** | 22 new shared components |
| **Components to update** | 4+ existing shared components |
| **Breaking changes** | Font family swap, color palette shift |
| **Zero backend changes** | ✅ Pure frontend/design work |

### Quick Wins (Can ship in Week 1)

1. **Design tokens update** — new colors, fonts, shadows
2. **Marketing navigation** — sticky, clean, pill CTA
3. **Marketing hero** — modern split layout
4. **Button component** — new variants and colors
5. **Card component** — updated shadows and radius

### Recommended Starting Point

Begin with **Phase 0** (design tokens) → then **Phase 1** (core components: Button, Card, Avatar, Tabs, Sidebar) → then **Phase 2** (marketing site) — this gives the highest visibility impact in the shortest time.
