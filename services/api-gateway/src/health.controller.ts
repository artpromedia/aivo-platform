/**
 * API Gateway - Health Controller
 *
 * Provides /health endpoint for Kubernetes liveness and readiness probes.
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  readiness() {
    return { status: 'ok' };
  }
}
