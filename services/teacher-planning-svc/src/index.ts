import { createApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = createApp();
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`teacher-planning-svc running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
