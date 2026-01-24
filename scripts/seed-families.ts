#!/usr/bin/env node
/**
 * AIVO Platform - Master Seed Script for Family Accounts
 *
 * This script seeds all services with the 6 test families:
 * - Hanson, Ofem, Oluwole, Kotz, Anderson, Hughes
 *
 * Run from workspace root:
 *   pnpm seed:families
 *
 * Or run individual services:
 *   pnpm --filter @aivo/tenant-svc seed:families
 */

import { execSync } from 'child_process';
import path from 'path';

const services = [
  { name: 'tenant-svc', description: 'Anoka-Hennepin District & Schools' },
  { name: 'auth-svc', description: 'User accounts (parents, learners, teachers)' },
  { name: 'parent-svc', description: 'Parent accounts & student links' },
  { name: 'profile-svc', description: 'Learner profiles & preferences' },
  { name: 'baseline-svc', description: 'Parent assessments & baseline data' },
  { name: 'iep-svc', description: 'IEPs, goals, accommodations, services' },
];

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    AIVO Family Seed Data Runner                            ║');
console.log('║                                                                            ║');
console.log('║  Creating 6 families with complete data across all services:              ║');
console.log('║  • Hanson (Emma, Profound, Grade 2)                                        ║');
console.log('║  • Ofem (Jayden, Mild, Grade 6)                                            ║');
console.log('║  • Oluwole (Adebayo, Moderate, Grade 3)                                    ║');
console.log('║  • Kotz (Tyler, Moderate, Grade 7)                                         ║');
console.log('║  • Anderson (Sophie, Mild, Grade 4)                                        ║');
console.log('║  • Hughes (Ethan, Mild, Grade 6)                                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

let successCount = 0;
let failCount = 0;

for (const service of services) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📦 Seeding ${service.name}: ${service.description}`);
  console.log('═'.repeat(60));

  try {
    const servicePath = path.join(process.cwd(), 'services', service.name);
    const seedFile = path.join(servicePath, 'prisma', 'seed-families.ts');

    execSync(`npx tsx ${seedFile}`, {
      cwd: servicePath,
      stdio: 'inherit',
      env: { ...process.env },
    });

    successCount++;
    console.log(`✅ ${service.name} seeded successfully`);
  } catch (error) {
    failCount++;
    console.error(`❌ ${service.name} seeding failed:`, error);
  }
}

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         SEEDING COMPLETE                                   ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');
console.log(`║  ✅ Successful: ${successCount}                                                          ║`);
console.log(`║  ❌ Failed: ${failCount}                                                              ║`);
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (failCount > 0) {
  console.log('⚠️  Some services failed to seed. Check the error messages above.');
  process.exit(1);
}

console.log('🎉 All family accounts created successfully!');
console.log('');
console.log('Test credentials:');
console.log('  Password for all accounts: AivoTest2024!');
console.log('');
console.log('Parent accounts:');
console.log('  • karen.hanson@email.com (Emma\'s mother)');
console.log('  • adaeze.ofem@email.com (Jayden\'s mother)');
console.log('  • funke.oluwole@email.com (Adebayo\'s mother)');
console.log('  • jennifer.kotz@email.com (Tyler\'s mother)');
console.log('  • robert.anderson@email.com (Sophie\'s father)');
console.log('  • michelle.hughes@email.com (Ethan\'s mother)');
console.log('');
console.log('District admin:');
console.log('  • admin@ahschools.us');
