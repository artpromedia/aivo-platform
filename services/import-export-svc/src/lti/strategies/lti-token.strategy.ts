// ══════════════════════════════════════════════════════════════════════════════
// LTI TOKEN STRATEGY
// Passport strategy for LTI OAuth2 access token authentication
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LTITokenStrategy extends PassportStrategy(Strategy, 'lti-token') {
  private platformIssuer: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
    this.platformIssuer = config.getOrThrow('LTI_PLATFORM_ISSUER');
  }

  async validate(token: string): Promise<any> {
    try {
      // Get JWKS for verification
      const JWKS = createRemoteJWKSet(
        new URL(`${this.platformIssuer}/lti/platform/jwks`)
      );

      // Verify the token
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: this.platformIssuer,
      });

      // Extract scopes
      const scopes = (payload.scope as string)?.split(' ') || [];

      // Find the tool that was issued this token
      // In production, you'd want to look up the tool from the token's claims
      
      return {
        type: 'lti-tool',
        scopes,
        tenantId: payload.tenantId,
        toolId: payload.toolId,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid LTI access token');
    }
  }
}
