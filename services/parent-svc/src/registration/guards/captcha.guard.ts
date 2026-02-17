/**
 * CAPTCHA Hook
 *
 * Validates reCAPTCHA tokens for registration endpoints.
 * Supports Google reCAPTCHA v2 and v3.
 * Used as a Fastify preHandler hook.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../../config.js';
import { BadRequestException } from '../../errors.js';

interface RecaptchaResponse {
  success: boolean;
  score?: number; // v3 only
  action?: string; // v3 only
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE_V3 = 0.5;

export async function captchaHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  // Skip if CAPTCHA is disabled
  if (!config.captchaEnabled) {
    return;
  }

  // Skip in development
  if (config.environment === 'development') {
    return;
  }

  // Ensure secret key is configured
  if (!config.recaptchaSecretKey) {
    logger.warn('CAPTCHA enabled but secret key not configured');
    return; // Fail open if misconfigured
  }

  const body = request.body as Record<string, unknown> | undefined;
  const captchaToken = body?.captchaToken as string | undefined;

  if (!captchaToken) {
    throw new BadRequestException('CAPTCHA verification required');
  }

  try {
    const isValid = await verifyToken(captchaToken, request);

    if (!isValid) {
      logger.warn(
        {
          ip: request.ip,
          path: request.url,
        },
        'CAPTCHA verification failed'
      );
      throw new BadRequestException('CAPTCHA verification failed. Please try again.');
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    logger.error({ error }, 'CAPTCHA verification error');
    // Fail open on verification errors to not block legitimate users
  }
}

async function verifyToken(token: string, request: FastifyRequest): Promise<boolean> {
  const clientIp = request.ip;

  const params = new URLSearchParams({
    secret: config.recaptchaSecretKey!,
    response: token,
    remoteip: clientIp,
  });

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    logger.error(
      {
        status: response.status,
        statusText: response.statusText,
      },
      'reCAPTCHA API error'
    );
    return false;
  }

  const data: RecaptchaResponse = await response.json();

  if (!data.success) {
    logger.warn(
      {
        errorCodes: data['error-codes'],
        ip: clientIp,
      },
      'reCAPTCHA verification failed'
    );
    return false;
  }

  // For v3, also check the score
  if (typeof data.score === 'number') {
    if (data.score < MIN_SCORE_V3) {
      logger.warn(
        {
          score: data.score,
          action: data.action,
          ip: clientIp,
        },
        'reCAPTCHA v3 score too low'
      );
      return false;
    }

    logger.debug(
      {
        score: data.score,
        action: data.action,
      },
      'reCAPTCHA v3 verified'
    );
  }

  return true;
}
