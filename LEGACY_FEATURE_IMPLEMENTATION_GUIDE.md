# Legacy Feature Implementation Guide

This document provides a comprehensive guide for implementing features from the legacy repositories into the aivo-platform.

## Executive Summary

After analyzing the aivo-platform repository, we've identified the current state of implementation for each feature from the legacy repositories:

### ✅ Already Implemented (Backend Complete)
- **Sensory Profiles System**: Full backend with API endpoints (missing UI components)
- **Grade-Based Theming**: Complete implementation with 3 themes (explorer, navigator, scholar)
- **Parent/Caregiver Management**: Backend complete with invite system (needs self-service flow)
- **Multi-Provider AI**: Partial implementation with OpenAI, Anthropic, Google, Ollama

### 🟡 Partially Implemented (Needs Enhancement)
- **Agent Infrastructure**: No persistent state or episodic memory
- **Content Authoring**: Service exists but no AI assistance
- **Baseline Assessment**: Service exists but needs enhancement
- **Homework Helper**: Service exists but no OCR integration

### ❌ Not Implemented (New Features Required)
- **OCR Integration**: No image processing capability
- **Brain Orchestrator**: No centralized cognitive task coordination
- **District Theme Customization**: No tenant-specific theming
- **Self-Service Parent Registration**: Only invite-based registration exists

## Implementation Priorities

### Phase 1: Quick Wins (Weeks 1-2)

#### 1.1 Sensory Profile UI Components ✅ Backend Ready

**Location**: `libs/ui-web/src/components/profile/`

**Components to Create**:

```
libs/ui-web/src/components/profile/
├── SensoryProfileWizard.tsx         # Multi-step wizard for profile creation
├── SensoryProfileEditor.tsx         # Full profile editor
├── VisualAccommodations.tsx         # Visual settings panel
├── AuditoryAccommodations.tsx       # Audio settings panel
├── MotorAccommodations.tsx          # Motor/input settings panel
├── CognitiveAccommodations.tsx      # Cognitive settings panel
└── AccommodationCard.tsx            # Display individual accommodations
```

**Existing Backend**:
- ✅ Prisma Schema: `LearnerProfile`, `LearnerSensoryProfile`
- ✅ API Endpoints: 
  - `GET/POST/PATCH /learners/:learnerId/profile`
  - `GET/POST/PATCH /learners/:learnerId/sensory-profile`
  - `GET/POST/PATCH/DELETE /learners/:learnerId/accommodations`

**Implementation Steps**:
1. Create base wizard component with multi-step navigation
2. Build accommodation panels using existing form components
3. Integrate with profile-svc API endpoints
4. Add validation and accessibility features
5. Create Storybook stories for documentation

**Priority**: HIGH - Improves accessibility and UX for learners with special needs

---

#### 1.2 Self-Service Parent Registration

**Location**: `services/parent-svc/src/routes/` and `services/auth-svc/src/routes/`

**New Endpoints to Create**:

```typescript
// services/parent-svc/src/routes/registration.ts
POST /registration/self-register          # Parent self-registration
POST /registration/verify-learner         # Verify learner using PIN/code
POST /registration/link-learner          # Link verified learner to parent
GET  /registration/verify-email/:token   # Email verification
```

**Implementation Steps**:
1. Create self-registration endpoint without invite requirement
2. Implement learner verification using PIN or student ID
3. Add email verification flow
4. Create family dashboard UI in `apps/web-parent`
5. Add multi-learner management interface

**Database Changes**: None required - existing schema supports this

**Priority**: HIGH - Reduces onboarding friction for parents

---

#### 1.3 Grade Theme Enhancements

**Location**: `libs/ui-web/src/theme/`

**Current State**: Already well-implemented with 3 themes

**Enhancements Needed**:
1. Add district-level theme customization API
2. Create theme preview/switcher component
3. Add more granular theme tokens for age-appropriate UI

**New Files**:
```
services/tenant-svc/src/routes/theme-config.ts  # Theme customization API
libs/ui-web/src/components/ThemeCustomizer.tsx  # Theme editor
```

**Priority**: MEDIUM - Current implementation is good, enhancements are nice-to-have

---

### Phase 2: AI Infrastructure (Weeks 3-8)

#### 2.1 Multi-Provider AI Enhancement

**Location**: `services/ai-orchestrator/src/providers/`

**Current Providers**:
- ✅ OpenAI
- ✅ Anthropic
- ✅ Google Gemini
- ✅ Ollama
- ✅ Basic failover exists

**Enhancements Needed**:
1. **Provider Registry**: Centralized provider management
2. **Circuit Breaker**: Per-provider circuit breaker pattern
3. **Priority Routing**: Cost/latency-based routing
4. **Health Monitoring**: Provider health checks

**New Files**:
```typescript
// services/ai-orchestrator/src/providers/
├── registry.ts              # Provider registry
├── circuit-breaker.ts       # Circuit breaker implementation
├── priority-router.ts       # Priority-based routing
├── health-monitor.ts        # Provider health monitoring
└── cost-calculator.ts       # Cost optimization
```

**Implementation**:
```typescript
// Example: Provider Registry
interface ProviderConfig {
  name: string;
  priority: number;
  costPerToken: number;
  maxTokens: number;
  healthCheckUrl?: string;
}

class ProviderRegistry {
  private providers: Map<string, ProviderConfig>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  register(config: ProviderConfig): void;
  getHealthyProvider(criteria: RoutingCriteria): LLMProvider;
  recordMetrics(provider: string, metrics: Metrics): void;
}
```

**Priority**: HIGH - Improves reliability and cost optimization

---

#### 2.2 Agent Infrastructure Package

**Location**: `packages/ts-agents/` (new package)

**Package Structure**:
```
packages/ts-agents/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Base agent class
│   │   ├── state-manager.ts      # Redis-backed state persistence
│   │   └── tool-registry.ts      # Tool registration and execution
│   ├── memory/
│   │   ├── episodic-memory.ts    # Episodic memory for learning context
│   │   ├── working-memory.ts     # Short-term working memory
│   │   └── long-term-memory.ts   # Long-term memory store
│   └── index.ts
├── package.json
└── README.md
```

**Implementation**:
```typescript
// Base Agent Class
abstract class Agent {
  constructor(
    protected id: string,
    protected stateManager: StateManager,
    protected memory: EpisodicMemory
  ) {}
  
  abstract run(input: AgentInput): Promise<AgentOutput>;
  
  async persist(): Promise<void> {
    await this.stateManager.save(this.id, this.getState());
  }
  
  async restore(): Promise<void> {
    const state = await this.stateManager.load(this.id);
    this.setState(state);
  }
}

// State Manager with Redis
class StateManager {
  constructor(private redis: Redis) {}
  
  async save(agentId: string, state: AgentState): Promise<void> {
    await this.redis.set(`agent:${agentId}:state`, JSON.stringify(state));
  }
  
  async load(agentId: string): Promise<AgentState> {
    const data = await this.redis.get(`agent:${agentId}:state`);
    return JSON.parse(data);
  }
}

// Episodic Memory
class EpisodicMemory {
  private episodes: Episode[] = [];
  
  async store(episode: Episode): Promise<void> {
    this.episodes.push(episode);
    await this.persist();
  }
  
  async recall(query: MemoryQuery): Promise<Episode[]> {
    // Implement similarity search or temporal search
    return this.episodes.filter(e => this.matches(e, query));
  }
}
```

**Priority**: HIGH - Foundation for advanced AI features

---

### Phase 3: Content & Assessment (Weeks 9-12)

#### 3.1 OCR-Powered Homework Helper

**Location**: `services/homework-helper-svc/`

**Current State**: Service exists but no OCR

**New Files**:
```
services/homework-helper-svc/src/
├── ocr/
│   ├── processor.ts              # Main OCR processor
│   ├── providers/
│   │   ├── tesseract.ts         # Tesseract integration
│   │   ├── google-vision.ts     # Google Cloud Vision
│   │   └── aws-textract.ts      # AWS Textract
│   └── image-validator.ts       # Image format validation
├── scaffolding/
│   ├── step-engine.ts           # 4-step assistance workflow
│   ├── hint-generator.ts        # Context-aware hints
│   └── solution-verifier.ts     # Solution verification
└── routes/
    └── upload.ts                # Image upload endpoint
```

**Implementation Flow**:
```typescript
1. Image Upload → Validation (JPEG/PNG/PDF)
2. OCR Processing → Text Extraction
3. Context Analysis → Subject/Problem Detection
4. Scaffolded Assistance:
   - Step 1: Clarifying questions
   - Step 2: Concept hints
   - Step 3: Worked example (similar problem)
   - Step 4: Solution verification
```

**Dependencies**:
- Tesseract.js (self-hosted) OR
- @google-cloud/vision OR
- AWS SDK for Textract

**Priority**: HIGH - Major differentiating feature

---

#### 3.2 AI-Assisted Content Authoring

**Location**: `services/content-authoring-svc/src/ai/`

**New Files**:
```typescript
services/content-authoring-svc/src/ai/
├── draft-generator.ts          # AI draft generation
├── standards-tagger.ts         # Auto-tag curriculum standards
├── quality-scorer.ts           # Content quality scoring
└── enhancement-suggester.ts    # AI suggestions
```

**Implementation**:
```typescript
class DraftGenerator {
  async generateDraft(params: {
    topic: string;
    gradeLevel: number;
    learningObjectives: string[];
    duration: number;
  }): Promise<ContentDraft> {
    const prompt = this.buildPrompt(params);
    const response = await this.llm.generate(prompt);
    return this.parseDraft(response);
  }
}

class QualityScorer {
  async scoreContent(content: Content): Promise<QualityScore> {
    return {
      readability: await this.assessReadability(content),
      alignment: await this.assessStandardsAlignment(content),
      engagement: await this.assessEngagement(content),
      accessibility: await this.assessAccessibility(content),
    };
  }
}
```

**Priority**: HIGH - Accelerates content creation

---

#### 3.3 Enhanced Baseline Assessment

**Location**: `services/baseline-svc/src/`

**Current State**: Basic baseline service exists

**Enhancements**:
```
services/baseline-svc/src/
├── learning-style/
│   ├── detector.ts             # Learning style detection
│   └── assessment.ts           # Style-specific assessments
├── cognitive-profile/
│   ├── profiler.ts            # Cognitive profile detection
│   └── mapper.ts              # Map to Virtual Brain
└── adaptive/
    └── flow-engine.ts         # Adaptive diagnostic flow
```

**Priority**: MEDIUM - Improves initial placement

---

### Phase 4: Advanced Orchestration (Weeks 13-16)

#### 4.1 Brain Orchestrator Service

**Location**: `services/brain-orchestrator-svc/` (new service)

**Purpose**: Centralized cognitive task coordination

**Structure**:
```
services/brain-orchestrator-svc/
├── src/
│   ├── orchestrator/
│   │   ├── task-decomposer.ts     # Break down complex tasks
│   │   ├── delegator.ts           # Delegate to services
│   │   └── coordinator.ts         # Coordinate responses
│   ├── cognitive-load/
│   │   ├── analyzer.ts            # Analyze cognitive load
│   │   ├── balancer.ts            # Balance load across tasks
│   │   └── optimizer.ts           # Optimize task sequencing
│   └── routes/
│       └── orchestrate.ts         # Main orchestration endpoint
├── package.json
└── prisma/
    └── schema.prisma
```

**Priority**: MEDIUM - Advanced optimization feature

---

## Implementation Guidelines

### Code Standards

1. **TypeScript**: All code must be TypeScript with strict mode
2. **Testing**: Unit tests required for all new functions
3. **Documentation**: JSDoc comments for all public APIs
4. **Accessibility**: WCAG 2.1 AA compliance for all UI
5. **Security**: Input validation, sanitization, and authentication

### API Design

1. **RESTful**: Follow REST principles
2. **Versioning**: Use `/v1/` prefix for all APIs
3. **Authentication**: JWT-based authentication
4. **Rate Limiting**: Apply rate limits to all endpoints
5. **Error Handling**: Consistent error response format

### Testing Strategy

1. **Unit Tests**: Jest/Vitest for all business logic
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Playwright for critical user flows
4. **Accessibility Tests**: Pa11y for WCAG compliance

### Security Considerations

1. **Input Validation**: Zod schemas for all inputs
2. **Authentication**: Required for all protected endpoints
3. **Authorization**: RBAC for all operations
4. **Data Protection**: PII encryption, COPPA compliance
5. **Audit Logging**: Log all sensitive operations

---

## Resource Requirements

### Development Team

- **Frontend Developer**: 2-3 months (UI components, theming)
- **Backend Developer**: 3-4 months (APIs, services, AI infrastructure)
- **AI/ML Engineer**: 2-3 months (Agent infrastructure, OCR, AI content)
- **QA Engineer**: 1-2 months (Testing, accessibility validation)

### Infrastructure

- **Redis**: Required for agent state persistence
- **OCR Service**: Tesseract (self-hosted) or Cloud OCR (Google/AWS)
- **Storage**: Image storage for homework uploads
- **Monitoring**: Enhanced observability for AI provider health

### Third-Party Services

- **OCR**: Google Cloud Vision or AWS Textract (optional)
- **AI Providers**: OpenAI, Anthropic, Google Gemini (already integrated)

---

## Migration & Deployment

### Phase 1 Deployment
1. Deploy sensory profile UI components
2. Enable self-service parent registration
3. Roll out to pilot districts

### Phase 2 Deployment
1. Deploy enhanced AI orchestrator
2. Deploy agent infrastructure package
3. Gradual rollout with feature flags

### Phase 3 Deployment
1. Deploy OCR homework helper
2. Enable AI-assisted content authoring
3. Staged rollout to content creators

### Phase 4 Deployment
1. Deploy brain orchestrator
2. Enable cognitive load optimization
3. Monitor and optimize performance

---

## Success Metrics

### User Experience
- Sensory profile completion rate: >80%
- Parent self-registration success rate: >90%
- Homework helper usage: Track adoption rate

### AI Performance
- Provider failover success rate: >99.9%
- AI response latency: <2 seconds p95
- Content quality scores: >4.0/5.0 average

### Business Impact
- Reduced support tickets for parent onboarding: -30%
- Increased content creation velocity: +50%
- Improved baseline assessment accuracy: +20%

---

## Maintenance Plan

### Regular Reviews
- Weekly: Provider health monitoring
- Monthly: Cost optimization analysis
- Quarterly: Feature usage analytics
- Annually: Technology stack review

### Documentation Updates
- Update API docs with each release
- Maintain architecture decision records (ADRs)
- Keep implementation guide current
- Document known issues and workarounds

---

## Conclusion

This implementation guide provides a comprehensive roadmap for integrating legacy repository features into the aivo-platform. The phased approach ensures:

1. Quick wins deliver immediate value
2. AI infrastructure provides foundation for advanced features
3. Content and assessment enhancements improve educational quality
4. Advanced orchestration optimizes the learning experience

By following this guide, the development team can systematically enhance the platform while maintaining code quality, security, and accessibility standards.
