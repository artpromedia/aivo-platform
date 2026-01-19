export const config = {
  port: Number.parseInt(process.env.PORT || '4074', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || '',
  meilisearchUrl: process.env.MEILISEARCH_URL || '',
  meilisearchApiKey: process.env.MEILISEARCH_API_KEY || '',
};
