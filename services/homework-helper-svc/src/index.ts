import { buildApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';

async function main() {
  await connectDatabase();

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Homework Helper Service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    await disconnectDatabase();
    process.exit(1);
  }

  // Graceful shutdown
  type Signal = 'SIGINT' | 'SIGTERM';
  const signals: Signal[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    });
  }
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
