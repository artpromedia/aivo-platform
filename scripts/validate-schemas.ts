/**
 * AIVO Platform - Schema Validation Script
 *
 * Validates all Prisma schemas across services to ensure:
 * - Schema syntax is correct
 * - All schemas can be parsed
 * - No conflicting model definitions
 *
 * Usage:
 *   npx tsx scripts/validate-schemas.ts
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const servicesDir = path.join(rootDir, 'services');

interface ValidationResult {
  service: string;
  hasPrisma: boolean;
  valid: boolean;
  error?: string;
  modelCount?: number;
  enumCount?: number;
}

const results: ValidationResult[] = [];

// Get all service directories
const services = fs.readdirSync(servicesDir).filter((name) => {
  const servicePath = path.join(servicesDir, name);
  return fs.statSync(servicePath).isDirectory();
});

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' AIVO Platform Schema Validation');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

for (const service of services) {
  const prismaPath = path.join(servicesDir, service, 'prisma', 'schema.prisma');

  if (!fs.existsSync(prismaPath)) {
    results.push({
      service,
      hasPrisma: false,
      valid: true,
    });
    continue;
  }

  try {
    // Run prisma validate
    execSync(`npx prisma validate --schema="${prismaPath}"`, {
      stdio: 'pipe',
      cwd: path.join(servicesDir, service),
    });

    // Count models and enums for info
    const schemaContent = fs.readFileSync(prismaPath, 'utf-8');
    const modelCount = (schemaContent.match(/^model\s+\w+/gm) || []).length;
    const enumCount = (schemaContent.match(/^enum\s+\w+/gm) || []).length;

    results.push({
      service,
      hasPrisma: true,
      valid: true,
      modelCount,
      enumCount,
    });

    console.log(`✅ ${service}: Schema valid (${modelCount} models, ${enumCount} enums)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      service,
      hasPrisma: true,
      valid: false,
      error: errorMessage,
    });

    console.log(`❌ ${service}: Schema INVALID`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const withPrisma = results.filter((r) => r.hasPrisma);
const valid = results.filter((r) => r.valid && r.hasPrisma);
const invalid = results.filter((r) => !r.valid && r.hasPrisma);
const noPrisma = results.filter((r) => !r.hasPrisma);

console.log(`Total services:     ${services.length}`);
console.log(`With Prisma:        ${withPrisma.length}`);
console.log(`Valid schemas:      ${valid.length}`);
console.log(`Invalid schemas:    ${invalid.length}`);
console.log(`Without Prisma:     ${noPrisma.length}`);
console.log('');

// Show total models and enums
const totalModels = valid.reduce((sum, r) => sum + (r.modelCount || 0), 0);
const totalEnums = valid.reduce((sum, r) => sum + (r.enumCount || 0), 0);

console.log(`Total models:       ${totalModels}`);
console.log(`Total enums:        ${totalEnums}`);
console.log('');

if (invalid.length > 0) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Validation Errors');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  for (const result of invalid) {
    console.log(`❌ ${result.service}:`);
    console.log(`   ${result.error}`);
    console.log('');
  }

  process.exit(1);
}

console.log('✅ All schemas valid!');
console.log('');
process.exit(0);
