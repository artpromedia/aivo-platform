export const config = {
  port: parseInt(process.env.PORT || '4071', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/etc/secrets/jwt-public.pem',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
};
