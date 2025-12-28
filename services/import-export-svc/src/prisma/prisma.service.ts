/**
 * Prisma Service
 *
 * NestJS wrapper for Prisma client with connection handling.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean database for testing
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
    );

    for (const model of models) {
      const m = this[model as keyof this];
      if (m && typeof m === 'object' && 'deleteMany' in m) {
        await (m as { deleteMany: () => Promise<unknown> }).deleteMany();
      }
    }
  }
}
