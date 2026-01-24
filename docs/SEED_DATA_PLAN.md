# AIVO Platform - Comprehensive Seed Data Plan

## Overview

This document outlines the seed data strategy for creating realistic test accounts for local development and testing. The seed data simulates a complete educational environment with:

- **1 District**: Anoka-Hennepin School District
- **6 Families**: Hanson, Ofem, Oluwole, Kotz, Anderson, Hughes
- **6 Learners**: 2 low functioning, 2 medium functioning, 2 high functioning
- **6 Parent Accounts**: One per family
- **Teachers**: Multiple teachers across grades
- **Completed Parent Assessments**: Pre-baseline assessments for each learner
- **IEPs**: Individualized Education Programs for each learner

---

## 1. District Account

### Anoka-Hennepin School District

| Field  | Value                                  |
| ------ | -------------------------------------- |
| ID     | `00000000-0000-0000-0000-100000000001` |
| Name   | Anoka-Hennepin School District         |
| Slug   | `anoka-hennepin`                       |
| Domain | `anoka.k12.mn.us`                      |
| Region | Minnesota                              |
| Type   | `DISTRICT`                             |
| Status | `ACTIVE`                               |

**Schools in District:**

1. Champlin Park High School (Grades 9-12)
2. Anoka Middle School (Grades 6-8)
3. Lincoln Elementary (Grades K-5)

---

## 2. Teacher Accounts

| ID            | Name             | Email                         | Role                        | School              | Grades |
| ------------- | ---------------- | ----------------------------- | --------------------------- | ------------------- | ------ |
| `teacher_001` | Sarah Martinez   | sarah.martinez@ahschools.us   | Special Education           | Lincoln Elementary  | K-2    |
| `teacher_002` | Michael Chen     | michael.chen@ahschools.us     | Special Education           | Lincoln Elementary  | 3-5    |
| `teacher_003` | Jessica Thompson | jessica.thompson@ahschools.us | Special Education           | Anoka Middle School | 6-8    |
| `teacher_004` | David Washington | david.washington@ahschools.us | General Education           | Lincoln Elementary  | 3rd    |
| `teacher_005` | Emily Rodriguez  | emily.rodriguez@ahschools.us  | Speech-Language Pathologist | District-wide       | All    |
| `teacher_006` | James O'Brien    | james.obrien@ahschools.us     | Occupational Therapist      | District-wide       | All    |

---

## 3. Family & Learner Accounts

### Family 1: Hanson (LOW FUNCTIONING - Profound Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_hanson_001` |
| Name | Karen Hanson |
| Email | karen.hanson@email.com |
| Phone | (763) 555-0101 |
| Language | English |
| Relationship | Mother |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_hanson_001` |
| Name | Emma Hanson |
| Grade | 2nd Grade |
| Age | 8 years old |
| DOB | 2018-03-15 |
| School | Lincoln Elementary |
| Functioning Level | `PROFOUND` |
| Assessment Type | `ALTERNATE` |
| Primary Disability | Intellectual Disability |
| Secondary Disabilities | Autism Spectrum Disorder |

**IEP Summary:**

- **Present Level**: Emma communicates using a picture exchange system (PECS) and requires constant physical assistance for all daily activities. She responds to familiar voices and enjoys cause-and-effect toys.
- **Assessment Mode**: Performance-based, caregiver-assisted, 2-3 options, functional skills focus
- **Communication**: AAC device (PECS), requires partner-assisted input
- **Services**: Speech therapy 3x/week, OT 2x/week, 1:1 paraprofessional support

---

### Family 2: Ofem (HIGH FUNCTIONING - Mild Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_ofem_001` |
| Name | Adaeze Ofem |
| Email | adaeze.ofem@email.com |
| Phone | (763) 555-0102 |
| Language | English |
| Relationship | Mother |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_ofem_001` |
| Name | Jayden Ofem |
| Grade | 6th Grade |
| Age | 12 years old |
| DOB | 2014-07-22 |
| School | Coon Rapids Middle School |
| Functioning Level | `MILD` |
| Assessment Type | `STANDARD_WITH_ACCOMMODATIONS` |
| Primary Disability | Autism Spectrum Disorder (Level 1) |
| Secondary Disabilities | ADHD |

**IEP Summary:**

- **Present Level**: Jayden is academically capable and performs at grade level in most subjects. He is creative and excels in art and music. He struggles with social interactions, reading social cues, and transitions between activities.
- **Assessment Mode**: Standard assessment with extended time (1.5x), visual supports, advance notice of transitions
- **Communication**: Verbal, prefers structured routines and clear expectations
- **Services**: Counseling 1x/week, Social skills group 2x/week

---

### Family 3: Oluwole (MEDIUM FUNCTIONING - Moderate Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_oluwole_001` |
| Name | Funke Oluwole |
| Email | funke.oluwole@email.com |
| Phone | (763) 555-0103 |
| Language | English |
| Relationship | Mother |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_oluwole_001` |
| Name | Adebayo Oluwole |
| Grade | 3rd Grade |
| Age | 9 years old |
| DOB | 2017-01-08 |
| School | Lincoln Elementary |
| Functioning Level | `MODERATE` |
| Assessment Type | `MODIFIED` |
| Primary Disability | Autism Spectrum Disorder (Level 2) |
| Secondary Disabilities | ADHD |

**IEP Summary:**

- **Present Level**: Adebayo reads at a 1st-grade level and can perform basic addition with manipulatives. He struggles with transitions and benefits from visual schedules. He can communicate verbally but prefers short, predictable interactions.
- **Assessment Mode**: Simplified language, visual supports, 3 answer options, shorter sessions with breaks
- **Communication**: Verbal with visual supports, benefits from wait time
- **Services**: Speech therapy 2x/week, Counseling 1x/week, Social skills group 2x/week

---

### Family 4: Kotz (MEDIUM FUNCTIONING - Moderate Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_kotz_001` |
| Name | Jennifer Kotz |
| Email | jennifer.kotz@email.com |
| Phone | (763) 555-0104 |
| Language | English |
| Relationship | Mother |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_kotz_001` |
| Name | Tyler Kotz |
| Grade | 7th Grade |
| Age | 13 years old |
| DOB | 2013-09-30 |
| School | Anoka Middle School |
| Functioning Level | `MODERATE` |
| Assessment Type | `MODIFIED` |
| Primary Disability | Specific Learning Disability |
| Secondary Disabilities | Anxiety Disorder, Dyslexia |

**IEP Summary:**

- **Present Level**: Tyler reads at a 4th-grade level and struggles with reading comprehension. Math skills are near grade level. He experiences significant test anxiety and requires extended time and a quiet setting.
- **Assessment Mode**: Extended time, text-to-speech, simplified navigation, frequent breaks
- **Communication**: Verbal, prefers written instructions, needs processing time
- **Services**: Reading intervention 5x/week, Counseling 1x/week, Study skills support

---

### Family 5: Anderson (HIGH FUNCTIONING - Mild Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_anderson_001` |
| Name | Robert Anderson |
| Email | robert.anderson@email.com |
| Phone | (763) 555-0105 |
| Language | English |
| Relationship | Father |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_anderson_001` |
| Name | Sophie Anderson |
| Grade | 4th Grade |
| Age | 10 years old |
| DOB | 2016-05-12 |
| School | Lincoln Elementary |
| Functioning Level | `MILD` |
| Assessment Type | `STANDARD_WITH_ACCOMMODATIONS` |
| Primary Disability | ADHD |
| Secondary Disabilities | None |

**IEP Summary:**

- **Present Level**: Sophie is academically capable but struggles with organization, focus, and completing tasks. She performs at grade level when given extended time and movement breaks.
- **Assessment Mode**: Standard assessment with extended time (1.5x), breaks allowed, preferential seating
- **Communication**: Verbal, benefits from chunked instructions
- **Services**: Executive function coaching 1x/week, Check-in/check-out behavior support

---

### Family 6: Hughes (HIGH FUNCTIONING - Mild Support Needs)

**Parent:**
| Field | Value |
|-------|-------|
| ID | `parent_hughes_001` |
| Name | Michelle Hughes |
| Email | michelle.hughes@email.com |
| Phone | (763) 555-0106 |
| Language | English |
| Relationship | Mother |

**Learner:**
| Field | Value |
|-------|-------|
| ID | `learner_hughes_001` |
| Name | Ethan Hughes |
| Grade | 6th Grade |
| Age | 12 years old |
| DOB | 2014-11-28 |
| School | Anoka Middle School |
| Functioning Level | `MILD` |
| Assessment Type | `STANDARD_WITH_ACCOMMODATIONS` |
| Primary Disability | Autism Spectrum Disorder (Level 1) |
| Secondary Disabilities | Sensory Processing Disorder |

**IEP Summary:**

- **Present Level**: Ethan is academically gifted (especially in math and science) but struggles with social interactions, sensory overload, and flexible thinking. He prefers routine and predictability.
- **Assessment Mode**: Standard assessment with noise-canceling headphones, reduced visual clutter, predictable format
- **Communication**: Verbal, prefers direct communication, dislikes ambiguity
- **Services**: Social skills group 2x/week, Sensory breaks as needed, Counseling 1x/week

---

## 4. Parent Assessment Data (Pre-Baseline)

Each parent has completed the parent assessment questionnaire. Below is the structure:

### Assessment Response Schema

```typescript
interface ParentAssessmentResponse {
  // Demographics
  childAge: number;
  childGrade: string;

  // IDEA Disability Categories
  hasExistingIep: boolean;
  hasExisting504: boolean;
  disabilityCategories: string[];

  // Communication
  primaryCommunicationMethod:
    | 'verbal'
    | 'sign_language'
    | 'aac_device'
    | 'picture_symbols'
    | 'gestures'
    | 'combination';
  understandsSpokenLanguage: 'fully' | 'partially' | 'minimally' | 'not_at_all';
  canFollowInstructions: 'multi_step' | 'two_step' | 'one_step' | 'needs_physical_prompts';

  // Cognitive/Adaptive Skills
  canRecognizeLetters: boolean;
  canRecognizeNumbers: boolean;
  canMatchPictures: boolean;
  understandsCauseEffect: boolean;
  canSequenceEvents: boolean;

  // Daily Living Skills (0-5 scale)
  selfCareLevel: number;
  communicationLevel: number;
  socialSkillsLevel: number;

  // Support Needs
  needsConstantSupervision: boolean;
  needsPhysicalPrompting: boolean;
  needsVerbalPrompting: boolean;

  // Sensory Profile
  hasSensoryIssues: boolean;
  noiseSensitivity: 'low' | 'medium' | 'high';
  lightSensitivity: 'low' | 'medium' | 'high';

  // Strengths & Challenges
  strengths: string;
  challenges: string;
  learningStyleNotes: string;
}
```

### Sample Parent Assessment Data by Family

#### Hanson (Emma - Profound)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["intellectual_disability", "autism"],
  "primaryCommunicationMethod": "picture_symbols",
  "understandsSpokenLanguage": "minimally",
  "canFollowInstructions": "needs_physical_prompts",
  "canRecognizeLetters": false,
  "canRecognizeNumbers": false,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": false,
  "selfCareLevel": 1,
  "communicationLevel": 1,
  "socialSkillsLevel": 1,
  "needsConstantSupervision": true,
  "needsPhysicalPrompting": true,
  "needsVerbalPrompting": true,
  "hasSensoryIssues": true,
  "noiseSensitivity": "high",
  "lightSensitivity": "medium",
  "strengths": "Emma loves music and responds well to singing. She recognizes familiar faces and enjoys sensory play.",
  "challenges": "Emma needs full physical assistance and cannot be left unsupervised.",
  "assessmentType": "ALTERNATE",
  "supportLevel": 95
}
```

#### Ofem (Jayden - Mild)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["autism", "other_health_impairment"],
  "primaryCommunicationMethod": "verbal",
  "understandsSpokenLanguage": "fully",
  "canFollowInstructions": "multi_step",
  "canRecognizeLetters": true,
  "canRecognizeNumbers": true,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": true,
  "selfCareLevel": 5,
  "communicationLevel": 4,
  "socialSkillsLevel": 3,
  "needsConstantSupervision": false,
  "needsPhysicalPrompting": false,
  "needsVerbalPrompting": false,
  "hasSensoryIssues": false,
  "noiseSensitivity": "medium",
  "lightSensitivity": "low",
  "strengths": "Jayden is very creative and excels in art and music. He has a great memory for details and facts.",
  "challenges": "Jayden struggles with social interactions and reading social cues. Transitions can be difficult.",
  "assessmentType": "STANDARD_WITH_ACCOMMODATIONS",
  "supportLevel": 28
}
```

#### Oluwole (Adebayo - Moderate)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["autism", "other_health_impairment"],
  "primaryCommunicationMethod": "verbal",
  "understandsSpokenLanguage": "fully",
  "canFollowInstructions": "two_step",
  "canRecognizeLetters": true,
  "canRecognizeNumbers": true,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": true,
  "selfCareLevel": 3,
  "communicationLevel": 3,
  "socialSkillsLevel": 2,
  "needsConstantSupervision": false,
  "needsPhysicalPrompting": false,
  "needsVerbalPrompting": true,
  "hasSensoryIssues": true,
  "noiseSensitivity": "high",
  "lightSensitivity": "low",
  "strengths": "Adebayo has strong visual memory and loves patterns. He is motivated by dinosaurs and space.",
  "challenges": "Transitions are very difficult. He needs advance warning and visual schedules.",
  "assessmentType": "MODIFIED",
  "supportLevel": 60
}
```

#### Kotz (Tyler - Moderate)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["specific_learning_disability"],
  "primaryCommunicationMethod": "verbal",
  "understandsSpokenLanguage": "fully",
  "canFollowInstructions": "multi_step",
  "canRecognizeLetters": true,
  "canRecognizeNumbers": true,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": true,
  "selfCareLevel": 5,
  "communicationLevel": 4,
  "socialSkillsLevel": 4,
  "needsConstantSupervision": false,
  "needsPhysicalPrompting": false,
  "needsVerbalPrompting": false,
  "hasSensoryIssues": false,
  "noiseSensitivity": "low",
  "lightSensitivity": "low",
  "strengths": "Tyler is creative and great at problem-solving. He excels at hands-on projects and math.",
  "challenges": "Reading is very frustrating for him. He has significant test anxiety.",
  "assessmentType": "MODIFIED",
  "supportLevel": 45
}
```

#### Anderson (Sophie - Mild)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["other_health_impairment"],
  "primaryCommunicationMethod": "verbal",
  "understandsSpokenLanguage": "fully",
  "canFollowInstructions": "multi_step",
  "canRecognizeLetters": true,
  "canRecognizeNumbers": true,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": true,
  "selfCareLevel": 5,
  "communicationLevel": 5,
  "socialSkillsLevel": 4,
  "needsConstantSupervision": false,
  "needsPhysicalPrompting": false,
  "needsVerbalPrompting": false,
  "hasSensoryIssues": false,
  "noiseSensitivity": "medium",
  "lightSensitivity": "low",
  "strengths": "Sophie is very bright and creative. She loves art and reading when she can focus.",
  "challenges": "She loses things constantly and has trouble finishing work without reminders.",
  "assessmentType": "STANDARD_WITH_ACCOMMODATIONS",
  "supportLevel": 25
}
```

#### Hughes (Ethan - Mild)

```json
{
  "hasExistingIep": true,
  "hasExisting504": false,
  "disabilityCategories": ["autism"],
  "primaryCommunicationMethod": "verbal",
  "understandsSpokenLanguage": "fully",
  "canFollowInstructions": "multi_step",
  "canRecognizeLetters": true,
  "canRecognizeNumbers": true,
  "canMatchPictures": true,
  "understandsCauseEffect": true,
  "canSequenceEvents": true,
  "selfCareLevel": 5,
  "communicationLevel": 4,
  "socialSkillsLevel": 3,
  "needsConstantSupervision": false,
  "needsPhysicalPrompting": false,
  "needsVerbalPrompting": false,
  "hasSensoryIssues": true,
  "noiseSensitivity": "high",
  "lightSensitivity": "medium",
  "strengths": "Ethan is extremely intelligent, especially in STEM subjects. He has an incredible memory for facts.",
  "challenges": "He struggles with unexpected changes and social nuances. Noisy environments are overwhelming.",
  "assessmentType": "STANDARD_WITH_ACCOMMODATIONS",
  "supportLevel": 30
}
```

---

## 5. IEP Data Structure

### IEP Goals by Learner

#### Emma Hanson (Profound)

| Goal # | Domain            | Description                                           | Baseline                       | Target                                 |
| ------ | ----------------- | ----------------------------------------------------- | ------------------------------ | -------------------------------------- |
| 1      | Communication     | Emma will use PECS to request preferred items         | Inconsistent eye gaze          | 10 independent requests per day        |
| 2      | Adaptive Behavior | Emma will participate in hand washing routine         | Requires full physical prompts | Partial participation with verbal cues |
| 3      | Social-Emotional  | Emma will engage with peer during structured activity | Isolated play                  | 5 min joint attention 3x/week          |

#### Jayden Ofem (Mild)

| Goal # | Domain            | Description                                                | Baseline                | Target                  |
| ------ | ----------------- | ---------------------------------------------------------- | ----------------------- | ----------------------- |
| 1      | Social-Emotional  | Jayden will identify and respond to social cues            | 35% accuracy            | 75% accuracy            |
| 2      | Communication     | Jayden will maintain conversation for 4 exchanges          | 1-2 exchanges           | 4 exchanges 80% of time |
| 3      | Adaptive Behavior | Jayden will independently transition using visual schedule | Requires verbal prompts | Independent 90% of time |

#### Adebayo Oluwole (Moderate)

| Goal # | Domain           | Description                                                   | Baseline           | Target                        |
| ------ | ---------------- | ------------------------------------------------------------- | ------------------ | ----------------------------- |
| 1      | Reading          | Adebayo will read 1st grade passages with comprehension       | Pre-primer level   | 1st grade, 70% comprehension  |
| 2      | Math             | Adebayo will add single-digit numbers without manipulatives   | Uses manipulatives | Mental math 80% accuracy      |
| 3      | Social-Emotional | Adebayo will transition between activities with 2 min warning | Meltdowns daily    | Successful transitions 4 of 5 |
| 4      | Communication    | Adebayo will initiate peer interaction                        | 0 initiations      | 2 per day                     |

#### Tyler Kotz (Moderate)

| Goal # | Domain           | Description                                       | Baseline            | Target                         |
| ------ | ---------------- | ------------------------------------------------- | ------------------- | ------------------------------ |
| 1      | Reading          | Tyler will decode multisyllabic words             | 40% accuracy        | 80% accuracy                   |
| 2      | Reading          | Tyler will answer comprehension questions         | 50% accuracy        | 75% accuracy                   |
| 3      | Writing          | Tyler will compose a 5-paragraph essay            | 2 paragraphs        | 5 paragraphs with organization |
| 4      | Social-Emotional | Tyler will use coping strategies for test anxiety | Avoidance behaviors | Self-advocacy 80% of tests     |

#### Sophie Anderson (Mild)

| Goal # | Domain            | Description                                         | Baseline       | Target                      |
| ------ | ----------------- | --------------------------------------------------- | -------------- | --------------------------- |
| 1      | Adaptive Behavior | Sophie will use a checklist to track assignments    | 0% use         | Independent use 80% of days |
| 2      | Adaptive Behavior | Sophie will complete classwork within allotted time | 30% completion | 75% completion              |
| 3      | Social-Emotional  | Sophie will self-monitor attention using timer      | 0 self-checks  | 5 self-checks per class     |

#### Ethan Hughes (Mild)

| Goal # | Domain            | Description                                        | Baseline      | Target                               |
| ------ | ----------------- | -------------------------------------------------- | ------------- | ------------------------------------ |
| 1      | Social-Emotional  | Ethan will identify emotions in social situations  | 40% accuracy  | 80% accuracy                         |
| 2      | Social-Emotional  | Ethan will use calming strategies when overwhelmed | 1 of 10 times | 8 of 10 times                        |
| 3      | Communication     | Ethan will engage in reciprocal conversation       | 2 exchanges   | 5 exchanges                          |
| 4      | Adaptive Behavior | Ethan will cope with schedule changes              | Meltdowns     | Verbal protest only, recovery <5 min |

---

## 6. Accommodations Matrix

| Learner         | Extended Time | Text-to-Speech | Visual Supports  | Breaks         | Reduced Options | 1:1 Support | Sensory         |
| --------------- | ------------- | -------------- | ---------------- | -------------- | --------------- | ----------- | --------------- |
| Emma Hanson     | N/A           | Yes            | Yes              | Continuous     | 2 options       | Yes         | Quiet room      |
| Jayden Ofem     | 1.5x          | No             | Yes              | As needed      | Standard        | No          | None            |
| Adebayo Oluwole | 2x            | Yes            | Yes              | Every 10 min   | 3 options       | No          | Noise-canceling |
| Tyler Kotz      | 1.5x          | Yes            | No               | As needed      | Standard        | No          | Quiet setting   |
| Sophie Anderson | 1.5x          | No             | Yes (checklists) | As needed      | Standard        | No          | None            |
| Ethan Hughes    | Standard      | No             | Yes              | Sensory breaks | Standard        | No          | Noise-canceling |

---

## 7. Services Matrix

| Learner         | Speech  | OT      | PT      | Counseling | Social Skills | Other                               |
| --------------- | ------- | ------- | ------- | ---------- | ------------- | ----------------------------------- |
| Emma Hanson     | 3x/week | 2x/week | 1x/week | -          | -             | 1:1 Para all day                    |
| Jayden Ofem     | -       | -       | -       | 1x/week    | 2x/week       | -                                   |
| Adebayo Oluwole | 2x/week | -       | -       | 1x/week    | 2x/week       | -                                   |
| Tyler Kotz      | -       | -       | -       | 1x/week    | -             | Reading intervention 5x/week        |
| Sophie Anderson | -       | -       | -       | -          | -             | Executive function coaching 1x/week |
| Ethan Hughes    | -       | -       | -       | 1x/week    | 2x/week       | Sensory breaks PRN                  |

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure Seeds

1. `tenant-svc/prisma/seed.ts` - Add Anoka-Hennepin district
2. `auth-svc/prisma/seed.ts` - Add all user accounts (parents, teachers, learners)

### Phase 2: Profile & IEP Seeds

3. `profile-svc/prisma/seed.ts` - Add learner profiles, functioning profiles, accommodations
4. `iep-svc/prisma/seed.ts` - Add IEPs, goals, services for each learner

### Phase 3: Assessment Seeds

5. `baseline-svc/prisma/seed.ts` - Add parent assessments (completed)
6. `assessment-svc/prisma/seed.ts` - Add assessment configurations

### Phase 4: Parent Service Seeds

7. `parent-svc/prisma/seed.ts` - Add parent accounts, student links, consent records

### Phase 5: Session & Learning Seeds

8. `session-svc/prisma/seed.ts` - Update with new learner IDs
9. `learner-model-svc/prisma/seed.ts` - Add virtual brains for each learner

---

## 9. Fixed UUIDs Reference

### Tenant IDs

| Entity                  | UUID                                   |
| ----------------------- | -------------------------------------- |
| Anoka-Hennepin District | `00000000-0000-0000-0000-100000000001` |
| Lincoln Elementary      | `00000000-0000-0000-0001-100000000001` |
| Anoka Middle School     | `00000000-0000-0000-0001-100000000002` |
| Champlin Park High      | `00000000-0000-0000-0001-100000000003` |

### Parent IDs

| Family          | UUID                                   |
| --------------- | -------------------------------------- |
| Karen Hanson    | `00000000-0000-0000-3000-000000000001` |
| Adaeze Ofem     | `00000000-0000-0000-3000-000000000002` |
| Funke Oluwole   | `00000000-0000-0000-3000-000000000003` |
| Jennifer Kotz   | `00000000-0000-0000-3000-000000000004` |
| Robert Anderson | `00000000-0000-0000-3000-000000000005` |
| Michelle Hughes | `00000000-0000-0000-3000-000000000006` |

### Learner IDs

| Learner         | UUID                                   | Functioning |
| --------------- | -------------------------------------- | ----------- |
| Emma Hanson     | `00000000-0000-0000-2000-000000000101` | Profound    |
| Jayden Ofem     | `00000000-0000-0000-2000-000000000102` | Mild        |
| Adebayo Oluwole | `00000000-0000-0000-2000-000000000103` | Moderate    |
| Tyler Kotz      | `00000000-0000-0000-2000-000000000104` | Moderate    |
| Sophie Anderson | `00000000-0000-0000-2000-000000000105` | Mild        |
| Ethan Hughes    | `00000000-0000-0000-2000-000000000106` | Mild        |

### Teacher IDs

| Teacher          | UUID                                   |
| ---------------- | -------------------------------------- |
| Sarah Martinez   | `00000000-0000-0000-4000-000000000001` |
| Michael Chen     | `00000000-0000-0000-4000-000000000002` |
| Jessica Thompson | `00000000-0000-0000-4000-000000000003` |
| David Washington | `00000000-0000-0000-4000-000000000004` |
| Emily Rodriguez  | `00000000-0000-0000-4000-000000000005` |
| James O'Brien    | `00000000-0000-0000-4000-000000000006` |

### IEP IDs

| Learner         | IEP UUID                               |
| --------------- | -------------------------------------- |
| Emma Hanson     | `00000000-0000-0000-5000-000000000001` |
| Jayden Ofem     | `00000000-0000-0000-5000-000000000002` |
| Adebayo Oluwole | `00000000-0000-0000-5000-000000000003` |
| Tyler Kotz      | `00000000-0000-0000-5000-000000000004` |
| Sophie Anderson | `00000000-0000-0000-5000-000000000005` |
| Ethan Hughes    | `00000000-0000-0000-5000-000000000006` |

---

## 10. Test Credentials

All accounts use the following password for testing:

- **Password**: `AivoTest2024!`
- **Password Hash**: (will be generated at seed time)

### Quick Login Reference

| Role              | Email                       | Password      |
| ----------------- | --------------------------- | ------------- |
| Parent (Hanson)   | karen.hanson@email.com      | AivoTest2024! |
| Parent (Ofem)     | adaeze.ofem@email.com       | AivoTest2024! |
| Parent (Oluwole)  | funke.oluwole@email.com     | AivoTest2024! |
| Parent (Kotz)     | jennifer.kotz@email.com     | AivoTest2024! |
| Parent (Anderson) | robert.anderson@email.com   | AivoTest2024! |
| Parent (Hughes)   | michelle.hughes@email.com   | AivoTest2024! |
| Teacher           | sarah.martinez@ahschools.us | AivoTest2024! |
| District Admin    | admin@ahschools.us          | AivoTest2024! |

---

## 11. Running the Seeds

```bash
# Run all seeds
pnpm seed:all

# Run individual service seeds
pnpm --filter @aivo/tenant-svc prisma:seed
pnpm --filter @aivo/auth-svc prisma:seed
pnpm --filter @aivo/profile-svc prisma:seed
pnpm --filter @aivo/iep-svc prisma:seed
pnpm --filter @aivo/baseline-svc prisma:seed
pnpm --filter @aivo/parent-svc prisma:seed
pnpm --filter @aivo/session-svc prisma:seed
```

---

## 12. Verification Queries

```sql
-- Verify parents created
SELECT id, email, given_name, family_name FROM parents;

-- Verify learners with functioning levels
SELECT p.id, p.given_name, p.family_name, f.functioning_level, f.assessment_type
FROM profiles p
JOIN learner_functioning_profiles f ON p.id = f.learner_id;

-- Verify IEPs with goal counts
SELECT s.first_name, s.last_name, i.status, COUNT(g.id) as goal_count
FROM students s
JOIN ieps i ON s.id = i.student_id
LEFT JOIN iep_goals g ON i.id = g.iep_id
GROUP BY s.id, i.id;

-- Verify parent-student links
SELECT p.email, pr.given_name as student_name, l.relationship, l.status
FROM parents p
JOIN parent_student_links l ON p.id = l.parent_id
JOIN profiles pr ON l.student_id = pr.id;
```

---

## Next Steps

1. Create seed files for each service based on this plan
2. Implement password hashing utility for test accounts
3. Add seed command to root package.json
4. Create integration test suite using seed data
5. Document API endpoints for each family scenario
