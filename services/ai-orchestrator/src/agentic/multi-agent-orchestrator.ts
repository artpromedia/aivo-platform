/**
 * Multi-Agent Orchestration System
 *
 * Implements coordination between multiple specialist agents:
 * - Supervisor agent pattern for request routing
 * - Agent-to-agent messaging and handoff
 * - Parallel agent execution
 * - Conflict resolution between agent recommendations
 * - Shared context management
 *
 * @module ai-orchestrator/agentic/multi-agent-orchestrator
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { TUTOR_PREMIUM_REGISTRY } from './subject-tutor-registry.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Specialist agent types available in the system
 */
export type SpecialistAgentType =
  | 'TUTOR'
  | 'SUBJECT_TUTOR'
  | 'TUTOR_MATH_PREMIUM'
  | 'TUTOR_ELA_PREMIUM'
  | 'TUTOR_SCIENCE_PREMIUM'
  | 'TUTOR_HISTORY_PREMIUM'
  | 'TUTOR_CODING_PREMIUM'
  | 'GOAL_PLANNER'
  | 'FOCUS_MONITOR'
  | 'EMOTIONAL_SUPPORT'
  | 'ASSESSMENT'
  | 'CONTENT_SELECTOR'
  | 'WRITING_ASSISTANT'
  | 'SOCIAL_STORY';

/**
 * Agent capability descriptor
 */
export interface AgentCapability {
  type: SpecialistAgentType;
  name: string;
  description: string;
  capabilities: string[];
  inputTypes: string[];
  outputTypes: string[];
  priority: number;
  maxConcurrentTasks: number;
}

/**
 * Message between agents
 */
export interface AgentMessage {
  id: string;
  fromAgent: SpecialistAgentType | 'SUPERVISOR';
  toAgent: SpecialistAgentType | 'SUPERVISOR';
  type: AgentMessageType;
  payload: Record<string, unknown>;
  context: SharedAgentContext;
  timestamp: Date;
  correlationId: string;
  replyToMessageId?: string;
}

export type AgentMessageType =
  | 'REQUEST'       // Request an agent to perform a task
  | 'RESPONSE'      // Response to a request
  | 'HANDOFF'       // Transfer responsibility to another agent
  | 'NOTIFY'        // Informational notification
  | 'QUERY'         // Ask for information
  | 'CONFLICT'      // Report a conflict with another agent
  | 'ESCALATE';     // Escalate to supervisor

/**
 * Shared context accessible by all agents
 */
export interface SharedAgentContext {
  tenantId: string;
  userId: string;
  learnerId: string;
  sessionId: string;
  conversationId: string;

  // Learner state
  learnerProfile: {
    gradeLevel: number;
    age: number;
    subjects: string[];
    learningStyle?: string;
    neurodiversityProfile?: {
      adhd?: boolean;
      dyslexia?: boolean;
      autism?: boolean;
    };
    currentGoals?: string[];
    recentPerformance?: {
      subject: string;
      score: number;
    }[];
  };

  // Session state
  sessionState: {
    startTime: Date;
    currentActivity?: string;
    emotionalState?: string;
    focusLevel?: number;
    recentTopics: string[];
  };

  // Shared scratchpad for agent collaboration
  scratchpad: Map<string, unknown>;

  // Message history between agents
  agentMessages: AgentMessage[];
}

/**
 * Task for an agent to execute
 */
export interface AgentTask {
  id: string;
  type: SpecialistAgentType;
  input: string;
  context: SharedAgentContext;
  priority: 'low' | 'normal' | 'high' | 'critical';
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Result from an agent task execution
 */
export interface AgentTaskResult {
  taskId: string;
  agentType: SpecialistAgentType;
  success: boolean;
  output?: string;
  actions?: AgentAction[];
  recommendations?: AgentRecommendation[];
  handoff?: {
    toAgent: SpecialistAgentType;
    reason: string;
    context: Record<string, unknown>;
  };
  error?: string;
  durationMs: number;
  tokensUsed: number;
}

/**
 * Action an agent wants to take
 */
export interface AgentAction {
  type: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
  priority: number;
  rationale: string;
}

/**
 * Recommendation from an agent
 */
export interface AgentRecommendation {
  id: string;
  agentType: SpecialistAgentType;
  type: string;
  description: string;
  confidence: number;
  priority: number;
  rationale: string;
  conflictsWith?: string[]; // IDs of conflicting recommendations
}

/**
 * Routing decision from supervisor
 */
export interface RoutingDecision {
  primaryAgent: SpecialistAgentType;
  supportingAgents: SpecialistAgentType[];
  rationale: string;
  parallelExecution: boolean;
}

/**
 * Configuration for the multi-agent orchestrator
 */
export interface MultiAgentConfig {
  /** Maximum agents that can work in parallel */
  maxParallelAgents: number;

  /** Timeout for individual agent tasks (ms) */
  agentTimeoutMs: number;

  /** Timeout for the full orchestration (ms) */
  orchestrationTimeoutMs: number;

  /** Whether to enable conflict resolution */
  enableConflictResolution: boolean;

  /** Minimum confidence for recommendations */
  minRecommendationConfidence: number;
}

export const DEFAULT_MULTI_AGENT_CONFIG: MultiAgentConfig = {
  maxParallelAgents: 3,
  agentTimeoutMs: 30000,
  orchestrationTimeoutMs: 120000,
  enableConflictResolution: true,
  minRecommendationConfidence: 0.7,
};

// ════════════════════════════════════════════════════════════════════════════════
// AGENT REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Registry of available specialist agents
 */
export const AGENT_REGISTRY: Record<SpecialistAgentType, AgentCapability> = {
  // Premium subject tutors (Sprint 2)
  ...TUTOR_PREMIUM_REGISTRY,

  TUTOR: {
    type: 'TUTOR',
    name: 'Socratic Tutor',
    description: 'Guides learners through problems using Socratic method',
    capabilities: ['explanation', 'scaffolding', 'question-answering', 'concept-teaching'],
    inputTypes: ['question', 'problem', 'concept'],
    outputTypes: ['explanation', 'guiding-question', 'hint'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  SUBJECT_TUTOR: {
    type: 'SUBJECT_TUTOR',
    name: 'Subject-Specific Tutor',
    description: 'Subject-specific AI tutor with persona-driven teaching style for MATH, ELA, SCIENCE, HISTORY, and CODING',
    capabilities: ['subject-tutoring', 'persona-driven-teaching', 'socratic-method', 'adaptive-difficulty', 'voice-responses'],
    inputTypes: ['subject-question', 'topic-help', 'concept-explanation'],
    outputTypes: ['guided-explanation', 'practice-question', 'encouragement'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  GOAL_PLANNER: {
    type: 'GOAL_PLANNER',
    name: 'Goal Planner',
    description: 'Creates and tracks learning goals aligned with IEP/504 plans',
    capabilities: ['goal-decomposition', 'progress-tracking', 'iep-alignment', 'milestone-setting'],
    inputTypes: ['goal', 'objective', 'accommodation-request'],
    outputTypes: ['learning-plan', 'milestone', 'progress-update'],
    priority: 2,
    maxConcurrentTasks: 1,
  },
  FOCUS_MONITOR: {
    type: 'FOCUS_MONITOR',
    name: 'Focus Monitor',
    description: 'Monitors learner focus and suggests breaks/interventions',
    capabilities: ['focus-tracking', 'break-suggestion', 'attention-management'],
    inputTypes: ['behavioral-signal', 'session-data'],
    outputTypes: ['intervention', 'break-suggestion', 'focus-report'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  EMOTIONAL_SUPPORT: {
    type: 'EMOTIONAL_SUPPORT',
    name: 'Emotional Support',
    description: 'Provides emotional support and regulation strategies',
    capabilities: ['emotional-detection', 'regulation-strategies', 'encouragement'],
    inputTypes: ['emotional-signal', 'frustration-indicator'],
    outputTypes: ['support-message', 'regulation-activity', 'encouragement'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  ASSESSMENT: {
    type: 'ASSESSMENT',
    name: 'Assessment Agent',
    description: 'Creates and evaluates assessments',
    capabilities: ['question-generation', 'answer-evaluation', 'skill-assessment'],
    inputTypes: ['skill-target', 'answer-submission'],
    outputTypes: ['assessment-question', 'evaluation', 'skill-update'],
    priority: 2,
    maxConcurrentTasks: 2,
  },
  CONTENT_SELECTOR: {
    type: 'CONTENT_SELECTOR',
    name: 'Content Selector',
    description: 'Selects and recommends learning content',
    capabilities: ['content-recommendation', 'difficulty-adjustment', 'personalization'],
    inputTypes: ['learning-goal', 'skill-level'],
    outputTypes: ['content-recommendation', 'learning-path'],
    priority: 2,
    maxConcurrentTasks: 2,
  },
  WRITING_ASSISTANT: {
    type: 'WRITING_ASSISTANT',
    name: 'Writing Assistant',
    description: 'Helps with writing assignments and feedback',
    capabilities: ['writing-feedback', 'grammar-check', 'structure-guidance'],
    inputTypes: ['writing-sample', 'assignment'],
    outputTypes: ['feedback', 'suggestion', 'revision-guide'],
    priority: 2,
    maxConcurrentTasks: 1,
  },
  SOCIAL_STORY: {
    type: 'SOCIAL_STORY',
    name: 'Social Story Personalizer',
    description: 'Creates personalized social stories for neurodiverse learners',
    capabilities: ['social-story-creation', 'scenario-adaptation', 'autism-support'],
    inputTypes: ['social-scenario', 'learner-context'],
    outputTypes: ['social-story', 'visual-support'],
    priority: 2,
    maxConcurrentTasks: 1,
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// SUPERVISOR AGENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Supervisor agent that routes requests and coordinates specialists
 */
export class SupervisorAgent {
  private readonly llm: LLMOrchestrator;
  private readonly registry: Record<SpecialistAgentType, AgentCapability>;

  constructor(llm: LLMOrchestrator) {
    this.llm = llm;
    this.registry = AGENT_REGISTRY;
  }

  /**
   * Route a request to appropriate specialist agents
   */
  async route(
    userInput: string,
    context: SharedAgentContext
  ): Promise<RoutingDecision> {
    const availableAgents = this.getAvailableAgents(context);

    const systemPrompt = this.buildRoutingPrompt(availableAgents);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Route this learner request to appropriate agents:

Learner Input: "${userInput}"

Learner Context:
- Grade Level: ${context.learnerProfile.gradeLevel}
- Current Activity: ${context.sessionState.currentActivity ?? 'None'}
- Emotional State: ${context.sessionState.emotionalState ?? 'Unknown'}
- Recent Topics: ${context.sessionState.recentTopics.join(', ') || 'None'}

Decide which agent(s) should handle this request.`,
      },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 500,
    });

    return this.parseRoutingDecision(result.content, availableAgents);
  }

  /**
   * Resolve conflicts between agent recommendations
   */
  async resolveConflicts(
    recommendations: AgentRecommendation[],
    context: SharedAgentContext
  ): Promise<AgentRecommendation[]> {
    // Group recommendations by conflict clusters
    const clusters = this.clusterConflictingRecommendations(recommendations);

    const resolved: AgentRecommendation[] = [];

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        resolved.push(cluster[0]);
        continue;
      }

      // Use LLM to resolve conflicts
      const winner = await this.resolveConflictCluster(cluster, context);
      if (winner) {
        resolved.push(winner);
      }
    }

    return resolved;
  }

  private getAvailableAgents(context: SharedAgentContext): AgentCapability[] {
    // Filter agents based on context
    const agents = Object.values(this.registry);

    // Prioritize autism support if learner has autism
    if (context.learnerProfile.neurodiversityProfile?.autism) {
      const socialStory = agents.find(a => a.type === 'SOCIAL_STORY');
      if (socialStory) {
        socialStory.priority = 0;
      }
    }

    return agents.sort((a, b) => a.priority - b.priority);
  }

  private buildRoutingPrompt(agents: AgentCapability[]): string {
    const agentDescriptions = agents
      .map(a => `${a.type}: ${a.description}\n  Capabilities: ${a.capabilities.join(', ')}`)
      .join('\n');

    return `You are a supervisor agent that routes learner requests to specialist agents.

Available Agents:
${agentDescriptions}

Your task:
1. Analyze the learner's request
2. Select the PRIMARY agent best suited to handle it
3. Identify any SUPPORTING agents that should assist
4. Decide if agents should work in PARALLEL or SEQUENTIAL

Respond in this exact JSON format:
{
  "primaryAgent": "AGENT_TYPE",
  "supportingAgents": ["AGENT_TYPE"],
  "rationale": "Brief explanation",
  "parallelExecution": true/false
}`;
  }

  private parseRoutingDecision(
    content: string,
    availableAgents: AgentCapability[]
  ): RoutingDecision {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          primaryAgent: string;
          supportingAgents?: string[];
          rationale?: string;
          parallelExecution?: boolean;
        };

        // Validate agent types
        const validAgentTypes = new Set(availableAgents.map(a => a.type));

        const primaryAgent = validAgentTypes.has(parsed.primaryAgent as SpecialistAgentType)
          ? (parsed.primaryAgent as SpecialistAgentType)
          : 'TUTOR';

        const supportingAgents = (parsed.supportingAgents ?? [])
          .filter((a): a is SpecialistAgentType => validAgentTypes.has(a as SpecialistAgentType));

        return {
          primaryAgent,
          supportingAgents,
          rationale: parsed.rationale ?? 'Default routing',
          parallelExecution: parsed.parallelExecution ?? false,
        };
      }
    } catch (error) {
      console.error('Failed to parse routing decision:', error);
    }

    // Default to tutor agent
    return {
      primaryAgent: 'TUTOR',
      supportingAgents: [],
      rationale: 'Default routing to tutor agent',
      parallelExecution: false,
    };
  }

  private clusterConflictingRecommendations(
    recommendations: AgentRecommendation[]
  ): AgentRecommendation[][] {
    const clusters: AgentRecommendation[][] = [];
    const processed = new Set<string>();

    for (const rec of recommendations) {
      if (processed.has(rec.id)) continue;

      const cluster = [rec];
      processed.add(rec.id);

      // Find all conflicting recommendations
      if (rec.conflictsWith) {
        for (const conflictId of rec.conflictsWith) {
          const conflict = recommendations.find(r => r.id === conflictId);
          if (conflict && !processed.has(conflict.id)) {
            cluster.push(conflict);
            processed.add(conflict.id);
          }
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  private async resolveConflictCluster(
    cluster: AgentRecommendation[],
    context: SharedAgentContext
  ): Promise<AgentRecommendation | null> {
    const descriptions = cluster
      .map((r, i) => `${i + 1}. [${r.agentType}] ${r.description} (confidence: ${r.confidence})`)
      .join('\n');

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are resolving conflicts between agent recommendations.
Consider the learner's current state and goals when deciding.
Respond with just the number of the best recommendation.`,
      },
      {
        role: 'user',
        content: `Conflicting recommendations:
${descriptions}

Learner context:
- Emotional state: ${context.sessionState.emotionalState ?? 'Unknown'}
- Focus level: ${context.sessionState.focusLevel ?? 'Unknown'}
- Current goals: ${context.learnerProfile.currentGoals?.join(', ') ?? 'None specified'}

Which recommendation is best for this learner right now?`,
      },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.2,
      maxTokens: 50,
    });

    const match = result.content.match(/\d+/);
    if (match) {
      const index = Number.parseInt(match[0]) - 1;
      if (index >= 0 && index < cluster.length) {
        return cluster[index];
      }
    }

    // Default to highest confidence
    return cluster.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Orchestrates multiple specialist agents to handle complex requests
 */
export class MultiAgentOrchestrator extends EventEmitter {
  private readonly llm: LLMOrchestrator;
  private readonly supervisor: SupervisorAgent;
  private readonly agentHandlers: Map<SpecialistAgentType, AgentHandler>;
  private readonly config: MultiAgentConfig;
  private readonly redis: Redis;

  constructor(
    llm: LLMOrchestrator,
    redis: Redis,
    config: Partial<MultiAgentConfig> = {}
  ) {
    super();
    this.llm = llm;
    this.redis = redis;
    this.supervisor = new SupervisorAgent(llm);
    this.agentHandlers = new Map();
    this.config = { ...DEFAULT_MULTI_AGENT_CONFIG, ...config };
  }

  /**
   * Register a handler for a specialist agent type
   */
  registerAgent(type: SpecialistAgentType, handler: AgentHandler): void {
    this.agentHandlers.set(type, handler);
    console.log(`Registered agent handler: ${type}`);
  }

  /**
   * Orchestrate handling of a user request
   */
  async orchestrate(
    userInput: string,
    context: SharedAgentContext
  ): Promise<OrchestrateResult> {
    const startTime = Date.now();
    const orchestrationId = randomUUID();

    this.emit('orchestration:started', { orchestrationId, userInput });

    try {
      // 1. Route request to appropriate agents
      const routing = await this.supervisor.route(userInput, context);
      this.emit('orchestration:routed', { orchestrationId, routing });

      // 2. Execute agents
      const allAgents = [routing.primaryAgent, ...routing.supportingAgents];
      const results = await this.executeAgents(
        allAgents,
        userInput,
        context,
        routing.parallelExecution
      );

      // 3. Collect recommendations
      const allRecommendations: AgentRecommendation[] = [];
      for (const result of results) {
        if (result.recommendations) {
          allRecommendations.push(...result.recommendations);
        }
      }

      // 4. Resolve conflicts if needed
      let finalRecommendations = allRecommendations;
      if (this.config.enableConflictResolution && allRecommendations.length > 1) {
        finalRecommendations = await this.supervisor.resolveConflicts(
          allRecommendations,
          context
        );
      }

      // 5. Handle any handoffs
      const handoffs = results.filter(r => r.handoff);
      for (const result of handoffs) {
        if (result.handoff) {
          const handoffResult = await this.executeHandoff(
            result.handoff,
            context
          );
          results.push(handoffResult);
        }
      }

      // 6. Synthesize final response
      const _primaryResult = results.find(r => r.agentType === routing.primaryAgent);
      const finalResponse = await this.synthesizeResponse(
        results,
        finalRecommendations,
        context
      );

      const orchestrationResult: OrchestrateResult = {
        orchestrationId,
        success: true,
        response: finalResponse,
        routing,
        agentResults: results,
        recommendations: finalRecommendations,
        durationMs: Date.now() - startTime,
      };

      this.emit('orchestration:completed', orchestrationResult);
      return orchestrationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('orchestration:error', { orchestrationId, error: errorMessage });

      return {
        orchestrationId,
        success: false,
        response: "I'm having trouble processing your request right now. Let me try a simpler approach.",
        routing: {
          primaryAgent: 'TUTOR',
          supportingAgents: [],
          rationale: 'Fallback due to error',
          parallelExecution: false,
        },
        agentResults: [],
        recommendations: [],
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute multiple agents (parallel or sequential)
   */
  private async executeAgents(
    agents: SpecialistAgentType[],
    input: string,
    context: SharedAgentContext,
    parallel: boolean
  ): Promise<AgentTaskResult[]> {
    const tasks: AgentTask[] = agents.map((type, index) => ({
      id: randomUUID(),
      type,
      input,
      context,
      priority: index === 0 ? 'high' : 'normal',
    }));

    if (parallel) {
      // Limit parallel execution
      const batches: AgentTask[][] = [];
      for (let i = 0; i < tasks.length; i += this.config.maxParallelAgents) {
        batches.push(tasks.slice(i, i + this.config.maxParallelAgents));
      }

      const results: AgentTaskResult[] = [];
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(task => this.executeTask(task))
        );
        results.push(...batchResults);
      }
      return results;
    } else {
      const results: AgentTaskResult[] = [];
      for (const task of tasks) {
        const result = await this.executeTask(task);
        results.push(result);

        // Stop if primary agent provides final answer
        if (task.type === agents[0] && result.success && !result.handoff) {
          break;
        }
      }
      return results;
    }
  }

  /**
   * Execute a single agent task
   */
  private async executeTask(task: AgentTask): Promise<AgentTaskResult> {
    const startTime = Date.now();

    const handler = this.agentHandlers.get(task.type);
    if (!handler) {
      return {
        taskId: task.id,
        agentType: task.type,
        success: false,
        error: `No handler registered for agent type: ${task.type}`,
        durationMs: Date.now() - startTime,
        tokensUsed: 0,
      };
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        handler.execute(task),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Agent timeout')), this.config.agentTimeoutMs)
        ),
      ]);

      return {
        ...result,
        taskId: task.id,
        agentType: task.type,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        taskId: task.id,
        agentType: task.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Execute a handoff to another agent
   */
  private async executeHandoff(
    handoff: {
      toAgent: SpecialistAgentType;
      reason: string;
      context: Record<string, unknown>;
    },
    context: SharedAgentContext
  ): Promise<AgentTaskResult> {
    const task: AgentTask = {
      id: randomUUID(),
      type: handoff.toAgent,
      input: JSON.stringify(handoff.context),
      context,
      priority: 'high',
      metadata: { handoff: true, reason: handoff.reason },
    };

    return this.executeTask(task);
  }

  /**
   * Synthesize a final response from multiple agent results
   */
  private async synthesizeResponse(
    results: AgentTaskResult[],
    recommendations: AgentRecommendation[],
    context: SharedAgentContext
  ): Promise<string> {
    // If only one successful result, use it directly
    const successfulResults = results.filter(r => r.success && r.output);
    if (successfulResults.length === 1) {
      return successfulResults[0].output!;
    }

    if (successfulResults.length === 0) {
      return "I'm having trouble helping with that right now. Could you try asking in a different way?";
    }

    // Synthesize from multiple results
    const outputs = successfulResults
      .map(r => `[${r.agentType}]: ${r.output}`)
      .join('\n\n');

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are synthesizing responses from multiple educational AI agents into a single, cohesive response for a learner.
Keep the response age-appropriate for grade ${context.learnerProfile.gradeLevel}.
Make sure the response is helpful and encouraging.`,
      },
      {
        role: 'user',
        content: `Synthesize these agent responses into one clear response:

${outputs}

Create a single, cohesive response that incorporates the best elements from each agent.`,
      },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 1000,
    });

    return result.content;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// AGENT HANDLER INTERFACE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Interface for specialist agent handlers
 */
export interface AgentHandler {
  execute(task: AgentTask): Promise<Omit<AgentTaskResult, 'taskId' | 'agentType' | 'durationMs'>>;
}

/**
 * Result of a full orchestration
 */
export interface OrchestrateResult {
  orchestrationId: string;
  success: boolean;
  response: string;
  routing: RoutingDecision;
  agentResults: AgentTaskResult[];
  recommendations: AgentRecommendation[];
  durationMs: number;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MESSAGE PASSING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create an agent message
 */
export function createAgentMessage(
  fromAgent: SpecialistAgentType | 'SUPERVISOR',
  toAgent: SpecialistAgentType | 'SUPERVISOR',
  type: AgentMessageType,
  payload: Record<string, unknown>,
  context: SharedAgentContext,
  replyToMessageId?: string
): AgentMessage {
  return {
    id: randomUUID(),
    fromAgent,
    toAgent,
    type,
    payload,
    context,
    timestamp: new Date(),
    correlationId: context.sessionId,
    replyToMessageId,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default MultiAgentOrchestrator;
