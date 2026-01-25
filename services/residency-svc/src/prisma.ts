import {
  PrismaClient,
  Prisma,
  SensitivityLevel,
  EnforcementLevel,
  EndpointType,
  EndpointStatus,
  LocationStatus,
  LegalBasis,
  TransferMechanism,
  ApprovalStatus,
  TransferStatus,
  ComplianceCheckType,
  CheckStatus,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export Prisma namespace and enums
export { Prisma };
export {
  SensitivityLevel,
  EnforcementLevel,
  EndpointType,
  EndpointStatus,
  LocationStatus,
  LegalBasis,
  TransferMechanism,
  ApprovalStatus,
  TransferStatus,
  ComplianceCheckType,
  CheckStatus,
};
export type { PrismaClient };
