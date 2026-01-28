# Model Monitoring Service

## Overview
Tracks AI/ML model performance in production, including predictions, metrics over time, data drift detection, and feature importance monitoring.

## Features
- **Prediction Logging**: Track every model prediction with inputs, outputs, and metadata
- **Performance Monitoring**: Track model accuracy, latency, and other metrics over time
- **Data Drift Detection**: Monitor input distribution changes
- **Feature Importance**: Track which features drive predictions
- **Alert Configuration**: Set thresholds for automated alerts
- **A/B Testing Support**: Compare model variants in production

## Architecture
- **Database**: PostgreSQL with time-series optimizations
- **API**: Fastify-based REST API
- **Monitoring**: Prometheus metrics export
- **Alerting**: Webhook notifications for threshold violations

## Related Services
- **model-registry-svc**: Model version management
- **model-trainer-svc**: Training pipeline
- **ai-orchestrator**: Model inference and routing
