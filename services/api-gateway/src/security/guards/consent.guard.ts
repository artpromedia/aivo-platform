/**
 * Consent Guard
 * Verifies user consent for data processing operations
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { METADATA_KEYS } from '../decorators';
import { ConsentService } from '../services/consent.service';
import { ConsentPurpose, AuthenticatedUser } from '../types';
import { SECURITY_ERROR_CODES } from '../constants';

@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);
  
  constructor(
    private readonly reflector: Reflector,
    private readonly consentService: ConsentService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required consent purposes from decorator
    const requiredConsents = this.reflector.getAllAndOverride<ConsentPurpose[]>(
      METADATA_KEYS.REQUIRE_CONSENT,
      [context.getHandler(), context.getClass()]
    );
    
    // No consent required for this endpoint
    if (!requiredConsents || requiredConsents.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    
    // Must be authenticated to check consent
    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Authentication required',
        code: SECURITY_ERROR_CODES.CONSENT_REQUIRED,
      });
    }
    
    try {
      // Check if user has granted all required consents
      const consentStatus = await this.consentService.verifyConsents(
        user.id,
        requiredConsents
      );
      
      // Check for missing consents
      const missingConsents = consentStatus.filter(c => !c.granted);
      
      if (missingConsents.length > 0) {
        // Check if this is a minor requiring parental consent
        if (user.isMinor) {
          const hasParentalConsent = await this.consentService.hasParentalConsent(
            user.id,
            requiredConsents
          );
          
          if (!hasParentalConsent) {
            throw new ForbiddenException({
              statusCode: 403,
              error: 'Forbidden',
              message: 'Parental consent required for this operation',
              code: SECURITY_ERROR_CODES.PARENTAL_CONSENT_REQUIRED,
              missingConsents: missingConsents.map(c => c.purpose),
            });
          }
        } else {
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            message: 'User consent required for this operation',
            code: SECURITY_ERROR_CODES.CONSENT_REQUIRED,
            missingConsents: missingConsents.map(c => c.purpose),
          });
        }
      }
      
      // Check for expired consents
      const expiredConsents = consentStatus.filter(c => c.expired);
      
      if (expiredConsents.length > 0) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Consent has expired and needs to be renewed',
          code: SECURITY_ERROR_CODES.CONSENT_EXPIRED,
          expiredConsents: expiredConsents.map(c => c.purpose),
        });
      }
      
      // Check for revoked consents
      const revokedConsents = consentStatus.filter(c => c.revoked);
      
      if (revokedConsents.length > 0) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Consent has been revoked',
          code: SECURITY_ERROR_CODES.CONSENT_REVOKED,
          revokedConsents: revokedConsents.map(c => c.purpose),
        });
      }
      
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Consent verification failed', {
        error: error.message,
        userId: user.id,
        purposes: requiredConsents,
        correlationId: request.correlationId,
      });
      
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Unable to verify consent status',
        code: SECURITY_ERROR_CODES.CONSENT_REQUIRED,
      });
    }
  }
}
