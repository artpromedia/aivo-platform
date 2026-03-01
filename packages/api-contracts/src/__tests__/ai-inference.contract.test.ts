/**
 * Contract tests – validate that the OpenAPI spec schemas stay consistent
 * with the generated TypeScript types and that sample payloads conform
 * to the JSON-Schema representation extracted from the spec.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { components } from '../../generated/ai-inference.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ────────────────────────────────────────────────────────

function loadSpec() {
  const specPath = resolve(__dirname, '../../schemas/ai-inference.openapi.yaml');
  return parseYaml(readFileSync(specPath, 'utf-8'));
}

/** Recursively resolve $ref pointers within the spec */
function resolveRefs(schema: Record<string, unknown>, root: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema;

  if ('$ref' in schema) {
    const refPath = (schema.$ref as string).replace('#/', '').split('/');
    let resolved: Record<string, unknown> = root;
    for (const seg of refPath) {
      resolved = (resolved as Record<string, Record<string, unknown>>)[seg];
    }
    return resolveRefs({ ...resolved }, root);
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        typeof v === 'object' && v !== null ? resolveRefs(v as Record<string, unknown>, root) : v,
      );
    } else if (typeof value === 'object' && value !== null) {
      out[key] = resolveRefs(value as Record<string, unknown>, root);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function schemaValidator(schemaName: string) {
  const spec = loadSpec();
  const rawSchema = spec.components.schemas[schemaName];
  if (!rawSchema) throw new Error(`Schema "${schemaName}" not found in spec`);

  const resolved = resolveRefs({ ...rawSchema }, spec);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(resolved);
}

// ─── GenerateRequest Contract ───────────────────────────────────────

describe('GenerateRequest contract', () => {
  const validate = schemaValidator('GenerateRequest');

  it('accepts a minimal valid request', () => {
    const req: components['schemas']['GenerateRequest'] = {
      prompt: 'Explain photosynthesis for a 5th grader',
      max_tokens: 1000,
      temperature: 0.7,
    };
    expect(validate(req)).toBe(true);
  });

  it('accepts a fully-populated request', () => {
    const req: components['schemas']['GenerateRequest'] = {
      prompt: 'Solve 2x + 3 = 7',
      system_prompt: 'You are a math tutor.',
      model: 'gpt-5.2-pro',
      max_tokens: 2048,
      temperature: 0.5,
      preferred_provider: 'openai',
    };
    expect(validate(req)).toBe(true);
  });

  it('rejects when prompt is missing', () => {
    const bad = { max_tokens: 500, temperature: 0.7 };
    expect(validate(bad)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: 'required' })]),
    );
  });

  it('rejects when prompt exceeds maxLength', () => {
    const bad = { prompt: 'x'.repeat(33000), max_tokens: 500, temperature: 0.7 };
    expect(validate(bad)).toBe(false);
  });

  it('rejects temperature > 2', () => {
    const bad = { prompt: 'hi', max_tokens: 100, temperature: 3.0 };
    expect(validate(bad)).toBe(false);
  });

  it('rejects invalid model enum value', () => {
    const bad = { prompt: 'hi', max_tokens: 100, temperature: 0.7, model: 'gpt-99' };
    expect(validate(bad)).toBe(false);
  });
});

// ─── GenerateResponse Contract ──────────────────────────────────────

describe('GenerateResponse contract', () => {
  const validate = schemaValidator('GenerateResponse');

  it('accepts a valid response', () => {
    const res: components['schemas']['GenerateResponse'] = {
      content: 'Photosynthesis is…',
      model: 'gpt-5.2-pro',
      provider: 'openai',
      tokens_used: 127,
      latency_ms: 340,
    };
    expect(validate(res)).toBe(true);
  });

  it('rejects when required fields are missing', () => {
    const bad = { content: 'hello' };
    expect(validate(bad)).toBe(false);
    expect(validate.errors!.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects negative tokens_used', () => {
    const bad = {
      content: 'x',
      model: 'm',
      provider: 'p',
      tokens_used: -1,
      latency_ms: 10,
    };
    expect(validate(bad)).toBe(false);
  });
});

// ─── HintRequest Contract ───────────────────────────────────────────

describe('HintRequest contract', () => {
  const validate = schemaValidator('HintRequest');

  it('accepts a valid hint request', () => {
    const req: components['schemas']['HintRequest'] = {
      question: 'What is 7 × 8?',
      subject: 'MATH',
      difficulty: 2,
    };
    expect(validate(req)).toBe(true);
  });

  it('rejects missing subject', () => {
    const bad = { question: 'What is gravity?' };
    expect(validate(bad)).toBe(false);
  });

  it('rejects difficulty out of range', () => {
    const bad = { question: 'Q', subject: 'SCIENCE', difficulty: 6 };
    expect(validate(bad)).toBe(false);
  });
});

// ─── HintResponse Contract ──────────────────────────────────────────

describe('HintResponse contract', () => {
  const validate = schemaValidator('HintResponse');

  it('accepts a valid hint response', () => {
    const res: components['schemas']['HintResponse'] = {
      hint: 'Try breaking the problem into…',
      model: 'gemini-3.1-flash',
      provider: 'gemini',
      tokens_used: 42,
      latency_ms: 200,
    };
    expect(validate(res)).toBe(true);
  });

  it('rejects when hint is missing', () => {
    const bad = { model: 'm', provider: 'p' };
    expect(validate(bad)).toBe(false);
  });
});

// ─── Enum Contracts ─────────────────────────────────────────────────

describe('ModelId enum contract', () => {
  const spec = loadSpec();
  const modelEnum: string[] = spec.components.schemas.ModelId.enum;

  it('includes all expected 2026 model IDs', () => {
    expect(modelEnum).toEqual(
      expect.arrayContaining([
        'gpt-5.2-pro',
        'gpt-5.2-instant',
        'gpt-5.3-codex',
        'claude-opus-4-6-20260201',
        'claude-sonnet-4-6-20260201',
        'gemini-3.1-pro',
        'gemini-3.1-flash',
      ]),
    );
  });

  it('has exactly 7 models', () => {
    expect(modelEnum).toHaveLength(7);
  });
});

describe('ProviderId enum contract', () => {
  const spec = loadSpec();
  const providerEnum: string[] = spec.components.schemas.ProviderId.enum;

  it('includes all expected providers', () => {
    expect(providerEnum).toEqual(
      expect.arrayContaining(['openai', 'anthropic', 'gemini']),
    );
  });

  it('has exactly 3 providers', () => {
    expect(providerEnum).toHaveLength(3);
  });
});
