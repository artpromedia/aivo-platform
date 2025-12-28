// ══════════════════════════════════════════════════════════════════════════════
// xAPI AUTH STRATEGY
// Passport strategy for xAPI Basic Auth / OAuth2 authentication
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy } from 'passport-http';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'node:crypto';

@Injectable()
export class XAPIAuthStrategy extends PassportStrategy(BasicStrategy, 'xapi') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async validate(clientId: string, clientSecret: string): Promise<any> {
    // Look up xAPI client credentials
    const client = await this.prisma.xapiClient.findFirst({
      where: {
        clientId,
        status: 'active',
      },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid xAPI credentials');
    }

    // Verify secret (compare hashed values)
    const hashedSecret = crypto
      .createHash('sha256')
      .update(clientSecret)
      .digest('hex');

    if (client.clientSecretHash !== hashedSecret) {
      throw new UnauthorizedException('Invalid xAPI credentials');
    }

    // Update last used timestamp
    await this.prisma.xapiClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      type: 'xapi-client',
      clientId: client.id,
      tenantId: client.tenantId,
      scopes: client.scopes || ['statements/read', 'statements/write'],
      authority: {
        objectType: 'Agent',
        name: client.name,
        account: {
          homePage: process.env.APP_URL || 'https://aivo.education',
          name: client.clientId,
        },
      },
    };
  }
}
