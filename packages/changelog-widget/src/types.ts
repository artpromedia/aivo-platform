export type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'security' | 'deprecation';
export type ChangelogAudience = 'district_admin' | 'teacher' | 'parent' | 'developer' | 'learner';

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  summary: string;
  bodyMarkdown: string | null;
  category: ChangelogCategory;
  audience: ChangelogAudience[];
  tags: string[];
  imageUrl: string | null;
  isHighlight: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export interface PaginatedChangelog {
  data: ChangelogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  feature: 'New Feature',
  improvement: 'Improvement',
  fix: 'Bug Fix',
  security: 'Security',
  deprecation: 'Deprecation',
};

export const CATEGORY_COLORS: Record<ChangelogCategory, { bg: string; text: string }> = {
  feature: { bg: '#dbeafe', text: '#1d4ed8' },
  improvement: { bg: '#dcfce7', text: '#16a34a' },
  fix: { bg: '#fef3c7', text: '#d97706' },
  security: { bg: '#fce7f3', text: '#db2777' },
  deprecation: { bg: '#f3e8ff', text: '#7c3aed' },
};
