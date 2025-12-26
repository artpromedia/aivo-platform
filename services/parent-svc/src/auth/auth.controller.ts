/**
 * Auth Controller
 *
 * Authentication endpoints for parent portal.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import { ParentAuthService } from './parent-auth.service.js';
import { ParentAuthRequest } from './parent-auth.middleware.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: ParentAuthService) {}

  /**
   * Login with email and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  /**
   * Register a new parent account
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      inviteCode: string;
      language?: string;
    }
  ) {
    return this.authService.register(body);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  /**
   * Logout and invalidate refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { refreshToken: string }) {
    await this.authService.logout(body.refreshToken);
  }

  /**
   * Verify email with token
   */
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.requestPasswordReset(body.email);
    return { success: true, message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    await this.authService.resetPassword(body.token, body.password);
    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Get current user info (requires auth)
   */
  @Get('me')
  async getMe(@Req() req: ParentAuthRequest) {
    return {
      id: req.parent!.id,
      email: req.parent!.email,
      firstName: req.parent!.firstName,
      lastName: req.parent!.lastName,
      language: req.parent!.language,
      verified: req.parent!.verified,
    };
  }
}
