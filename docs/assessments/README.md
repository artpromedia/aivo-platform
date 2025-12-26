# Assessment System Documentation

## Overview

The AIVO Assessment System is a comprehensive, enterprise-grade assessment platform supporting:
- 13 question types with auto-grading and rubric-based evaluation
- Real-time question shuffling and security monitoring
- Item analysis, reliability metrics, and standards mastery tracking
- Drag-and-drop assessment builder with live preview
- Teacher grading queue with rubric scoring
- Student assessment-taking with accommodations support

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Applications                         │
├──────────────────────┬──────────────────────────────────────────┤
│   web-teacher        │              web-learner                 │
│   - AssessmentBuilder│              - AssessmentTaker           │
│   - GradingQueue     │              - Results View              │
│   - Analytics        │              - Review Mode               │
└──────────┬───────────┴──────────────────────┬───────────────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     assessment-svc API                           │
├─────────────────────────────────────────────────────────────────┤
│  /api/v1/assessments     Assessment CRUD & publishing           │
│  /api/v1/questions       Question bank management               │
│  /api/v1/attempts        Student attempt lifecycle              │
│  /api/v1/grading         Manual grading & rubrics               │
│  /api/v1/analytics       Item analysis & reporting              │
│  /api/v1/security        Proctoring & violation tracking        │
└─────────────────────────────────────────────────────────────────┘
```

## Question Types

### Basic Types
| Type | Auto-Graded | Description |
|------|-------------|-------------|
| `MULTIPLE_CHOICE` | ✅ | Single correct answer from options |
| `MULTIPLE_SELECT` | ✅ | Multiple correct answers, partial credit |
| `TRUE_FALSE` | ✅ | Binary true/false selection |
| `SHORT_ANSWER` | ✅ | Text matching with alternatives |
| `ESSAY` | ❌ | Long-form response, rubric graded |

### Advanced Types
| Type | Auto-Graded | Description |
|------|-------------|-------------|
| `FILL_BLANK` | ✅ | Multiple blanks with accepted answers |
| `MATCHING` | ✅ | Pair items together |
| `ORDERING` | ✅ | Arrange items in correct sequence |
| `NUMERIC` | ✅ | Number with tolerance |

### Interactive Types
| Type | Auto-Graded | Description |
|------|-------------|-------------|
| `HOTSPOT` | ✅ | Click correct regions on image |
| `DRAG_DROP` | ✅ | Place items in zones |
| `CODE` | ✅ | Programming with test cases |
| `MATH_EQUATION` | ✅ | Mathematical expression input |

## API Reference

### Assessment Endpoints

#### Create Assessment
```http
POST /api/v1/assessments
Content-Type: application/json

{
  "name": "Chapter 5 Quiz",
  "type": "QUIZ",
  "settings": {
    "timeLimit": 30,
    "shuffleQuestions": true,
    "shuffleOptions": true,
    "maxAttempts": 2
  }
}
```

#### Publish Assessment
```http
POST /api/v1/assessments/:id/publish
```

#### Get Assessment with Questions
```http
GET /api/v1/assessments/:id?include=questions
```

### Question Endpoints

#### Create Question
```http
POST /api/v1/questions
Content-Type: application/json

{
  "assessmentId": "uuid",
  "type": "MULTIPLE_CHOICE",
  "stem": "What is the capital of France?",
  "points": 10,
  "difficulty": "EASY",
  "options": [
    { "text": "London", "isCorrect": false },
    { "text": "Paris", "isCorrect": true },
    { "text": "Berlin", "isCorrect": false }
  ],
  "tags": ["geography", "europe"],
  "standardIds": ["GEO.1.1"]
}
```

### Grading Endpoints

#### Get Grading Queue
```http
GET /api/v1/grading/queue?assessmentId=:id&questionType=ESSAY
```

#### Submit Grade
```http
POST /api/v1/grading/:responseId
Content-Type: application/json

{
  "score": 8,
  "feedback": "Good analysis, but missing conclusion.",
  "rubricScores": {
    "criterion-1": 4,
    "criterion-2": 4
  }
}
```

#### Release Grades
```http
POST /api/v1/grading/release
Content-Type: application/json

{
  "assessmentId": "uuid",
  "studentIds": ["student-1", "student-2"]
}
```

### Analytics Endpoints

#### Get Assessment Analytics
```http
GET /api/v1/analytics/assessments/:id

Response:
{
  "scoreDistribution": {
    "mean": 75.5,
    "median": 78,
    "standardDeviation": 12.3,
    "min": 45,
    "max": 98
  },
  "reliability": {
    "cronbachAlpha": 0.85,
    "kr20": 0.82,
    "sem": 4.2
  },
  "itemAnalysis": [
    {
      "questionId": "q1",
      "difficulty": 0.72,
      "discrimination": 0.45,
      "difficultyLevel": "MEDIUM"
    }
  ]
}
```

### Security Endpoints

#### Start Secure Session
```http
POST /api/v1/security/session/start
Content-Type: application/json

{
  "attemptId": "uuid",
  "userAgent": "Mozilla/5.0...",
  "lockdownBrowser": true
}
```

#### Report Violation
```http
POST /api/v1/security/violations
Content-Type: application/json

{
  "attemptId": "uuid",
  "type": "TAB_SWITCH",
  "details": "User switched to another tab"
}
```

## Data Models

### Assessment
```typescript
interface Assessment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  instructions?: string;
  type: 'QUIZ' | 'TEST' | 'EXAM' | 'PRACTICE' | 'SURVEY' | 'DIAGNOSTIC';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  settings: AssessmentSettings;
  questions: Question[];
  totalPoints: number;
  passingScore?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Question
```typescript
interface Question {
  id: string;
  assessmentId?: string;
  type: QuestionType;
  stem: string;
  points: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  
  // Type-specific fields
  options?: QuestionOption[];        // MC, MS, Ordering
  correctAnswer?: unknown;           // TF, Short, Numeric
  blanks?: QuestionBlank[];          // Fill blank
  pairs?: QuestionPair[];            // Matching
  correctOrder?: string[];           // Ordering
  tolerance?: number;                // Numeric
  testCases?: TestCase[];            // Code
  
  // Metadata
  tags: string[];
  standardIds?: string[];
  rubricId?: string;
  partialCredit?: boolean;
  feedback?: {
    correct?: string;
    incorrect?: string;
    partial?: string;
  };
}
```

### Rubric
```typescript
interface Rubric {
  id: string;
  name: string;
  description?: string;
  type: 'ANALYTIC' | 'HOLISTIC' | 'SINGLE_POINT';
  criteria: RubricCriterion[];
  maxPoints: number;
}

interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  weight: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  id: string;
  name: string;
  description?: string;
  points: number;
}
```

## Frontend Components

### Assessment Builder
```tsx
import { AssessmentBuilder } from '@/components/assessments';

<AssessmentBuilder
  assessmentId="uuid"        // Edit existing or undefined for new
  tenantId="tenant-1"
  onSave={handleSave}
  onPublish={handlePublish}
  onClose={handleClose}
/>
```

### Grading Queue
```tsx
import { GradingQueue } from '@/components/assessments';

<GradingQueue
  assessmentId="uuid"
  assessmentName="Chapter 5 Quiz"
  items={gradingItems}
  totalUngradedCount={25}
  onGrade={handleGrade}
  onFlag={handleFlag}
  onUnflag={handleUnflag}
  onSkip={handleSkip}
  onReleaseGrades={handleRelease}
/>
```

### Assessment Taker (Student)
```tsx
import { AssessmentTaker } from '@/components/assessments';

<AssessmentTaker
  assessment={assessment}
  attempt={attemptData}
  accommodations={{
    extraTime: 30,
    breaks: true
  }}
  onSaveResponse={handleSaveResponse}
  onSubmit={handleSubmit}
  onSecurityViolation={handleViolation}
/>
```

## Auto-Grading

The auto-grading service supports all objective question types:

### Multiple Choice
- Exact match on selected option ID
- Full points or zero

### Multiple Select
- Partial credit based on correct/incorrect selections
- Formula: `(correct - incorrect) / totalCorrect × points`

### Short Answer
- Case-insensitive matching (configurable)
- Multiple accepted answers
- Whitespace normalization
- Optional fuzzy matching

### Numeric
- Tolerance-based matching
- Formula: `|answer - correct| ≤ tolerance`

### Fill in the Blank
- Per-blank scoring with partial credit
- Multiple accepted answers per blank
- Case sensitivity option

### Matching
- Partial credit for correct pairs
- Formula: `correctPairs / totalPairs × points`

### Ordering
- Position-based scoring
- Formula: `correctPositions / totalItems × points`

### Code
- Test case execution
- Visible and hidden test cases
- Timeout and memory limits

## Analytics & Reporting

### Item Analysis
- **Difficulty (p-value)**: Proportion of students answering correctly
  - Easy: p > 0.7
  - Medium: 0.3 ≤ p ≤ 0.7
  - Hard: p < 0.3

- **Discrimination Index**: Point-biserial correlation
  - Good: r > 0.3
  - Fair: 0.2 ≤ r ≤ 0.3
  - Poor: r < 0.2

### Reliability Metrics
- **Cronbach's Alpha**: Internal consistency (target: α ≥ 0.7)
- **KR-20**: For dichotomous items
- **Split-Half Reliability**: Spearman-Brown corrected
- **Standard Error of Measurement (SEM)**: Precision estimate

### Standards Mastery
- Per-standard performance tracking
- Mastery threshold configuration
- Learning objective alignment

## Security Features

### Browser Lockdown
- Respondus LockDown Browser detection
- Proctorio, Examity, Honorlock support
- User agent verification

### Violation Tracking
- Tab switch detection
- Window blur events
- Copy/paste prevention
- Screenshot prevention
- Auto-submit on max violations

### Session Management
- Secure token generation
- IP address tracking
- Session expiry enforcement
- Multiple device prevention

## Accommodations

The system supports various student accommodations:

| Accommodation | Description |
|---------------|-------------|
| `EXTENDED_TIME` | Additional time (percentage or fixed) |
| `BREAKS` | Allow pausing during assessment |
| `REDUCED_DISTRACTIONS` | Simplified UI mode |
| `SCREEN_READER` | ARIA-enhanced accessibility |
| `LARGE_TEXT` | Increased font sizes |
| `COLOR_CONTRAST` | High contrast mode |

## Best Practices

### Question Design
1. Use clear, unambiguous stems
2. Avoid "all of the above" options
3. Include relevant distractors
4. Align with learning objectives
5. Tag with standards

### Assessment Settings
1. Set appropriate time limits
2. Use question shuffling for security
3. Enable partial credit where appropriate
4. Configure meaningful feedback
5. Set passing scores aligned with objectives

### Grading
1. Use rubrics for subjective questions
2. Provide specific feedback
3. Review flagged items carefully
4. Release grades promptly
5. Analyze item performance regularly

## Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
SECURITY_HMAC_SECRET=security-secret
LOCKDOWN_BROWSER_KEY=lockdown-key
```

### Database Migrations
```bash
pnpm prisma migrate dev
pnpm prisma generate
```

### Running Tests
```bash
pnpm test
pnpm test:coverage
```
