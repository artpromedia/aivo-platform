import type { ChangelogCategory, Prisma } from '../generated/prisma-client/index.js';

import { prisma } from './prisma.js';
import type {
  ChangelogEntryDTO,
  CreateEntryInput,
  PaginatedResult,
  UpdateEntryInput,
} from './schemas.js';

// ─── Helpers ─────────────────────────────────────────────────────────

interface EntryWithReads {
  id: string;
  version: string;
  title: string;
  summary: string;
  bodyMarkdown: string | null;
  category: string;
  audience: string[];
  tags: string[];
  imageUrl: string | null;
  isHighlight: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reads?: { id: string }[];
}

function toDTO(e: EntryWithReads, userId?: string): ChangelogEntryDTO {
  return {
    id: e.id,
    version: e.version,
    title: e.title,
    summary: e.summary,
    bodyMarkdown: e.bodyMarkdown,
    category: e.category,
    audience: e.audience,
    tags: e.tags,
    imageUrl: e.imageUrl,
    isHighlight: e.isHighlight,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    isRead: userId ? (e.reads?.length ?? 0) > 0 : undefined,
  };
}

// ─── Public queries ──────────────────────────────────────────────────

export async function listEntries(opts: {
  page: number;
  limit: number;
  category?: string;
  audience?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}): Promise<PaginatedResult<ChangelogEntryDTO>> {
  const { page, limit, category, audience, search, startDate, endDate, userId } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.ChangelogEntryWhereInput = {
    publishedAt: { not: null, lte: new Date() },
  };

  if (category) where.category = category as Prisma.EnumChangelogCategoryFilter;
  if (audience) where.audience = { has: audience };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (startDate || endDate) {
    const publishedFilter: Prisma.DateTimeNullableFilter = { not: null };
    if (startDate) publishedFilter.gte = new Date(startDate);
    if (endDate) publishedFilter.lte = new Date(endDate);
    where.publishedAt = publishedFilter;
  }

  const [entries, total] = await Promise.all([
    prisma.changelogEntry.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      include: userId
        ? { reads: { where: { userId }, select: { id: true } } }
        : undefined,
    }),
    prisma.changelogEntry.count({ where }),
  ]);

  const data: ChangelogEntryDTO[] = entries.map((e) => toDTO(e as EntryWithReads, userId));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getEntry(id: string, userId?: string): Promise<ChangelogEntryDTO | null> {
  const entry = await prisma.changelogEntry.findUnique({
    where: { id },
    include: userId
      ? { reads: { where: { userId }, select: { id: true } } }
      : undefined,
  });

  if (!entry) return null;

  return toDTO(entry as EntryWithReads, userId);
}

export async function getUnreadCount(userId: string, audience?: string): Promise<number> {
  const publishedWhere: Prisma.ChangelogEntryWhereInput = {
    publishedAt: { not: null, lte: new Date() },
  };
  if (audience) publishedWhere.audience = { has: audience };

  const totalPublished = await prisma.changelogEntry.count({
    where: publishedWhere,
  });

  const readCount = await prisma.changelogRead.count({
    where: {
      userId,
      entry: publishedWhere,
    },
  });

  return Math.max(0, totalPublished - readCount);
}

export async function markRead(
  userId: string,
  tenantId: string,
  entryId: string,
): Promise<void> {
  await prisma.changelogRead.upsert({
    where: { userId_entryId: { userId, entryId } },
    create: { userId, tenantId, entryId },
    update: {},
  });
}

export async function markAllRead(userId: string, tenantId: string): Promise<number> {
  const unreadEntries = await prisma.changelogEntry.findMany({
    where: {
      publishedAt: { not: null, lte: new Date() },
      NOT: { reads: { some: { userId } } },
    },
    select: { id: true },
  });

  if (unreadEntries.length === 0) return 0;

  const result = await prisma.changelogRead.createMany({
    data: unreadEntries.map((e) => ({
      userId,
      tenantId,
      entryId: e.id,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

// ─── Admin mutations ─────────────────────────────────────────────────

export async function createEntry(input: CreateEntryInput): Promise<ChangelogEntryDTO> {
  const entry = await prisma.changelogEntry.create({
    data: {
      version: input.version,
      title: input.title,
      summary: input.summary,
      bodyMarkdown: input.bodyMarkdown,
      category: input.category as ChangelogCategory,
      audience: input.audience,
      tags: input.tags ?? [],
      imageUrl: input.imageUrl,
      isHighlight: input.isHighlight ?? false,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    },
  });

  return toDTO(entry);
}

export async function updateEntry(
  id: string,
  input: UpdateEntryInput,
): Promise<ChangelogEntryDTO | null> {
  const existing = await prisma.changelogEntry.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Prisma.ChangelogEntryUpdateInput = {};
  if (input.version !== undefined) data.version = input.version;
  if (input.title !== undefined) data.title = input.title;
  if (input.summary !== undefined) data.summary = input.summary;
  if (input.bodyMarkdown !== undefined) data.bodyMarkdown = input.bodyMarkdown;
  if (input.category !== undefined) data.category = input.category as ChangelogCategory;
  if (input.audience !== undefined) data.audience = input.audience;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.isHighlight !== undefined) data.isHighlight = input.isHighlight;
  if (input.publishedAt !== undefined) data.publishedAt = new Date(input.publishedAt);

  const entry = await prisma.changelogEntry.update({
    where: { id },
    data,
  });

  return toDTO(entry);
}

export async function deleteEntry(id: string): Promise<boolean> {
  const existing = await prisma.changelogEntry.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.changelogEntry.delete({ where: { id } });
  return true;
}

// ─── Analytics ───────────────────────────────────────────────────────

export async function getEntryAnalytics(entryId: string) {
  const [entry, readCount] = await Promise.all([
    prisma.changelogEntry.findUnique({ where: { id: entryId } }),
    prisma.changelogRead.count({ where: { entryId } }),
  ]);

  if (!entry) return null;

  return {
    entryId,
    title: entry.title,
    totalReads: readCount,
    publishedAt: entry.publishedAt?.toISOString() ?? null,
  };
}

export async function getAllAnalytics(limitEntries = 50) {
  const entries = await prisma.changelogEntry.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: limitEntries,
    include: { _count: { select: { reads: true } } },
  });

  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    version: e.version,
    category: e.category,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    totalReads: e._count.reads,
  }));
}
