# Internationalization & Accessibility Guide

This document describes the localization and accessibility features of the Learning Object content system.

## Overview

The content-authoring service supports:

- **Localization**: Content can be translated into multiple locales (en, es, fr, etc.)
- **Accessibility Profiles**: Content flags for dyslexia-friendly, reduced stimuli, screen reader optimization
- **Content Resolution**: API for fetching the best-matching content for a learner's preferences

## Data Model

### Translation Table

```sql
learning_object_translations
├── id (UUID, PK)
├── learning_object_version_id (UUID, FK)
├── locale (VARCHAR 10) -- e.g., "en", "es-MX"
├── status (ENUM) -- DRAFT, READY, NEEDS_UPDATE
├── content_json (JSONB) -- Localized content
├── accessibility_json (JSONB) -- Localized alt text, hints
├── metadata_json (JSONB) -- Locale-specific metadata
├── translated_by_user_id (UUID)
├── reviewed_by_user_id (UUID)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

UNIQUE (learning_object_version_id, locale)
```

### Accessibility JSON Schema

The `accessibility_json` field (on both versions and translations) supports:

```typescript
interface AccessibilityMetadata {
  // Alt text and transcripts (keyed by media URL)
  altTexts?: Record<string, string>;
  transcripts?: Record<string, string>;
  audioDescriptions?: Record<string, string>;

  // Reading/cognitive metrics
  readingLevel?: string;
  flesch_kincaid_grade?: number;
  estimatedCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';

  // Accessibility feature flags
  supportsDyslexiaFriendlyFont?: boolean;
  supportsReducedStimuli?: boolean;
  hasScreenReaderOptimizedStructure?: boolean;
  hasHighContrastMode?: boolean;
  supportsTextToSpeech?: boolean;

  // Additional hints
  teacherNotes?: string;
  simplifiedInstructions?: string;
  keyVocabulary?: string[];
}
```

### Accessibility Flags Explained

| Flag                                | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `supportsDyslexiaFriendlyFont`      | Content renders well in OpenDyslexic or similar fonts     |
| `supportsReducedStimuli`            | Minimal animations, calmer colors, simplified layout      |
| `hasScreenReaderOptimizedStructure` | Proper heading hierarchy, ARIA labels, logical tab order  |
| `hasHighContrastMode`               | Supports high-contrast color scheme                       |
| `supportsTextToSpeech`              | Optimized for TTS with proper pauses and emphasis markers |
| `estimatedCognitiveLoad`            | LOW / MEDIUM / HIGH based on content complexity           |

## API Endpoints

### Translation Management

#### List Translations

```http
GET /api/learning-objects/:loId/versions/:versionNumber/translations
```

Response:

```json
{
  "versionId": "uuid",
  "learningObjectId": "uuid",
  "versionNumber": 1,
  "title": "Fractions Introduction",
  "supportedLocales": ["en", "en-US", "es", "es-MX", "fr", "de", "pt", "zh"],
  "translations": [
    { "locale": "en", "status": "READY", "updatedAt": "..." },
    { "locale": "es", "status": "DRAFT", "updatedAt": "..." }
  ],
  "coverage": {
    "total": 2,
    "ready": 1,
    "draft": 1,
    "needsUpdate": 0
  }
}
```

#### Get Translation

```http
GET /api/learning-objects/:loId/versions/:versionNumber/translations/:locale
```

#### Upsert Translation

```http
PUT /api/learning-objects/:loId/versions/:versionNumber/translations/:locale

{
  "contentJson": {
    "type": "lesson",
    "passage": "Hoy vamos a aprender sobre fracciones...",
    "questions": [...]
  },
  "accessibilityJson": {
    "altTexts": {
      "fraction-diagram.png": "Un diagrama mostrando 3/4"
    },
    "readingLevel": "2nd grade equivalent"
  },
  "metadataJson": {
    "culturalNotes": "Uses Mexico-specific examples",
    "localStandards": ["SEP-MATH-2-3"]
  },
  "status": "DRAFT"
}
```

#### Update Status

```http
PATCH /api/learning-objects/:loId/versions/:versionNumber/translations/:locale/status

{ "status": "READY" }
```

#### Delete Translation

```http
DELETE /api/learning-objects/:loId/versions/:versionNumber/translations/:locale
```

### Content Resolution (for Consumers)

#### Resolve by Query

```http
POST /api/content/learning-objects/resolve?locale=es&skillId=uuid&gradeBand=K_2

Body (optional):
{
  "accessibilityProfile": {
    "dyslexiaFriendly": true,
    "reducedStimuli": true,
    "maxCognitiveLoad": "LOW"
  }
}
```

Response:

```json
{
  "items": [
    {
      "learningObjectId": "uuid",
      "versionId": "uuid",
      "versionNumber": 2,
      "slug": "fractions-intro",
      "title": "Fractions Introduction",
      "subject": "MATH",
      "gradeBand": "K_2",
      "content": {
        /* localized content */
      },
      "accessibility": {
        /* merged accessibility metadata */
      },
      "metadata": {
        /* merged metadata */
      },
      "locale": "es",
      "fallbackLocaleUsed": false,
      "requestedLocale": "es",
      "accessibilityScore": 0.85,
      "accessibilityFlags": {
        "supportsDyslexiaFriendlyFont": true,
        "supportsReducedStimuli": true,
        "hasScreenReaderOptimizedStructure": true,
        "hasHighContrastMode": false,
        "supportsTextToSpeech": false,
        "estimatedCognitiveLoad": "LOW"
      },
      "skills": [{ "skillId": "uuid", "isPrimary": true }]
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20,
  "fallbacksUsed": 3
}
```

#### Resolve Single LO

```http
POST /api/content/learning-objects/:learningObjectId/resolve?locale=es

Body (optional): { "accessibilityProfile": {...} }
```

#### Best Match for Skill

```http
POST /api/content/learning-objects/best-match?skillId=uuid&locale=es

Body (optional): { "accessibilityProfile": {...} }
```

#### Get Accessibility Schema

```http
GET /api/content/accessibility-profile/schema
```

## Locale Fallback Strategy

When content is requested for a locale that doesn't have a READY translation:

1. Try exact locale (e.g., `es-MX`)
2. Try base locale (e.g., `es`)
3. Fall back to default locale (`en`)

The response includes:

- `locale`: The locale actually used
- `requestedLocale`: The locale originally requested
- `fallbackLocaleUsed`: `true` if fallback was needed

## Accessibility Profile Matching

When an `accessibilityProfile` is provided:

1. Each LO is scored based on how many requested flags it supports
2. Results are sorted by accessibility score (highest first)
3. Cognitive load is matched: content load ≤ requested max load

### Scoring Example

Request: `{ dyslexiaFriendly: true, reducedStimuli: true, screenReader: true }`

| LO  | Dyslexia | Reduced | ScreenReader | Score |
| --- | -------- | ------- | ------------ | ----- |
| A   | ✓        | ✓       | ✓            | 1.00  |
| B   | ✓        | ✓       | ✗            | 0.67  |
| C   | ✗        | ✓       | ✗            | 0.33  |

## QA Checks for Accessibility

The QA engine validates accessibility profile completeness:

### K-5 Requirements (K_2, G3_5)

- **Required**: `estimatedCognitiveLoad` must be set
- **Recommended**: `supportsDyslexiaFriendlyFont`, `supportsReducedStimuli`

### All Content

- **Recommended**: `hasScreenReaderOptimizedStructure`

Check results appear in the QA summary when submitting for review.

## Authoring Workflow

### Adding Translations

1. Author creates/updates version in default locale
2. Translator opens "Translations" tab
3. Selects target locale
4. Edits `contentJson` with localized text
5. Updates `accessibilityJson` with localized alt text
6. Saves as DRAFT
7. Reviewer marks as READY

### When Source Changes

When the source version's `contentJson` is updated:

- All `READY` translations are automatically marked `NEEDS_UPDATE`
- Translators can see which translations need review

## Multi-Tenant Considerations

- Translations inherit the tenant scope of their version
- Global content (null tenant) translations are available to all tenants
- Tenant-specific translations are only visible to that tenant

## Best Practices

### For Authors

1. Always set accessibility flags when creating content
2. For K-5 content, ensure cognitive load is marked
3. Provide comprehensive alt text for all media
4. Consider reduced-stimuli variants for younger learners

### For Translators

1. Translate alt text, not just main content
2. Adapt cultural references appropriately
3. Document locale-specific standards in `metadataJson`
4. Use `translationNotes` for context

### For Consumers (Lesson Planner, Tutor)

1. Always request with both `locale` and `accessibilityProfile`
2. Check `fallbackLocaleUsed` to inform user of language limitations
3. Use `accessibilityScore` to prioritize content selection
4. Handle missing translations gracefully with fallback messaging
