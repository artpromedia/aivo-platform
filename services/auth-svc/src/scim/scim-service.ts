/**
 * SCIM 2.0 Provisioning Service — Prisma-backed
 *
 * Handles automated user provisioning via SCIM protocol (RFC 7643/7644).
 * Directly uses Prisma for persistence, publishes NATS events, and logs to ScimSyncLog.
 */

import { randomUUID } from 'node:crypto';

import { prisma, UserStatus, type UserRoleEnum } from '../prisma.js';
import type {
  ScimUser,
  ScimGroup,
  ScimGroupMember,
  ScimListResponse,
  ScimError,
  ScimPatchOp,
} from './scim.types.js';
import { SCIM_SCHEMAS } from './scim.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimConfig {
  baseUrl: string;
  maxResults: number;
}

const DEFAULT_CONFIG: ScimConfig = {
  baseUrl: '/scim/v2',
  maxResults: 100,
};

// ══════════════════════════════════════════════════════════════════════════════
// NATS PUBLISHING HELPER (best-effort, non-blocking)
// ══════════════════════════════════════════════════════════════════════════════

async function publishEvent(subject: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const natsUrl = process.env.NATS_URL;
    if (!natsUrl) return;
    // Dynamic import to keep NATS optional
    // @ts-expect-error — nats is an optional peer dependency
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: natsUrl });
    const sc = StringCodec();
    nc.publish(subject, sc.encode(JSON.stringify(payload)));
    await nc.drain();
  } catch {
    // Best-effort: SCIM operations succeed even when NATS is unavailable
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC LOG
// ══════════════════════════════════════════════════════════════════════════════

async function logSync(
  tenantId: string,
  operation: string,
  resourceType: string,
  resourceId: string,
  statusCode: number,
  requestBody?: unknown,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.scimSyncLog.create({
      data: {
        tenantId,
        operation,
        resourceType,
        resourceId,
        requestBody: requestBody ? (requestBody as any) : undefined,
        statusCode,
        errorMessage,
      },
    });
  } catch {
    // Best-effort logging — don't block SCIM operations
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCIM FILTER PARSER (subset: userName eq "…" / externalId eq "…")
// ══════════════════════════════════════════════════════════════════════════════

function parseFilter(filter?: string): Record<string, string> | undefined {
  if (!filter) return undefined;
  // Matches: userName eq "value" / externalId eq "value" / email eq "value"
  const m = /^(\w+)\s+eq\s+"([^"]+)"$/i.exec(filter.trim());
  if (!m) return undefined;
  const [, attr, value] = m;
  const key = attr.toLowerCase();
  if (key === 'username' || key === 'email') return { email: value };
  if (key === 'externalid') return { externalId: value };
  return undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getUser(
  tenantId: string,
  id: string,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimUser | ScimError> {
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { roles: true },
  });

  if (!user) return scimError('404', 'User not found');
  return toScimUser(user, baseUrl);
}

export async function listUsers(
  tenantId: string,
  opts: {
    filter?: string;
    startIndex?: number;
    count?: number;
  },
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimListResponse<ScimUser>> {
  const startIndex = Math.max(1, opts.startIndex ?? 1);
  const take = Math.min(DEFAULT_CONFIG.maxResults, opts.count ?? 100);
  const skip = startIndex - 1;

  const filterWhere = parseFilter(opts.filter);

  const where = { tenantId, ...filterWhere };

  const [users, totalResults] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { roles: true },
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults,
    startIndex,
    itemsPerPage: users.length,
    Resources: users.map((u) => toScimUser(u, baseUrl)),
  };
}

export async function createUser(
  tenantId: string,
  scimUser: ScimUser,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimUser | ScimError> {
  const email = primaryEmail(scimUser);
  const aivoExt = scimUser['urn:aivo:scim:schemas:extension:1.0:User'];

  // Uniqueness checks
  if (scimUser.externalId) {
    const dup = await prisma.user.findUnique({
      where: { tenantId_externalId: { tenantId, externalId: scimUser.externalId } },
    });
    if (dup) {
      await logSync(tenantId, 'create', 'User', '', 409, scimUser, 'Duplicate externalId');
      return scimError('409', 'User with this externalId already exists', 'uniqueness');
    }
  }

  const dupEmail = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (dupEmail) {
    await logSync(tenantId, 'create', 'User', '', 409, scimUser, 'Duplicate email');
    return scimError('409', 'User with this email already exists', 'uniqueness');
  }

  const role: UserRoleEnum = (aivoExt?.role as UserRoleEnum) || 'LEARNER';

  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      firstName: scimUser.name?.givenName ?? null,
      lastName: scimUser.name?.familyName ?? null,
      passwordHash: randomUUID(), // Placeholder — federated users don't log in with password
      externalId: scimUser.externalId ?? null,
      status: scimUser.active === false ? UserStatus.DISABLED : UserStatus.ACTIVE,
      roles: { create: { role } },
    },
    include: { roles: true },
  });

  await logSync(tenantId, 'create', 'User', user.id, 201, scimUser);
  void publishEvent('user.provisioned', {
    userId: user.id,
    tenantId,
    email,
    role,
    source: 'scim',
  });

  return toScimUser(user, baseUrl);
}

export async function replaceUser(
  tenantId: string,
  id: string,
  scimUser: ScimUser,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimUser | ScimError> {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) return scimError('404', 'User not found');

  const email = primaryEmail(scimUser);
  const aivoExt = scimUser['urn:aivo:scim:schemas:extension:1.0:User'];
  const newStatus = scimUser.active === false ? UserStatus.DISABLED : UserStatus.ACTIVE;

  const user = await prisma.user.update({
    where: { id },
    data: {
      email,
      firstName: scimUser.name?.givenName ?? null,
      lastName: scimUser.name?.familyName ?? null,
      externalId: scimUser.externalId ?? null,
      status: newStatus,
    },
    include: { roles: true },
  });

  // Update role if provided
  if (aivoExt?.role) {
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.userRole.create({ data: { userId: id, role: aivoExt.role as UserRoleEnum } });
  }

  // Revoke sessions if user was deactivated
  if (newStatus === UserStatus.DISABLED && existing.status !== UserStatus.DISABLED) {
    await revokeUserSessions(id, tenantId);
  }

  await logSync(tenantId, 'update', 'User', id, 200, scimUser);
  void publishEvent('user.updated', {
    userId: id,
    tenantId,
    changes: ['email', 'name', 'status'],
    source: 'scim',
  });

  // Re-fetch with updated roles
  const refreshed = await prisma.user.findUnique({
    where: { id },
    include: { roles: true },
  });
  return toScimUser(refreshed!, baseUrl);
}

export async function patchUser(
  tenantId: string,
  id: string,
  patch: ScimPatchOp,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimUser | ScimError> {
  const existing = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { roles: true },
  });
  if (!existing) return scimError('404', 'User not found');

  const data: Record<string, unknown> = {};

  for (const op of patch.Operations) {
    const path = op.path?.toLowerCase();

    if (op.op === 'replace') {
      if (path === 'active') {
        data.status = op.value ? UserStatus.ACTIVE : UserStatus.DISABLED;
      } else if (path === 'username' || path === 'emails') {
        data.email = typeof op.value === 'string' ? op.value : (op.value as any)?.[0]?.value;
      } else if (path === 'name.givenname') {
        data.firstName = op.value as string;
      } else if (path === 'name.familyname') {
        data.lastName = op.value as string;
      } else if (!path && typeof op.value === 'object' && op.value !== null) {
        // Replace entire resource attrs
        const v = op.value as Record<string, unknown>;
        if ('active' in v) data.status = v.active ? UserStatus.ACTIVE : UserStatus.DISABLED;
        if ('displayName' in v) data.firstName = v.displayName;
      }
    } else if (op.op === 'add' && path === 'emails') {
      const emails = op.value as { value: string }[];
      if (emails?.[0]?.value) data.email = emails[0].value;
    } else if (op.op === 'remove') {
      if (path === 'name.givenname') data.firstName = null;
      if (path === 'name.familyname') data.lastName = null;
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id }, data });
  }

  // Revoke sessions on deactivation
  if (data.status === UserStatus.DISABLED && existing.status !== UserStatus.DISABLED) {
    await revokeUserSessions(id, tenantId);
  }

  await logSync(tenantId, 'patch', 'User', id, 200, patch);
  void publishEvent('user.updated', {
    userId: id,
    tenantId,
    changes: Object.keys(data),
    source: 'scim',
  });

  const refreshed = await prisma.user.findUnique({
    where: { id },
    include: { roles: true },
  });
  return toScimUser(refreshed!, baseUrl);
}

export async function deactivateUser(
  tenantId: string,
  id: string
): Promise<ScimError | undefined> {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) return scimError('404', 'User not found');

  // Soft-delete: set DISABLED, revoke sessions, delete MFA
  await prisma.user.update({
    where: { id },
    data: { status: UserStatus.DISABLED },
  });

  await revokeUserSessions(id, tenantId);

  // Delete MFA config & challenges
  await prisma.mfaConfig.deleteMany({ where: { userId: id } });
  await prisma.mfaChallenge.deleteMany({ where: { userId: id } });

  await logSync(tenantId, 'delete', 'User', id, 204);
  void publishEvent('user.deprovisioned', {
    userId: id,
    tenantId,
    source: 'scim',
  });

  return undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// GROUP OPERATIONS (Virtual groups mapped from UserRoleEnum)
// ══════════════════════════════════════════════════════════════════════════════

const ROLE_GROUPS: ReadonlyArray<{ id: string; displayName: string; role: string }> = [
  { id: 'group-learner', displayName: 'Learners', role: 'LEARNER' },
  { id: 'group-parent', displayName: 'Parents', role: 'PARENT' },
  { id: 'group-teacher', displayName: 'Teachers', role: 'TEACHER' },
  { id: 'group-therapist', displayName: 'Therapists', role: 'THERAPIST' },
  { id: 'group-school-admin', displayName: 'School Admins', role: 'SCHOOL_ADMIN' },
  { id: 'group-district-admin', displayName: 'District Admins', role: 'DISTRICT_ADMIN' },
  { id: 'group-platform-admin', displayName: 'Platform Admins', role: 'PLATFORM_ADMIN' },
  { id: 'group-support', displayName: 'Support', role: 'SUPPORT' },
];

export async function getGroup(
  tenantId: string,
  id: string,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimGroup | ScimError> {
  const group = ROLE_GROUPS.find((g) => g.id === id);
  if (!group) return scimError('404', 'Group not found');

  const members = await prisma.userRole.findMany({
    where: { role: group.role as UserRoleEnum, user: { tenantId } },
    include: { user: { select: { id: true, email: true } } },
  });

  return toScimGroup(group, members, baseUrl);
}

export async function listGroups(
  tenantId: string,
  opts: { startIndex?: number; count?: number; filter?: string },
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimListResponse<ScimGroup>> {
  const start = Math.max(1, opts.startIndex ?? 1);
  const count = Math.min(100, opts.count ?? 100);

  let groups = ROLE_GROUPS;
  if (opts.filter) {
    const m = /^displayName\s+eq\s+"([^"]+)"$/i.exec(opts.filter.trim());
    if (m) {
      groups = ROLE_GROUPS.filter((g) => g.displayName.toLowerCase() === m[1].toLowerCase());
    }
  }

  const paged = groups.slice(start - 1, start - 1 + count);

  const resources: ScimGroup[] = [];
  for (const g of paged) {
    const members = await prisma.userRole.findMany({
      where: { role: g.role as UserRoleEnum, user: { tenantId } },
      include: { user: { select: { id: true, email: true } } },
    });
    resources.push(toScimGroup(g, members, baseUrl));
  }

  return {
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults: groups.length,
    startIndex: start,
    itemsPerPage: resources.length,
    Resources: resources,
  };
}

export async function patchGroup(
  tenantId: string,
  id: string,
  patch: ScimPatchOp,
  baseUrl = DEFAULT_CONFIG.baseUrl
): Promise<ScimGroup | ScimError> {
  const group = ROLE_GROUPS.find((g) => g.id === id);
  if (!group) return scimError('404', 'Group not found');

  for (const op of patch.Operations) {
    if (op.op === 'add' && op.path?.toLowerCase() === 'members') {
      const members = op.value as { value: string }[];
      for (const m of members ?? []) {
        const user = await prisma.user.findFirst({ where: { id: m.value, tenantId } });
        if (user) {
          // Upsert to avoid duplicates
          const exists = await prisma.userRole.findFirst({
            where: { userId: user.id, role: group.role as UserRoleEnum },
          });
          if (!exists) {
            await prisma.userRole.create({
              data: { userId: user.id, role: group.role as UserRoleEnum },
            });
          }
        }
      }
    } else if (op.op === 'remove' && op.path?.toLowerCase().startsWith('members')) {
      // path: members[value eq "userId"]
      const idMatch = /value\s+eq\s+"([^"]+)"/i.exec(op.path);
      if (idMatch) {
        await prisma.userRole.deleteMany({
          where: { userId: idMatch[1], role: group.role as UserRoleEnum },
        });
      }
    }
  }

  await logSync(tenantId, 'patch', 'Group', id, 200, patch);

  return getGroup(tenantId, id, baseUrl) as Promise<ScimGroup>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE PROVIDER CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export function getServiceProviderConfig(baseUrl = DEFAULT_CONFIG.baseUrl) {
  return {
    schemas: [SCIM_SCHEMAS.SERVICE_PROVIDER_CONFIG],
    documentationUri: 'https://docs.aivolearning.com/scim',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: DEFAULT_CONFIG.maxResults },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken' as const,
        name: 'OAuth Bearer Token',
        description: 'Authentication using OAuth 2.0 Bearer Token',
        specUri: 'https://tools.ietf.org/html/rfc6750',
        primary: true,
      },
    ],
    meta: {
      resourceType: 'ServiceProviderConfig' as const,
      location: `${baseUrl}/ServiceProviderConfig`,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

type UserWithRoles = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  externalId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  roles: { role: string }[];
};

function toScimUser(user: UserWithRoles, baseUrl: string): ScimUser {
  const role = user.roles[0]?.role ?? 'LEARNER';

  return {
    schemas: [SCIM_SCHEMAS.USER, SCIM_SCHEMAS.AIVO_USER],
    id: user.id,
    externalId: user.externalId ?? undefined,
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/Users/${user.id}`,
    },
    userName: user.email,
    name: {
      givenName: user.firstName ?? undefined,
      familyName: user.lastName ?? undefined,
      formatted: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    },
    displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    active: user.status === UserStatus.ACTIVE,
    emails: [{ value: user.email, type: 'work', primary: true }],
    'urn:aivo:scim:schemas:extension:1.0:User': { role: role as any },
  };
}

function toScimGroup(
  group: { id: string; displayName: string },
  members: { user: { id: string; email: string } }[],
  baseUrl: string
): ScimGroup {
  const scimMembers: ScimGroupMember[] = members.map((m) => ({
    value: m.user.id,
    display: m.user.email,
    $ref: `${baseUrl}/Users/${m.user.id}`,
    type: 'User',
  }));

  return {
    schemas: [SCIM_SCHEMAS.GROUP],
    id: group.id,
    meta: {
      resourceType: 'Group' as any,
      location: `${baseUrl}/Groups/${group.id}`,
    },
    displayName: group.displayName,
    members: scimMembers,
  };
}

function primaryEmail(scimUser: ScimUser): string {
  return scimUser.emails?.find((e) => e.primary)?.value || scimUser.userName;
}

async function revokeUserSessions(userId: string, tenantId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, tenantId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: 'scim_deactivation' },
  });
}

function scimError(status: string, detail: string, scimType?: string): ScimError {
  return { schemas: [SCIM_SCHEMAS.ERROR], detail, status, scimType };
}
