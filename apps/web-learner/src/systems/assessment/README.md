# Assessment System Architecture

## Overview

The AIVO Assessment System provides adaptive, AI-powered assessments for learner profiling and progress tracking. It supports multiple assessment types and integrates with the AI recommendation engine for personalized learning paths.

## Components

### BaselineAssessment
Initial learner profiling that establishes:
- Learning style preferences (visual, auditory, kinesthetic, reading/writing)
- Subject interests and strengths
- Challenge areas and accommodation needs
- Domain-specific baseline scores across 7 learning domains

### DynamicAssessment
Adaptive questioning system that:
- Adjusts difficulty based on learner responses
- Uses Item Response Theory (IRT) for question selection
- Integrates with AI for real-time difficulty calibration
- Supports multiple question types (MCQ, open-ended, matching)

### ResultsAnalysis
AI-powered analysis that:
- Generates proficiency levels per domain
- Identifies learning patterns and preferences
- Creates personalized recommendations
- Updates the learner's AI Brain profile

### ProgressTracking
Long-term monitoring that:
- Tracks skill progression over time
- Identifies mastery vs. areas needing reinforcement
- Triggers re-assessment when needed
- Provides data for learning path optimization

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Assessment     │────▶│  AI Engine      │────▶│  Question       │
│  Start          │     │  (Python)       │     │  Selection      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AI Brain       │◀────│  Results        │◀────│  Learner        │
│  Update         │     │  Analysis       │     │  Response       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  Supabase       │
                        │  Storage        │
                        └─────────────────┘
```

## Assessment Domains

| Domain | Code | Description |
|--------|------|-------------|
| Math | MATH | Number sense, operations, geometry, problem-solving |
| Reading & Writing | ELA | Phonemic awareness, fluency, comprehension, writing |
| Speech & Language | SPEECH | Articulation, fluency, voice, pragmatics |
| Social & Emotional | SEL | Self-awareness, relationships, decision-making |
| Spelling | SPELLING | Phonics patterns, rules, sight words |
| Creative Writing | CREATIVE_WRITING | Story elements, character, setting, description |
| Life Skills | LIFE_SKILLS | Time, money, safety, hygiene, organization |

## Assessment Types

### Baseline Assessment
- **Purpose**: Initial profiling for new learners
- **Duration**: ~15-20 minutes
- **Structure**:
  - Phase 1: Learning style questions (7 questions)
  - Phase 2: Domain assessments (7 domains × 5 questions)
  - Game breaks between domains
- **Output**: Learner profile with domain scores and recommendations

### Progress Assessment
- **Purpose**: Track skill development over time
- **Frequency**: Weekly or after completing learning modules
- **Structure**: Focused on specific skills/domains
- **Output**: Progress metrics and updated proficiency levels

### Subject Assessment
- **Purpose**: Pre/post assessment for specific subjects
- **Structure**: Targeted questions for grade-level standards
- **Output**: Subject-specific scores and gap analysis

## API Endpoints

### Start Assessment
```typescript
POST /api/assessment/start
Body: { type: 'baseline' | 'progress' | 'subject', learnerId: string, subjectId?: string }
Response: { sessionId: string, questions: Question[] }
```

### Submit Answer
```typescript
POST /api/assessment/answer
Body: { sessionId: string, questionId: string, answer: number | string, latencyMs: number }
Response: { isCorrect?: boolean, nextQuestion?: Question, feedback?: string }
```

### Complete Assessment
```typescript
POST /api/assessment/complete
Body: { sessionId: string }
Response: { results: AssessmentResult, recommendations: Recommendation[] }
```

## Database Schema

### assessment_sessions
```sql
CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID REFERENCES learners(id),
  type VARCHAR(20) NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  results JSONB,
  metadata JSONB
);
```

### assessment_answers
```sql
CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES assessment_sessions(id),
  question_id VARCHAR(100) NOT NULL,
  domain VARCHAR(50),
  answer JSONB NOT NULL,
  latency_ms INTEGER,
  is_correct BOOLEAN,
  score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Integration with AI Services

The assessment system integrates with Python AI services for:

1. **Question Generation**: AI generates grade-appropriate questions
2. **Difficulty Calibration**: Real-time adjustment based on responses
3. **Response Evaluation**: AI evaluates open-ended responses
4. **Profile Generation**: Creates comprehensive learner profiles
5. **Recommendations**: Generates personalized learning paths

## Game Breaks

To maintain engagement, especially for younger learners:
- Short activity breaks between domain assessments
- Breathing exercises, movement activities, mindfulness
- 8-10 second duration with countdown
- Skippable for older learners

## Accessibility Features

- Screen reader compatible question rendering
- Keyboard navigation support
- Extended time options
- Text-to-speech for questions
- High contrast mode
- Reduced motion option
