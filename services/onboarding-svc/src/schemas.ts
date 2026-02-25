import { z } from 'zod';

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const CompleteStepSchema = z.object({
  stepId: z.string().min(1).max(100),
});

export const SkipStepSchema = z.object({
  stepId: z.string().min(1).max(100),
});

export const MarkFeatureSeenSchema = z.object({
  featureKey: z.string().min(1).max(200),
});

export const CheckFeaturesSeenSchema = z.object({
  featureKeys: z.array(z.string().min(1).max(200)).min(1).max(50),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompleteStepInput = z.infer<typeof CompleteStepSchema>;
export type SkipStepInput = z.infer<typeof SkipStepSchema>;
export type MarkFeatureSeenInput = z.infer<typeof MarkFeatureSeenSchema>;
export type CheckFeaturesSeenInput = z.infer<typeof CheckFeaturesSeenSchema>;
