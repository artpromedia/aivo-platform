/**
 * Prisma Service
 *
 * Database client wrapper with connection management.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/index.js';
import { logger } from '@aivo/ts-observability';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    logger.info('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    logger.info('Database disconnected');
  }
}
