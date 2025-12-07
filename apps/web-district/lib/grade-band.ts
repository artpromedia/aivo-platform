import type { GradeBand } from '@aivo/ui-web';

export function gradeToBand(grade?: number | null, fallback: GradeBand = 'G6_8'): GradeBand {
  if (!grade || grade <= 0) return fallback;
  if (grade <= 5) return 'K5';
  if (grade <= 8) return 'G6_8';
  return 'G9_12';
}
