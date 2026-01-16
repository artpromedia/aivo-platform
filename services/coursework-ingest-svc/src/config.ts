export const config = {
  port: parseInt(process.env.PORT || '4078', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  storageUrl: process.env.STORAGE_URL || '',
  storageBucket: process.env.STORAGE_BUCKET || 'coursework-ingest',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  contentServiceUrl: process.env.CONTENT_SERVICE_URL || '',
};
