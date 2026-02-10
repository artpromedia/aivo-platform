import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import type { Tool } from '../src/core/types.js';

function createMockTool(overrides: Partial<Tool> = {}): Tool {
  return {
    name: 'testTool',
    description: 'A test tool',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({ success: true, output: 'ok' }),
    ...overrides,
  };
}

// ============================================================================
// ToolRegistry - register & get
// ============================================================================
describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry({ allowOverwrite: false, validateOnRegister: true });
  });

  describe('register', () => {
    it('registers a valid tool', () => {
      const tool = createMockTool();
      registry.register(tool);
      expect(registry.has('testTool')).toBe(true);
    });

    it('throws when registering duplicate without allowOverwrite', () => {
      const tool = createMockTool();
      registry.register(tool);
      expect(() => registry.register(tool)).toThrow('Tool already registered: testTool');
    });

    it('allows overwrite when option is set', () => {
      const overwriteRegistry = new ToolRegistry({ allowOverwrite: true });
      const tool = createMockTool();
      overwriteRegistry.register(tool);
      const updated = createMockTool({ description: 'Updated' });
      overwriteRegistry.register(updated);
      expect(overwriteRegistry.get('testTool')?.description).toBe('Updated');
    });
  });

  describe('registerAll', () => {
    it('registers multiple tools at once', () => {
      const tools = [
        createMockTool({ name: 'tool1' }),
        createMockTool({ name: 'tool2' }),
        createMockTool({ name: 'tool3' }),
      ];
      registry.registerAll(tools);
      expect(registry.count()).toBe(3);
    });
  });

  describe('unregister', () => {
    it('removes an existing tool', () => {
      registry.register(createMockTool());
      expect(registry.unregister('testTool')).toBe(true);
      expect(registry.has('testTool')).toBe(false);
    });

    it('returns false for non-existent tool', () => {
      expect(registry.unregister('nonExistent')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the tool by name', () => {
      const tool = createMockTool();
      registry.register(tool);
      expect(registry.get('testTool')).toBeDefined();
      expect(registry.get('testTool')?.name).toBe('testTool');
    });

    it('returns undefined for unknown tool', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true when tool exists', () => {
      registry.register(createMockTool());
      expect(registry.has('testTool')).toBe(true);
    });

    it('returns false when tool does not exist', () => {
      expect(registry.has('missing')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns all registered tools', () => {
      registry.register(createMockTool({ name: 'a' }));
      registry.register(createMockTool({ name: 'b' }));
      const all = registry.getAll();
      expect(all.length).toBe(2);
    });

    it('returns empty array when no tools registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getNames', () => {
    it('returns all tool names', () => {
      registry.register(createMockTool({ name: 'alpha' }));
      registry.register(createMockTool({ name: 'beta' }));
      const names = registry.getNames();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });
  });

  describe('count', () => {
    it('returns correct count', () => {
      expect(registry.count()).toBe(0);
      registry.register(createMockTool({ name: 'one' }));
      expect(registry.count()).toBe(1);
      registry.register(createMockTool({ name: 'two' }));
      expect(registry.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all tools', () => {
      registry.register(createMockTool({ name: 'x' }));
      registry.register(createMockTool({ name: 'y' }));
      registry.clear();
      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('search', () => {
    it('finds tools by name substring', () => {
      registry.register(createMockTool({ name: 'searchMe', description: 'desc' }));
      registry.register(createMockTool({ name: 'other', description: 'another' }));
      const results = registry.search('search');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('searchMe');
    });

    it('finds tools by description substring', () => {
      registry.register(createMockTool({ name: 'tool1', description: 'calculates math' }));
      registry.register(createMockTool({ name: 'tool2', description: 'sends email' }));
      const results = registry.search('math');
      expect(results.length).toBe(1);
    });

    it('is case-insensitive', () => {
      registry.register(createMockTool({ name: 'MyTool', description: 'desc' }));
      expect(registry.search('mytool').length).toBe(1);
      expect(registry.search('MYTOOL').length).toBe(1);
    });
  });

  describe('getToolDefinitions', () => {
    it('returns definitions with name, description, parameters', () => {
      registry.register(createMockTool({ name: 'def1' }));
      const defs = registry.getToolDefinitions();
      expect(defs.length).toBe(1);
      expect(defs[0]).toHaveProperty('name', 'def1');
      expect(defs[0]).toHaveProperty('description');
      expect(defs[0]).toHaveProperty('parameters');
    });
  });

  describe('getToolDefinition', () => {
    it('returns definition for specific tool', () => {
      registry.register(createMockTool({ name: 'specific' }));
      const def = registry.getToolDefinition('specific');
      expect(def).toBeDefined();
      expect(def?.name).toBe('specific');
    });

    it('returns undefined for unknown tool', () => {
      expect(registry.getToolDefinition('nope')).toBeUndefined();
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      registry.register(createMockTool({ name: 'original' }));
      const cloned = registry.clone();
      expect(cloned.count()).toBe(1);
      expect(cloned.has('original')).toBe(true);

      // Mutating clone does not affect original
      cloned.register(createMockTool({ name: 'extra' }));
      expect(cloned.count()).toBe(2);
      expect(registry.count()).toBe(1);
    });
  });

  describe('export', () => {
    it('exports tool data as plain objects', () => {
      registry.register(createMockTool({ name: 'exported' }));
      const exported = registry.export();
      expect(exported.length).toBe(1);
      expect(exported[0].name).toBe('exported');
      expect(exported[0].description).toBe('A test tool');
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================
  describe('validation', () => {
    it('rejects tool without name', () => {
      expect(() => registry.register(createMockTool({ name: '' }))).toThrow(
        'Tool must have a valid name'
      );
    });

    it('rejects tool without description', () => {
      expect(() => registry.register(createMockTool({ description: '' }))).toThrow(
        'Tool must have a valid description'
      );
    });

    it('rejects tool with invalid name format', () => {
      expect(() => registry.register(createMockTool({ name: '123invalid' }))).toThrow(
        'Tool name must start with a letter'
      );
    });

    it('accepts tool names with underscores', () => {
      expect(() => registry.register(createMockTool({ name: 'my_tool_v2' }))).not.toThrow();
    });

    it('skips validation when disabled', () => {
      const noValidate = new ToolRegistry({ validateOnRegister: false });
      // This would normally fail validation
      expect(() => noValidate.register(createMockTool({ name: '123bad' }))).not.toThrow();
    });
  });

  // ============================================================================
  // Category support
  // ============================================================================
  describe('getByCategory', () => {
    it('returns empty array for unknown category', () => {
      expect(registry.getByCategory('search' as never)).toEqual([]);
    });
  });

  describe('getByTag', () => {
    it('returns empty array when no tools have the tag', () => {
      registry.register(createMockTool({ name: 'noTag' }));
      expect(registry.getByTag('special')).toEqual([]);
    });
  });
});
