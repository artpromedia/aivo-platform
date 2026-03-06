# Phase 2-4: Advanced Features - Technical Specification

## Phase 2: AI Infrastructure Enhancement (Weeks 3-8)

### 2.1 Multi-Provider AI with Priority-Based Failover

**Current State**:
- ✅ OpenAI, Anthropic, Google Gemini, Ollama providers implemented
- ✅ Basic failover exists
- ❌ No circuit breaker pattern
- ❌ No priority-based routing
- ❌ No cost optimization

**Location**: `services/ai-orchestrator/src/providers/`

**New Files to Create**:
```
services/ai-orchestrator/src/providers/
├── registry.ts              # Centralized provider registry
├── circuit-breaker.ts       # Circuit breaker per provider
├── priority-router.ts       # Priority-based routing logic
├── health-monitor.ts        # Provider health checking
└── cost-calculator.ts       # Cost optimization routing
```

**Implementation**:
```typescript
// Provider Registry Pattern
interface ProviderConfig {
  name: string;
  priority: number;          // 1 = highest priority
  costPerToken: number;
  maxTokens: number;
  healthCheckUrl?: string;
  rateLimit?: number;
}

class ProviderRegistry {
  async getHealthyProvider(criteria: {
    taskComplexity?: 'low' | 'medium' | 'high';
    costOptimized?: boolean;
    latencyOptimized?: boolean;
  }): Promise<LLMProvider> {
    // 1. Filter healthy providers (circuit breaker check)
    // 2. Apply priority routing
    // 3. Optimize for cost or latency
    // 4. Return best provider
  }
}
```

**Priority**: HIGH  
**Effort**: 4-5 days

---

### 2.2 Agent Infrastructure Package

**Location**: `packages/ts-agents/` (new package)

**Package Structure**:
```
packages/ts-agents/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Base agent class
│   │   ├── state-manager.ts      # Redis-backed state
│   │   └── tool-registry.ts      # Tool management
│   ├── memory/
│   │   ├── episodic-memory.ts    # Learning context memory
│   │   ├── working-memory.ts     # Short-term memory
│   │   └── long-term-memory.ts   # Persistent memory
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Key Classes**:
```typescript
abstract class Agent {
  constructor(
    protected id: string,
    protected stateManager: StateManager,
    protected memory: EpisodicMemory
  ) {}
  
  abstract run(input: AgentInput): Promise<AgentOutput>;
  async persist(): Promise<void>;
  async restore(): Promise<void>;
}

class StateManager {
  constructor(private redis: Redis) {}
  async save(agentId: string, state: AgentState): Promise<void>;
  async load(agentId: string): Promise<AgentState>;
}

class EpisodicMemory {
  async store(episode: Episode): Promise<void>;
  async recall(query: MemoryQuery): Promise<Episode[]>;
}
```

**Dependencies**:
- Redis (already in use)
- ioredis client
- @aivo/ts-types

**Priority**: HIGH  
**Effort**: 5-6 days

---

## Phase 3: Content & Assessment (Weeks 9-12)

### 3.1 OCR-Powered Homework Helper

**Current State**:
- ✅ homework-helper-svc exists
- ❌ No OCR integration
- ❌ No image upload handling

**Location**: `services/homework-helper-svc/`

**New Files**:
```
services/homework-helper-svc/src/
├── ocr/
│   ├── processor.ts              # Main OCR processor
│   ├── providers/
│   │   ├── tesseract.ts         # Tesseract.js integration
│   │   ├── google-vision.ts     # Google Cloud Vision
│   │   └── aws-textract.ts      # AWS Textract
│   └── image-validator.ts       # Image format validation
├── scaffolding/
│   ├── step-engine.ts           # 4-step assistance
│   ├── hint-generator.ts        # Context-aware hints
│   └── solution-verifier.ts     # Verify solutions
└── routes/
    └── upload.ts                # Image upload endpoint
```

**OCR Flow**:
```
1. Upload Image → Validate (JPEG/PNG/PDF, max 10MB)
2. Process OCR → Extract text
3. Analyze Context → Detect subject, problem type
4. Scaffolded Help:
   Step 1: "What do you understand about this problem?"
   Step 2: "Here's a hint about [concept]"
   Step 3: "Here's a similar problem solved"
   Step 4: "Check your solution"
```

**OCR Provider Options**:
- **Tesseract.js**: Free, self-hosted, good for printed text
- **Google Cloud Vision**: Paid, excellent accuracy, handwriting support
- **AWS Textract**: Paid, good for documents, handwriting support

**Recommendation**: Start with Tesseract.js, add cloud providers as optional

**Priority**: HIGH (differentiating feature)  
**Effort**: 4-5 days

---

### 3.2 AI-Assisted Content Authoring

**Current State**:
- ✅ content-authoring-svc exists
- ❌ No AI assistance

**Location**: `services/content-authoring-svc/src/ai/`

**New Files**:
```
services/content-authoring-svc/src/ai/
├── draft-generator.ts          # Generate content drafts
├── standards-tagger.ts         # Auto-tag standards
├── quality-scorer.ts           # Score content quality
└── enhancement-suggester.ts    # Suggest improvements
```

**Implementation**:
```typescript
class DraftGenerator {
  async generateDraft(params: {
    topic: string;
    gradeLevel: number;
    learningObjectives: string[];
    duration: number;
    standards?: string[];
  }): Promise<ContentDraft> {
    // Build prompt with context
    // Call AI orchestrator
    // Parse and structure response
  }
}

class QualityScorer {
  async scoreContent(content: Content): Promise<{
    readability: number;          // Flesch-Kincaid, etc.
    standardsAlignment: number;   // Alignment to standards
    engagement: number;           // Predicted engagement
    accessibility: number;        // A11y score
    overall: number;
  }> {
    // Analyze content on multiple dimensions
  }
}
```

**Priority**: HIGH  
**Effort**: 3-4 days

---

### 3.3 Enhanced Baseline Assessment

**Current State**:
- ✅ baseline-svc exists
- ❌ No learning style assessment
- ❌ No cognitive profiling

**Location**: `services/baseline-svc/src/`

**Enhancements**:
```
services/baseline-svc/src/
├── learning-style/
│   ├── detector.ts             # Detect learning preferences
│   └── assessment.ts           # Style-specific questions
├── cognitive-profile/
│   ├── profiler.ts            # Build cognitive profile
│   └── mapper.ts              # Map to Virtual Brain
└── adaptive/
    └── flow-engine.ts         # Adaptive question flow
```

**Learning Style Detection**:
- Visual learner indicators
- Auditory learner indicators
- Kinesthetic learner indicators
- Reading/writing preference indicators

**Priority**: MEDIUM  
**Effort**: 3-4 days

---

## Phase 4: Advanced Orchestration (Weeks 13-16)

### 4.1 Brain Orchestrator Service

**Location**: `services/brain-orchestrator-svc/` (new service)

**Purpose**: Centralize cognitive task coordination across all learning services

**Structure**:
```
services/brain-orchestrator-svc/
├── src/
│   ├── orchestrator/
│   │   ├── task-decomposer.ts     # Break complex tasks
│   │   ├── delegator.ts           # Delegate to services
│   │   └── coordinator.ts         # Coordinate responses
│   ├── cognitive-load/
│   │   ├── analyzer.ts            # Analyze cognitive load
│   │   ├── balancer.ts            # Balance task load
│   │   └── optimizer.ts           # Optimize sequencing
│   ├── routes/
│   │   └── orchestrate.ts
│   └── app.ts
├── package.json
└── prisma/
    └── schema.prisma
```

**Key Functionality**:
```typescript
class BrainOrchestrator {
  async orchestrateLearningTask(task: LearningTask): Promise<OrchestrationResult> {
    // 1. Decompose task into subtasks
    const subtasks = await this.decomposer.decompose(task);
    
    // 2. Analyze cognitive load
    const loadAnalysis = await this.loadAnalyzer.analyze(subtasks);
    
    // 3. Optimize sequence
    const optimizedSequence = await this.optimizer.optimize(subtasks, loadAnalysis);
    
    // 4. Delegate to services
    const results = await this.delegator.executeTasks(optimizedSequence);
    
    // 5. Coordinate and return
    return this.coordinator.synthesize(results);
  }
}
```

**Priority**: MEDIUM  
**Effort**: 6-7 days

---

### 4.2 Model Cost Optimization

**Location**: `services/ai-orchestrator/src/optimization/`

**Files**:
```
services/ai-orchestrator/src/optimization/
├── cost-tracker.ts         # Track costs per provider
├── cost-optimizer.ts       # Optimize provider selection
└── analytics.ts            # Cost analytics dashboard
```

**Features**:
- Real-time cost tracking per provider
- Monthly cost projections
- Cost-optimized routing (use cheaper models for simple tasks)
- Cost alerting when thresholds exceeded

**Priority**: MEDIUM  
**Effort**: 2-3 days

---

## Resource Requirements

### Infrastructure
- ✅ Redis (already available)
- ✅ PostgreSQL (already available)
- ⚠️ OCR Service (Tesseract or cloud provider)
- ⚠️ Image Storage (S3 or equivalent)

### Third-Party Services
- Optional: Google Cloud Vision API ($1.50/1000 images)
- Optional: AWS Textract ($1.50/1000 pages)
- Already integrated: OpenAI, Anthropic, Google Gemini

### Development Effort Summary

| Phase | Component | Effort | Priority |
|-------|-----------|--------|----------|
| 2 | Multi-Provider Enhancement | 4-5 days | HIGH |
| 2 | Agent Infrastructure | 5-6 days | HIGH |
| 3 | OCR Homework Helper | 4-5 days | HIGH |
| 3 | AI Content Authoring | 3-4 days | HIGH |
| 3 | Enhanced Baseline | 3-4 days | MEDIUM |
| 4 | Brain Orchestrator | 6-7 days | MEDIUM |
| 4 | Cost Optimization | 2-3 days | MEDIUM |
| **Total** | | **28-34 days** | |

---

## Success Metrics

### Phase 2 (AI Infrastructure)
- Provider failover success rate: >99.9%
- Average response latency: <2s p95
- Cost reduction through optimization: 20-30%

### Phase 3 (Content & Assessment)
- OCR accuracy: >95% for printed text, >85% for handwriting
- Content generation quality score: >4.0/5.0
- Baseline assessment completion rate: >85%

### Phase 4 (Orchestration)
- Task completion success rate: >95%
- Cognitive load optimization: 15-20% improvement
- Cost savings through intelligent routing: 25-35%

---

## Implementation Sequence

**Recommended Order**:
1. Multi-Provider Enhancement (enables better AI reliability)
2. Agent Infrastructure (foundation for advanced features)
3. OCR Homework Helper (high-value feature)
4. AI Content Authoring (productivity boost)
5. Enhanced Baseline (improved placement)
6. Brain Orchestrator (advanced optimization)
7. Cost Optimization (ongoing efficiency)

Each phase can begin after the previous is in production, allowing for iterative delivery and validation.
