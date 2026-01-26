/**
 * @aivo/ts-agents - Agent infrastructure with state persistence, memory, and tool execution
 *
 * A comprehensive framework for building AI agents with:
 * - Redis-backed state persistence
 * - Episodic, working, and long-term memory
 * - Tool execution capabilities
 * - Model adapters for OpenAI and Anthropic
 * - Pre-built educational agents
 *
 * @example
 * ```typescript
 * import { AgentBuilder, RedisStateStore } from '@aivo/ts-agents';
 *
 * const agent = new AgentBuilder()
 *   .withName('Math Tutor')
 *   .withSystemPrompt('You are a patient math tutor...')
 *   .withModel({ provider: 'anthropic', model: 'claude-3-sonnet' })
 *   .withTools([calculatorTool])
 *   .withRedis(redisClient)
 *   .build();
 *
 * const result = await agent.run(
 *   { message: "Help me understand quadratic equations" },
 *   { sessionId: 'session-123', userId: 'user-456', tenantId: 'tenant-789' }
 * );
 * ```
 *
 * @packageDocumentation
 */

// Core exports
export * from './core/index.js';

// State management
export * from './state/index.js';

// Memory system
export * from './memory/index.js';

// Tool system
export * from './tools/index.js';

// Model providers
export * from './providers/index.js';

// Conversation management
export * from './conversation/index.js';

// Observability
export * from './observability/index.js';

// Educational agents
export * from './educational/index.js';
