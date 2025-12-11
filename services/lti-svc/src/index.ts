/**
 * LTI Service Entry Point
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { startServer } from './server.js';

// Cache for loaded keys
const keyCache = new Map<string, string>();

/**
 * Get private key for LTI signing
 * Supports:
 * - File path references (LTI_DEFAULT_PRIVATE_KEY_PATH)
 * - Direct PEM content in env vars
 * - KMS/Vault references (for production)
 */
async function getPrivateKey(keyRef: string): Promise<string> {
  // Check cache first
  const cached = keyCache.get(keyRef);
  if (cached) {
    return cached;
  }

  let key: string | undefined;

  // Try specific key reference
  key = process.env[`LTI_PRIVATE_KEY_${keyRef}`];

  // Try default key from environment
  if (!key) {
    key = process.env.LTI_DEFAULT_PRIVATE_KEY;
  }

  // Try loading from file path
  if (!key) {
    const keyPath = process.env.LTI_DEFAULT_PRIVATE_KEY_PATH;
    if (keyPath) {
      const resolvedPath = resolve(keyPath);
      if (existsSync(resolvedPath)) {
        key = readFileSync(resolvedPath, 'utf8');
        console.log(`Loaded private key from: ${resolvedPath}`);
      }
    }
  }

  if (!key) {
    throw new Error(
      `Private key not found for ref: ${keyRef}. ` +
        'Set LTI_DEFAULT_PRIVATE_KEY or LTI_DEFAULT_PRIVATE_KEY_PATH in .env'
    );
  }

  // Cache the key
  keyCache.set(keyRef, key);
  return key;
}

const baseUrl = process.env.LTI_BASE_URL || 'http://localhost:3008';
const port = parseInt(process.env.PORT || '3008', 10);

void startServer({
  port,
  baseUrl,
  getPrivateKey,
});
