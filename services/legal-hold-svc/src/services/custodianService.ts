/**
 * AIVO Legal Hold Service - Custodian Service
 *
 * Manages custodians and their data sources.
 */

import { prisma } from '../prisma.js';
import type {
  CreateCustodianInput,
  UpdateCustodianInput,
  ListCustodiansQuery,
  PaginatedResponse,
} from '../types/index.js';

/**
 * Create a new custodian.
 */
export async function createCustodian(
  tenantId: string,
  input: CreateCustodianInput
) {
  const custodian = await prisma.custodian.create({
    data: {
      tenantId,
      userId: input.userId,
      employeeId: input.employeeId,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName || `${input.firstName} ${input.lastName}`,
      department: input.department,
      title: input.title,
      location: input.location,
      manager: input.manager,
      phone: input.phone,
      alternateEmail: input.alternateEmail?.toLowerCase(),
      status: input.status || 'ACTIVE',
      hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      metadata: input.metadata,
    },
  });

  return custodian;
}

/**
 * Get a custodian by ID.
 */
export async function getCustodian(tenantId: string, custodianId: string) {
  return prisma.custodian.findFirst({
    where: { id: custodianId, tenantId },
    include: {
      matters: {
        where: { removedAt: null },
        include: {
          matter: {
            select: {
              id: true,
              matterNumber: true,
              name: true,
              status: true,
            },
          },
        },
      },
      holds: {
        where: { status: { not: 'RELEASED' } },
        include: {
          hold: {
            select: {
              id: true,
              holdNumber: true,
              name: true,
              status: true,
              issuedAt: true,
            },
          },
        },
      },
      dataSources: {
        include: {
          dataSource: {
            select: {
              id: true,
              name: true,
              sourceType: true,
            },
          },
        },
      },
    },
  });
}

/**
 * List custodians with filtering.
 */
export async function listCustodians(
  tenantId: string,
  query: ListCustodiansQuery
): Promise<PaginatedResponse<any>> {
  const { status, department, search, page = 1, pageSize = 20 } = query;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(department && { department }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const skip = (page - 1) * pageSize;

  const [custodians, totalItems] = await Promise.all([
    prisma.custodian.findMany({
      where,
      orderBy: { displayName: 'asc' },
      skip,
      take: pageSize,
      include: {
        _count: {
          select: {
            holds: { where: { status: { not: 'RELEASED' } } },
            matters: { where: { removedAt: null } },
          },
        },
      },
    }),
    prisma.custodian.count({ where }),
  ]);

  return {
    data: custodians,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Update a custodian.
 */
export async function updateCustodian(
  tenantId: string,
  custodianId: string,
  input: UpdateCustodianInput
) {
  const existing = await prisma.custodian.findFirst({
    where: { id: custodianId, tenantId },
  });

  if (!existing) {
    throw new Error('Custodian not found');
  }

  const custodian = await prisma.custodian.update({
    where: { id: custodianId },
    data: {
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName,
      department: input.department,
      title: input.title,
      location: input.location,
      manager: input.manager,
      phone: input.phone,
      alternateEmail: input.alternateEmail?.toLowerCase(),
      status: input.status,
      terminationDate: input.terminationDate ? new Date(input.terminationDate) : undefined,
      metadata: input.metadata,
    },
  });

  return custodian;
}

/**
 * Get custodian's active holds.
 */
export async function getCustodianHolds(
  tenantId: string,
  custodianId: string,
  options: { includeReleased?: boolean } = {}
) {
  const custodian = await prisma.custodian.findFirst({
    where: { id: custodianId, tenantId },
  });

  if (!custodian) {
    throw new Error('Custodian not found');
  }

  const where: any = { custodianId };
  if (!options.includeReleased) {
    where.status = { not: 'RELEASED' };
  }

  const holdCustodians = await prisma.holdCustodian.findMany({
    where,
    include: {
      hold: {
        include: {
          matter: {
            select: {
              id: true,
              matterNumber: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });

  return holdCustodians;
}

/**
 * Get custodian compliance status.
 */
export async function getCustodianCompliance(tenantId: string, custodianId: string) {
  const custodian = await prisma.custodian.findFirst({
    where: { id: custodianId, tenantId },
  });

  if (!custodian) {
    throw new Error('Custodian not found');
  }

  const holdCustodians = await prisma.holdCustodian.findMany({
    where: {
      custodianId,
      status: { not: 'RELEASED' },
      hold: { status: { in: ['ISSUED', 'ACTIVE'] } },
    },
    include: {
      hold: {
        select: {
          id: true,
          holdNumber: true,
          name: true,
          acknowledgmentDue: true,
        },
      },
    },
  });

  const compliance = {
    totalActiveHolds: holdCustodians.length,
    acknowledged: 0,
    pendingAcknowledgment: 0,
    overdue: 0,
    holds: [] as any[],
  };

  const now = new Date();

  for (const hc of holdCustodians) {
    const holdInfo = {
      holdId: hc.hold.id,
      holdNumber: hc.hold.holdNumber,
      holdName: hc.hold.name,
      status: hc.status,
      notifiedAt: hc.notifiedAt,
      acknowledgedAt: hc.acknowledgedAt,
      acknowledgmentDue: hc.hold.acknowledgmentDue,
      isOverdue: false,
    };

    if (hc.status === 'ACKNOWLEDGED') {
      compliance.acknowledged++;
    } else {
      compliance.pendingAcknowledgment++;
      if (hc.hold.acknowledgmentDue && hc.hold.acknowledgmentDue < now) {
        compliance.overdue++;
        holdInfo.isOverdue = true;
      }
    }

    compliance.holds.push(holdInfo);
  }

  return compliance;
}

/**
 * Bulk import custodians.
 */
export async function bulkImportCustodians(
  tenantId: string,
  custodians: CreateCustodianInput[]
): Promise<{ imported: number; skipped: number; errors: Array<{ email: string; error: string }> }> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  for (const input of custodians) {
    try {
      // Check if custodian already exists
      const existing = await prisma.custodian.findFirst({
        where: { tenantId, email: input.email.toLowerCase() },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      await createCustodian(tenantId, input);
      result.imported++;
    } catch (error: any) {
      result.errors.push({ email: input.email, error: error.message });
    }
  }

  return result;
}

/**
 * Search custodians by email or name.
 */
export async function searchCustodians(
  tenantId: string,
  searchTerm: string,
  limit: number = 10
) {
  return prisma.custodian.findMany({
    where: {
      tenantId,
      OR: [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { displayName: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      email: true,
      displayName: true,
      department: true,
      status: true,
    },
  });
}

/**
 * Get custodians with pending acknowledgments.
 */
export async function getCustodiansWithPendingAcknowledgments(
  tenantId: string,
  options: { overdueOnly?: boolean; page?: number; pageSize?: number } = {}
) {
  const { overdueOnly = false, page = 1, pageSize = 20 } = options;
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    status: { in: ['PENDING', 'NOTIFIED'] },
    hold: {
      tenantId,
      status: { in: ['ISSUED', 'ACTIVE'] },
    },
  };

  if (overdueOnly) {
    whereClause.hold.acknowledgmentDue = { lt: new Date() };
  }

  const [holdCustodians, totalItems] = await Promise.all([
    prisma.holdCustodian.findMany({
      where: whereClause,
      include: {
        custodian: {
          select: {
            id: true,
            email: true,
            displayName: true,
            department: true,
          },
        },
        hold: {
          select: {
            id: true,
            holdNumber: true,
            name: true,
            acknowledgmentDue: true,
          },
        },
      },
      orderBy: { addedAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.holdCustodian.count({ where: whereClause }),
  ]);

  return {
    data: holdCustodians,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Link data source to custodian.
 */
export async function linkDataSource(
  tenantId: string,
  custodianId: string,
  dataSourceId: string,
  options: { identifier?: string; estimatedSize?: number; itemCount?: number } = {}
) {
  const [custodian, dataSource] = await Promise.all([
    prisma.custodian.findFirst({ where: { id: custodianId, tenantId } }),
    prisma.dataSource.findFirst({ where: { id: dataSourceId, tenantId } }),
  ]);

  if (!custodian) throw new Error('Custodian not found');
  if (!dataSource) throw new Error('Data source not found');

  return prisma.custodianDataSource.upsert({
    where: { custodianId_dataSourceId: { custodianId, dataSourceId } },
    create: {
      custodianId,
      dataSourceId,
      identifier: options.identifier,
      estimatedSize: options.estimatedSize ? BigInt(options.estimatedSize) : undefined,
      itemCount: options.itemCount,
    },
    update: {
      identifier: options.identifier,
      estimatedSize: options.estimatedSize ? BigInt(options.estimatedSize) : undefined,
      itemCount: options.itemCount,
      lastScanned: new Date(),
    },
  });
}

/**
 * Get department list.
 */
export async function getDepartments(tenantId: string) {
  const departments = await prisma.custodian.groupBy({
    by: ['department'],
    where: { tenantId, department: { not: null } },
    _count: { department: true },
    orderBy: { department: 'asc' },
  });

  return departments
    .filter((d) => d.department)
    .map((d) => ({
      name: d.department,
      count: d._count.department,
    }));
}
