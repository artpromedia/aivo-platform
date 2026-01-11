/**
 * ReAct Loop Implementation
 *
 * Implements the Reason-Act pattern for multi-step agentic reasoning.
 * The agent iteratively:
 * 1. Reasons about the current state (Thought)
 * 2. Decides which action/tool to invoke (Action)
 * 3. Executes the action and observes the result (Observation)
 * 4. Repeats until task completion or max iterations
 *
 * Features:
 * - Configurable max iterations and timeouts
 * - Structured thought/action/observation logging
 * - Graceful termination conditions
 * - Error recovery and fallback
 * - Integration with tool executor
 *
 * @module ai-orchestrator/agentic/react-loop
 */

import { EventEmitter } from 'events';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

import type {
  ToolDefinition,
  ToolExecutor,
  ExecutionContext,
  ToolExecutionResult,
} from '../execution/tool-executor.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage, LLMCompletionResult } from '../providers/llm-provider.interface.js';
import {
  type ParsedFunctionCall,
  type FunctionCallResult,
  type FunctionCallingOptions,
  type FunctionCallingProvider,
  toolsToSchemas,
  parseFunctionCalls,
  buildToolResultMessages,
  DEFAULT_FUNCTION_CALLING_OPTIONS,
} from './function-calling.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the ReAct loop
 */
export interface ReActConfig {
  /** Maximum number of reasoning iterations */
  maxIterations: number;

  /** Maximum total time for the loop (ms) */
  maxTimeMs: number;

  /** Whether to continue on tool errors */
  continueOnError: boolean;

  /** Function calling options */
  functionCalling: FunctionCallingOptions;

  /** Provider type for function calling format */
  provider: FunctionCallingProvider;

  /** Whether to log detailed trace */
  enableTrace: boolean;

  /** Thinking budget for reasoning steps */
  thinkingBudget: number;
}

export const DEFAULT_REACT_CONFIG: ReActConfig = {
  maxIterations: 10,
  maxTimeMs: 120000, // 2 minutes
  continueOnError: true,
  functionCalling: DEFAULT_FUNCTION_CALLING_OPTIONS,
  provider: 'openai',
  enableTrace: true,
  thinkingBudget: 1024,
};

/**
 * A single step in the ReAct loop
 */
export interface ReActStep {
  iteration: number;
  thought?: string;
  action?: {
    tool: string;
    input: Record<string, unknown>;
  };
  observation?: string;
  error?: string;
  durationMs: number;
  tokensUsed: number;
}

/**
 * Result of a complete ReAct loop execution
 */
export interface ReActResult {
  success: boolean;
  finalAnswer?: string;
  steps: ReActStep[];
  totalIterations: number;
  totalDurationMs: number;
  totalTokensUsed: number;
  terminationReason: ReActTerminationReason;
  error?: string;
}

export type ReActTerminationReason =
  | 'COMPLETED' // Agent signaled completion
  | 'MAX_ITERATIONS' // Hit max iterations
  | 'MAX_TIME' // Hit time limit
  | 'ERROR' // Unrecoverable error
  | 'NO_ACTION' // Agent didn't choose any action
  | 'USER_ABORT'; // User requested abort

/**
 * Context for the ReAct loop execution
 */
export interface ReActContext extends ExecutionContext {
  /** The original user task/query */
  task: string;

  /** Current conversation history */
  conversationHistory: LLMMessage[];

  /** Available tools */
  tools: ToolDefinition[];

  /** Scratchpad for intermediate results */
  scratchpad: Map<string, unknown>;
}

/**
 * Internal state for the loop
 */
interface LoopState {
  steps: ReActStep[];
  messages: LLMMessage[];
  totalTokens: number;
  startTime: number;
  aborted: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// REACT LOOP EXECUTOR
// ════════════════════════════════════════════════════════════════════════════════

export class ReActLoopExecutor extends EventEmitter {
  private readonly llm: LLMOrchestrator;
  private readonly toolExecutor: ToolExecutor;
  private readonly config: ReActConfig;

  constructor(
    llm: LLMOrchestrator,
    toolExecutor: ToolExecutor,
    config: Partial<ReActConfig> = {}
  ) {
    super();
    this.llm = llm;
    this.toolExecutor = toolExecutor;
    this.config = { ...DEFAULT_REACT_CONFIG, ...config };
  }

  /**
   * Execute the ReAct loop for a given task
   */
  async execute(context: ReActContext): Promise<ReActResult> {
    const state: LoopState = {
      steps: [],
      messages: this.buildInitialMessages(context),
      totalTokens: 0,
      startTime: Date.now(),
      aborted: false,
    };

    this.emit('loop:started', { context, config: this.config });

    try {
      // Main reasoning loop
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        // Check time limit
        if (Date.now() - state.startTime > this.config.maxTimeMs) {
          return this.buildResult(state, 'MAX_TIME');
        }

        // Check abort flag
        if (state.aborted) {
          return this.buildResult(state, 'USER_ABORT');
        }

        // Execute single iteration
        const step = await this.executeIteration(iteration, context, state);
        state.steps.push(step);
        state.totalTokens += step.tokensUsed;

        this.emit('step:completed', { iteration, step });

        // Check if agent signaled completion
        if (this.isCompleted(state.messages)) {
          return this.buildResult(state, 'COMPLETED');
        }

        // Check if no action was taken (agent is stuck)
        if (!step.action && !step.error) {
          return this.buildResult(state, 'NO_ACTION');
        }
      }

      // Hit max iterations
      return this.buildResult(state, 'MAX_ITERATIONS');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('loop:error', { error: errorMessage });

      return {
        success: false,
        steps: state.steps,
        totalIterations: state.steps.length,
        totalDurationMs: Date.now() - state.startTime,
        totalTokensUsed: state.totalTokens,
        terminationReason: 'ERROR',
        error: errorMessage,
      };
    }
  }

  /**
   * Abort the currently running loop
   */
  abort(): void {
    this.emit('loop:abort_requested');
  }

  /**
   * Execute a single iteration of the loop
   */
  private async executeIteration(
    iteration: number,
    context: ReActContext,
    state: LoopState
  ): Promise<ReActStep> {
    const stepStart = Date.now();
    const step: ReActStep = {
      iteration,
      durationMs: 0,
      tokensUsed: 0,
    };

    try {
      // Get LLM response with function calling
      const toolSchemas = toolsToSchemas(context.tools, this.config.provider);

      const llmResult = await this.llm.complete(state.messages, {
        tools: toolSchemas,
        toolChoice: this.config.functionCalling.toolChoice,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          agentType: context.agentId,
          iteration,
        },
      });

      step.tokensUsed = llmResult.usage.totalTokens;

      // Parse function calls from response
      const functionCalls = parseFunctionCalls(
        llmResult.rawResponse,
        this.config.provider
      );

      // Extract thought from text content if present
      step.thought = this.extractThought(llmResult.content);

      if (functionCalls.length > 0) {
        // Execute tool calls
        const results = await this.executeToolCalls(functionCalls, context);

        // Record the action
        step.action = {
          tool: functionCalls[0].name,
          input: functionCalls[0].arguments,
        };

        // Build observation from results
        step.observation = this.buildObservation(results);

        // Add assistant message with tool calls to history
        state.messages.push({
          role: 'assistant',
          content: llmResult.content || '',
          toolCalls: functionCalls.map(fc => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.arguments,
          })),
        });

        // Add tool results to history
        const toolResultMessages = buildToolResultMessages(
          results,
          this.config.provider
        );
        for (const msg of toolResultMessages) {
          state.messages.push(msg as LLMMessage);
        }
      } else if (llmResult.content) {
        // No function calls - agent is providing a direct response
        state.messages.push({
          role: 'assistant',
          content: llmResult.content,
        });
      }
    } catch (error) {
      step.error = error instanceof Error ? error.message : 'Unknown error';

      if (!this.config.continueOnError) {
        throw error;
      }

      // Add error observation to history
      state.messages.push({
        role: 'assistant',
        content: `Error occurred: ${step.error}. Let me try a different approach.`,
      });
    }

    step.durationMs = Date.now() - stepStart;
    return step;
  }

  /**
   * Execute multiple tool calls (parallel if configured)
   */
  private async executeToolCalls(
    calls: ParsedFunctionCall[],
    context: ReActContext
  ): Promise<FunctionCallResult[]> {
    const results: FunctionCallResult[] = [];

    if (this.config.functionCalling.parallelCalls) {
      // Execute in parallel
      const promises = calls.map(call =>
        this.executeSingleToolCall(call, context)
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Execute sequentially
      for (const call of calls) {
        const result = await this.executeSingleToolCall(call, context);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute a single tool call
   */
  private async executeSingleToolCall(
    call: ParsedFunctionCall,
    context: ReActContext
  ): Promise<FunctionCallResult> {
    this.emit('tool:invoking', { call });

    const result = await this.toolExecutor.execute({
      toolId: call.name,
      parameters: call.arguments,
      context: {
        tenantId: context.tenantId,
        userId: context.userId,
        userRole: context.userRole,
        learnerId: context.learnerId,
        sessionId: context.sessionId,
        agentId: context.agentId,
        autonomyLevel: context.autonomyLevel,
        consents: context.consents,
        requestId: context.requestId,
      },
    });

    this.emit('tool:completed', { call, result });

    return {
      callId: call.id,
      name: call.name,
      result: result.status === 'success' ? result.result?.data : undefined,
      error: result.status !== 'success' ? result.error : undefined,
    };
  }

  /**
   * Build initial messages for the loop
   */
  private buildInitialMessages(context: ReActContext): LLMMessage[] {
    const systemPrompt = this.buildReActSystemPrompt(context);

    return [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: context.task },
    ];
  }

  /**
   * Build the system prompt for ReAct reasoning
   */
  private buildReActSystemPrompt(context: ReActContext): string {
    const toolDescriptions = context.tools
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `You are an intelligent educational AI agent. You help learners by reasoning step-by-step and using available tools when needed.

## Available Tools
${toolDescriptions}

## Instructions
1. Think carefully about what information or actions are needed to help the learner
2. Use the appropriate tools to gather information or take actions
3. After each tool use, reflect on the result and decide next steps
4. When you have enough information, provide a clear, helpful response to the learner
5. Always prioritize the learner's safety and learning outcomes

## Reasoning Approach
- Break complex problems into smaller steps
- Use tools to verify information rather than guessing
- If a tool fails, try an alternative approach
- Explain your reasoning in a learner-friendly way

## Safety Guidelines
- Never provide direct homework answers; guide learners to discover solutions
- Never make medical diagnoses or provide crisis counseling
- Protect learner privacy and never expose personal information
- Adapt responses to be age-appropriate

Remember: Your goal is to empower learners to understand and solve problems themselves.`;
  }

  /**
   * Extract thought/reasoning from LLM content
   */
  private extractThought(content: string | undefined): string | undefined {
    if (!content) return undefined;

    // Look for explicit thought markers (case insensitive)
    const thoughtMatch = content.match(/(?:Thought|Thinking|Let me think):\s*([^]*?)(?=Action:|Observation:|$)/i);
    if (thoughtMatch && thoughtMatch[1]) {
      return thoughtMatch[1].trim();
    }

    // Return first sentence as implicit thought
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence?.trim();
  }

  /**
   * Build observation string from tool results
   */
  private buildObservation(results: FunctionCallResult[]): string {
    return results
      .map(r => {
        if (r.error) {
          return `Tool ${r.name} failed: ${r.error}`;
        }
        return `Tool ${r.name} returned: ${JSON.stringify(r.result)}`;
      })
      .join('\n');
  }

  /**
   * Check if the agent has signaled completion
   */
  private isCompleted(messages: LLMMessage[]): boolean {
    const lastMessage = messages[messages.length - 1];

    // Completed if last message is assistant response without tool calls
    if (lastMessage?.role === 'assistant') {
      const hasToolCalls = 'toolCalls' in lastMessage &&
        Array.isArray(lastMessage.toolCalls) &&
        lastMessage.toolCalls.length > 0;
      return !hasToolCalls && !!lastMessage.content;
    }

    return false;
  }

  /**
   * Build the final result object
   */
  private buildResult(state: LoopState, reason: ReActTerminationReason): ReActResult {
    const lastAssistantMessage = [...state.messages]
      .reverse()
      .find(m => m.role === 'assistant' && m.content);

    return {
      success: reason === 'COMPLETED',
      finalAnswer: lastAssistantMessage?.content,
      steps: state.steps,
      totalIterations: state.steps.length,
      totalDurationMs: Date.now() - state.startTime,
      totalTokensUsed: state.totalTokens,
      terminationReason: reason,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// REACT TRACE LOGGING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Format a ReAct result for logging/display
 */
export function formatReActTrace(result: ReActResult): string {
  const lines: string[] = [
    '===============================================================',
    `ReAct Loop Trace (${result.terminationReason})`,
    `Total Iterations: ${result.totalIterations}`,
    `Total Duration: ${result.totalDurationMs}ms`,
    `Total Tokens: ${result.totalTokensUsed}`,
    '===============================================================',
  ];

  for (const step of result.steps) {
    lines.push(`\n--- Iteration ${step.iteration + 1} ---`);

    if (step.thought) {
      lines.push(`Thought: ${step.thought}`);
    }

    if (step.action) {
      lines.push(`Action: ${step.action.tool}(${JSON.stringify(step.action.input)})`);
    }

    if (step.observation) {
      lines.push(`Observation: ${step.observation}`);
    }

    if (step.error) {
      lines.push(`Error: ${step.error}`);
    }

    lines.push(`Duration: ${step.durationMs}ms, Tokens: ${step.tokensUsed}`);
  }

  if (result.finalAnswer) {
    lines.push('\n===============================================================');
    lines.push('Final Answer:');
    lines.push(result.finalAnswer);
  }

  if (result.error) {
    lines.push(`\nError: ${result.error}`);
  }

  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default ReActLoopExecutor;
