/**
 * Prisma Types for API Gateway
 *
 * Stub types for Prisma Client until a proper schema is set up.
 * TODO: Generate proper Prisma client when database schema is finalized.
 */

// Stub Consent model type
export interface Consent {
  id: string;
  userId: string;
  consentType: string;
  purposes: string[];
  status: string;
  grantedBy: string;
  grantedAt: Date;
  revokedAt: Date | null;
  expiresAt: Date | null;
  version: number;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Stub PrismaClient interface with consent-related methods
export interface PrismaClientStub {
  consent: {
    findFirst: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
    }) => Promise<Consent | null>;
    findMany: (args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
      take?: number;
    }) => Promise<Consent[]>;
    create: (args: { data: Partial<Consent> }) => Promise<Consent>;
    update: (args: {
      where: { id: string };
      data: Partial<Consent>;
    }) => Promise<Consent>;
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Partial<Consent>;
    }) => Promise<{ count: number }>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}
