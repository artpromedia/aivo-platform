/**
 * Age Verification Guard
 * Enforces age restrictions for COPPA compliance
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
import { AuthenticatedUser } from '../types';
import { COMPLIANCE } from '../constants';

@Injectable()
export class AgeVerificationGuard implements CanActivate {
  private readonly logger = new Logger(AgeVerificationGuard.name);
  
  constructor(private readonly reflector: Reflector) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get minimum age requirement from decorator
    const minAge = this.reflector.getAllAndOverride<number>(
      METADATA_KEYS.AGE_RESTRICTION,
      [context.getHandler(), context.getClass()]
    );
    
    // No age restriction on this endpoint
    if (!minAge) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    
    // Must be authenticated
    if (!user) {
      return true; // Let auth guard handle this
    }
    
    // Check if age has been verified
    if (!user.ageVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Age verification required',
        code: 'AGE_VERIFICATION_REQUIRED',
      });
    }
    
    // For COPPA compliance (minors under 13)
    if (minAge === COMPLIANCE.AGE_THRESHOLDS.COPPA_MINOR && user.isMinor) {
      // Minor users need parental consent for certain operations
      if (user.consentStatus !== 'granted') {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Parental consent required for users under 13',
          code: 'PARENTAL_CONSENT_REQUIRED',
          minAgeRequired: minAge,
        });
      }
    }
    
    return true;
  }
}
