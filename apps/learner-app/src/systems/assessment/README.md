# Assessment System Architecture

## Overview
The Assessment System provides comprehensive learner evaluation through AI-powered adaptive questioning, real-time difficulty adjustment, and detailed performance analysis. This system integrates with the AIVO AI Brain for personalized learning paths.

## Components

### BaselineAssessment
Initial learner profiling that evaluates foundational skills across multiple domains:
- **Learning Style Assessment**: Identifies visual, auditory, kinesthetic, and reading/writing preferences
- **Domain Evaluation**: Tests core competencies in Math, ELA, Speech, SEL, Spelling, Creative Writing, and Life Skills
- **Grade Band Detection**: Automatically determines appropriate grade level (K5, MS, HS)
- **Adaptive Difficulty**: Adjusts question complexity based on real-time performance

### DynamicAssessment
Adaptive questioning system that responds to learner performance:
- **Real-time Adjustment**: Questions adapt based on response accuracy and timing
- **Confidence Tracking**: Monitors learner confidence levels to optimize difficulty
- **Game Breaks**: Inserts engaging activities between assessment sections to maintain focus
- **Progress Persistence**: Saves state for seamless resume capability

### ResultsAnalysis
AI-powered analysis of assessment outcomes:
- **Performance Scoring**: Calculates domain-specific scores and overall competency
- **Strength/Weakness Identification**: Highlights areas of mastery and improvement opportunities
- **Learning Recommendations**: Generates personalized learning path suggestions
- **Comparative Analytics**: Benchmarks against grade-level expectations

### ProgressTracking
Long-term monitoring of learner development:
- **Historical Trends**: Tracks improvement over time across all domains
- **Milestone Detection**: Identifies when learners achieve key competency levels
- **Regression Alerts**: Flags potential areas of concern for intervention
- **Growth Visualization**: Provides visual progress indicators for motivation

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Assessment Flow                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Assessment Start                                                 │
│     ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    │
│     │  Learner     │───►│  AI Engine      │───►│  Question    │    │
│     │  Initiates   │    │  Selects        │    │  Presented   │    │
│     └──────────────┘    │  Questions      │    └──────────────┘    │
│                         └─────────────────┘                          │
│                                                                      │
│  2. Learner Response                                                 │
│     ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    │
│     │  Answer      │───►│  Real-time      │───►│  Next        │    │
│     │  Submitted   │    │  Difficulty     │    │  Question    │    │
│     └──────────────┘    │  Adjustment     │    │  Selected    │    │
│                         └─────────────────┘                          │
│                                                                      │
│  3. Completion                                                       │
│     ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    │
│     │  Assessment  │───►│  AI Results     │───►│  Learning    │    │
│     │  Finished    │    │  Analysis       │    │  Path        │    │
│     └──────────────┘    └─────────────────┘    │  Generated   │    │
│                                                 └──────────────┘    │
│                                                                      │
│  4. Storage                                                          │
│     ┌──────────────┐    ┌─────────────────┐                         │
│     │  Supabase    │◄───│  AI Brain       │                         │
│     │  Database    │    │  Updated        │                         │
│     └──────────────┘    └─────────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## API Integration

### Assessment Service Endpoints
- `POST /api/assessment/start` - Initialize new assessment session
- `POST /api/assessment/answer` - Submit answer for AI evaluation
- `POST /api/assessment/complete` - Finalize assessment and get results
- `GET /api/assessment/:sessionId` - Retrieve session state
- `GET /api/assessment/:sessionId/results` - Get detailed analysis

### Supabase Tables
- `assessment_sessions` - Active and completed assessment sessions
- `assessment_responses` - Individual question responses
- `learner_profiles` - AI-generated learner profiles
- `progress_snapshots` - Historical progress data

## Configuration

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=<assessment-service-url>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-key>
```

### Assessment Types
| Type | Purpose | Duration |
|------|---------|----------|
| `baseline` | Initial learner profiling | 15-25 min |
| `progress` | Regular progress check | 10-15 min |
| `subject` | Subject-specific deep dive | 20-30 min |
| `quick` | Brief skill verification | 5 min |

## Usage Example

```tsx
import { useAssessmentAPI } from '@/hooks/useAssessmentAPI';
import { AssessmentFlow } from '@/components/Assessment';

function MyAssessment() {
  const { startAssessment, submitAnswer, completeAssessment } = useAssessmentAPI();

  const handleStart = async () => {
    const session = await startAssessment({
      type: 'baseline',
      learnerId: 'learner-123',
    });
    // Session started, questions will be presented
  };

  return <AssessmentFlow onSubmitAnswer={submitAnswer} />;
}
```

## Testing

Run assessment system tests:
```bash
pnpm test apps/learner-app/src/systems/assessment
```

## Related Documentation
- [Subject System](../subjects/README.md)
- [AI Brain Integration](../../docs/ai-brain.md)
- [Supabase Schema](../../docs/database-schema.md)
