/**
 * Writing Pad Service - Entry Point
 *
 * AI-assisted writing pad for AIVO platform learners.
 * Provides writing assistance, feedback, and encouragement.
 */

import { buildApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Writing Pad Service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Failed to start Writing Pad Service:', err);
  process.exit(1);
});
