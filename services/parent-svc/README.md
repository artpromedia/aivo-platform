# Parent Engagement Platform

## Overview

The Parent Engagement Platform provides parents with comprehensive visibility into their children's learning progress, secure communication with teachers, and full control over data privacy and consent.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Parent Engagement Platform                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  web-parent  │  │mobile-parent │  │  Weekly      │          │
│  │  (Next.js)   │  │  (Flutter)   │  │  Digest Job  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼───────┐                            │
│                    │  parent-svc  │                            │
│                    │   (NestJS)   │                            │
│                    └──────┬───────┘                            │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                   │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │  PostgreSQL  │  │    Redis     │  │   Email/     │         │
│  │  (Prisma)    │  │   (Cache)    │  │   Push       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Progress Dashboard
- Real-time learning progress for each child
- Subject-by-subject breakdown with trends
- Activity timeline with scores
- Downloadable PDF reports

### 2. Secure Messaging
- Teacher-parent communication
- Content moderation (PII detection, inappropriate content)
- Message reporting
- Read receipts

### 3. Consent Management
- COPPA/FERPA compliant consent workflows
- Granular privacy controls
- Data export (GDPR Article 15)
- Data deletion (GDPR Article 17)

### 4. Weekly Digest
- Automated weekly progress summaries
- Multi-language email templates
- Configurable via consent settings

### 5. Multi-Language Support
- 10 languages: EN, ES, FR, DE, PT, ZH, JA, KO, AR, HI
- RTL support for Arabic
- Localized email templates
- PDF reports in user's language

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Start development server
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/parent_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=email-password
PUSH_VAPID_PUBLIC=vapid-public-key
PUSH_VAPID_PRIVATE=vapid-private-key
```

## API Documentation

See [API Documentation](./docs/api.md) for detailed endpoint documentation.

## Security

### Authentication
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Rate limiting on authentication endpoints
- Session management with Redis

### Content Moderation
- Automated PII detection (phone, email, SSN)
- Profanity filtering
- Message length limits
- Report/flag mechanism

### Data Protection
- COPPA compliance for children under 13
- FERPA compliance for educational records
- GDPR data portability and deletion
- Encrypted data at rest

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

## Deployment

### Docker

```bash
docker build -t parent-svc .
docker run -p 3000:3000 parent-svc
```

### Kubernetes

```bash
kubectl apply -f k8s/parent-svc/
```

## Mobile App

The mobile-parent Flutter app provides:
- Native iOS/Android experience
- Push notifications
- Offline support
- Biometric authentication

### Building

```bash
cd apps/mobile-parent
flutter pub get
flutter build apk  # Android
flutter build ios  # iOS
```

## Web App

The web-parent Next.js app provides:
- Server-side rendering for SEO
- Progressive Web App (PWA) support
- Responsive design
- Real-time updates

### Building

```bash
cd apps/web-parent
pnpm build
pnpm start
```

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Submit a pull request
4. Ensure CI passes

## License

Proprietary - Aivo Learning Platform
