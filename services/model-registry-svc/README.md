# AIVO Model Registry Service

AI/ML model versioning and lifecycle management service.

## Overview

The Model Registry Service provides:

- **Model Management**: Register and manage ML models with metadata
- **Version Control**: Semantic versioning with full lineage tracking
- **Lifecycle Management**: Stage transitions (Draft → Validation → Staging → Production)
- **Artifact Storage**: Secure storage for model weights, configs, and related files
- **Deployment Tracking**: Track where models are deployed
- **Metrics Recording**: Store and query model performance metrics
- **Multi-tenant**: Full tenant isolation

## API Endpoints

### Models

```
POST   /models              - Create a new model
GET    /models              - List models (with filtering)
GET    /models/stats        - Get model statistics
GET    /models/:id          - Get model by ID
PATCH  /models/:id          - Update model
DELETE /models/:id          - Delete model
```

### Versions

```
POST   /models/:modelId/versions                    - Create version
GET    /models/:modelId/versions                    - List versions
GET    /models/:modelId/versions/:versionId         - Get version (by ID or tag: latest, production, staging, semver)
PATCH  /models/:modelId/versions/:versionId         - Update version
POST   /models/:modelId/versions/:versionId/transition - Transition stage
GET    /models/:modelId/versions/:v1/compare/:v2    - Compare versions
DELETE /models/:modelId/versions/:versionId         - Delete version
```

### Artifacts

```
POST   /models/:modelId/versions/:versionId/artifacts/upload           - Initiate upload
POST   /models/:modelId/versions/:versionId/artifacts/:artifactId/complete - Complete upload
GET    /models/:modelId/versions/:versionId/artifacts                  - List artifacts
GET    /models/:modelId/versions/:versionId/artifacts/:artifactId      - Get artifact
GET    /models/:modelId/versions/:versionId/artifacts/:artifactId/download - Get download URL
DELETE /models/:modelId/versions/:versionId/artifacts/:artifactId      - Delete artifact
```

### Deployments

```
POST   /models/:modelId/deployments     - Create deployment
GET    /deployments                     - List deployments
GET    /deployments/stats               - Get deployment stats
GET    /deployments/:id                 - Get deployment
PATCH  /deployments/:id                 - Update deployment
POST   /deployments/:id/stop            - Stop deployment
DELETE /deployments/:id                 - Delete deployment
```

## Model Lifecycle

```
┌─────────┐    ┌────────────┐    ┌─────────┐    ┌────────────┐
│  DRAFT  │ ──▶│ VALIDATION │ ──▶│ STAGING │ ──▶│ PRODUCTION │
└─────────┘    └────────────┘    └─────────┘    └────────────┘
     │              │                 │               │
     │              │                 │               ▼
     │              │                 │         ┌────────────┐
     └──────────────┴─────────────────┴────────▶│  ARCHIVED  │
                                                └────────────┘
                                                      │
                                                ┌────────────┐
                                                │ DEPRECATED │
                                                └────────────┘
```

## Supported Frameworks

- PyTorch
- TensorFlow
- ONNX
- scikit-learn
- XGBoost
- LightGBM
- Hugging Face
- OpenAI
- Anthropic
- Custom

## Artifact Types

- `MODEL_WEIGHTS` - Model weights/parameters
- `CONFIG` - Model configuration
- `TOKENIZER` - Tokenizer files
- `VOCABULARY` - Vocabulary files
- `METADATA` - Additional metadata
- `ONNX_EXPORT` - ONNX exported model
- `TENSORRT` - TensorRT optimized
- `CHECKPOINT` - Training checkpoint
- `EVALUATION` - Evaluation results
- `SAMPLE_DATA` - Sample input/output

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Environment Variables

See `.env.example` for all configuration options.

## Architecture

```
model-registry-svc/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Fastify app setup
│   ├── config.ts         # Configuration
│   ├── prisma.ts         # Database client
│   ├── routes/           # API routes
│   │   ├── models.ts     # Model endpoints
│   │   ├── versions.ts   # Version endpoints
│   │   ├── artifacts.ts  # Artifact endpoints
│   │   └── deployments.ts # Deployment endpoints
│   ├── services/         # Business logic
│   │   ├── modelService.ts
│   │   ├── versionService.ts
│   │   ├── artifactService.ts
│   │   ├── deploymentService.ts
│   │   └── metricsService.ts
│   ├── middleware/       # Auth middleware
│   └── types/            # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── test/                 # Tests
```

## S3 Storage

Model artifacts are stored in S3 with the following key structure:

```
models/{tenantId}/{modelId}/{versionId}/{artifactId}/{filename}
```

Presigned URLs are used for secure upload/download without exposing credentials.
