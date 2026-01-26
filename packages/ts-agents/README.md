# @aivo/ts-agents

A comprehensive TypeScript framework for building AI agents with Redis-backed state persistence, episodic memory, and tool execution capabilities.

## Features

- **State Persistence**: Redis-backed state management with checkpointing and recovery
- **Memory System**: Episodic, working, and long-term memory with vector similarity search
- **Tool Execution**: Type-safe tool registry with validation and parallel execution
- **Model Adapters**: Support for OpenAI and Anthropic (Claude) models
- **Conversation Management**: Context window optimization and message history
- **Educational Agents**: Pre-built agents for tutoring, assessment, and feedback
- **Observability**: Logging, metrics, and distributed tracing

## Installation

```bash
pnpm add @aivo/ts-agents
```

### Optional Dependencies

```bash
# For Redis state persistence
pnpm add ioredis

# For OpenAI models
pnpm add openai

# For Anthropic models
pnpm add @anthropic-ai/sdk
```

## Quick Start

### Basic Agent

```typescript
import { AgentBuilder, calculatorTool } from '@aivo/ts-agents';

const agent = new AgentBuilder()
  .withName('Math Assistant')
  .withSystemPrompt('You are a helpful math assistant.')
  .withModel({ provider: 'openai', model: 'gpt-4' })
  .withTools([calculatorTool])
  .build();

const result = await agent.run(
  { message: 'What is 15% of 280?' },
  { sessionId: 'session-123', userId: 'user-456', tenantId: 'tenant-789', metadata: {} }
);

console.log(result.message);
```

### With Redis State Persistence

```typescript
import Redis from 'ioredis';
import { AgentBuilder, RedisStateStore } from '@aivo/ts-agents';

const redis = new Redis('redis://localhost:6379');

const agent = new AgentBuilder()
  .withName('Persistent Agent')
  .withSystemPrompt('You are a helpful assistant with persistent memory.')
  .withModel('openai:gpt-4')
  .withRedis(redis)
  .withStateTTL(3600) // 1 hour
  .withEpisodicMemory({ maxEpisodes: 100 })
  .withLongTermMemory({ vectorStore: 'memory' })
  .build();
```

### Educational Agents

```typescript
import { createTutorAgent, createAssessmentAgent, createFeedbackAgent } from '@aivo/ts-agents';

// Create a math tutor
const tutor = createTutorAgent({
  subject: 'Mathematics',
  gradeLevel: '6-8',
  teachingStyle: 'socratic',
  hintsEnabled: true,
  adaptiveDifficulty: true,
});

// Create an assessment agent
const assessment = createAssessmentAgent({
  subject: 'Mathematics',
  topics: ['algebra', 'geometry', 'fractions'],
  adaptiveDifficulty: true,
  minQuestions: 5,
  maxQuestions: 15,
});

// Create a feedback agent
const feedback = createFeedbackAgent({
  subject: 'Writing',
  defaultTone: 'encouraging',
  feedbackFocus: 'growth',
  includeSuggestions: true,
  trackProgress: true,
});
```

## Core Concepts

### Agent

The `Agent` class is the main abstraction for building AI agents:

```typescript
import { Agent, AgentConfig, AgentContext } from '@aivo/ts-agents';

class CustomAgent extends Agent {
  protected async onStart(context: AgentContext): Promise<void> {
    // Called when agent starts
  }

  protected async onToolCall(tool: string, params: Record<string, unknown>): Promise<void> {
    // Called before each tool execution
  }

  protected async onComplete(output: AgentOutput): Promise<void> {
    // Called when agent completes
  }

  protected async onError(error: Error): Promise<void> {
    // Called on error
  }
}
```

### Tools

Define custom tools with type-safe parameters:

```typescript
import { defineTool } from '@aivo/ts-agents';

const weatherTool = defineTool<{ city: string; units?: 'celsius' | 'fahrenheit' }>({
  name: 'get_weather',
  description: 'Get the current weather for a city',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'The city name' },
      units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' },
    },
    required: ['city'],
  },
  execute: async (params, context) => {
    // Fetch weather data
    return { temperature: 22, conditions: 'sunny' };
  },
});
```

### Memory System

The memory system provides episodic, working, and long-term storage:

```typescript
import { MemoryManager, createMemoryManager } from '@aivo/ts-agents';

const memoryManager = createMemoryManager({
  episodic: { enabled: true, maxEpisodes: 100 },
  working: { capacity: 7 },
  longTerm: { enabled: true, vectorStore: 'memory' },
});

// Store a memory
await memoryManager.remember('User prefers detailed explanations', 'long-term', {
  topic: 'preferences',
});

// Recall relevant memories
const memories = await memoryManager.recall('How does the user like explanations?');
```

### State Management

State is automatically persisted and can be restored:

```typescript
import { StateManager, RedisStateStore } from '@aivo/ts-agents';
import Redis from 'ioredis';

const redis = new Redis();
const store = new RedisStateStore(redis, { defaultTtlSeconds: 3600 });

const stateManager = new StateManager(store, {
  store: 'redis',
  ttlSeconds: 3600,
  checkpointInterval: 5,
  maxCheckpoints: 10,
});

// Initialize state
const state = await stateManager.initialize('session-123', 'agent-id');

// Create checkpoints
await stateManager.checkpoint('session-123', 'before-tool-call');

// Restore from checkpoint
await stateManager.restore('session-123', 'checkpoint-id');
```

## Architecture

```
@aivo/ts-agents
├── core/           # Agent, AgentBuilder, AgentRunner, types
├── state/          # StateManager, RedisStateStore, MemoryStateStore
├── memory/         # EpisodicMemory, WorkingMemory, LongTermMemory
├── tools/          # ToolRegistry, ToolExecutor, built-in tools
├── providers/      # OpenAI and Anthropic model adapters
├── conversation/   # ConversationManager, ContextWindowManager
├── observability/  # Logger, Metrics, Tracing
└── educational/    # TutorAgent, AssessmentAgent, FeedbackAgent
```

## API Reference

### AgentBuilder

| Method | Description |
|--------|-------------|
| `withId(id)` | Set agent ID |
| `withName(name)` | Set agent name |
| `withSystemPrompt(prompt)` | Set system prompt |
| `withModel(config)` | Set model configuration |
| `withTools(tools)` | Add tools |
| `withRedis(client)` | Use Redis for state |
| `withMemory(config)` | Configure memory system |
| `withMaxIterations(n)` | Set max iterations |
| `build()` | Build the agent |

### Agent

| Method | Description |
|--------|-------------|
| `run(input, context)` | Execute the agent |
| `saveState()` | Save current state |
| `restoreState(sessionId)` | Restore state |
| `remember(key, value, type)` | Store in memory |
| `recall(query, type)` | Retrieve from memory |
| `executeTool(name, params)` | Execute a tool |

### ToolRegistry

| Method | Description |
|--------|-------------|
| `register(tool)` | Register a tool |
| `unregister(name)` | Remove a tool |
| `get(name)` | Get a tool |
| `getAll()` | Get all tools |
| `getToolDefinitions()` | Get definitions for LLM |

### MemoryManager

| Method | Description |
|--------|-------------|
| `remember(content, type, metadata)` | Store memory |
| `recall(query, options)` | Retrieve memories |
| `getRelevantContext(query, maxTokens)` | Get context string |
| `transferToLongTerm()` | Consolidate memories |

## Configuration

### Model Configuration

```typescript
interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### State Configuration

```typescript
interface StateConfig {
  store: 'redis' | 'memory';
  ttlSeconds: number;
  checkpointInterval: number;
  maxCheckpoints: number;
  encryptionKey?: string;
}
```

### Memory Configuration

```typescript
interface MemoryConfig {
  episodic?: { enabled: boolean; maxEpisodes?: number };
  working?: { capacity?: number };
  longTerm?: { enabled: boolean; vectorStore?: string };
}
```

## Built-in Tools

- **calculatorTool**: Mathematical calculations
- **searchTool**: Knowledge base search
- **curriculumLookupTool**: Educational standards lookup

## Observability

### Logging

```typescript
import { createAgentLogger } from '@aivo/ts-agents';

const logger = createAgentLogger('agent-id', 'session-id', {
  level: 'debug',
  pretty: true,
});

logger.info('Agent started', { input: userMessage });
```

### Metrics

```typescript
import { createAgentMetrics } from '@aivo/ts-agents';

const metrics = createAgentMetrics({ prefix: 'myapp_' });

metrics.increment('requests_total');
metrics.histogram('response_time_ms', 150);
```

### Tracing

```typescript
import { createTraceContext } from '@aivo/ts-agents';

const tracer = createTraceContext({ serviceName: 'agent-service' });

await tracer.withSpan('process-request', async (span) => {
  tracer.setAttributes(span, { userId: 'user-123' });
  // ... processing
});
```

## License

UNLICENSED - Internal use only
