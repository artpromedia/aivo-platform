/**
 * Payments Service Entry Point
 */

import { config } from './config.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Payments service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err, 'Error starting server');
    process.exit(1);
  }
}

void main();
