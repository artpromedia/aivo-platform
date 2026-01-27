/**
 * Prisma Service for API Gateway
 *
 * Database client wrapper with connection management for consent operations.
 * Provides COPPA/FERPA compliant consent management.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma-client/index.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _client: PrismaClient | null = null;

  /**
   * Get the Prisma client instance.
   * Throws if not connected.
   */
  get client(): PrismaClient {
    if (!this._client) {
      throw new Error('PrismaService not initialized. Call onModuleInit first.');
    }
    return this._client;
  }

  /**
   * Consent model accessor
   */
  get consent() {
    return this.client.consent;
  }

  async onModuleInit() {
    this._client = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Set up query logging in development
    if (process.env.NODE_ENV === 'development') {
      this._client.$on('query' as never, (e: { query: string; duration: number }) => {
        this.logger.debug(`Query: ${e.query} (${e.duration}ms)`);
      });
    }

    this._client.$on('error' as never, (e: { message: string }) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });

    this._client.$on('warn' as never, (e: { message: string }) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });

    await this._client.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    if (this._client) {
      await this._client.$disconnect();
      this.logger.log('Database disconnected');
    }
  }
}
