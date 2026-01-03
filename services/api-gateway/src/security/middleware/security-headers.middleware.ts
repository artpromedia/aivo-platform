/**
 * Security Headers Middleware
 * Implements comprehensive security headers using Helmet
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SECURITY_HEADERS } from '../constants';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private helmetMiddleware: ReturnType<typeof helmet>;
  
  constructor() {
    this.helmetMiddleware = helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'strict-dynamic'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https://api.aivo.edu', 'wss://api.aivo.edu'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
          reportUri: SECURITY_HEADERS.CSP_REPORT_URI,
        },
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      },
      
      // Strict Transport Security
      hsts: {
        maxAge: SECURITY_HEADERS.HSTS_MAX_AGE,
        includeSubDomains: true,
        preload: true,
      },
      
      // Prevent clickjacking
      frameguard: {
        action: 'deny',
      },
      
      // Prevent MIME type sniffing
      noSniff: true,
      
      // XSS filter (legacy, but still useful)
      xssFilter: true,
      
      // Hide X-Powered-By header
      hidePoweredBy: true,
      
      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      
      // Cross-Origin policies
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      
      // Origin-Agent-Cluster header
      originAgentCluster: true,
      
      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },
      
      // IE No Open
      ieNoOpen: true,
      
      // Permitted Cross-Domain Policies
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    });
  }
  
  use(req: Request, res: Response, next: NextFunction): void {
    // Apply helmet middleware
    this.helmetMiddleware(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      // Add Permissions-Policy header (Feature-Policy replacement)
      res.setHeader(
        'Permissions-Policy',
        SECURITY_HEADERS.FEATURE_POLICY.join(', ')
      );
      
      // Add Cache-Control for sensitive endpoints
      if (this.isSensitiveEndpoint(req.path)) {
        res.setHeader(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      next();
    });
  }
  
  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      /^\/api\/auth/,
      /^\/api\/users/,
      /^\/api\/students/,
      /^\/api\/admin/,
      /^\/api\/consent/,
      /^\/api\/export/,
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(path));
  }
}
