/**
 * Prisma Client for Billing Service
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

import { config } from './config.js';

// Re-export Prisma namespace and PrismaClient type
export { Prisma };
export type { PrismaClient };

// Re-export all enums from schema
export {
  BillingAccountType,
  SubscriptionStatus,
  PlanType,
  BillingPeriod,
  PaymentProvider,
  ContractBillingPeriod,
  ContractStatus,
  ContractPaymentType,
  InvoiceStatus,
  VaultLicenseType,
  VaultLicenseStatus,
  VaultCodeType,
  VaultCodeStatus,
  EnterpriseDealStatus,
  EnterpriseDealType,
  EnterpriseCustomerType,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('📦 Billing database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Billing database disconnected');
}
