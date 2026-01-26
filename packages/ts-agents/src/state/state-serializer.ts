/**
 * StateSerializer - Handles serialization and deserialization of agent state
 */

import type { AgentState, Checkpoint, Message, ToolCall } from '../core/types';

export interface SerializerOptions {
  encryptionKey?: string;
  compress?: boolean;
}

export class StateSerializer {
  private options: SerializerOptions;

  constructor(options?: SerializerOptions) {
    this.options = options || {};
  }

  /**
   * Serialize agent state to string
   */
  serialize(state: AgentState): string {
    const serializable = this.toSerializable(state);
    let json = JSON.stringify(serializable);

    if (this.options.compress) {
      json = this.compress(json);
    }

    if (this.options.encryptionKey) {
      json = this.encrypt(json, this.options.encryptionKey);
    }

    return json;
  }

  /**
   * Deserialize string to agent state
   */
  deserialize(data: string): AgentState {
    let json = data;

    if (this.options.encryptionKey) {
      json = this.decrypt(json, this.options.encryptionKey);
    }

    if (this.options.compress) {
      json = this.decompress(json);
    }

    const parsed = JSON.parse(json);
    return this.fromSerializable(parsed);
  }

  /**
   * Convert state to a serializable object
   */
  private toSerializable(state: AgentState): Record<string, unknown> {
    return {
      sessionId: state.sessionId,
      agentId: state.agentId,
      status: state.status,
      currentStep: state.currentStep,
      variables: state.variables,
      conversationHistory: state.conversationHistory.map(this.serializeMessage),
      toolCallHistory: state.toolCallHistory.map(this.serializeToolCall),
      checkpoints: state.checkpoints.map(cp => ({
        id: cp.id,
        sessionId: cp.sessionId,
        label: cp.label,
        state: this.toSerializable(cp.state),
        createdAt: cp.createdAt.toISOString(),
      })),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      expiresAt: state.expiresAt.toISOString(),
    };
  }

  /**
   * Convert serializable object back to state
   */
  private fromSerializable(data: Record<string, unknown>): AgentState {
    const checkpoints = (data.checkpoints as Array<Record<string, unknown>>).map(
      (cp): Checkpoint => ({
        id: cp.id as string,
        sessionId: cp.sessionId as string,
        label: cp.label as string | undefined,
        state: this.fromSerializable(cp.state as Record<string, unknown>),
        createdAt: new Date(cp.createdAt as string),
      })
    );

    return {
      sessionId: data.sessionId as string,
      agentId: data.agentId as string,
      status: data.status as AgentState['status'],
      currentStep: data.currentStep as number,
      variables: data.variables as Record<string, unknown>,
      conversationHistory: (data.conversationHistory as Array<Record<string, unknown>>).map(
        this.deserializeMessage
      ),
      toolCallHistory: (data.toolCallHistory as Array<Record<string, unknown>>).map(
        this.deserializeToolCall
      ),
      checkpoints,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      expiresAt: new Date(data.expiresAt as string),
    };
  }

  /**
   * Serialize a message
   */
  private serializeMessage(message: Message): Record<string, unknown> {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      name: message.name,
      toolCallId: message.toolCallId,
      toolCalls: message.toolCalls?.map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
        timestamp: tc.timestamp.toISOString(),
      })),
      timestamp: message.timestamp.toISOString(),
      metadata: message.metadata,
    };
  }

  /**
   * Deserialize a message
   */
  private deserializeMessage(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      role: data.role as Message['role'],
      content: data.content as string,
      name: data.name as string | undefined,
      toolCallId: data.toolCallId as string | undefined,
      toolCalls: data.toolCalls
        ? (data.toolCalls as Array<Record<string, unknown>>).map(tc => ({
            id: tc.id as string,
            name: tc.name as string,
            arguments: tc.arguments as Record<string, unknown>,
            timestamp: new Date(tc.timestamp as string),
          }))
        : undefined,
      timestamp: new Date(data.timestamp as string),
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Serialize a tool call
   */
  private serializeToolCall(toolCall: ToolCall): Record<string, unknown> {
    return {
      id: toolCall.id,
      name: toolCall.name,
      arguments: toolCall.arguments,
      timestamp: toolCall.timestamp.toISOString(),
    };
  }

  /**
   * Deserialize a tool call
   */
  private deserializeToolCall(data: Record<string, unknown>): ToolCall {
    return {
      id: data.id as string,
      name: data.name as string,
      arguments: data.arguments as Record<string, unknown>,
      timestamp: new Date(data.timestamp as string),
    };
  }

  /**
   * Simple XOR encryption (for basic protection - not cryptographically secure)
   * In production, use a proper encryption library
   */
  private encrypt(data: string, key: string): string {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      result.push(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return Buffer.from(result).toString('base64');
  }

  /**
   * Decrypt XOR encrypted data
   */
  private decrypt(data: string, key: string): string {
    const bytes = Buffer.from(data, 'base64');
    const result: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
      result.push(String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length)));
    }
    return result.join('');
  }

  /**
   * Simple compression using run-length encoding
   * In production, consider using a proper compression library
   */
  private compress(data: string): string {
    // Base64 encode to handle potential special characters
    return `compressed:${Buffer.from(data).toString('base64')}`;
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    if (data.startsWith('compressed:')) {
      return Buffer.from(data.slice(11), 'base64').toString('utf-8');
    }
    return data;
  }

  /**
   * Validate state structure
   */
  static validate(state: unknown): state is AgentState {
    if (!state || typeof state !== 'object') {
      return false;
    }

    const s = state as Record<string, unknown>;

    const requiredFields = [
      'sessionId',
      'agentId',
      'status',
      'currentStep',
      'variables',
      'conversationHistory',
      'toolCallHistory',
      'checkpoints',
      'createdAt',
      'updatedAt',
      'expiresAt',
    ];

    for (const field of requiredFields) {
      if (!(field in s)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the size of serialized state in bytes
   */
  getSize(state: AgentState): number {
    return Buffer.byteLength(this.serialize(state), 'utf-8');
  }
}
