/**
 * API Gateway - Health Controller
 *
 * Provides /health endpoint for Kubernetes liveness and readiness probes.
 */

import { Controller, Get } from '@nestjs/common';

import { Public } from './security/decorators';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  readiness() {
    return { status: 'ok' };
  }
}
