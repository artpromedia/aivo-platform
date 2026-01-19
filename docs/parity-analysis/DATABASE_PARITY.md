# Database Schema Parity Analysis

## Executive Summary

**Analysis Date:** January 19, 2026

This document compares the database schemas between the legacy (Supabase) and current (PostgreSQL + Prisma) implementations.

### Architecture Overview

| Aspect | Legacy | Current |
|--------|--------|---------|
| **Database** | Supabase (PostgreSQL 15) | PostgreSQL 16 |
| **ORM** | SQLAlchemy 2.0 | Prisma (TS) + SQLAlchemy (Python) |
| **Migrations** | Alembic | Prisma Migrate |
| **Schema Management** | Single schema | Multi-service schemas |
| **Real-time** | Supabase Realtime | NATS + Custom |

---

## Legacy Schema (Supabase)

### Core Tables

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  grade_level VARCHAR(20),
  date_of_birth DATE,
  brain_state JSONB,
  sensory_profile JSONB,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment Tables
CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress',
  current_domain VARCHAR(50),
  questions JSONB,
  responses JSONB,
  results JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES assessment_sessions(id),
  learner_id UUID REFERENCES learners(id),
  domain VARCHAR(50),
  score DECIMAL(5,2),
  proficiency_level VARCHAR(50),
  irt_ability DECIMAL(5,3),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Brain Tables
CREATE TABLE learner_brain_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id) UNIQUE,
  model_state JSONB NOT NULL,
  model_version VARCHAR(50),
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus and Engagement
CREATE TABLE focus_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  session_id UUID,
  state VARCHAR(50),
  engagement_score DECIMAL(3,2),
  break_suggested BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  game_type VARCHAR(50),
  score INTEGER,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework
CREATE TABLE homework_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  subject VARCHAR(50),
  ocr_text TEXT,
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE homework_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  upload_id UUID REFERENCES homework_uploads(id),
  current_step VARCHAR(50),
  step_data JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IEP Tables
CREATE TABLE iep_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL,
  teacher_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE iep_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iep_id UUID REFERENCES iep_documents(id),
  domain VARCHAR(100),
  goal_text TEXT NOT NULL,
  baseline TEXT,
  target TEXT,
  measurement_method TEXT,
  progress_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Tracking
CREATE TABLE progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  subject VARCHAR(50),
  skill VARCHAR(100),
  mastery_level DECIMAL(3,2),
  attempts INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensory and Regulation
CREATE TABLE sensory_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id) UNIQUE,
  visual JSONB,
  auditory JSONB,
  motor JSONB,
  cognitive JSONB,
  accommodations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emotion_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id),
  emotion VARCHAR(50),
  intensity INTEGER,
  context VARCHAR(100),
  intervention_suggested VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent/Teacher Communication
CREATE TABLE parent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  subject VARCHAR(255),
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curriculum
CREATE TABLE curriculum_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject VARCHAR(50),
  grade_level VARCHAR(20),
  standard_code VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Total Tables: 16+ core tables

---

## Current Schema (Prisma + PostgreSQL)

### Schema Distribution by Service

The current architecture uses distributed schemas managed by Prisma in individual services:

#### auth-svc Schema
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String
  role        Role
  mfaEnabled  Boolean  @default(false)
  mfaSecret   String?
  lastLogin   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessions    Session[]
  profile     Profile?
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

enum Role {
  LEARNER
  PARENT
  TEACHER
  SCHOOL_ADMIN
  DISTRICT_ADMIN
  PLATFORM_ADMIN
  SUPER_ADMIN
}
```

#### profile-svc Schema
```prisma
model Profile {
  id           String   @id @default(uuid())
  userId       String   @unique
  firstName    String
  lastName     String
  avatar       String?
  phone        String?
  timezone     String   @default("UTC")
  locale       String   @default("en")
  preferences  Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Learner {
  id             String    @id @default(uuid())
  userId         String    @unique
  name           String
  gradeLevel     String?
  dateOfBirth    DateTime?
  parentId       String?
  schoolId       String?
  classroomId    String?
  brainState     Json?
  sensoryProfile Json?
  preferences    Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

#### baseline-svc Schema
```prisma
model BaselineSession {
  id            String   @id @default(uuid())
  learnerId     String
  status        SessionStatus
  currentDomain String?
  domains       Json     // array of domain configs
  responses     Json     // array of responses
  results       Json?
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  items BaselineItem[]
}

model BaselineItem {
  id          String   @id @default(uuid())
  sessionId   String
  domain      String
  itemId      String
  difficulty  Float
  response    Json?
  correct     Boolean?
  responseTime Int?
  createdAt   DateTime @default(now())

  session BaselineSession @relation(fields: [sessionId], references: [id])
}

enum SessionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ABANDONED
}
```

#### learner-model-svc Schema
```prisma
model LearnerModel {
  id            String   @id @default(uuid())
  learnerId     String   @unique
  modelVersion  String
  modelState    Json
  abilities     Json     // skill abilities
  preferences   Json     // learning preferences
  lastTrainedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model ModelTrainingJob {
  id          String    @id @default(uuid())
  learnerId   String
  status      JobStatus
  modelType   String
  inputData   Json
  outputModel Json?
  error       String?
  startedAt   DateTime  @default(now())
  completedAt DateTime?
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

#### focus-svc Schema
```prisma
model FocusSession {
  id            String   @id @default(uuid())
  learnerId     String
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  totalDuration Int?

  events FocusEvent[]
  breaks BreakSession[]
}

model FocusEvent {
  id              String   @id @default(uuid())
  sessionId       String
  eventType       String
  engagementScore Float?
  attentionLevel  String?
  timestamp       DateTime @default(now())

  session FocusSession @relation(fields: [sessionId], references: [id])
}

model BreakSession {
  id         String   @id @default(uuid())
  sessionId  String
  gameType   String?
  duration   Int
  score      Int?
  completed  Boolean  @default(false)
  startedAt  DateTime @default(now())
  endedAt    DateTime?

  session FocusSession @relation(fields: [sessionId], references: [id])
}

model SensoryProfile {
  id             String   @id @default(uuid())
  learnerId      String   @unique
  visual         Json
  auditory       Json
  motor          Json
  cognitive      Json
  accommodations Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

#### homework-helper-svc Schema
```prisma
model HomeworkUpload {
  id         String   @id @default(uuid())
  learnerId  String
  fileUrl    String
  fileType   String
  subject    String?
  ocrText    String?
  analysis   Json?
  createdAt  DateTime @default(now())

  sessions HomeworkSession[]
}

model HomeworkSession {
  id          String   @id @default(uuid())
  learnerId   String
  uploadId    String?
  currentStep String   @default("understand")
  stepData    Json?
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  upload HomeworkUpload? @relation(fields: [uploadId], references: [id])
}
```

#### gamification-svc Schema
```prisma
model LearnerStats {
  id              String   @id @default(uuid())
  learnerId       String   @unique
  totalXp         Int      @default(0)
  level           Int      @default(1)
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastActivityAt  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  achievements Achievement[]
}

model Achievement {
  id          String   @id @default(uuid())
  statsId     String
  type        String
  name        String
  description String?
  earnedAt    DateTime @default(now())

  stats LearnerStats @relation(fields: [statsId], references: [id])
}
```

#### sel-svc Schema
```prisma
model EmotionCheckin {
  id          String   @id @default(uuid())
  learnerId   String
  emotion     String
  intensity   Int
  context     String?
  triggers    Json?
  intervention String?
  createdAt   DateTime @default(now())
}

model RegulationActivity {
  id          String   @id @default(uuid())
  learnerId   String
  activityType String
  duration    Int?
  effectiveness Int?
  notes       String?
  createdAt   DateTime @default(now())
}
```

#### iep-svc Schema
```prisma
model IepDocument {
  id            String   @id @default(uuid())
  studentId     String
  teacherId     String?
  status        IepStatus
  effectiveDate DateTime?
  reviewDate    DateTime?
  content       Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  goals IepGoal[]
  services IepService[]
}

model IepGoal {
  id                String   @id @default(uuid())
  iepId             String
  domain            String
  goalText          String
  baseline          String?
  target            String?
  measurementMethod String?
  progressData      Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  iep IepDocument @relation(fields: [iepId], references: [id])
}

model IepService {
  id          String   @id @default(uuid())
  iepId       String
  serviceType String
  frequency   String
  duration    String
  provider    String?
  notes       String?

  iep IepDocument @relation(fields: [iepId], references: [id])
}

enum IepStatus {
  DRAFT
  ACTIVE
  REVIEW
  ARCHIVED
}
```

#### billing-svc Schema
```prisma
model Subscription {
  id            String   @id @default(uuid())
  tenantId      String
  planId        String
  status        SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  canceledAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  invoices Invoice[]
}

model Invoice {
  id             String   @id @default(uuid())
  subscriptionId String
  amount         Decimal
  currency       String   @default("USD")
  status         InvoiceStatus
  dueDate        DateTime
  paidAt         DateTime?
  createdAt      DateTime @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id])
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  VOID
}
```

#### audit-svc Schema
```prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  tenantId     String?
  action       String
  resourceType String?
  resourceId   String?
  changes      Json?
  ipAddress    String?
  userAgent    String?
  timestamp    DateTime @default(now())

  @@index([userId])
  @@index([tenantId])
  @@index([action])
  @@index([timestamp])
}
```

#### consent-svc Schema (New)
```prisma
model Consent {
  id          String   @id @default(uuid())
  userId      String
  tenantId    String?
  purposeCode String
  status      ConsentStatus
  version     String
  grantedAt   DateTime?
  revokedAt   DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, purposeCode])
}

model ConsentPurpose {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String
  required    Boolean  @default(false)
  category    String   // marketing, analytics, essential
  createdAt   DateTime @default(now())
}

enum ConsentStatus {
  PENDING
  GRANTED
  REVOKED
  EXPIRED
}
```

#### dsr-svc Schema (New - GDPR)
```prisma
model DsrRequest {
  id          String   @id @default(uuid())
  userId      String
  requestType DsrType
  status      DsrStatus
  submittedAt DateTime @default(now())
  processedAt DateTime?
  completedAt DateTime?
  data        Json?
  error       String?

  @@index([userId])
  @@index([status])
}

enum DsrType {
  ACCESS
  RECTIFICATION
  ERASURE
  PORTABILITY
  RESTRICTION
}

enum DsrStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  REJECTED
}
```

---

## Schema Mapping: Legacy → Current

| Legacy Table | Current Service | Current Table(s) | Status |
|--------------|-----------------|------------------|--------|
| users | auth-svc | User, Session | ✅ Enhanced |
| learners | profile-svc | Learner | ✅ Complete |
| assessment_sessions | baseline-svc | BaselineSession | ✅ Enhanced |
| assessment_results | baseline-svc | BaselineItem + Results | ✅ Complete |
| learner_brain_states | learner-model-svc | LearnerModel | ✅ Enhanced |
| focus_events | focus-svc | FocusEvent | ✅ Complete |
| game_sessions | focus-svc | BreakSession | ✅ Enhanced |
| homework_uploads | homework-helper-svc | HomeworkUpload | ✅ Complete |
| homework_sessions | homework-helper-svc | HomeworkSession | ✅ Complete |
| iep_documents | iep-svc | IepDocument | ✅ Enhanced |
| iep_goals | iep-svc | IepGoal | ✅ Complete |
| progress_entries | engagement-svc | (distributed) | ✅ Complete |
| sensory_profiles | focus-svc | SensoryProfile | ✅ Complete |
| emotion_checkins | sel-svc | EmotionCheckin | ✅ Complete |
| parent_messages | messaging-svc | Message | ✅ Enhanced |
| curriculum_items | curriculum-svc | (distributed) | ✅ Complete |
| audit_logs | audit-svc | AuditLog | ✅ Enhanced |

---

## New Tables in Current (Not in Legacy)

### Compliance & Privacy

| Table | Service | Purpose |
|-------|---------|---------|
| Consent | consent-svc | GDPR consent tracking |
| ConsentPurpose | consent-svc | Consent categories |
| DsrRequest | dsr-svc | Data subject requests |
| LegalHold | legal-hold-svc | Legal preservation |
| DataResidency | residency-svc | Data location tracking |

### Multi-tenancy

| Table | Service | Purpose |
|-------|---------|---------|
| Tenant | tenant-svc | Tenant management |
| TenantSettings | tenant-svc | Tenant configuration |
| TenantBilling | billing-svc | Per-tenant billing |

### Enhanced Billing

| Table | Service | Purpose |
|-------|---------|---------|
| Subscription | billing-svc | Subscription management |
| Invoice | billing-svc | Invoice tracking |
| PaymentMethod | payments-svc | Payment methods |
| SeatAllocation | billing-svc | License seats |

### Marketplace

| Table | Service | Purpose |
|-------|---------|---------|
| App | marketplace-svc | Marketplace apps |
| AppInstallation | marketplace-svc | Installed apps |

---

## Migration Considerations

### 1. Data Migration Strategy

```sql
-- Example: Migrate learner_brain_states → LearnerModel
INSERT INTO learner_model_svc.learner_models (
  id, learner_id, model_version, model_state,
  abilities, preferences, last_trained_at, created_at
)
SELECT
  id, learner_id, model_version, model_state,
  model_state->'abilities', model_state->'preferences',
  last_trained_at, created_at
FROM legacy.learner_brain_states;
```

### 2. Foreign Key Considerations

Current architecture uses service-to-service communication rather than direct foreign keys:

```
Legacy: learners.user_id → users.id (FK)
Current: Learner stores userId, validates via auth-svc API
```

### 3. Schema Evolution

Legacy schema modifications require Alembic migrations.
Current schema uses Prisma migrations per service:

```bash
# Per-service migration
cd services/baseline-svc
npx prisma migrate dev --name add_new_field
```

---

## Recommendations

### 1. Data Migration Order

1. Users and Auth (auth-svc)
2. Profiles and Learners (profile-svc)
3. Assessment Data (baseline-svc, assessment-svc)
4. Engagement Data (focus-svc, gamification-svc)
5. IEP Data (iep-svc, goal-svc)
6. Historical Events (audit-svc, analytics-svc)

### 2. Backwards Compatibility

During migration, maintain API compatibility:
- Legacy endpoints proxy to new services
- Data sync between schemas
- Gradual cutover by feature

### 3. Index Optimization

Current schema includes enhanced indexes:
```prisma
@@index([userId, timestamp])  // Audit queries
@@index([tenantId, status])   // Multi-tenant queries
@@index([learnerId, domain])  // Learning analytics
```

---

## Document Information

- **Version:** 1.0
- **Created:** January 19, 2026
- **Author:** Claude (Sprint 0 Analysis)
