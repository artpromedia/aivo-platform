/**
 * Messaging Controller
 *
 * REST API endpoints for parent-teacher messaging.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { ParentAuthRequest } from '../auth/parent-auth.middleware.js';
import { SendMessageInput } from './messaging.types.js';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * Get all conversations for the parent
   */
  @Get('conversations')
  async getConversations(
    @Req() req: ParentAuthRequest,
    @Query('includeArchived') includeArchived?: string
  ) {
    return this.messagingService.getParentConversations(req.parent!.id, {
      includeArchived: includeArchived === 'true',
    });
  }

  /**
   * Create a new conversation with a teacher
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Req() req: ParentAuthRequest,
    @Body() body: { teacherId: string; studentId: string; subject: string; message?: string }
  ) {
    const conversation = await this.messagingService.createConversation({
      parentId: req.parent!.id,
      teacherId: body.teacherId,
      studentId: body.studentId,
      subject: body.subject,
    });

    // Send initial message if provided
    if (body.message) {
      await this.messagingService.sendMessage({
        conversationId: conversation.id,
        senderId: req.parent!.id,
        senderType: 'parent',
        content: body.message,
      });
    }

    return conversation;
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:conversationId')
  async getConversationMessages(
    @Req() req: ParentAuthRequest,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string
  ) {
    return this.messagingService.getConversationMessages(conversationId, req.parent!.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before: before || undefined,
    });
  }

  /**
   * Send a message in a conversation
   */
  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Req() req: ParentAuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string }
  ) {
    return this.messagingService.sendMessage({
      conversationId,
      senderId: req.parent!.id,
      senderType: 'parent',
      content: body.content,
    });
  }

  /**
   * Mark messages as read
   */
  @Put('conversations/:conversationId/read')
  async markAsRead(
    @Req() req: ParentAuthRequest,
    @Param('conversationId') conversationId: string
  ) {
    await this.messagingService.markAsRead(conversationId, req.parent!.id);
    return { success: true };
  }

  /**
   * Archive a conversation
   */
  @Put('conversations/:conversationId/archive')
  async archiveConversation(
    @Req() req: ParentAuthRequest,
    @Param('conversationId') conversationId: string
  ) {
    await this.messagingService.archiveConversation(conversationId, req.parent!.id);
    return { success: true };
  }

  /**
   * Report a message
   */
  @Post('messages/:messageId/report')
  @HttpCode(HttpStatus.CREATED)
  async reportMessage(
    @Req() req: ParentAuthRequest,
    @Param('messageId') messageId: string,
    @Body() body: { reason: string; details?: string }
  ) {
    return this.messagingService.reportMessage({
      messageId,
      reporterId: req.parent!.id,
      reporterType: 'parent',
      reason: body.reason,
      details: body.details,
    });
  }

  /**
   * Get unread message count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: ParentAuthRequest) {
    return this.messagingService.getUnreadCount(req.parent!.id);
  }
}
