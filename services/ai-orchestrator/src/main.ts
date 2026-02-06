import { createApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = createApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`AI Orchestrator listening on 0.0.0.0:${config.port}`);
}

main().catch((error) => {
  console.error('Failed to start AI Orchestrator', error);
  process.exit(1);
});
