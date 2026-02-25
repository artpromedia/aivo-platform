import { z } from 'zod';

export const ChangelogCategoryEnum = z.enum([
  'feature',
  'improvement',
  'fix',
  'security',
  'deprecation',
]);
export type ChangelogCategory = z.infer<typeof ChangelogCategoryEnum>;

export const AudienceEnum = z.enum([
  'district_admin',
  'teacher',
  'parent',
  'developer',
  'learner',
]);
export type Audience = z.infer<typeof AudienceEnum>;

export const CreateEntrySchema = z.object({
  version: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  summary: z.string().min(1),
  bodyMarkdown: z.string().optional(),
  category: ChangelogCategoryEnum,
  audience: z.array(AudienceEnum).min(1),
  tags: z.array(z.string().max(50)).optional().default([]),
  imageUrl: z.string().url().max(500).optional(),
  isHighlight: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
});
export type CreateEntryInput = z.infer<typeof CreateEntrySchema>;

export const UpdateEntrySchema = CreateEntrySchema.partial();
export type UpdateEntryInput = z.infer<typeof UpdateEntrySchema>;

export const ListEntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: ChangelogCategoryEnum.optional(),
  audience: AudienceEnum.optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export interface ChangelogEntryDTO {
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
