import { createApp } from './app';
import { config } from './config';

async function main() {
  const app = createApp();
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`auth-svc running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
