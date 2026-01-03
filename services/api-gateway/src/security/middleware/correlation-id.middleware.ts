/**
 * Correlation ID Middleware
 * Generates and propagates correlation IDs for request tracing
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Get or generate correlation ID (traces across services)
    const correlationId = 
      req.headers[CORRELATION_ID_HEADER] as string || randomUUID();
    
    // Always generate new request ID (unique per request)
    const requestId = randomUUID();
    
    // Attach to request object
    req.correlationId = correlationId;
    (req as any).requestId = requestId;
    
    // Set response headers for tracing
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, requestId);
    
    // Initialize security context if not present
    if (!req.securityContext) {
      req.securityContext = {
        correlationId,
        requestId,
        ip: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        origin: req.headers.origin,
        isAuthenticated: false,
        permissions: [],
      };
    } else {
      req.securityContext.correlationId = correlationId;
      req.securityContext.requestId = requestId;
    }
    
    next();
  }
  
  private getClientIp(req: Request): string {
    // Handle various proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    
    return (
      req.headers['x-real-ip'] as string ||
      req.headers['cf-connecting-ip'] as string ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}
