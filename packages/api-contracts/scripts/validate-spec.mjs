#!/usr/bin/env node
/**
 * validate-spec.mjs — CI-level OpenAPI spec validation
 *
 * Validates:
 *  1. YAML parses without error
 *  2. OpenAPI version is 3.1.x
 *  3. All $ref pointers resolve to existing schemas
 *  4. Required fields match between the spec and generated TS types
 *
 * Exit 0 on success, 1 on failure.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(__dirname, '../schemas/ai-inference.openapi.yaml');

let exitCode = 0;

function fail(msg) {
  console.error(`❌  ${msg}`);
  exitCode = 1;
}

function pass(msg) {
  console.log(`✅  ${msg}`);
}

// ─── 1. Parse YAML ─────────────────────────────────────────────────

let spec;
try {
  const raw = readFileSync(SPEC_PATH, 'utf-8');
  spec = parseYaml(raw);
  pass('YAML parses successfully');
} catch (err) {
  fail(`YAML parse error: ${err.message}`);
  process.exit(1);
}

// ─── 2. OpenAPI version ─────────────────────────────────────────────

if (spec.openapi && spec.openapi.startsWith('3.1')) {
  pass(`OpenAPI version: ${spec.openapi}`);
} else {
  fail(`Expected OpenAPI 3.1.x, got: ${spec.openapi}`);
}

// ─── 3. Validate all $ref pointers resolve ──────────────────────────

function collectRefs(obj, refs = []) {
  if (!obj || typeof obj !== 'object') return refs;
  if ('$ref' in obj) refs.push(obj.$ref);
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null) collectRefs(val, refs);
  }
  return refs;
}

function resolveRef(ref, root) {
  const path = ref.replace('#/', '').split('/');
  let node = root;
  for (const seg of path) {
    if (!node || typeof node !== 'object' || !(seg in node)) return null;
    node = node[seg];
  }
  return node;
}

const allRefs = collectRefs(spec);
let unresolvedCount = 0;
for (const ref of allRefs) {
  if (resolveRef(ref, spec) === null) {
    fail(`Unresolved $ref: ${ref}`);
    unresolvedCount++;
  }
}
if (unresolvedCount === 0) {
  pass(`All ${allRefs.length} $ref pointers resolve`);
}

// ─── 4. Schema inventory ────────────────────────────────────────────

const schemaNames = Object.keys(spec.components?.schemas ?? {});
if (schemaNames.length > 0) {
  pass(`Schemas defined: ${schemaNames.join(', ')}`);
} else {
  fail('No schemas found in components.schemas');
}

// ─── 5. Validate required fields consistency ────────────────────────

const requiredChecks = [
  { name: 'GenerateRequest', expected: ['prompt'] },
  { name: 'GenerateResponse', expected: ['content', 'model', 'provider', 'tokens_used', 'latency_ms'] },
  { name: 'HintRequest', expected: ['question', 'subject'] },
  { name: 'HintResponse', expected: ['hint', 'model', 'provider'] },
  { name: 'ErrorResponse', expected: ['error', 'message'] },
  { name: 'HealthResponse', expected: ['status', 'service'] },
];

for (const { name, expected } of requiredChecks) {
  const schema = spec.components?.schemas?.[name];
  if (!schema) {
    fail(`Schema ${name} not found`);
    continue;
  }
  const actual = schema.required ?? [];
  const missing = expected.filter((f) => !actual.includes(f));
  const extra = actual.filter((f) => !expected.includes(f));
  if (missing.length === 0 && extra.length === 0) {
    pass(`${name}: required fields match (${expected.length})`);
  } else {
    if (missing.length) fail(`${name}: missing required fields: ${missing.join(', ')}`);
    if (extra.length) fail(`${name}: unexpected required fields: ${extra.join(', ')}`);
  }
}

// ─── 6. Validate enum values ────────────────────────────────────────

const expectedModels = [
  'gpt-5.2-pro', 'gpt-5.2-instant', 'gpt-5.3-codex',
  'claude-opus-4-6-20260201', 'claude-sonnet-4-6-20260201',
  'gemini-3.1-pro', 'gemini-3.1-flash',
];
const actualModels = spec.components?.schemas?.ModelId?.enum ?? [];
if (JSON.stringify([...expectedModels].sort()) === JSON.stringify([...actualModels].sort())) {
  pass(`ModelId enum: ${actualModels.length} values match`);
} else {
  fail(`ModelId enum mismatch. Expected: ${expectedModels.join(', ')}. Got: ${actualModels.join(', ')}`);
}

const expectedProviders = ['openai', 'anthropic', 'gemini'];
const actualProviders = spec.components?.schemas?.ProviderId?.enum ?? [];
if (JSON.stringify([...expectedProviders].sort()) === JSON.stringify([...actualProviders].sort())) {
  pass(`ProviderId enum: ${actualProviders.length} values match`);
} else {
  fail(`ProviderId enum mismatch`);
}

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
if (exitCode === 0) {
  console.log('🎉  All spec validations passed!');
} else {
  console.log('💥  Spec validation failed — see errors above.');
}
process.exit(exitCode);
