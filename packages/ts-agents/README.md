# @aivo/ts-agents

A comprehensive TypeScript framework for building AI agents with Redis-backed state persistence, episodic memory, and tool execution capabilities.

## Features

- **State Persistence**: Redis-backed or in-memory state management with checkpointing
- **Memory System**: Episodic, working, and long-term memory with vector similarity search
- **Tool Execution**: Flexible tool registry with validation, timeout, and retry support
- **Conversation Management**: Message history, context window optimization, and branching
- **Multi-Provider Support**: Adapters for Anthropic Claude and OpenAI GPT models
- **Observability**: Structured logging, metrics collection, and distributed tracing
- **Educational Agents**: Pre-built tutor, assessment, and feedback agents

## Installation

```bash
pnpm add @aivo/ts-agents
```

### Peer Dependencies

```bash
# For Redis state storage
pnpm add ioredis

# For Anthropic models
pnpm add @anthropic-ai/sdk

# For OpenAI models
pnpm add openai
```

## Quick Start

```typescript
import {
  AgentBuilder,
  RedisStateStore,
  calculatorTool,
  searchTool,
} from '@aivo/ts-agents';
import Redis from 'ioredis';

// Create Redis client
const redis = new Redis();

// Build an agent
const agent = new AgentBuilder()
  .withName('Math Tutor')
  .withDescription('A helpful math tutoring assistant')
  .withSystemPrompt(`You are a patient math tutor...`)
  .withModel({
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 4096,
  })
  .withTools([calculatorTool, searchTool])
  .withStateStore(new RedisStateStore(redis))
  .withMemory({
    episodic: { enabled: true, maxEpisodes: 100 },
    working: { capacity: 7 },
    longTerm: { enabled: true },
  })
  .withAnthropicKey(process.env.ANTHROPIC_API_KEY)
  .build();

// Run the agent
const result = await agent.run(
  { message: "Help me understand quadratic equations" },
  {
    sessionId: 'session-123',
    userId: 'user-456',
    tenantId: 'tenant-789',
    metadata: {},
  }
);

console.log(result.message);
```

## Core Concepts

### Agent

The base class for all agents. Handles the execution loop, state management, memory operations, and tool execution.

```typescript
import { Agent, AgentConfig, AgentDependencies } from '@aivo/ts-agents';

class MyCustomAgent extends Agent {
  constructor(config: AgentConfig, deps: AgentDependencies) {
    super(config, deps);
  }

  // Override lifecycle hooks
  protected async onStart(context: AgentContext): Promise<void> {
    console.log('Agent starting...');
  }

  protected async onComplete(output: AgentOutput): Promise<void> {
    console.log('Agent completed:', output);
  }

  protected async onError(error: Error): Promise<void> {
    console.error('Agent error:', error);
  }
}
```

### AgentBuilder

Fluent builder for creating agents with all dependencies configured.

```typescript
const agent = new AgentBuilder()
  .withId('custom-id')
  .withName('My Agent')
  .withDescription('Description')
  .withSystemPrompt('You are...')
  .withModel({ provider: 'anthropic', model: 'claude-3-sonnet-20240229' })
  .withTools([tool1, tool2])
  .withMaxIterations(20)
  .withTimeout(300000)
  .withStateConfig({ store: 'redis', ttlSeconds: 3600 })
  .withMemory({ episodic: { enabled: true, maxEpisodes: 100 } })
  .withRedis(redisClient)
  .withAnthropicKey('sk-...')
  .build();
```

### State Management

Persist agent state across sessions with Redis or in-memory storage.

```typescript
import { StateManager, RedisStateStore, MemoryStateStore } from '@aivo/ts-agents';

// Redis storage (production)
const redisStore = new RedisStateStore(redisClient, {
  keyPrefix: 'myapp:agent:',
});

// Memory storage (development)
const memoryStore = new MemoryStateStore({
  maxSize: 1000,
  cleanupIntervalMs: 60000,
});

// Create state manager
const stateManager = new StateManager(redisStore, {
  store: 'redis',
  ttlSeconds: 3600,
  checkpointInterval: 5,
  maxCheckpoints: 10,
});

// Initialize state
const state = await stateManager.initialize('session-id', 'agent-id');

// Update state
await stateManager.update('session-id', { status: 'running' });

// Create checkpoint
await stateManager.checkpoint('session-id', 'after-tool-call');

// Restore from checkpoint
await stateManager.restore('session-id', 'checkpoint-id');
```

### Memory System

Three-tier memory system inspired by cognitive architecture.

```typescript
import {
  EpisodicMemory,
  WorkingMemory,
  LongTermMemory,
  MemoryManager,
} from '@aivo/ts-agents';

// Episodic Memory - Stores specific interactions
const episodic = new EpisodicMemory(100);
await episodic.record({
  type: 'question',
  content: { question: 'What is 2+2?', answer: '4' },
  participants: ['user', 'agent'],
  timestamp: new Date(),
  metadata: { topic: 'math' },
});

// Working Memory - Short-term storage (Miller's Law: 7±2 items)
const working = new WorkingMemory(7);
await working.push({ content: 'Current task', timestamp: new Date() });

// Long-Term Memory - Persistent storage with similarity search
const longTerm = new LongTermMemory({ enabled: true });
await longTerm.store({
  type: 'long-term',
  content: { fact: 'Quadratic formula: x = (-b ± √(b²-4ac)) / 2a' },
  timestamp: new Date(),
  importance: 0.9,
  metadata: { topic: 'algebra' },
});

// Memory Manager - Unified interface
const memoryManager = new MemoryManager(episodic, working, longTerm, config);
const memories = await memoryManager.recall('quadratic equations', { limit: 5 });
const context = await memoryManager.getRelevantContext('quadratic', 1000);
```

### Tool System

Create and register custom tools for agent capabilities.

```typescript
import {
  ToolRegistry,
  ToolExecutor,
  defineTool,
  toolSuccess,
  toolError,
} from '@aivo/ts-agents';

// Define a custom tool
const myTool = defineTool({
  name: 'my_tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input value' },
    },
    required: ['input'],
  },
  execute: async (params, context) => {
    try {
      const result = await doSomething(params.input);
      return toolSuccess(result, Date.now() - startTime);
    } catch (error) {
      return toolError(error.message, Date.now() - startTime);
    }
  },
  metadata: {
    category: 'custom',
    tags: ['utility'],
  },
});

// Register tools
const registry = new ToolRegistry();
registry.register(myTool);

// Execute tools
const executor = new ToolExecutor(registry, {
  timeout: 30000,
  retryAttempts: 3,
});

const result = await executor.execute('my_tool', { input: 'test' }, context);
```

### Built-in Tools

```typescript
import {
  calculatorTool,
  searchTool,
  curriculumLookupTool,
  configureSearchData,
  configureCurriculumData,
} from '@aivo/ts-agents';

// Calculator - Mathematical operations
const calcResult = await calculatorTool.execute(
  { operation: 'add', a: 5, b: 3 },
  context
);
// { success: true, data: { result: 8, steps: ['5 + 3 = 8'] } }

// Search - Educational content search
configureSearchData([
  { id: '1', title: 'Algebra Basics', snippet: '...', relevanceScore: 0.9 },
]);
const searchResult = await searchTool.execute(
  { query: 'algebra', maxResults: 5 },
  context
);

// Curriculum Lookup - Standards and objectives
configureCurriculumData([
  {
    id: 'CCSS.MATH.4.NF.1',
    code: 'CCSS.MATH.4.NF.1',
    title: 'Equivalent Fractions',
    // ...
  },
]);
const curriculumResult = await curriculumLookupTool.execute(
  { action: 'get', standardId: 'CCSS.MATH.4.NF.1' },
  context
);
```

### Conversation Management

```typescript
import { ConversationManager, ContextWindowManager } from '@aivo/ts-agents';

const conversation = new ConversationManager({
  maxHistoryLength: 100,
  maxTokens: 8000,
  summarizeThreshold: 50,
});

// Add messages
await conversation.addUserMessage('Hello!');
await conversation.addAssistantMessage('Hi! How can I help?');

// Get history for context window
const history = await conversation.getContextWindow(4000);

// Branch conversations
const branch = await conversation.branch('exploration');
await conversation.addUserMessage('What if we try...', { branchId: branch.id });
await conversation.mergeBranch(branch.id);

// Summarize long conversations
const summary = await conversation.summarizeHistory();
```

### Model Adapters

```typescript
import { AnthropicAdapter, OpenAIAdapter, MockModelAdapter } from '@aivo/ts-agents';

// Anthropic Claude
const anthropic = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY);
const response = await anthropic.generate({
  systemPrompt: 'You are helpful...',
  messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
  tools: [],
  config: { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
});

// OpenAI GPT
const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);

// Mock adapter for testing
const mock = new MockModelAdapter();
mock.setResponses([
  { message: 'Test response', finishReason: 'stop' },
]);
```

### Observability

```typescript
import {
  AgentLogger,
  AgentMetrics,
  TraceContext,
  ConsoleTransport,
  JsonTransport,
} from '@aivo/ts-agents';

// Logging
const logger = new AgentLogger({
  level: 'info',
  transports: [new ConsoleTransport(), new JsonTransport()],
});

logger.setContext({ agentId: 'tutor', sessionId: 'session-123' });
logger.info('Agent started', { input: 'Hello' });
logger.error('Tool failed', new Error('Timeout'), { tool: 'search' });

// Metrics
const metrics = new AgentMetrics('tutor', {
  enabled: true,
  flushIntervalMs: 60000,
  onFlush: (snapshot) => console.log('Metrics:', snapshot),
});

metrics.recordAgentExecution(1500, true);
metrics.recordToolExecution('calculator', 50, true);
metrics.recordTokenUsage(500, 200);

// Tracing
const trace = new TraceContext({
  serviceName: 'ts-agents',
  enabled: true,
  sampleRate: 1.0,
});

const span = trace.startTrace('agent.run');
trace.setTag(span, 'agent.id', 'tutor');

await trace.withSpan('tool.execute', async (toolSpan) => {
  trace.log(toolSpan, 'Executing tool', 'info', { tool: 'calculator' });
  // ... execute tool
});

trace.endSpan(span);
await trace.endTrace();
```

## Educational Agents

### TutorAgent

```typescript
import { TutorAgent, AgentBuilder } from '@aivo/ts-agents';

// Create using builder
const tutorBuilder = TutorAgent.create({
  name: 'Math Tutor',
  subject: 'Mathematics',
  gradeLevel: '6-8',
  teachingStyle: 'socratic',
});

const tutor = tutorBuilder
  .withTools([calculatorTool])
  .withAnthropicKey(apiKey)
  .buildAs(TutorAgent);

// Set student profile for personalization
tutor.setStudentProfile({
  learningStyle: 'visual',
  priorKnowledge: ['basic arithmetic', 'simple fractions'],
  strengths: ['pattern recognition'],
  areasForImprovement: ['word problems'],
});

const result = await tutor.run(
  { message: "I don't understand how to add fractions" },
  context
);
```

### AssessmentAgent

```typescript
import { AssessmentAgent, Question } from '@aivo/ts-agents';

const assessmentBuilder = AssessmentAgent.create({
  name: 'Math Assessment',
  subject: 'Mathematics',
  assessmentType: 'adaptive',
});

const assessment = assessmentBuilder.buildAs(AssessmentAgent);

// Set up question bank
assessment.setQuestionBank([
  {
    id: 'q1',
    content: 'What is 2 + 2?',
    type: 'short-answer',
    difficulty: 0.2,
    topic: 'Addition',
    skills: ['basic-arithmetic'],
    correctAnswer: '4',
    points: 1,
  },
  // ... more questions
]);

// Get adaptive questions
const nextQuestion = assessment.getNextQuestion();

// Record responses
assessment.recordResponse({
  questionId: 'q1',
  answer: '4',
  timestamp: new Date(),
  responseTimeMs: 5000,
});

// Get results
const results = assessment.calculateResults();
console.log('Score:', results.percentageScore);
console.log('Estimated skill level:', results.estimatedSkillLevel);
console.log('Recommendations:', results.recommendations);
```

### FeedbackAgent

```typescript
import { FeedbackAgent, Goal } from '@aivo/ts-agents';

const feedbackBuilder = FeedbackAgent.create({
  name: 'Progress Coach',
  feedbackStyle: 'encouraging',
});

const feedback = feedbackBuilder.buildAs(FeedbackAgent);

// Add goals
const goal = feedback.addGoal({
  title: 'Master Fractions',
  description: 'Understand and apply fraction operations',
  targetDate: new Date('2024-06-01'),
  progress: 25,
  milestones: [
    { id: 'm1', title: 'Understanding numerators/denominators', completed: true },
    { id: 'm2', title: 'Adding fractions', completed: false },
    { id: 'm3', title: 'Multiplying fractions', completed: false },
  ],
});

// Record progress
feedback.recordProgress({
  subject: 'Math',
  activity: 'Fraction practice',
  performance: 75,
  effort: 90,
  notes: 'Good improvement on adding fractions',
  strengths: ['Understanding concept'],
  improvements: ['Speed'],
});

// Generate report
const report = feedback.generateReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
console.log('Progress:', report.overallProgress);
console.log('Trend:', report.progressTrend);
console.log('Message:', report.motivationalMessage);
```

## API Reference

### Types

- `AgentConfig` - Agent configuration options
- `AgentContext` - Execution context (session, user, tenant)
- `AgentInput` - Input message and attachments
- `AgentOutput` - Response with tool calls and usage
- `AgentState` - Persisted agent state
- `Tool` - Tool definition with execute function
- `Memory` - Memory entry with content and metadata

### Classes

- `Agent` - Base agent class
- `AgentBuilder` - Fluent agent builder
- `AgentRunner` - Manages agent execution lifecycle
- `StateMachine` - Finite state machine for agent states
- `StateManager` - State persistence manager
- `MemoryManager` - Unified memory interface
- `ToolRegistry` - Tool registration and lookup
- `ToolExecutor` - Tool execution with validation
- `ConversationManager` - Conversation handling
- `ModelAdapter` - Abstract LLM adapter

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests.

## License

UNLICENSED - Internal use only.
