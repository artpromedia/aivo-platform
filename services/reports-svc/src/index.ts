/**
 * Reports Service - Entry Point
 */

import { buildApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`📊 Reports service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
