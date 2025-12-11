/**
 * LTI Service Setup Script
 * 
 * Run with: node scripts/setup.mjs
 * 
 * This script:
 * 1. Generates RSA keys if not present
 * 2. Creates .env from .env.example if not present
 * 3. Runs Prisma generate
 * 4. Provides instructions for database setup
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🚀 LTI Service Setup\n');
console.log('='.repeat(50) + '\n');

// Step 1: Check/Generate Keys
console.log('📝 Step 1: RSA Keys\n');
const keysDir = join(rootDir, 'keys');
const privateKeyPath = join(keysDir, 'private.pem');
const publicKeyPath = join(keysDir, 'public.pem');

if (existsSync(privateKeyPath) && existsSync(publicKeyPath)) {
  console.log('   ✅ Keys already exist\n');
} else {
  console.log('   Generating RSA keys...');
  try {
    execSync('node scripts/generate-keys.mjs', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.error('   ❌ Failed to generate keys');
    process.exit(1);
  }
}

// Step 2: Check/Create .env
console.log('📝 Step 2: Environment Configuration\n');
const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

if (existsSync(envPath)) {
  console.log('   ✅ .env file already exists\n');
} else if (existsSync(envExamplePath)) {
  console.log('   Creating .env from .env.example...');
  copyFileSync(envExamplePath, envPath);
  console.log('   ✅ .env created - please review and update values\n');
} else {
  console.log('   ⚠️  No .env.example found, skipping\n');
}

// Step 3: Prisma Generate
console.log('📝 Step 3: Prisma Client\n');
try {
  console.log('   Running prisma generate...');
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✅ Prisma client generated\n');
} catch (error) {
  console.log('   ⚠️  Prisma generate failed (may need database URL)\n');
}

// Step 4: Instructions
console.log('='.repeat(50));
console.log('\n📋 Manual Steps Required:\n');

console.log('1. DATABASE SETUP:');
console.log('   Create a PostgreSQL database for the LTI service:');
console.log('   ```');
console.log('   CREATE DATABASE lti_svc;');
console.log('   ```\n');

console.log('2. UPDATE .env:');
console.log('   Review and update the DATABASE_URL in .env:');
console.log('   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lti_svc\n');

console.log('3. RUN MIGRATIONS:');
console.log('   ```');
console.log('   pnpm prisma migrate dev');
console.log('   ```\n');

console.log('4. START THE SERVICE:');
console.log('   ```');
console.log('   pnpm dev');
console.log('   ```\n');

console.log('5. REGISTER IN LMS:');
console.log('   Configure your LMS with these endpoints:');
console.log(`   - Login URL:   ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/login`);
console.log(`   - Launch URL:  ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/launch`);
console.log(`   - JWKS URL:    ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/jwks?toolId=<TOOL_ID>`);
console.log('\n');

console.log('='.repeat(50));
console.log('\n✅ Setup complete! See above for next steps.\n');
