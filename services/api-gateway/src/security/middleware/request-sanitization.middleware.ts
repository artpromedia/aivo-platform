/**
 * Request Sanitization Middleware
 * Sanitizes incoming request data to prevent injection attacks
 */

import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// Configure DOMPurify for strict sanitization
DOMPurify.setConfig({
  ALLOWED_TAGS: [], // No HTML tags allowed by default
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  USE_PROFILES: { html: false },
});

@Injectable()
export class RequestSanitizationMiddleware implements NestMiddleware {
  // Patterns that indicate potential attacks
  private readonly dangerousPatterns = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /('|")\s*(OR|AND)\s*('|"|\d)/i,
    /(--|#|\/\*)/,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    
    // XSS patterns
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /(<|%3C)(script|iframe|object|embed|svg|img)/i,
    
    // Path traversal
    /\.\.[\/\\]/,
    /%2e%2e[\/\\%]/i,
    
    // Command injection
    /[;&|`$(){}[\]]/,
    /\$\([^)]+\)/,
    /`[^`]+`/,
    
    // LDAP injection
    /[()\\*\x00]/,
    
    // XML injection
    /<!ENTITY/i,
    /<!\[CDATA\[/i,
  ];
  
  // Fields that should never be sanitized (binary, etc.)
  private readonly bypassFields = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'signature',
    'certificate',
  ]);
  
  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query, 'query');
      }
      
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body, 'body');
      }
      
      // Sanitize params
      if (req.params) {
        req.params = this.sanitizeObject(req.params, 'params');
      }
      
      // Check for dangerous patterns in URL
      this.validateUrl(req.originalUrl);
      
      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      next(error);
    }
  }
  
  private sanitizeObject(obj: any, context: string, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.sanitizeObject(item, context, `${path}[${index}]`)
      );
    }
    
    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Skip bypass fields
        if (this.bypassFields.has(key)) {
          sanitized[key] = value;
          continue;
        }
        
        sanitized[key] = this.sanitizeObject(value, context, fieldPath);
      }
      return sanitized;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, path);
    }
    
    return obj;
  }
  
  private sanitizeString(value: string, path: string): string {
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid characters detected in input',
          field: path,
          code: 'SEC5001',
        });
      }
    }
    
    // Trim whitespace
    let sanitized = value.trim();
    
    // Normalize unicode
    sanitized = sanitized.normalize('NFC');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Sanitize HTML if it looks like it contains HTML
    if (/<[^>]+>/.test(sanitized)) {
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    }
    
    // Escape HTML entities for display
    sanitized = validator.escape(sanitized);
    
    return sanitized;
  }
  
  private validateUrl(url: string): void {
    // Decode URL to check for encoded attacks
    let decoded = url;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      // If decoding fails, check the original
    }
    
    // Check for path traversal
    if (/\.\.[\/\\]/.test(decoded)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid URL path',
        code: 'SEC5002',
      });
    }
    
    // Check for null bytes
    if (decoded.includes('\x00')) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid URL',
        code: 'SEC5002',
      });
    }
  }
}
