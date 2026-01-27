#!/usr/bin/env node
/**
 * Generate Prisma client stubs for services when prisma generate cannot run
 */
const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'services');

function parseEnums(schemaContent) {
  const enums = [];
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = enumRegex.exec(schemaContent)) !== null) {
    const enumName = match[1];
    const enumBody = match[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//') && !line.startsWith('@@'))
      .map(line => line.split(/\s|\/\//)[0].trim())
      .filter(v => v && !v.startsWith('@@') && /^[A-Z_][A-Z0-9_]*$/i.test(v));

    if (values.length > 0) {
      enums.push({ name: enumName, values });
    }
  }

  return enums;
}

function parseModels(schemaContent) {
  const models = [];
  const modelRegex = /model\s+(\w+)\s*\{/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }

  return models;
}

function generateIndexJs(enums) {
  let content = `// Stub Prisma client for build - re-exports from @prisma/client
// This file is auto-generated when prisma generate cannot run
export { PrismaClient, Prisma } from '@prisma/client';

`;

  for (const enumDef of enums) {
    const values = enumDef.values.map(v => `'${v}': '${v}'`).join(', ');
    content += `export const ${enumDef.name} = { ${values} };\n`;
  }

  return content;
}

function generateIndexDts(enums, models) {
  let content = `// Stub Prisma client types for build - re-exports from @prisma/client
// This file is auto-generated when prisma generate cannot run
export { PrismaClient, Prisma } from '@prisma/client';

// Augment Prisma namespace with common types
declare module '@prisma/client' {
  namespace Prisma {
    type InputJsonValue = string | number | boolean | null | Record<string, unknown> | unknown[];
    type JsonValue = string | number | boolean | null | Record<string, unknown> | unknown[];
    type JsonObject = Record<string, unknown>;
    type JsonArray = unknown[];
    const JsonNull: unique symbol;
    const DbNull: unique symbol;
    const AnyNull: unique symbol;
    type NullTypes = typeof DbNull | typeof JsonNull | typeof AnyNull;
    type SelectSubset<T, U> = U;
`;

  // Add model-specific input types
  for (const model of models) {
    content += `    type ${model}WhereInput = Record<string, unknown>;\n`;
    content += `    type ${model}CreateInput = Record<string, unknown>;\n`;
    content += `    type ${model}UpdateInput = Record<string, unknown>;\n`;
    content += `    type ${model}WhereUniqueInput = Record<string, unknown>;\n`;
  }

  content += `  }
}

`;

  // Add enum types
  for (const enumDef of enums) {
    const typeValues = enumDef.values.map(v => `'${v}'`).join(' | ');
    const constValues = enumDef.values.map(v => `${v}: '${v}'`).join('; ');
    content += `export type ${enumDef.name} = ${typeValues};\n`;
    content += `export declare const ${enumDef.name}: { ${constValues}; };\n\n`;
  }

  // Add model type stubs
  for (const model of models) {
    content += `export type ${model} = Record<string, unknown>;\n`;
  }

  return content;
}

function processService(serviceDir) {
  const serviceName = path.basename(serviceDir);
  const schemaPath = path.join(serviceDir, 'prisma', 'schema.prisma');
  const stubDir = path.join(serviceDir, 'generated', 'prisma-client');

  if (!fs.existsSync(schemaPath)) {
    return false;
  }

  // Create stub directory
  fs.mkdirSync(stubDir, { recursive: true });

  // Parse schema
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const enums = parseEnums(schemaContent);
  const models = parseModels(schemaContent);

  // Generate files
  fs.writeFileSync(path.join(stubDir, 'index.js'), generateIndexJs(enums));
  fs.writeFileSync(path.join(stubDir, 'index.d.ts'), generateIndexDts(enums, models));

  console.log(`Created stubs for ${serviceName} (${enums.length} enums, ${models.length} models)`);
  return true;
}

// Main
const services = fs.readdirSync(servicesDir)
  .filter(name => fs.statSync(path.join(servicesDir, name)).isDirectory());

let count = 0;
for (const service of services) {
  if (processService(path.join(servicesDir, service))) {
    count++;
  }
}

console.log(`\nGenerated stubs for ${count} services`);
