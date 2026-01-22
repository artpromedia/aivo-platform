import type { GradeBand } from './billing-api';

export function gradeToBand(grade?: number | null, fallback: GradeBand = 'G6_8'): GradeBand {
  if (!grade || grade <= 0) return fallback;
  if (grade <= 2) return 'K_2';
  if (grade <= 5) return 'G3_5';
  if (grade <= 8) return 'G6_8';
  return 'G9_12';
}
