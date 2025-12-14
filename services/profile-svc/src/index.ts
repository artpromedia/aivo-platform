/**
 * Profile Service Entry Point
 */

import { buildApp } from './app.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Profile service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
