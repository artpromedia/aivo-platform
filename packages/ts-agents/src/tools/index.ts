/**
 * Tool system exports
 */

export {
  validateParameters,
  createToolDefinition,
  successResult,
  errorResult,
  defineTool,
  type ToolExecutionOptions,
  type ToolMetadata,
  type ExtendedTool,
} from './tool-types.js';

export {
  ToolRegistry,
  createToolRegistry,
  type ToolRegistryOptions,
} from './tool-registry.js';

export {
  ToolExecutor,
  createToolExecutor,
  type ExecutorOptions,
} from './tool-executor.js';

// Built-in tools
export {
  searchTool,
  createSearchTool,
  MockSearchProvider,
  type SearchResult,
  type SearchProvider,
  type SearchOptions,
} from './built-in/search.tool.js';

export {
  calculatorTool,
  type Operation,
  type CalculatorResult,
} from './built-in/calculator.tool.js';

export {
  curriculumLookupTool,
  createCurriculumLookupTool,
  MockCurriculumProvider,
  type CurriculumStandard,
  type LearningObjective,
  type CurriculumProvider,
} from './built-in/curriculum-lookup.tool.js';

// Re-export types from core
export type {
  Tool,
  ToolResult,
  ToolContext,
  ToolDefinition,
  ToolCall,
  JSONSchema,
  JSONSchemaProperty,
  ValidationResult,
} from '../core/types.js';
