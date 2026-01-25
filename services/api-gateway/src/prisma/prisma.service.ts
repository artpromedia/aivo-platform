/**
 * Prisma Service for API Gateway
 *
 * Database client wrapper with connection management.
 *
 * NOTE: This service requires a Prisma schema and generated client.
 * Currently using a stub implementation for type safety.
 * TODO: Set up prisma/schema.prisma and run `prisma generate` to create proper client.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClientStub } from './prisma.types';

// Stub implementation - replace with actual PrismaClient when schema is generated
// import { PrismaClient } from '../../generated/prisma-client/index.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _client: PrismaClientStub | null = null;

  /**
   * Get the Prisma client instance.
   * Throws if not connected.
   */
  get client(): PrismaClientStub {
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
    // TODO: Initialize actual PrismaClient when schema is set up
    // this._client = new PrismaClient({
    //   log: [
    //     { emit: 'event', level: 'query' },
    //     { emit: 'event', level: 'error' },
    //     { emit: 'event', level: 'warn' },
    //   ],
    // });
    // await this._client.$connect();

    this.logger.warn(
      'PrismaService: Using stub implementation. ' +
      'Set up prisma/schema.prisma and generate client for production use.'
    );

    // Stub client for development - all operations will throw
    this._client = this.createStubClient();
  }

  async onModuleDestroy() {
    if (this._client) {
      await this._client.$disconnect();
      this.logger.log('Database disconnected');
    }
  }

  /**
   * Create a stub client that throws helpful errors
   */
  private createStubClient(): PrismaClientStub {
    const notImplemented = (method: string) => {
      throw new Error(
        `PrismaService.${method} is not implemented. ` +
        'Set up prisma/schema.prisma and run "prisma generate" to enable database access.'
      );
    };

    return {
      consent: {
        findFirst: () => notImplemented('consent.findFirst') as never,
        findMany: () => notImplemented('consent.findMany') as never,
        create: () => notImplemented('consent.create') as never,
        update: () => notImplemented('consent.update') as never,
        updateMany: () => notImplemented('consent.updateMany') as never,
        count: () => notImplemented('consent.count') as never,
      },
      $connect: async () => { /* no-op for stub */ },
      $disconnect: async () => { /* no-op for stub */ },
    };
  }
}
