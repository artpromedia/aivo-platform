/**
 * CAPTCHA Guard
 *
 * Validates reCAPTCHA tokens for registration endpoints.
 * Supports Google reCAPTCHA v2 and v3.
 */

import { logger } from '@aivo/ts-observability';
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

import { config } from '../../config.js';

interface RecaptchaResponse {
  success: boolean;
  score?: number; // v3 only
  action?: string; // v3 only
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class CaptchaGuard implements CanActivate {
  private readonly RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
  private readonly MIN_SCORE_V3 = 0.5; // Minimum score for v3 (0.0 - 1.0)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if CAPTCHA is disabled
    if (!config.captchaEnabled) {
      return true;
    }

    // Skip in development
    if (config.environment === 'development') {
      return true;
    }

    // Ensure secret key is configured
    if (!config.recaptchaSecretKey) {
      logger.warn('CAPTCHA enabled but secret key not configured');
      return true; // Fail open if misconfigured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const captchaToken = request.body?.captchaToken;

    if (!captchaToken) {
      throw new BadRequestException('CAPTCHA verification required');
    }

    try {
      const isValid = await this.verifyToken(captchaToken, request);

      if (!isValid) {
        logger.warn('CAPTCHA verification failed', {
          ip: this.getClientIp(request),
          path: request.path,
        });
        throw new BadRequestException('CAPTCHA verification failed. Please try again.');
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      logger.error('CAPTCHA verification error', { error });
      // Fail open on verification errors to not block legitimate users
      return true;
    }
  }

  private async verifyToken(token: string, request: Request): Promise<boolean> {
    const clientIp = this.getClientIp(request);

    const params = new URLSearchParams({
      secret: config.recaptchaSecretKey!,
      response: token,
      remoteip: clientIp,
    });

    const response = await fetch(this.RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      logger.error('reCAPTCHA API error', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    const data: RecaptchaResponse = await response.json();

    if (!data.success) {
      logger.warn('reCAPTCHA verification failed', {
        errorCodes: data['error-codes'],
        ip: clientIp,
      });
      return false;
    }

    // For v3, also check the score
    if (typeof data.score === 'number') {
      if (data.score < this.MIN_SCORE_V3) {
        logger.warn('reCAPTCHA v3 score too low', {
          score: data.score,
          action: data.action,
          ip: clientIp,
        });
        return false;
      }

      logger.debug('reCAPTCHA v3 verified', {
        score: data.score,
        action: data.action,
      });
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return request.socket?.remoteAddress || 'unknown';
  }
}
