import { buildApp } from './app.js';
import { config } from './config.js';

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`baseline-svc listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
