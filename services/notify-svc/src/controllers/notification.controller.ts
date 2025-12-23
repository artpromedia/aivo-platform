/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { logger } from '@aivo/ts-observability';
import { Controller, Post, Body, UseGuards, Get, Put, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { PrismaService } from '../prisma/prisma.service';
import type { PushNotificationService } from '../services/push-notification.service';

interface RegisterDeviceDto {
  token: string;
  platform: 'ios' | 'android';
  app: 'parent' | 'teacher' | 'learner';
  learnerId?: string;
  isChildDevice?: boolean;
}

interface UpdatePreferencesDto {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  sessionUpdates?: boolean;
  achievements?: boolean;
  messages?: boolean;
  reminders?: boolean;
  alerts?: boolean;
  billing?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}

interface SendNotificationDto {
  userId?: string;
  userIds?: string[];
  topic?: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  imageUrl?: string;
}

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private pushService: PushNotificationService,
    private prisma: PrismaService
  ) {}

  @Post('devices/register')
  @ApiOperation({ summary: 'Register device for push notifications' })
  async registerDevice(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: RegisterDeviceDto
  ) {
    // Deactivate existing tokens for this device/app combo
    await this.prisma.deviceToken.updateMany({
      where: {
        userId: user.id,
        platform: dto.platform,
        app: dto.app,
      },
      data: { isActive: false },
    });

    // Create or update token
    const device = await this.prisma.deviceToken.upsert({
      where: {
        token: dto.token,
      },
      create: {
        userId: user.id,
        tenantId: user.tenantId,
        token: dto.token,
        platform: dto.platform,
        app: dto.app,
        learnerId: dto.learnerId,
        isChildDevice: dto.isChildDevice ?? false,
        isActive: true,
      },
      update: {
        userId: user.id,
        isActive: true,
        learnerId: dto.learnerId,
        isChildDevice: dto.isChildDevice ?? false,
        updatedAt: new Date(),
      },
    });

    logger.info('Device registered for push notifications', {
      userId: user.id,
      platform: dto.platform,
      app: dto.app,
    });

    return { success: true, deviceId: device.id };
  }

  @Delete('devices/:token')
  @ApiOperation({ summary: 'Unregister device from push notifications' })
  async unregisterDevice(@CurrentUser() user: { id: string }, @Param('token') token: string) {
    await this.prisma.deviceToken.updateMany({
      where: {
        userId: user.id,
        token,
      },
      data: { isActive: false },
    });

    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() user: { id: string }) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    return prefs || this.getDefaultPreferences();
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@CurrentUser() user: { id: string }, @Body() dto: UpdatePreferencesDto) {
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...dto,
        preferences: {},
      },
      update: dto,
    });

    return prefs;
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  async getHistory(@CurrentUser() user: { id: string }) {
    const notifications = await this.prisma.notificationLog.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    return notifications;
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a push notification (admin only)' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    if (dto.topic) {
      await this.pushService.sendToTopic({
        topic: dto.topic,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        data: dto.data,
        priority: dto.priority,
        imageUrl: dto.imageUrl,
      });
      return { success: true };
    }

    const result = await this.pushService.sendToUsers({
      userId: dto.userId,
      userIds: dto.userIds,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      data: dto.data,
      priority: dto.priority,
      imageUrl: dto.imageUrl,
    });

    return result;
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to yourself' })
  async sendTestNotification(@CurrentUser() user: { id: string }) {
    const result = await this.pushService.sendToUsers({
      userId: user.id,
      title: 'Test Notification',
      body: 'This is a test notification from Aivo!',
      type: 'test',
      priority: 'normal',
    });

    return result;
  }

  private getDefaultPreferences() {
    return {
      pushEnabled: true,
      emailEnabled: true,
      sessionUpdates: true,
      achievements: true,
      messages: true,
      reminders: true,
      alerts: true,
      billing: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      quietHoursTimezone: 'UTC',
    };
  }
}
