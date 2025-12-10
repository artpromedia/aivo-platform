# Content Review Workflow

This document describes the review workflow for Learning Object versions, including state transitions, QA checks, and review notes.

## Overview

The content authoring workflow follows a state machine pattern where versions move through specific states:

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED → RETIRED
           ↓
         DRAFT (rejected)
```

## State Definitions

| State         | Description                                            |
| ------------- | ------------------------------------------------------ |
| **DRAFT**     | Content is being authored. Only the author can edit.   |
| **IN_REVIEW** | Submitted for review. Reviewers can approve or reject. |
| **APPROVED**  | Review passed. Waiting for publication.                |
| **PUBLISHED** | Live content available to learners.                    |
| **RETIRED**   | No longer in use; replaced by newer version.           |

## Roles & Permissions

### Author Roles

- `CURRICULUM_AUTHOR` - Can create/edit content, submit for review
- `DISTRICT_CONTENT_ADMIN` - Can edit any content in their district
- `PLATFORM_ADMIN` - Full access

### Reviewer Roles

- `CURRICULUM_REVIEWER` - Can approve/reject content in review
- `DISTRICT_CONTENT_ADMIN` - Can approve within their district
- `PLATFORM_ADMIN` - Can approve any content

### Publisher Roles

- `DISTRICT_CONTENT_ADMIN` - Can publish approved content
- `PLATFORM_ADMIN` - Can publish any content

## QA Checks

Automated QA checks run when content is submitted for review (and on-demand). These help reviewers identify potential issues.

### Check Types

#### 1. ACCESSIBILITY

- **Purpose**: Ensure content is accessible to all learners
- **Checks**:
  - Images/media have alt text
  - Reading level appropriate for grade band
- **Severity**: FAILED if media missing alt text, WARNING for reading level mismatch

#### 2. METADATA_COMPLETENESS

- **Purpose**: Ensure all required metadata is present
- **Required**:
  - Subject (ELA, MATH, SCIENCE, SEL, SPEECH, OTHER)
  - Grade band (K_2, G3_5, G6_8, G9_12)
  - At least one skill alignment
- **Recommended**:
  - Estimated duration
- **Severity**: FAILED if required missing, WARNING if recommended missing

#### 3. POLICY_LANGUAGE

- **Purpose**: Detect inappropriate or policy-violating content
- **Checks for**:
  - Diagnostic language ("You have ADHD")
  - Stigmatizing language ("suffers from")
  - Derogatory terms
  - Harmful content
  - Advertising language
- **Severity**: FAILED if any violations found

#### 4. CONTENT_STRUCTURE

- **Purpose**: Validate content is properly structured
- **Checks**:
  - Content is not empty
  - Questions have text
  - Multiple choice questions have at least 2 choices
- **Severity**: FAILED if empty, WARNING for structure issues

#### 5. SKILL_ALIGNMENT

- **Purpose**: Ensure skills are properly aligned
- **Checks**:
  - At least one skill aligned
  - At least one primary skill marked
- **Severity**: WARNING if no skills or no primary skill

### QA Check Results

```json
{
  "checkType": "ACCESSIBILITY",
  "status": "PASSED" | "WARNING" | "FAILED",
  "message": "Human-readable description",
  "details": { /* Additional context */ }
}
```

### Overall Status

- **PASSED**: All checks passed
- **WARNING**: No failures, but some warnings
- **FAILED**: At least one check failed

## Review Notes

Review notes provide an audit trail of feedback during the review process.

### Note Types

| Type            | When Used                               |
| --------------- | --------------------------------------- |
| **GENERAL**     | Any general comment from reviewer       |
| **FEEDBACK**    | Specific feedback for improvement       |
| **APPROVAL**    | Note added when approving               |
| **REJECTION**   | Required note when rejecting            |
| **QA_OVERRIDE** | Justification for overriding QA failure |

### Note Storage

Notes are stored in `learning_object_version_review_notes` table:

```sql
CREATE TABLE learning_object_version_review_notes (
  id UUID PRIMARY KEY,
  learning_object_version_id UUID REFERENCES learning_object_versions(id),
  author_user_id UUID,
  note_text TEXT,
  note_type VARCHAR(50),
  created_at TIMESTAMPTZ
);
```

## API Endpoints

### Submit for Review

```http
POST /learning-objects/:loId/versions/:versionNumber/submit-review
```

- Runs QA checks automatically
- Returns QA check results in response
- Moves state from DRAFT → IN_REVIEW

### Approve

```http
POST /learning-objects/:loId/versions/:versionNumber/approve
Body: { "note": "Optional approval note" }
```

- Creates APPROVAL note
- Moves state from IN_REVIEW → APPROVED

### Reject

```http
POST /learning-objects/:loId/versions/:versionNumber/reject
Body: { "reason": "Required rejection reason" }
```

- Creates REJECTION note
- Moves state from IN_REVIEW → DRAFT

### Get QA Checks

```http
GET /learning-objects/:loId/versions/:versionNumber/qa-checks
```

Returns latest QA check results.

### Run QA Checks On-Demand

```http
POST /learning-objects/:loId/versions/:versionNumber/qa-checks/run
```

Re-runs QA checks without submitting for review.

### Get Review Notes

```http
GET /learning-objects/:loId/versions/:versionNumber/review-notes
```

Returns all review notes for the version.

### Add Review Note

```http
POST /learning-objects/:loId/versions/:versionNumber/review-notes
Body: { "noteText": "Your comment", "noteType": "GENERAL" | "FEEDBACK" }
```

## Audit Trail

All state transitions are recorded in `learning_object_version_transitions`:

```sql
CREATE TABLE learning_object_version_transitions (
  id UUID PRIMARY KEY,
  version_id UUID REFERENCES learning_object_versions(id),
  from_state VARCHAR(50),
  to_state VARCHAR(50),
  transitioned_by_user_id UUID,
  reason TEXT,
  transitioned_at TIMESTAMPTZ
);
```

Combined with review notes, this provides a complete history of:

- Who made each transition
- When it occurred
- Why (rejection reasons, approval notes)

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHOR                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Create LO → Edit DRAFT → Submit for Review                         │
│                                ↓                                     │
│                     [QA Checks Run Automatically]                    │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        REVIEWER                                      │
├─────────────────────────────────────────────────────────────────────┤
│  View IN_REVIEW → See QA Results → Add Notes                        │
│        ↓                                                             │
│  ┌─────────────┐       ┌─────────────┐                              │
│  │   APPROVE   │       │   REJECT    │                              │
│  │ (optional   │       │ (required   │                              │
│  │   note)     │       │   reason)   │                              │
│  └──────┬──────┘       └──────┬──────┘                              │
│         ↓                     ↓                                      │
│      APPROVED              DRAFT (author fixes)                      │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       PUBLISHER                                      │
├─────────────────────────────────────────────────────────────────────┤
│  View APPROVED → Publish                                             │
│        ↓                                                             │
│    PUBLISHED (previous version auto-retired)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Best Practices

### For Authors

1. Run QA checks before submitting (use on-demand endpoint)
2. Fix all FAILED checks before submission
3. Address WARNINGs when practical
4. Include meaningful change summaries

### For Reviewers

1. Review QA check results first
2. Add FEEDBACK notes for specific improvements
3. Provide clear rejection reasons
4. Use GENERAL notes for context

### For Content Admins

1. Monitor QA failure patterns
2. Update banned phrase lists as needed
3. Review audit trails periodically
