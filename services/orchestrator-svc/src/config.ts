export const config = {
  port: parseInt(process.env.PORT || '4075', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
  taskPollInterval: parseInt(process.env.TASK_POLL_INTERVAL || '1000', 10),
};
