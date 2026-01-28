export const config = {
  // Server
  port: Number.parseInt(process.env.PORT || '4074', 10),
  host: process.env.HOST || '0.0.0.0',
  serviceName: 'model-monitoring-svc',
  version: '1.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/aivo_model_monitoring',

  // Authentication
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/etc/secrets/jwt-public.pem',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // External services
  modelRegistryUrl: process.env.MODEL_REGISTRY_URL || 'http://model-registry-svc:4012',
  
  // Monitoring settings
  defaultMetricWindowDuration: Number.parseInt(process.env.DEFAULT_METRIC_WINDOW || '3600', 10), // 1 hour
  predictionRetentionDays: Number.parseInt(process.env.PREDICTION_RETENTION_DAYS || '90', 10),
  metricAggregationIntervals: ['hour', 'day', 'week', 'month'],

  // Alert settings
  alertCheckInterval: Number.parseInt(process.env.ALERT_CHECK_INTERVAL || '300', 10), // 5 minutes
  webhookTimeout: Number.parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10),

  // Feature importance
  featureImportanceRecalcInterval: Number.parseInt(process.env.FEATURE_IMPORTANCE_INTERVAL || '86400', 10), // 24 hours
  
  // Data drift
  driftCheckInterval: Number.parseInt(process.env.DRIFT_CHECK_INTERVAL || '86400', 10), // 24 hours
  driftDetectionMethod: process.env.DRIFT_DETECTION_METHOD || 'ks_test', // ks_test, chi2, jensen_shannon

  // Performance
  batchPredictionLogSize: Number.parseInt(process.env.BATCH_PREDICTION_LOG_SIZE || '1000', 10),
  metricsAggregationBatchSize: Number.parseInt(process.env.METRICS_BATCH_SIZE || '10000', 10),

  // Environment
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};
