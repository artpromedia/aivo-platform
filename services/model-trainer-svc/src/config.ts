export const config = {
  port: Number.parseInt(process.env.PORT || '4073', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/etc/secrets/jwt-public.pem',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
  s3: { bucket: process.env.S3_BUCKET || 'aivo-training', region: process.env.AWS_REGION || 'us-east-1' },
};
