/**
 * Extended Prisma Client Types for Sandbox Service
 * These types extend the base PrismaClient with sandbox-specific models
 * that are used for synthetic data generation and partner management.
 *
 * NOTE: This is a build-compatibility layer. The actual Prisma models
 * should be defined in the schema.prisma file and generated via prisma generate.
 */

import { PrismaClient as BasePrismaClient } from '@prisma/client';

// Re-export the PrismaClient directly - the schema.prisma defines all models
// No need for custom ExtendedPrismaClient since all models are in the schema
export type ExtendedPrismaClient = BasePrismaClient;

// Export prisma client instance
export const prisma = new BasePrismaClient();
