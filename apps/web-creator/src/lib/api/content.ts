/**
 * Content API types
 */

export interface AdaptiveCondition {
  id: string;
  type:
    | 'performance'
    | 'attempts'
    | 'time'
    | 'engagement'
    | 'skill'
    | 'custom'
    | 'mastery'
    | 'previous_answer'
    | 'attempt_count'
    | 'time_spent';
  operator:
    | 'equals'
    | 'greater'
    | 'less'
    | 'between'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'not_equals';
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
