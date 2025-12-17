# Social Stories Library - ND-1.2

## Overview

The Social Stories Library implements evidence-based visual narratives for neurodiverse learners following Carol Gray's Social Stories™ framework. This feature helps learners prepare for transitions, manage emotions, and navigate challenging situations through personalized, accessible stories.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Social Stories System                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐ │
│  │   content-svc       │    │   ai-orchestrator   │    │  mobile-learner │ │
│  │                     │    │                     │    │                 │ │
│  │  ┌───────────────┐  │    │  ┌───────────────┐  │    │  ┌───────────┐  │ │
│  │  │ Prisma Schema │  │    │  │ Personalizer  │  │    │  │  Models   │  │ │
│  │  │ - SocialStory │  │    │  │    Agent      │  │    │  │           │  │ │
│  │  │ - Preferences │  │    │  └───────────────┘  │    │  └───────────┘  │ │
│  │  │ - Views       │  │    │                     │    │                 │ │
│  │  │ - Assignments │  │    │  ┌───────────────┐  │    │  ┌───────────┐  │ │
│  │  └───────────────┘  │    │  │  AI Routes    │  │    │  │  Service  │  │ │
│  │                     │    │  │  /personalize │  │    │  │  (API)    │  │ │
│  │  ┌───────────────┐  │    │  │  /generate    │  │    │  └───────────┘  │ │
│  │  │    Service    │  │    │  │  /calming     │  │    │                 │ │
│  │  │ - CRUD        │  │    │  └───────────────┘  │    │  ┌───────────┐  │ │
│  │  │ - Recommend   │  │    │                     │    │  │  Widgets  │  │ │
│  │  │ - Analytics   │  │    └─────────────────────┘    │  │  - Viewer │  │ │
│  │  └───────────────┘  │                               │  │  - Page   │  │ │
│  │                     │                               │  │  - Recs   │  │ │
│  │  ┌───────────────┐  │                               │  └───────────┘  │ │
│  │  │  Templates    │  │                               │                 │ │
│  │  │  (Built-in)   │  │                               └─────────────────┘ │
│  │  └───────────────┘  │                                                   │
│  │                     │                                                   │
│  │  ┌───────────────┐  │                                                   │
│  │  │  API Routes   │  │                                                   │
│  │  │  /stories     │  │                                                   │
│  │  │  /preferences │  │                                                   │
│  │  │  /views       │  │                                                   │
│  │  └───────────────┘  │                                                   │
│  │                     │                                                   │
│  └─────────────────────┘                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Carol Gray's Social Stories™ Framework

### Sentence Types

Social Stories follow a specific ratio of sentence types to maintain an encouraging, supportive tone:

| Type            | Description                            | Example                                      |
| --------------- | -------------------------------------- | -------------------------------------------- |
| **Descriptive** | Factual statements about the situation | "My classroom has desks and chairs."         |
| **Perspective** | Describes others' thoughts/feelings    | "My teacher feels happy when I try my best." |
| **Directive**   | Suggests an appropriate response       | "I will try to stay calm."                   |
| **Affirmative** | Reinforces positive statements         | "This is okay and normal."                   |
| **Cooperative** | Identifies who will help               | "My teacher and I will work together."       |
| **Control**     | Personal strategies (from learner)     | "When I need help, I can raise my hand."     |
| **Partial**     | Fill-in-the-blank sentences            | "When I feel nervous, I can **\_**."         |

### Sentence Ratio

The framework recommends at least **2 descriptive/perspective/affirmative sentences** for every **1 directive/control sentence**.

## Data Models

### SocialStory

```typescript
interface SocialStory {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description?: string;
  category: SocialStoryCategory;
  readingLevel: SocialStoryReadingLevel;
  visualStyle: SocialStoryVisualStyle;
  isBuiltIn: boolean;
  isActive: boolean;
  targetGradeLevelMin?: number;
  targetGradeLevelMax?: number;
  pages: StoryPage[];
  pageCount: number;
  estimatedDuration: number;
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Categories

Stories are organized into 30 categories across several domains:

**Academic Transitions**

- Starting Lesson, Ending Lesson, Changing Activity
- Taking Quiz, Test Taking, Receiving Feedback

**Communication**

- Asking for Help, Asking for Break
- Raising Hand, Talking to Teacher

**Emotional Regulation**

- Feeling Frustrated, Overwhelmed, Anxious
- Calming Down, Celebrating Success

**Focus & Attention**

- Staying on Task, Ignoring Distractions, Waiting Turn

**Social Skills**

- Working with Peers, Sharing Materials, Respectful Disagreement

**Sensory Needs**

- Sensory Break, Movement Break, Quiet Space

**Safety**

- Fire Drill, Lockdown, Feeling Unsafe

## API Endpoints

### Content Service (`content-svc`)

#### Stories

```
GET    /social-stories                    # List stories
GET    /social-stories/:id                # Get story by ID
POST   /social-stories                    # Create story
PATCH  /social-stories/:id                # Update story
DELETE /social-stories/:id                # Delete story
POST   /social-stories/:id/personalize    # Personalize for learner
POST   /social-stories/seed-built-in      # Seed built-in templates
```

#### Preferences

```
GET    /learners/:learnerId/story-preferences     # Get preferences
PUT    /learners/:learnerId/story-preferences     # Update preferences
```

#### Views & Analytics

```
POST   /social-stories/:storyId/views             # Record view
PATCH  /social-story-views/:viewId                # Update view
GET    /learners/:learnerId/story-recommendations # Get recommendations
```

#### Assignments

```
POST   /social-story-assignments                  # Create assignment
GET    /learners/:learnerId/story-assignments     # List assignments
DELETE /social-story-assignments/:id              # Delete assignment
```

### AI Orchestrator

```
POST   /ai/social-stories/personalize            # AI personalization
POST   /ai/social-stories/generate               # Generate custom story
POST   /ai/social-stories/calming-strategy       # Suggest calming strategy
POST   /ai/social-stories/batch-personalize      # Batch personalization
```

## Built-in Story Templates

The system includes 6 built-in story templates:

1. **Starting My Lesson** (`starting-my-lesson`)
   - Category: STARTING_LESSON
   - Purpose: Prepare learners for beginning a new lesson

2. **Taking a Quiz** (`taking-a-quiz`)
   - Category: TAKING_QUIZ
   - Purpose: Reduce anxiety around assessments

3. **Asking for a Break** (`asking-for-a-break`)
   - Category: ASKING_FOR_BREAK
   - Purpose: Teach self-advocacy for breaks

4. **When I Feel Overwhelmed** (`when-i-feel-overwhelmed`)
   - Category: FEELING_OVERWHELMED
   - Purpose: Recognize and respond to overwhelm

5. **Calming Down** (`calming-down`)
   - Category: CALMING_DOWN
   - Purpose: Practice calming strategies

6. **When Things Change** (`when-things-change`)
   - Category: UNEXPECTED_CHANGE
   - Purpose: Cope with unexpected changes

## Personalization

Stories can be personalized based on:

### Learner Context

- Name and preferred name
- Pronouns
- Grade level
- Interests
- Current emotional state
- Current/next activity
- Preferred coping strategies
- Sensory preferences

### Preferences

- Reading level (Simplified, Standard, Advanced)
- Vocabulary level
- Sentence length
- Visual style
- TTS settings
- Font size

### AI Personalization

The AI Personalizer Agent uses the TUTOR agent configuration to:

1. Replace placeholders with learner-specific information
2. Adjust vocabulary and sentence complexity
3. Incorporate learner interests
4. Add relevant coping strategies
5. Generate visual prompts

## Flutter Integration

### Using the Story Viewer

```dart
import 'package:mobile_learner/social_stories/social_stories.dart';

// Launch a story
await StoryLauncher.launchStory(
  context,
  story: story,
  learnerId: 'learner-123',
  preferences: preferences,
  triggerType: StoryTriggerType.contextRecommendation,
  onComplete: () => print('Story completed!'),
);
```

### Displaying Recommendations

```dart
StoryRecommendationsList(
  learnerId: 'learner-123',
  currentActivityType: 'LESSON',
  nextActivityType: 'QUIZ',
  onStorySelected: (story) => StoryLauncher.launchStory(
    context,
    story: story,
    learnerId: 'learner-123',
  ),
)
```

### Story Page Widget

```dart
StoryPageWidget(
  page: storyPage,
  enableTts: true,
  fontSize: 18.0,
  onSentenceRead: (sentence) => print('Read: ${sentence.text}'),
  onInteractionComplete: (result) => print('Interaction: $result'),
)
```

## Accessibility Features

### Text-to-Speech (TTS)

- Auto-play narration option
- Adjustable narration speed
- Text highlighting during narration
- Pronunciation hints for complex words

### Visual Accessibility

- Multiple visual styles (photos, illustrations, icons, cartoon)
- High contrast mode support
- Adjustable font sizes
- Reduced motion support

### Interactive Elements

- Breathing exercises with visual guides
- Emotion check-ins
- Choice selections
- Drag-and-drop activities

## Analytics & Tracking

### View Tracking

- Story views with timestamps
- Pages viewed vs total pages
- Completion status
- Helpfulness ratings
- Trigger type (scheduled, recommended, manual)

### Effectiveness Metrics

- Completion rates by category
- Helpfulness ratings over time
- Most effective stories per learner
- Emotional state changes

## Security & Privacy

- Stories are tenant-scoped
- Learner preferences are private
- View history is auditable
- Teacher assignments are tracked
- COPPA-compliant data handling

## Testing

### Content Service Tests

```bash
pnpm --filter @aivo/content-svc test test/social-stories.test.ts
```

### AI Orchestrator Tests

```bash
pnpm --filter @aivo/ai-orchestrator test test/socialStoryPersonalizer.test.ts
```

### Flutter Tests

```bash
cd apps/mobile-learner
flutter test test/social_stories_test.dart
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Parent/caregiver story access
- [ ] Story creation by teachers
- [ ] AI-generated illustrations
- [ ] Voice recording for personalized narration
- [ ] Integration with behavior tracking
- [ ] Classroom-wide story sessions
- [ ] Story sharing between tenants (with permission)
