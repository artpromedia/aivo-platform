/**
 * Tool registry for managing available agent tools
 */

import type { Tool, ToolDefinition } from '../core/types.js';
import { createToolDefinition, type ExtendedTool, type ToolMetadata } from './tool-types.js';

export interface ToolRegistryOptions {
  /** Allow overwriting existing tools */
  allowOverwrite?: boolean;
  /** Validate tools on registration */
  validateOnRegister?: boolean;
}

/**
 * Registry for managing agent tools
 */
export class ToolRegistry {
  private readonly tools: Map<string, ExtendedTool> = new Map();
  private readonly options: ToolRegistryOptions;

  constructor(options?: ToolRegistryOptions) {
    this.options = {
      allowOverwrite: options?.allowOverwrite ?? false,
      validateOnRegister: options?.validateOnRegister ?? true,
    };
  }

  /**
   * Register a tool
   */
  register(tool: Tool | ExtendedTool): void {
    if (!this.options.allowOverwrite && this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }

    if (this.options.validateOnRegister) {
      this.validateTool(tool);
    }

    this.tools.set(tool.name, tool as ExtendedTool);
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: (Tool | ExtendedTool)[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  /**
   * Get a tool by name
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Check if a tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool definitions for LLM function calling
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(tool => !tool.metadata?.deprecated)
      .map(createToolDefinition);
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.metadata?.category === category
    );
  }

  /**
   * Get tools by tag
   */
  getByTag(tag: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.metadata?.tags?.includes(tag)
    );
  }

  /**
   * Get non-deprecated tools
   */
  getActive(): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => !tool.metadata?.deprecated
    );
  }

  /**
   * Get deprecated tools
   */
  getDeprecated(): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.metadata?.deprecated
    );
  }

  /**
   * Search tools by name or description
   */
  search(query: string): Tool[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.tools.values()).filter(
      tool =>
        tool.name.toLowerCase().includes(queryLower) ||
        tool.description.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Create a subset registry with specific tools
   */
  subset(toolNames: string[]): ToolRegistry {
    const subset = new ToolRegistry(this.options);
    for (const name of toolNames) {
      const tool = this.tools.get(name);
      if (tool) {
        subset.register(tool);
      }
    }
    return subset;
  }

  /**
   * Merge another registry into this one
   */
  merge(other: ToolRegistry, overwrite?: boolean): void {
    const originalOverwrite = this.options.allowOverwrite;
    if (overwrite !== undefined) {
      this.options.allowOverwrite = overwrite;
    }

    for (const tool of other.getAll()) {
      this.register(tool);
    }

    this.options.allowOverwrite = originalOverwrite;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    deprecated: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    let deprecated = 0;

    for (const tool of this.tools.values()) {
      if (tool.metadata?.deprecated) {
        deprecated++;
      }

      const category = tool.metadata?.category ?? 'uncategorized';
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }

    return {
      total: this.tools.size,
      active: this.tools.size - deprecated,
      deprecated,
      byCategory,
    };
  }

  private validateTool(tool: Tool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error(`Tool '${tool.name}' must have a valid description`);
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      throw new Error(`Tool '${tool.name}' must have valid parameters schema`);
    }

    if (typeof tool.execute !== 'function') {
      throw new Error(`Tool '${tool.name}' must have an execute function`);
    }

    // Validate name format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      throw new Error(
        `Tool name '${tool.name}' is invalid. Must start with a letter and contain only alphanumeric characters, underscores, and hyphens`
      );
    }
  }
}

/**
 * Create a new tool registry with optional initial tools
 */
export function createToolRegistry(
  tools?: Tool[],
  options?: ToolRegistryOptions
): ToolRegistry {
  const registry = new ToolRegistry(options);
  if (tools) {
    registry.registerAll(tools);
  }
  return registry;
}
