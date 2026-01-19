export const config = {
  port: Number.parseInt(process.env.PORT || '4077', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
  assetStorageUrl: process.env.ASSET_STORAGE_URL || '',
  maxConcurrentGenerations: Number.parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '5', 10),
};
