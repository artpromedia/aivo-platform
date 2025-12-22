/**
 * Agent Tests
 *
 * Tests for AI agent implementations including:
 * - Prompt building
 * - Adaptation logic
 * - Response handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PromptBuilder } from '../src/prompts/prompt-builder.js';
import type { AgentContext } from '../src/agents/base-agent.js';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  describe('Variable Substitution', () => {
    it('should substitute simple variables', () => {
      const template = 'Hello, {{name}}!';
      const result = builder.build(template, { name: 'Alice' } as any);

      expect(result).toBe('Hello, Alice!');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello, {{name}}!';
      const result = builder.build(template, {} as any);

      expect(result).toBe('Hello, !');
    });

    it('should substitute multiple variables', () => {
      const template = 'Grade: {{gradeLevel}}, Age: {{age}}';
      const result = builder.build(template, { gradeLevel: 5, age: 10 } as any);

      expect(result).toBe('Grade: 5, Age: 10');
    });
  });

  describe('Conditional Blocks', () => {
    it('should include content when condition is true', () => {
      const template = '{{#if adaptations}}Adaptations enabled{{/if}}';
      const result = builder.build(template, {
        adaptations: ['test'],
      });

      expect(result).toBe('Adaptations enabled');
    });

    it('should exclude content when condition is false', () => {
      const template = 'Start{{#if adaptations}} Adaptations enabled{{/if}} End';
      const result = builder.build(template, {
        adaptations: [],
      });

      expect(result).toBe('Start End');
    });

    it('should handle undefined conditions', () => {
      const template = '{{#if missing}}Hidden{{/if}}Visible';
      const result = builder.build(template, {} as any);

      expect(result).toBe('Visible');
    });
  });

  describe('Iteration Blocks', () => {
    it('should iterate over arrays', () => {
      const template = '{{#each items}}- {{this}}\n{{/each}}';
      const result = builder.build(template, {
        items: ['one', 'two', 'three'],
      } as any);

      expect(result).toBe('- one\n- two\n- three');
    });

    it('should handle empty arrays', () => {
      const template = 'Items:{{#each items}} {{this}}{{/each}}';
      const result = builder.build(template, { items: [] } as any);

      expect(result).toBe('Items:');
    });

    it('should handle undefined arrays', () => {
      const template = '{{#each missing}}item{{/each}}default';
      const result = builder.build(template, {} as any);

      expect(result).toBe('default');
    });
  });

  describe('Adaptation Instructions', () => {
    it('should generate instructions for ADHD adaptations', () => {
      const instructions = PromptBuilder.getAdaptationInstructions([
        'chunked_information',
        'bullet_points',
      ]);

      expect(instructions).toContain('small, manageable chunks');
      expect(instructions).toContain('bullet points');
    });

    it('should generate instructions for dyslexia adaptations', () => {
      const instructions = PromptBuilder.getAdaptationInstructions([
        'avoid_complex_words',
        'short_paragraphs',
      ]);

      expect(instructions).toContain('complex vocabulary');
      expect(instructions).toContain('2-3 sentences');
    });

    it('should generate instructions for autism adaptations', () => {
      const instructions = PromptBuilder.getAdaptationInstructions([
        'literal_language',
        'avoid_idioms',
      ]);

      expect(instructions).toContain('literal, direct');
      expect(instructions).toContain('idioms');
    });

    it('should handle unknown adaptations', () => {
      const instructions = PromptBuilder.getAdaptationInstructions(['unknown_adaptation']);

      expect(instructions).toBe('');
    });
  });

  describe('Complex Templates', () => {
    it('should handle tutor system prompt template', () => {
      const template = `You are a tutor for grade {{gradeLevel}} students (age {{age}}).

{{#if adaptations}}
ADAPTATIONS:
{{#each adaptations}}
- {{this}}
{{/each}}
{{/if}}

Be helpful!`;

      const result = builder.build(template, {
        gradeLevel: 3,
        age: 8,
        adaptations: ['use_simple_words', 'short_sentences'],
      });

      expect(result).toContain('grade 3');
      expect(result).toContain('age 8');
      expect(result).toContain('ADAPTATIONS:');
      expect(result).toContain('- use_simple_words');
      expect(result).toContain('- short_sentences');
      expect(result).toContain('Be helpful!');
    });
  });
});

describe('AgentContext Adaptations', () => {
  // Test the adaptation logic that would be in BaseAgent

  function getAdaptations(context: AgentContext): string[] {
    const adaptations: string[] = [];
    const profile = context.learnerProfile;

    if (!profile) return adaptations;

    if (profile.gradeLevel <= 2) {
      adaptations.push('use_simple_words');
      adaptations.push('short_sentences');
    } else if (profile.gradeLevel <= 5) {
      adaptations.push('use_clear_language');
    }

    if (profile.neurodiversityProfile?.adhd) {
      adaptations.push('chunked_information');
      adaptations.push('bullet_points');
    }

    if (profile.neurodiversityProfile?.dyslexia) {
      adaptations.push('avoid_complex_words');
      adaptations.push('short_paragraphs');
    }

    if (profile.neurodiversityProfile?.autism) {
      adaptations.push('literal_language');
      adaptations.push('avoid_idioms');
    }

    return adaptations;
  }

  it('should apply simple language for young students', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: { gradeLevel: 1, age: 6 },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('use_simple_words');
    expect(adaptations).toContain('short_sentences');
  });

  it('should apply clear language for middle elementary', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: { gradeLevel: 4, age: 9 },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('use_clear_language');
    expect(adaptations).not.toContain('use_simple_words');
  });

  it('should apply ADHD adaptations', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: {
        gradeLevel: 5,
        age: 10,
        neurodiversityProfile: { adhd: true },
      },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('chunked_information');
    expect(adaptations).toContain('bullet_points');
  });

  it('should apply dyslexia adaptations', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: {
        gradeLevel: 5,
        age: 10,
        neurodiversityProfile: { dyslexia: true },
      },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('avoid_complex_words');
    expect(adaptations).toContain('short_paragraphs');
  });

  it('should apply autism adaptations', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: {
        gradeLevel: 5,
        age: 10,
        neurodiversityProfile: { autism: true },
      },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('literal_language');
    expect(adaptations).toContain('avoid_idioms');
  });

  it('should combine multiple neurodiversity adaptations', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
      learnerProfile: {
        gradeLevel: 3,
        age: 8,
        neurodiversityProfile: { adhd: true, dyslexia: true },
      },
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toContain('use_clear_language');
    expect(adaptations).toContain('chunked_information');
    expect(adaptations).toContain('bullet_points');
    expect(adaptations).toContain('avoid_complex_words');
    expect(adaptations).toContain('short_paragraphs');
  });

  it('should handle missing learner profile', () => {
    const context: AgentContext = {
      tenantId: 'test',
      userId: 'user',
    };

    const adaptations = getAdaptations(context);

    expect(adaptations).toEqual([]);
  });
});
