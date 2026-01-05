/**
 * Content API types
 */

export interface AdaptiveCondition {
  id: string;
  type: 'performance' | 'attempts' | 'time' | 'engagement' | 'skill' | 'custom';
  operator: 'equals' | 'greater' | 'less' | 'between' | 'contains';
  value: string | number | boolean;
  targetBlockId?: string;
  skillId?: string;
}

export interface ContentBlock {
  id: string;
  type: string;
  label: string;
  content: unknown;
  conditions?: AdaptiveCondition[];
}
