/**
 * AIVO Audit Service - Database Seed
 *
 * Seeds the database with sample data for development.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding audit database...');

  const tenantId = '00000000-0000-0000-0000-000000000001';

  // Create a default audit policy
  const defaultPolicy = await prisma.auditPolicy.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: 'Default Policy',
      },
    },
    update: {},
    create: {
      tenantId,
      name: 'Default Policy',
      description: 'Default audit policy for all events',
      eventTypes: [],
      categories: [],
      minSeverity: 'INFO',
      retentionDays: 2555, // ~7 years
      isActive: true,
    },
  });

  console.log('Created default policy:', defaultPolicy.id);

  // Create a security alert policy
  const securityPolicy = await prisma.auditPolicy.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: 'Security Alerts',
      },
    },
    update: {},
    create: {
      tenantId,
      name: 'Security Alerts',
      description: 'Alert on critical security events',
      eventTypes: [],
      categories: ['SECURITY', 'AUTHENTICATION'],
      minSeverity: 'WARNING',
      retentionDays: 2555,
      alertOnSeverity: 'CRITICAL',
      isActive: true,
    },
  });

  console.log('Created security policy:', securityPolicy.id);

  // Create some sample audit logs
  const sampleEvents = [
    {
      eventId: crypto.randomUUID(),
      eventType: 'auth.login.success',
      tenantId,
      category: 'AUTHENTICATION' as const,
      severity: 'INFO' as const,
      outcome: 'SUCCESS' as const,
      actorId: '00000000-0000-0000-0000-000000000002',
      actorType: 'user',
      actorEmail: 'admin@example.com',
      actorRoles: ['PLATFORM_ADMIN'],
      action: 'login',
      description: 'User admin@example.com logged in successfully',
      sourceService: 'auth-svc',
      checksum: 'sample-checksum-1',
      occurredAt: new Date(),
    },
    {
      eventId: crypto.randomUUID(),
      eventType: 'user.created',
      tenantId,
      category: 'DATA_MODIFICATION' as const,
      severity: 'INFO' as const,
      outcome: 'SUCCESS' as const,
      actorId: '00000000-0000-0000-0000-000000000002',
      actorType: 'user',
      actorEmail: 'admin@example.com',
      actorRoles: ['PLATFORM_ADMIN'],
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000003',
      targetName: 'New User',
      action: 'create',
      description: 'User account created: newuser@example.com',
      sourceService: 'auth-svc',
      checksum: 'sample-checksum-2',
      occurredAt: new Date(),
    },
    {
      eventId: crypto.randomUUID(),
      eventType: 'auth.permission.denied',
      tenantId,
      category: 'AUTHORIZATION' as const,
      severity: 'WARNING' as const,
      outcome: 'DENIED' as const,
      actorId: '00000000-0000-0000-0000-000000000003',
      actorType: 'user',
      actorEmail: 'newuser@example.com',
      actorRoles: ['LEARNER'],
      action: 'permission_denied',
      description: 'Permission denied for action admin:manage on tenant:settings',
      sourceService: 'auth-svc',
      checksum: 'sample-checksum-3',
      occurredAt: new Date(),
    },
  ];

  for (const event of sampleEvents) {
    await prisma.auditLog.upsert({
      where: { eventId: event.eventId },
      update: {},
      create: event,
    });
  }

  console.log(`Created ${sampleEvents.length} sample audit events`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
