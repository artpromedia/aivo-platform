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
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const nodeEnv = configService.get<string>('NODE_ENV');
        if (!jwtSecret && nodeEnv === 'production') {
          throw new Error('JWT_SECRET environment variable is required in production');
        }
        return {
          secret: jwtSecret ?? 'dev-only-not-for-production',
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  providers: [],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
