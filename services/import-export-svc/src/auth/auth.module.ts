// ══════════════════════════════════════════════════════════════════════════════
// AUTH MODULE - Authentication and authorization for import-export service
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
