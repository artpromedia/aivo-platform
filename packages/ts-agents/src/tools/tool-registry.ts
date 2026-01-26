/**
 * ToolRegistry - Central registry for managing tools
 */

import type { Tool, ToolDefinition } from '../core/types';
import type { ExtendedTool, ToolMetadata, ToolCategory, ToolFactory } from './tool-types';

export interface RegistryOptions {
  allowOverwrite?: boolean;
  validateOnRegister?: boolean;
}

export class ToolRegistry {
  private tools: Map<string, ExtendedTool> = new Map();
  private factories: Map<string, ToolFactory> = new Map();
  private categories: Map<ToolCategory, Set<string>> = new Map();
  private options: Required<RegistryOptions>;

  constructor(options?: RegistryOptions) {
    this.options = {
      allowOverwrite: false,
      validateOnRegister: true,
      ...options,
    };
  }

  /**
   * Register a tool
   */
  register(tool: Tool | ExtendedTool): void {
    if (this.tools.has(tool.name) && !this.options.allowOverwrite) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    if (this.options.validateOnRegister) {
      this.validateTool(tool);
    }

    this.tools.set(tool.name, tool as ExtendedTool);

    // Index by category
    const category = (tool as ExtendedTool).metadata?.category as ToolCategory;
    if (category) {
      let categoryTools = this.categories.get(category);
      if (!categoryTools) {
        categoryTools = new Set();
        this.categories.set(category, categoryTools);
      }
      categoryTools.add(tool.name);
    }
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Register a tool factory
   */
  registerFactory(name: string, factory: ToolFactory): void {
    this.factories.set(name, factory);
  }

  /**
   * Create a tool from a factory
   */
  createFromFactory(
    name: string,
    config?: Record<string, unknown>
  ): Tool | undefined {
    const factory = this.factories.get(name);
    if (!factory) {
      return undefined;
    }

    const tool = factory(config);
    this.register(tool);
    return tool;
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    // Remove from category index
    const category = (tool as ExtendedTool).metadata?.category as ToolCategory;
    if (category) {
      const categoryTools = this.categories.get(category);
      if (categoryTools) {
        categoryTools.delete(toolName);
      }
    }

    return this.tools.delete(toolName);
  }

  /**
   * Get a tool by name
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get a tool with full metadata
   */
  getExtended(toolName: string): ExtendedTool | undefined {
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
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    const toolNames = this.categories.get(category);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map(name => this.tools.get(name))
      .filter((tool): tool is ExtendedTool => tool !== undefined);
  }

  /**
   * Get tools by tag
   */
  getByTag(tag: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.metadata?.tags?.includes(tag)
    );
  }

  /**
   * Get tool definitions for LLM function calling
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Get tool definition for a specific tool
   */
  getToolDefinition(toolName: string): ToolDefinition | undefined {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return undefined;
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
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
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }

  /**
   * Get all categories with tool counts
   */
  getCategories(): Map<ToolCategory, number> {
    const result = new Map<ToolCategory, number>();
    for (const [category, tools] of this.categories) {
      result.set(category, tools.size);
    }
    return result;
  }

  /**
   * Update tool metadata
   */
  updateMetadata(toolName: string, metadata: Partial<ToolMetadata>): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    const oldCategory = tool.metadata?.category as ToolCategory;
    tool.metadata = { ...tool.metadata, ...metadata };
    const newCategory = tool.metadata?.category as ToolCategory;

    // Update category index if changed
    if (oldCategory !== newCategory) {
      if (oldCategory) {
        const oldCategoryTools = this.categories.get(oldCategory);
        if (oldCategoryTools) {
          oldCategoryTools.delete(toolName);
        }
      }
      if (newCategory) {
        let newCategoryTools = this.categories.get(newCategory);
        if (!newCategoryTools) {
          newCategoryTools = new Set();
          this.categories.set(newCategory, newCategoryTools);
        }
        newCategoryTools.add(toolName);
      }
    }

    return true;
  }

  /**
   * Validate a tool
   */
  private validateTool(tool: Tool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool must have a valid description');
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      throw new Error('Tool must have valid parameters schema');
    }

    if (typeof tool.execute !== 'function') {
      throw new Error('Tool must have an execute function');
    }

    // Validate name format (alphanumeric with underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tool.name)) {
      throw new Error(
        'Tool name must start with a letter and contain only alphanumeric characters and underscores'
      );
    }
  }

  /**
   * Export registry as JSON
   */
  export(): Array<{
    name: string;
    description: string;
    parameters: unknown;
    metadata?: ToolMetadata;
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      metadata: tool.metadata,
    }));
  }

  /**
   * Clone the registry
   */
  clone(): ToolRegistry {
    const newRegistry = new ToolRegistry(this.options);
    for (const tool of this.tools.values()) {
      newRegistry.register(tool);
    }
    return newRegistry;
  }
}
