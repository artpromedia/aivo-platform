/**
 * State serialization utilities for agent state persistence
 */

import type { AgentState } from '../core/types.js';

export interface IStateSerializer {
  serialize(state: AgentState): string;
  deserialize(data: string): AgentState;
}

/**
 * JSON serializer with date handling
 */
export class JSONStateSerializer implements IStateSerializer {
  serialize(state: AgentState): string {
    return JSON.stringify(state, (_, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }

  deserialize(data: string): AgentState {
    return JSON.parse(data, (_, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    }) as AgentState;
  }
}

/**
 * Encrypted serializer for sensitive state data
 */
export class EncryptedStateSerializer implements IStateSerializer {
  private readonly baseSerializer: IStateSerializer;
  private readonly encryptionKey: string;

  constructor(encryptionKey: string, baseSerializer?: IStateSerializer) {
    this.encryptionKey = encryptionKey;
    this.baseSerializer = baseSerializer ?? new JSONStateSerializer();
  }

  serialize(state: AgentState): string {
    const json = this.baseSerializer.serialize(state);
    return this.encrypt(json);
  }

  deserialize(data: string): AgentState {
    const json = this.decrypt(data);
    return this.baseSerializer.deserialize(json);
  }

  private encrypt(data: string): string {
    // Simple XOR encryption for demonstration
    // In production, use a proper encryption library like crypto-js
    const key = this.encryptionKey;
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return Buffer.from(result, 'binary').toString('base64');
  }

  private decrypt(data: string): string {
    const decoded = Buffer.from(data, 'base64').toString('binary');
    const key = this.encryptionKey;
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}

/**
 * Compressed serializer for large state objects
 */
export class CompressedStateSerializer implements IStateSerializer {
  private readonly baseSerializer: IStateSerializer;

  constructor(baseSerializer?: IStateSerializer) {
    this.baseSerializer = baseSerializer ?? new JSONStateSerializer();
  }

  serialize(state: AgentState): string {
    const json = this.baseSerializer.serialize(state);
    // Simple compression using built-in zlib would be added here
    // For now, return the JSON as-is
    return json;
  }

  deserialize(data: string): AgentState {
    // Decompress if needed
    return this.baseSerializer.deserialize(data);
  }
}

/**
 * Create a serializer based on configuration
 */
export function createSerializer(options?: {
  encryptionKey?: string;
  compress?: boolean;
}): IStateSerializer {
  let serializer: IStateSerializer = new JSONStateSerializer();

  if (options?.compress) {
    serializer = new CompressedStateSerializer(serializer);
  }

  if (options?.encryptionKey) {
    serializer = new EncryptedStateSerializer(options.encryptionKey, serializer);
  }

  return serializer;
}
