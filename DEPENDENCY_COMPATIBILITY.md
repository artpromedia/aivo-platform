# Dependency Compatibility Matrix

## Overview
This document analyzes the dependency compatibility between the source repository (aivo-agentic-ai-learning-app) and target repository (aivo-platform) for the migration process.

---

## JavaScript/TypeScript Dependencies

### Node.js & Package Manager

| Component | Source (Legacy) | Target (Platform) | Status | Action |
|-----------|-----------------|-------------------|--------|--------|
| Node.js | >=20.19.4 | 20.19.4 | ✅ Compatible | None |
| Package Manager | pnpm 10.0.0 | pnpm 9.12.0 | ⚠️ Minor diff | Upgrade target to 10.0.0 |
| Build System | Turbo 2.0.0 | Turbo 2.1.0 | ✅ Compatible | None |

### React & Core Framework

| Dependency | Source Version | Target Version | Status | Resolution Strategy |
|------------|----------------|----------------|--------|---------------------|
| react | ^19.0.0 | ^18.3.1 | ⚠️ Major diff | Source uses React 19, target uses 18. Evaluate upgrade path |
| react-dom | ^19.2.0 | ^18.3.1 | ⚠️ Major diff | Must upgrade together with React |
| @types/react | ^19.2.2 | ^18.3.12 | ⚠️ Major diff | Types follow React version |
| @types/react-dom | ^19.0.3 | ^18.3.1 | ⚠️ Major diff | Types follow React DOM version |
| next | N/A (Vite-based) | 14.2.35 | ✅ N/A | Target already uses Next.js |

### UI & Styling

| Dependency | Source Version | Target Version | Status | Resolution Strategy |
|------------|----------------|----------------|--------|---------------------|
| tailwindcss | ^4.1.14 | ^3.4.17 | ⚠️ Major diff | Source uses Tailwind v4, target v3 |
| postcss | ^8.5.6 | ^8.5.4 | ✅ Compatible | None |
| autoprefixer | ^10.4.21 | ^10.4.21 | ✅ Compatible | None |
| lucide-react | ^0.546.0 | N/A | 🆕 Add | Add to target |
| framer-motion | ^11.18.0 | N/A | 🆕 Add | Add to target |

### Routing & State

| Dependency | Source Version | Target Version | Status | Resolution Strategy |
|------------|----------------|----------------|--------|---------------------|
| react-router-dom | ^6.30.1 | N/A (uses Next.js router) | ⚠️ Different pattern | Convert to Next.js app router |
| zustand | ^4.5.7 | N/A | 🆕 Add | Add for state management |

### Build & Development

| Dependency | Source Version | Target Version | Status | Resolution Strategy |
|------------|----------------|----------------|--------|---------------------|
| vite | ^7.1.12 | N/A | ⚠️ Not needed | Next.js handles builds |
| @vitejs/plugin-react | ^4.7.0 | N/A | ⚠️ Not needed | Next.js handles JSX |
| typescript | ^5.6.0 | ^5.6.3 | ✅ Compatible | Use target version |
| vitest | ^3.2.4 | ^4.0.15 | ⚠️ Minor diff | Use target version (newer) |

### Testing

| Dependency | Source Version | Target Version | Status | Resolution Strategy |
|------------|----------------|----------------|--------|---------------------|
| @playwright/test | ^1.56.1 | N/A (root level) | ✅ Add | Add E2E testing capability |
| @testing-library/react | ^16.3.0 | ^16.3.1 | ✅ Compatible | Use target version |
| happy-dom | ^20.0.7 | N/A | 🆕 Add | Add for faster tests |

### Additional Libraries (Source only)

| Dependency | Source Version | Purpose | Priority | Target Action |
|------------|----------------|---------|----------|---------------|
| axios | ^1.12.2 | HTTP client | P1 | Add (or use fetch) |
| canvas-confetti | ^1.9.3 | Celebration effects | P2 | Add |
| react-confetti | ^6.4.0 | Confetti animation | P2 | Add |
| jspdf | ^3.0.3 | PDF generation | P1 | Add |
| jspdf-autotable | ^5.0.2 | PDF tables | P1 | Add |
| vite-plugin-pwa | ^1.1.0 | PWA support | P2 | Use next-pwa instead |
| workbox-window | ^7.3.0 | Service worker | P2 | Add |
| sharp | ^0.34.4 | Image processing | P1 | Add |

---

## Python Dependencies

### Core Framework & API

| Dependency | Source Version(s) | Target (ml-recommendation-svc) | Status | Resolution |
|------------|-------------------|--------------------------------|--------|------------|
| fastapi | 0.104.0-0.115.0 | >=0.109.0 | ✅ Compatible | Use 0.115.0 |
| uvicorn[standard] | 0.24.0-0.32.0 | >=0.27.0 | ✅ Compatible | Use 0.32.0 |
| pydantic | 2.5.0-2.9.0 | >=2.6.0 | ✅ Compatible | Use 2.9.0 |
| pydantic-settings | 2.1.0-2.5.0 | >=2.1.0 | ✅ Compatible | Use 2.5.0 |

### Database & ORM

| Dependency | Source Version(s) | Target Version | Status | Resolution |
|------------|-------------------|----------------|--------|------------|
| sqlalchemy | 2.0.0-2.0.35 | >=2.0.25 | ✅ Compatible | Use 2.0.35 |
| asyncpg | 0.29.0 | >=0.29.0 | ✅ Compatible | None |
| psycopg2-binary | 2.9.9 | N/A | 🆕 Add | Add for sync Postgres |
| alembic | 1.12.0-1.13.0 | N/A | 🆕 Add | Add for migrations |

### Caching & Messaging

| Dependency | Source Version(s) | Target Version | Status | Resolution |
|------------|-------------------|----------------|--------|------------|
| redis | 5.0.0-5.1.0 | >=5.0.0 | ✅ Compatible | Use 5.1.0 |
| aio-pika | N/A | >=9.4.0 | ✅ Keep | RabbitMQ support |

### AI/ML Libraries

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| openai | 1.3.0-1.54.0 | >=1.10.0 | ✅ Compatible | Use 1.54.0 |
| anthropic | 0.7.0-0.18.0 | >=0.18.0 | ✅ Compatible | Use 0.18.0 |
| google-generativeai | >=0.3.0 | N/A | 🆕 Add | Add Gemini support |
| transformers | >=4.35.0 | N/A | 🆕 Add | For local training |
| torch | >=2.1.0 | N/A | 🆕 Add | PyTorch for ML |
| datasets | >=2.15.0 | N/A | 🆕 Add | HuggingFace datasets |

### Scientific Computing

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| numpy | N/A | >=1.26.0 | ✅ Already there | None |
| scipy | N/A | >=1.12.0 | ✅ Already there | None |
| scikit-learn | N/A | >=1.4.0 | ✅ Already there | None |
| pandas | >=2.1.0 | N/A | 🆕 Add | Data processing |

### Text & NLP

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| textstat | >=0.7.3 | N/A | 🆕 Add | Reading level analysis |
| nltk | >=3.8.1 | N/A | 🆕 Add | Natural language |
| beautifulsoup4 | >=4.12.0 | N/A | 🆕 Add | HTML parsing |

### Monitoring & Observability

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| wandb | >=0.16.0 | N/A | 🆕 Add | ML experiment tracking |
| mlflow | >=2.8.0 | N/A | 🆕 Add | MLOps platform |
| opentelemetry-* | N/A | >=1.22.0 | ✅ Keep | Already in target |
| structlog | N/A | >=24.1.0 | ✅ Keep | Structured logging |

### Authentication & Security

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| python-jose[cryptography] | 3.3.0 | N/A | 🆕 Add | JWT handling |
| passlib[bcrypt] | 1.7.4 | N/A | 🆕 Add | Password hashing |
| email-validator | 2.2.0 | N/A | 🆕 Add | Email validation |

### File Processing

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| PyPDF2 | 3.0.1 | N/A | 🆕 Add | PDF processing |
| Pillow | 11.0.0 | N/A | 🆕 Add | Image processing |
| aiofiles | 24.1.0 | N/A | 🆕 Add | Async file I/O |
| python-multipart | 0.0.6-0.0.9 | N/A | 🆕 Add | Multipart forms |

### Utilities

| Dependency | Source Version | Target Version | Status | Resolution |
|------------|----------------|----------------|--------|------------|
| httpx | 0.25.0-0.27.2 | >=0.26.0 | ✅ Compatible | Use 0.27.2 |
| python-dotenv | 1.0.0-1.0.1 | N/A | 🆕 Add | Env file support |
| pyyaml | >=6.0 | N/A | 🆕 Add | YAML config |
| tenacity | N/A | >=8.2.0 | ✅ Keep | Retry logic |
| schedule | 1.2.0 | N/A | 🆕 Add | Task scheduling |

---

## Unified Python Requirements

Based on the compatibility analysis, here's the consolidated `requirements.txt` for Python services:

```txt
# Core Framework
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.0
pydantic-settings==2.5.0

# Database
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.0
redis==5.1.0

# AI/ML Providers
openai==1.54.0
anthropic==0.18.0
google-generativeai>=0.3.0

# ML/Deep Learning (Optional - for local training)
# torch>=2.1.0
# transformers>=4.35.0
# datasets>=2.15.0

# Scientific Computing
numpy>=1.26.0
scipy>=1.12.0
scikit-learn>=1.4.0
pandas>=2.1.0

# Text Processing
textstat>=0.7.3
nltk>=3.8.1
beautifulsoup4>=4.12.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
email-validator==2.2.0

# HTTP & Networking
httpx==0.27.2
aiohttp>=3.8.0

# File Processing
PyPDF2==3.0.1
Pillow==11.0.0
aiofiles==24.1.0
python-multipart==0.0.9

# Observability
opentelemetry-api>=1.22.0
opentelemetry-sdk>=1.22.0
opentelemetry-instrumentation-fastapi>=0.43b0
structlog>=24.1.0

# MLOps (Optional)
# wandb>=0.16.0
# mlflow>=2.8.0

# Utilities
python-dotenv==1.0.1
pyyaml>=6.0
tenacity>=8.2.0
schedule==1.2.0

# Testing
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0

# Code Quality
ruff>=0.2.0
mypy>=1.8.0
```

---

## Conflict Resolution Strategies

### React 18 vs React 19

**Issue**: Source uses React 19, target uses React 18.3.1

**Resolution Options**:
1. **Option A (Recommended)**: Keep target at React 18 for stability
   - Port components to work with React 18
   - Avoid React 19-specific features (use, compiler directives)
   - Upgrade later when ecosystem stabilizes

2. **Option B**: Upgrade target to React 19
   - Risk: Breaking changes in dependencies
   - Benefit: Latest features
   - Requires testing all existing components

**Decision**: Option A - Keep React 18 for migration, plan React 19 upgrade as separate sprint

### Tailwind v3 vs v4

**Issue**: Source uses Tailwind 4.x, target uses 3.4.x

**Resolution**:
1. Port component styles using Tailwind v3 syntax
2. Avoid v4-specific features (CSS-first config)
3. Use `@tailwindcss/postcss` for future compatibility
4. Plan v4 upgrade post-migration

### Vite vs Next.js

**Issue**: Source uses Vite + react-router-dom, target uses Next.js

**Resolution**:
1. Convert page components to Next.js app router conventions
2. Replace `react-router-dom` with Next.js `Link` and `useRouter`
3. Convert `BrowserRouter` patterns to `app/` directory structure
4. Use Next.js server components where beneficial

---

## Recommended Package.json Updates for Target

### Root package.json additions
```json
{
  "devDependencies": {
    "happy-dom": "^20.0.7",
    "@playwright/test": "^1.56.1"
  }
}
```

### apps/web-learner/package.json additions
```json
{
  "dependencies": {
    "lucide-react": "^0.546.0",
    "framer-motion": "^11.18.0",
    "zustand": "^4.5.7",
    "jspdf": "^3.0.3",
    "jspdf-autotable": "^5.0.2",
    "canvas-confetti": "^1.9.3",
    "react-confetti": "^6.4.0"
  },
  "devDependencies": {
    "sharp": "^0.34.4"
  }
}
```

---

## Docker Base Images

| Service | Source Base Image | Recommended | Notes |
|---------|-------------------|-------------|-------|
| AI Inference | python:3.11-slim | python:3.11-slim | Consistent |
| API Gateway | python:3.11-slim | python:3.11-slim | Consistent |
| Auth Service | python:3.11-slim | python:3.11-slim | Consistent |
| Curriculum | python:3.11-slim | python:3.11-slim | Consistent |
| Training | python:3.11-slim | python:3.11-bookworm | Needs ML libs |
| Web Apps | node:20-alpine | node:20-alpine | Consistent |

---

## Migration Checklist

### Phase 1: Dependency Alignment
- [ ] Update target pnpm to 10.0.0
- [ ] Add missing npm dependencies to target
- [ ] Create unified Python requirements.txt
- [ ] Test dependency installation in Docker

### Phase 2: Framework Adaptation
- [ ] Document React 18 compatibility requirements
- [ ] Create Tailwind v3 style guide
- [ ] Map react-router patterns to Next.js routes

### Phase 3: Service Setup
- [ ] Create Python service Dockerfiles
- [ ] Create docker-compose.services.yml
- [ ] Verify all dependencies resolve correctly

---

## Version Lock Recommendations

For stability during migration, lock these versions:
- Node.js: 20.19.4 (exact)
- Python: 3.11.x (minor)
- pnpm: 10.0.0 (exact)
- FastAPI: 0.115.0 (exact)
- React: 18.3.1 (exact during migration)
- Next.js: 14.2.35 (exact)
