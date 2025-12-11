/**
 * Generate RSA Key Pair for LTI JWT Signing
 * 
 * Run with: node scripts/generate-keys.mjs
 */

import { generateKeyPairSync } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, '..', 'keys');

// Ensure keys directory exists
if (!existsSync(keysDir)) {
  mkdirSync(keysDir, { recursive: true });
}

console.log('Generating RSA-2048 key pair for LTI JWT signing...\n');

// Generate RSA key pair
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Write keys to files
const privateKeyPath = join(keysDir, 'private.pem');
const publicKeyPath = join(keysDir, 'public.pem');

writeFileSync(privateKeyPath, privateKey);
writeFileSync(publicKeyPath, publicKey);

console.log('✅ Keys generated successfully!\n');
console.log(`   Private key: ${privateKeyPath}`);
console.log(`   Public key:  ${publicKeyPath}\n`);

// Generate a sample key ID
const keyId = `lti-key-${Date.now()}`;
console.log(`   Suggested Key ID: ${keyId}\n`);

// Print setup instructions
console.log('📋 Next steps:\n');
console.log('1. Add these environment variables to your .env file:\n');
console.log(`   LTI_DEFAULT_PRIVATE_KEY="$(cat ${privateKeyPath})"`);
console.log(`   LTI_KEY_ID="${keyId}"`);
console.log('\n2. Or reference the key file path in your tool configuration.\n');
console.log('⚠️  Keep the private key secure and never commit it to version control!');
