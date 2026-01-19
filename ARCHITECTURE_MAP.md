# Architecture Mapping: Legacy → Platform

## Overview

This document maps the architecture between the source repository (aivo-agentic-ai-learning-app) and target repository (aivo-platform) to guide the migration process.

---

## Repository Structure Comparison

### Source: aivo-agentic-ai-learning-app (Vite-based)

```
aivo-agentic-ai-learning-app/
├── apps/                           # Applications
│   ├── learner-app/               # Main learner app (Vite + React)
│   │   ├── src/
│   │   │   ├── components/        # UI components
│   │   │   ├── pages/             # Page components
│   │   │   ├── hooks/             # Custom hooks
│   │   │   ├── api/               # API client
│   │   │   ├── services/          # Business logic
│   │   │   ├── types/             # TypeScript types
│   │   │   └── styles/            # CSS/styling
│   │   └── test/                  # Tests
│   ├── teacher-portal/            # Teacher dashboard
│   ├── parent-portal/             # Parent dashboard
│   ├── district-portal/           # District admin
│   ├── admin-portal/              # Platform admin
│   ├── mobile-learner/            # Flutter mobile app
│   ├── web/                       # Vite web wrapper
│   ├── api/                       # API routes
│   ├── api-gateway-backend/       # Python API Gateway
│   └── auth-service-backend/      # Python Auth Service
├── services/                       # Python microservices
│   ├── ai-inference-service/      # AI inference (FastAPI)
│   ├── api-gateway/               # API routing (FastAPI)
│   ├── auth-service/              # Authentication (FastAPI)
│   ├── curriculum-service/        # Curriculum (FastAPI)
│   └── training-service/          # Brain training (FastAPI)
├── packages/                       # Shared packages
│   ├── auth/                      # Auth utilities
│   ├── ui/                        # UI components
│   ├── types/                     # Shared types
│   ├── utils/                     # Utilities
│   ├── config/                    # Build configs
│   ├── tailwind-config/           # Tailwind preset
│   └── typescript-config/         # TS config
└── app/                           # App scripts
    └── scripts/                   # Utility scripts
```

### Target: aivo-platform (Next.js-based)

```
aivo-platform/
├── apps/                           # Applications (9 web, 3 mobile)
│   ├── web-learner/               # Next.js learner app ← Migration target
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   ├── components/        # UI components
│   │   │   └── lib/               # Utilities
│   │   └── public/                # Static assets
│   ├── web-teacher/               # Next.js teacher portal
│   ├── web-parent/                # Next.js parent portal
│   ├── web-district/              # Next.js district portal
│   ├── web-platform-admin/        # Next.js admin portal
│   ├── web-creator/               # Content creator
│   ├── web-author/                # Content authoring
│   ├── web-dev-portal/            # Developer portal
│   ├── web-marketing/             # Marketing site
│   ├── mobile-learner/            # Flutter mobile (existing)
│   ├── mobile-parent/             # Flutter parent app
│   └── mobile-teacher/            # Flutter teacher app
├── services/                       # 68 Node.js microservices
│   ├── ml-recommendation-svc/     # Python ML service (existing)
│   ├── ai-orchestrator/           # AI coordination
│   ├── assessment-svc/            # Assessment engine
│   ├── baseline-svc/              # Baseline assessment
│   ├── content-svc/               # Content management
│   ├── curriculum-svc/            # Curriculum (Node.js)
│   ├── game-library-svc/          # Game library
│   ├── auth-svc/                  # Authentication
│   ├── ... (60+ more services)
│   └── api-gateway/               # Kong gateway config
├── libs/                           # Shared libraries (18)
│   ├── ui-web/                    # React component library
│   ├── ts-types/                  # Shared TypeScript types
│   ├── ts-utils/                  # Utility functions
│   ├── ts-rbac/                   # RBAC system
│   ├── ts-data-access/            # Data access layer
│   ├── ts-observability/          # Logging/monitoring
│   ├── flutter-common/            # Flutter utilities
│   └── ... (more libs)
├── packages/                       # Utility packages (9)
│   ├── database/                  # Database utilities
│   ├── a11y/                      # Accessibility
│   ├── i18n/                      # Internationalization
│   ├── caching/                   # Cache utilities
│   └── ...
├── docker/                         # Docker configs
│   ├── docker-compose.yml         # Main compose
│   └── ...
├── infra/                          # Infrastructure
│   ├── k8s/                       # Kubernetes manifests
│   ├── terraform/                 # Terraform IaC
│   └── ...
├── tests/                          # Test suites
│   ├── integration/               # Integration tests
│   ├── e2e-mobile/                # Mobile E2E
│   ├── performance/               # Performance tests
│   └── security/                  # Security tests
└── docs/                          # Documentation
```

---

## Component Migration Mapping

### Apps

| Source Location | Target Location | Migration Notes |
|-----------------|-----------------|-----------------|
| `/apps/learner-app/` | `/apps/web-learner/` | Convert Vite → Next.js App Router |
| `/apps/teacher-portal/` | `/apps/web-teacher/` | Merge functionality |
| `/apps/parent-portal/` | `/apps/web-parent/` | Merge functionality |
| `/apps/district-portal/` | `/apps/web-district/` | Merge functionality |
| `/apps/admin-portal/` | `/apps/web-platform-admin/` | Merge functionality |
| `/apps/mobile-learner/` | `/apps/mobile-learner/` | Feature parity check |

### Python Services

| Source Location | Target Location | Migration Notes |
|-----------------|-----------------|-----------------|
| `/services/ai-inference-service/` | `/services/ai-inference-svc/` | **NEW** - Create |
| `/services/api-gateway/` | `/services/api-gateway/` | Enhance existing Kong config |
| `/services/auth-service/` | `/services/auth-svc/` | Merge with existing Node.js |
| `/services/curriculum-service/` | `/services/curriculum-svc/` | Complement existing Node.js |
| `/services/training-service/` | `/services/training-svc/` | **NEW** - Create |

### Packages → Libraries

| Source Location | Target Location | Migration Notes |
|-----------------|-----------------|-----------------|
| `/packages/auth/` | `/libs/ts-rbac/` | Merge auth utilities |
| `/packages/ui/` | `/libs/ui-web/` | Merge UI components |
| `/packages/types/` | `/libs/ts-types/` | Merge type definitions |
| `/packages/utils/` | `/libs/ts-utils/` | Merge utilities |
| `/packages/config/` | Root configs | Align configurations |
| `/packages/tailwind-config/` | `/libs/design-tokens/` | Merge styling |
| `/packages/typescript-config/` | `tsconfig.base.json` | Merge TS config |

---

## Component Architecture Mapping

### Learner App Components

```
Source: /apps/learner-app/src/components/
                    ↓
Target: /apps/web-learner/src/components/

┌─────────────────────────────────────────────────────────────────────┐
│ Source Component                │ Target Location                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ FocusMonitor/                   │ components/FocusMonitor/          │
│ ├── FocusMonitor.tsx           │ ├── FocusMonitor.tsx             │
│ ├── GameBreakModal.tsx         │ ├── GameBreakModal.tsx           │
│ └── games/                      │ └── games/                        │
│     ├── BreathingExercise.tsx  │     ├── BreathingExercise.tsx    │
│     ├── MemoryMatchGame.tsx    │     ├── MemoryMatchGame.tsx      │
│     └── ...                     │     └── ...                       │
├─────────────────────────────────┼───────────────────────────────────┤
│ ExecutiveFunction/              │ components/ExecutiveFunction/     │
│ ├── VisualSchedule.tsx         │ ├── VisualSchedule.tsx           │
│ ├── TaskBreakdown.tsx          │ ├── TaskBreakdown.tsx            │
│ ├── VisualTimer.tsx            │ ├── VisualTimer.tsx              │
│ └── FirstThenBoard.tsx         │ └── FirstThenBoard.tsx           │
├─────────────────────────────────┼───────────────────────────────────┤
│ SelfRegulation/                 │ components/SelfRegulation/        │
│ ├── CalmingSpace.tsx           │ ├── CalmingSpace.tsx             │
│ ├── EmotionCheckIn.tsx         │ ├── EmotionCheckIn.tsx           │
│ └── RegulationActivity.tsx     │ └── RegulationActivity.tsx       │
├─────────────────────────────────┼───────────────────────────────────┤
│ WritingPad/                     │ components/WritingPad/            │
│ ├── WritingPad.tsx             │ ├── WritingPad.tsx               │
│ └── DrawPad.tsx                │ └── DrawPad.tsx                  │
├─────────────────────────────────┼───────────────────────────────────┤
│ GamePicker/                     │ components/GamePicker/            │
│ └── GamePicker.tsx             │ └── GamePicker.tsx               │
├─────────────────────────────────┼───────────────────────────────────┤
│ MiniGames/                      │ components/MiniGames/             │
│ ├── ReactionGame.tsx           │ ├── ReactionGame.tsx             │
│ ├── PatternGame.tsx            │ ├── PatternGame.tsx              │
│ ├── BreathingGame.tsx          │ ├── BreathingGame.tsx            │
│ ├── MemoryGame.tsx             │ ├── MemoryGame.tsx               │
│ └── SortingGame.tsx            │ └── SortingGame.tsx              │
└─────────────────────────────────┴───────────────────────────────────┘
```

### Page Routing Conversion

```
Source: Vite + react-router-dom
Target: Next.js App Router

┌─────────────────────────────────────────────────────────────────────┐
│ Source Route                    │ Target Route (App Router)         │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/Home.tsx                 │ /app/page.tsx                     │
│   <Route path="/" />            │   export default function Home()  │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/Login.tsx                │ /app/login/page.tsx               │
│   <Route path="/login" />       │   export default function Login() │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/SubjectSelection.tsx     │ /app/subjects/page.tsx            │
│   <Route path="/subjects" />    │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/subjects/k5/Math.tsx     │ /app/subjects/k5/math/page.tsx    │
│   <Route path="/subjects/k5/    │                                   │
│           math" />              │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/NewBaselineAssessment.tsx│ /app/baseline/page.tsx            │
│   <Route path="/baseline" />    │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/HomeworkHelper.tsx       │ /app/homework/page.tsx            │
│   <Route path="/homework" />    │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/ModelCloning.tsx         │ /app/model-cloning/page.tsx       │
│   <Route path="/model-cloning" />│                                  │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/ExecutiveFunction.tsx    │ /app/executive-function/page.tsx  │
│   <Route path="/executive-      │                                   │
│           function" />          │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│ /pages/Rewards.tsx              │ /app/rewards/page.tsx             │
│   <Route path="/rewards" />     │                                   │
└─────────────────────────────────┴───────────────────────────────────┘
```

---

## Service Architecture Mapping

### Python Services Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AIVO Platform Services Architecture              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway (Kong)                         │   │
│  │                    Port: 8000                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │ AI Inference│     │  Training   │     │ Curriculum  │           │
│  │   Service   │     │   Service   │     │   Service   │           │
│  │ Port: 8001  │     │ Port: 8003  │     │ Port: 8004  │           │
│  │  (FastAPI)  │     │  (FastAPI)  │     │  (FastAPI)  │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│         │                    │                    │                  │
│         │                    │                    │                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Shared Infrastructure                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │PostgreSQL│  │  Redis   │  │   NATS   │  │ AI Models│    │    │
│  │  │  (per    │  │  Cache   │  │ Messaging│  │  Volume  │    │    │
│  │  │ service) │  │          │  │          │  │          │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Existing Node.js Services:                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │ml-recommend │     │  ai-orch    │     │  baseline   │           │
│  │   -svc      │     │   -estrator │     │    -svc     │           │
│  │ Port: 8005  │     │ Port: 8006  │     │ Port: 8007  │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Port Allocation

| Service | Source Port | Target Port | Protocol |
|---------|-------------|-------------|----------|
| API Gateway | 8000 | 8000 | HTTP |
| AI Inference | 8001 | 8001 | HTTP |
| Assessment | 8002 | 8002 | HTTP |
| Training | 8003 | 8003 | HTTP |
| Curriculum (Python) | 8004 | 8004 | HTTP |
| ML Recommendation | N/A | 8005 | HTTP |
| AI Orchestrator | N/A | 8006 | HTTP |
| Baseline | N/A | 8007 | HTTP |
| Redis | 6379 | 6379 | TCP |
| PostgreSQL | 5432 | 5432 | TCP |
| NATS | 4222 | 4222 | TCP |

---

## Data Flow Architecture

### Assessment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Assessment Data Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │ Learner  │───▶│  API     │───▶│Assessment│───▶│   AI     │      │
│  │   App    │    │ Gateway  │    │   SVC    │    │ Inference│      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │                                │               │             │
│       │                                │               │             │
│       ▼                                ▼               ▼             │
│  ┌──────────┐                   ┌──────────┐    ┌──────────┐       │
│  │ Results  │◀──────────────────│  Store   │◀───│ Process  │       │
│  │ Display  │                   │ Results  │    │  Model   │       │
│  └──────────┘                   └──────────┘    └──────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Brain Training Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Brain Training Data Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Game    │───▶│ Training │───▶│  Model   │───▶│  Update  │      │
│  │  Play    │    │  Service │    │ Trainer  │    │  Weights │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │                                               │              │
│       │                                               │              │
│       ▼                                               ▼              │
│  ┌──────────┐                                  ┌──────────┐         │
│  │Engagement│◀─────────────────────────────────│Personalize│         │
│  │ Metrics  │                                  │  Content │         │
│  └──────────┘                                  └──────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## State Management Migration

### Source: Zustand + React Context

```typescript
// Source pattern (Vite + Zustand)
import { create } from 'zustand';

interface LearnerState {
  profile: LearnerProfile | null;
  setProfile: (profile: LearnerProfile) => void;
}

export const useLearnerStore = create<LearnerState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
```

### Target: Next.js + Zustand (compatible)

```typescript
// Target pattern (Next.js + Zustand)
// Same Zustand pattern works in Next.js
// Add 'use client' directive for client components

'use client';

import { create } from 'zustand';

interface LearnerState {
  profile: LearnerProfile | null;
  setProfile: (profile: LearnerProfile) => void;
}

export const useLearnerStore = create<LearnerState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
```

---

## Authentication Integration

### Source: Custom JWT

```typescript
// Source auth pattern
const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // JWT stored in localStorage/cookie
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token).then(setUser);
    }
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};
```

### Target: Integration with existing auth-svc

```typescript
// Target auth pattern (uses @aivo/ts-rbac)
'use client';

import { useAuth } from '@aivo/ts-rbac';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
```

---

## Database Schema Alignment

### Assessment Data Models

```
Source: services/ai-inference-service/app/models/
                        ↓
Target: services/assessment-svc/prisma/schema.prisma

┌─────────────────────────────────────────────────────────────────────┐
│ Source (Python/SQLAlchemy)         │ Target (Prisma)                │
├─────────────────────────────────────┼───────────────────────────────┤
│ class Assessment(Base):             │ model Assessment {            │
│     id = Column(UUID)               │   id String @id @db.Uuid     │
│     learner_id = Column(UUID)       │   learnerId String @db.Uuid  │
│     type = Column(String)           │   type AssessmentType        │
│     status = Column(Enum)           │   status AssessmentStatus    │
│     score = Column(Float)           │   score Float?               │
│     created_at = Column(DateTime)   │   createdAt DateTime         │
│                                     │   updatedAt DateTime         │
├─────────────────────────────────────┼───────────────────────────────┤
│ class CognitiveProfile(Base):       │ model CognitiveProfile {      │
│     learner_id = Column(UUID)       │   learnerId String @db.Uuid  │
│     working_memory = Column(Float)  │   workingMemory Float        │
│     processing_speed = Column(Float)│   processingSpeed Float      │
│     attention = Column(Float)       │   attention Float            │
│     executive_function = Column()   │   executiveFunction Float    │
└─────────────────────────────────────┴───────────────────────────────┘
```

---

## Migration Directory Structure (Final)

After migration, the target repository will have this enhanced structure:

```
aivo-platform/
├── apps/
│   ├── web-learner/                    # Enhanced with migrated features
│   │   ├── src/
│   │   │   ├── app/                    # Next.js App Router
│   │   │   │   ├── (auth)/             # Auth group
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (learner)/          # Protected routes
│   │   │   │   │   ├── baseline/
│   │   │   │   │   ├── homework/
│   │   │   │   │   ├── executive-function/
│   │   │   │   │   ├── subjects/
│   │   │   │   │   │   ├── k5/
│   │   │   │   │   │   ├── ms/
│   │   │   │   │   │   └── hs/
│   │   │   │   │   └── rewards/
│   │   │   │   └── page.tsx            # Home
│   │   │   ├── components/             # Migrated components
│   │   │   │   ├── FocusMonitor/       # ← Migrated
│   │   │   │   ├── ExecutiveFunction/  # ← Migrated
│   │   │   │   ├── SelfRegulation/     # ← Migrated
│   │   │   │   ├── WritingPad/         # ← Migrated
│   │   │   │   ├── GamePicker/         # ← Migrated
│   │   │   │   ├── MiniGames/          # ← Migrated
│   │   │   │   └── ...
│   │   │   └── lib/
│   │   └── public/
│   └── ...
├── services/
│   ├── ai-inference-svc/               # ← NEW (from source)
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   ├── training-svc/                   # ← NEW (from source)
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   ├── curriculum-py-svc/              # ← NEW (Python complement)
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   ├── ml-recommendation-svc/          # Existing
│   ├── ai-orchestrator/                # Existing
│   └── ... (68+ services)
├── docker/
│   ├── docker-compose.yml              # Updated
│   └── docker-compose.services.yml     # ← NEW (Python services)
└── scripts/
    └── validate-python-migration.sh    # ← NEW
```

---

## Next Steps

1. ✅ Architecture mapping complete
2. → Create API Inventory
3. → Set up Python service directory structure
4. → Create Docker configurations
5. → Implement API Gateway enhancements
6. → Create validation scripts
