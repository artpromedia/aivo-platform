# Subject System

## Overview
The Subject System manages educational content across grade levels (K5, MS, HS) with AI-powered personalization and progress tracking.

## Components

### SubjectEngine
Core class for subject content management:
- `getSubjectContent()` - Fetch subject with AI personalization
- `recordLessonProgress()` - Track lesson completion
- `getNextRecommendedLesson()` - AI-recommended next steps
- `startSubjectAssessment()` - Begin subject assessments
- `getSubjectAnalytics()` - Performance insights

### SubjectTemplate
Reusable layout component for all subject pages providing consistent UI/UX.

## Grade Levels

### K5 (Elementary)
- Math, Reading, Science, Social Studies, Art, Music
- Game-based learning focus
- Visual, interactive content

### MS (Middle School)
- Algebra, Geometry, Pre-Algebra, English, Science, History
- Balanced interactive and traditional content
- Increased complexity

### HS (High School)
- Calculus, Biology, Chemistry, Physics, English, History, Algebra 2, Geometry
- Advanced concepts
- College prep focus

## Data Flow

```
User selects subject
        ↓
SubjectEngine.getSubjectContent()
        ↓
┌───────────────────┐
│   Supabase DB     │ → Subject data, lessons, assessments
└───────────────────┘
        ↓
┌───────────────────┐
│   AI Service      │ → Personalized content ordering
└───────────────────┘
        ↓
SubjectTemplate renders content
        ↓
User interacts with lessons
        ↓
SubjectEngine.recordLessonProgress()
        ↓
AI Brain updated with progress
```

## Usage

```typescript
import { SubjectEngine } from '@/systems/subjects/SubjectEngine';

const engine = new SubjectEngine();

// Get subject content
const content = await engine.getSubjectContent('K5', 'math', 'learner-123');

// Record progress
await engine.recordLessonProgress('learner-123', 'lesson-456', 75);

// Get recommendations
const nextLesson = await engine.getNextRecommendedLesson('learner-123', 'math');
```

## API Integration

- `POST /api/ai/personalize` - Get personalized content
- `POST /api/ai/progress-update` - Notify AI of progress
- `POST /api/ai/recommend-lesson` - Get next lesson recommendation
- `POST /api/analytics/subject` - Get subject performance data
