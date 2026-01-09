/**
 * Virtual Brain Template Service
 *
 * Manages the "Main AIVO Brain" templates that get cloned for each learner.
 * Each grade band (K5, G6_8, G9_12) has a pre-configured template with:
 * - Default skill mastery levels appropriate for that grade band
 * - Default BKT parameters tuned for the grade band
 * - Default curriculum standards
 * - Default reading level ranges
 *
 * When a learner completes their baseline assessment, the system:
 * 1. Clones the appropriate grade band template
 * 2. Personalizes it with the learner's baseline skill estimates
 * 3. Creates the learner's unique Virtual Brain
 *
 * @author AIVO Platform Team
 */

import type { Prisma, GradeBand, SkillDomain } from '@prisma/client';
import { prisma } from '../prisma.js';

// Type for template skill state from DB
interface TemplateSkillStateRecord {
  skillCode: string;
  domain: SkillDomain;
  defaultMastery: Prisma.Decimal;
  defaultPLearn: Prisma.Decimal;
  defaultPTransit: Prisma.Decimal;
  defaultPGuess: Prisma.Decimal;
  defaultPSlip: Prisma.Decimal;
  difficultyMultiplier: Prisma.Decimal;
}

// Type for template with skill states
interface TemplateWithStates {
  id: string;
  gradeBand: GradeBand;
  name: string;
  version: string;
  defaultCurriculumStandards: string[];
  defaultLexileMin: number | null;
  defaultLexileMax: number | null;
  templateBktDefaults: Prisma.JsonValue;
  templateSkillStates: TemplateSkillStateRecord[];
}

/**
 * Skill estimate from baseline assessment
 */
export interface SkillEstimate {
  skillCode: string;
  domain: SkillDomain;
  estimatedLevel: number;  // 0-10 scale
  confidence: number;      // 0-1
}

/**
 * Result of cloning a template
 */
export interface CloneResult {
  virtualBrainId: string;
  sourceTemplateId: string;
  templateVersion: string;
  skillsInitialized: number;
  skillsPersonalized: number;
  skillsMissing: string[];
}

/**
 * Default templates for each grade band
 */
const DEFAULT_TEMPLATES: Record<GradeBand, {
  name: string;
  description: string;
  lexileMin: number;
  lexileMax: number;
  curriculumStandards: string[];
  bktDefaults: Record<string, { pLearn: number; pTransit: number; pGuess: number; pSlip: number }>;
}> = {
  K5: {
    name: 'Elementary School (K-5) Template',
    description: 'Pre-configured Virtual Brain for elementary school learners',
    lexileMin: -100,  // Beginning Reader (BR)
    lexileMax: 900,
    curriculumStandards: ['COMMON_CORE', 'NGSS'],
    bktDefaults: {
      ELA: { pLearn: 0.15, pTransit: 0.12, pGuess: 0.25, pSlip: 0.15 },
      MATH: { pLearn: 0.12, pTransit: 0.10, pGuess: 0.20, pSlip: 0.12 },
      SCIENCE: { pLearn: 0.18, pTransit: 0.15, pGuess: 0.25, pSlip: 0.10 },
      SPEECH: { pLearn: 0.15, pTransit: 0.12, pGuess: 0.20, pSlip: 0.15 },
      SEL: { pLearn: 0.20, pTransit: 0.15, pGuess: 0.30, pSlip: 0.10 },
    },
  },
  G6_8: {
    name: 'Middle School (6-8) Template',
    description: 'Pre-configured Virtual Brain for middle school learners',
    lexileMin: 600,
    lexileMax: 1100,
    curriculumStandards: ['COMMON_CORE', 'NGSS', 'C3'],
    bktDefaults: {
      ELA: { pLearn: 0.12, pTransit: 0.10, pGuess: 0.20, pSlip: 0.12 },
      MATH: { pLearn: 0.10, pTransit: 0.08, pGuess: 0.18, pSlip: 0.10 },
      SCIENCE: { pLearn: 0.15, pTransit: 0.12, pGuess: 0.22, pSlip: 0.10 },
      SPEECH: { pLearn: 0.12, pTransit: 0.10, pGuess: 0.18, pSlip: 0.12 },
      SEL: { pLearn: 0.18, pTransit: 0.14, pGuess: 0.25, pSlip: 0.08 },
    },
  },
  G9_12: {
    name: 'High School (9-12) Template',
    description: 'Pre-configured Virtual Brain for high school learners',
    lexileMin: 900,
    lexileMax: 1400,
    curriculumStandards: ['COMMON_CORE', 'NGSS', 'C3'],
    bktDefaults: {
      ELA: { pLearn: 0.10, pTransit: 0.08, pGuess: 0.18, pSlip: 0.10 },
      MATH: { pLearn: 0.08, pTransit: 0.06, pGuess: 0.15, pSlip: 0.08 },
      SCIENCE: { pLearn: 0.12, pTransit: 0.10, pGuess: 0.20, pSlip: 0.08 },
      SPEECH: { pLearn: 0.10, pTransit: 0.08, pGuess: 0.15, pSlip: 0.10 },
      SEL: { pLearn: 0.15, pTransit: 0.12, pGuess: 0.22, pSlip: 0.06 },
    },
  },
};

/**
 * Virtual Brain Template Service
 */
export class VirtualBrainTemplateService {
  /**
   * Get or create a template for a grade band
   */
  async getOrCreateTemplate(gradeBand: GradeBand): Promise<TemplateWithStates> {
    // Try to find existing template
    let template = await prisma.virtualBrainTemplate.findUnique({
      where: { gradeBand },
      include: {
        templateSkillStates: true,
      },
    });

    if (!template) {
      // Create default template
      template = await this.createDefaultTemplate(gradeBand);
    }

    return template as TemplateWithStates;
  }

  /**
   * Create a default template for a grade band
   */
  private async createDefaultTemplate(gradeBand: GradeBand): Promise<TemplateWithStates> {
    const defaults = DEFAULT_TEMPLATES[gradeBand];

    // Create template with default skill states based on skills in DB
    const skills = await prisma.skill.findMany({
      where: { gradeBand },
      select: { skillCode: true, domain: true },
    });

    const template = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create template
      const newTemplate = await tx.virtualBrainTemplate.create({
        data: {
          gradeBand,
          name: defaults.name,
          description: defaults.description,
          defaultCurriculumStandards: defaults.curriculumStandards,
          defaultLexileMin: defaults.lexileMin,
          defaultLexileMax: defaults.lexileMax,
          templateBktDefaults: defaults.bktDefaults,
        },
      });

      // Create template skill states
      for (const skill of skills) {
        const domainDefaults = defaults.bktDefaults[skill.domain] || defaults.bktDefaults.ELA;

        await tx.templateSkillState.create({
          data: {
            templateId: newTemplate.id,
            skillCode: skill.skillCode,
            domain: skill.domain,
            defaultMastery: 0,  // Starting mastery (will be personalized by baseline)
            defaultPLearn: domainDefaults.pLearn,
            defaultPTransit: domainDefaults.pTransit,
            defaultPGuess: domainDefaults.pGuess,
            defaultPSlip: domainDefaults.pSlip,
          },
        });
      }

      // Return with skill states
      return tx.virtualBrainTemplate.findUnique({
        where: { id: newTemplate.id },
        include: { templateSkillStates: true },
      });
    });

    if (!template) {
      throw new Error(`Failed to create template for grade band ${gradeBand}`);
    }

    return template as TemplateWithStates;
  }

  /**
   * Clone a template to create a personalized Virtual Brain for a learner.
   *
   * This is the core cloning operation that creates a learner's Virtual Brain
   * from the "Main AIVO Brain" template, personalized with baseline results.
   */
  async cloneTemplateForLearner(params: {
    tenantId: string;
    learnerId: string;
    gradeBand: GradeBand;
    baselineProfileId: string;
    baselineAttemptId: string;
    skillEstimates: SkillEstimate[];
    location?: {
      stateCode?: string;
      zipCode?: string;
      ncesDistrictId?: string;
    };
    curriculumStandards?: string[];
  }): Promise<CloneResult> {
    const {
      tenantId,
      learnerId,
      gradeBand,
      baselineProfileId,
      baselineAttemptId,
      skillEstimates,
      location,
      curriculumStandards,
    } = params;

    // Get template for this grade band
    const template = await this.getOrCreateTemplate(gradeBand);

    // Fetch all skills to map skillCode -> skillId
    const allSkills = await prisma.skill.findMany({
      select: { id: true, skillCode: true },
    });
    const skillCodeToId = new Map(allSkills.map((s) => [s.skillCode, s.id]));

    // Build personalization map from baseline estimates
    const estimateMap = new Map(
      skillEstimates.map((e) => [e.skillCode, e])
    );

    // Create Virtual Brain by cloning template
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create Virtual Brain with template reference
      const virtualBrain = await tx.virtualBrain.create({
        data: {
          tenantId,
          learnerId,
          gradeBand,
          baselineProfileId,
          baselineAttemptId,
          sourceTemplateId: template.id,
          templateVersion: template.version,
          stateCode: location?.stateCode,
          zipCode: location?.zipCode,
          ncesDistrictId: location?.ncesDistrictId,
          curriculumStandards: curriculumStandards ?? template.defaultCurriculumStandards,
          curriculumVersion: '1.0',
          // Set default reading level from template
          lexileLevel: template.defaultLexileMin
            ? Math.round((template.defaultLexileMin + (template.defaultLexileMax ?? template.defaultLexileMin)) / 2)
            : null,
          lexileLevelLow: template.defaultLexileMin,
          lexileLevelHigh: template.defaultLexileMax,
          initializationJson: {
            source: 'template_clone',
            templateId: template.id,
            templateName: template.name,
            templateVersion: template.version,
            baselineEstimatesCount: skillEstimates.length,
            clonedAt: new Date().toISOString(),
            location: location ?? null,
            curriculumStandards: curriculumStandards ?? template.defaultCurriculumStandards,
          },
        },
      });

      let skillsInitialized = 0;
      let skillsPersonalized = 0;
      const skillsMissing: string[] = [];

      // Clone template skill states, personalizing with baseline where available
      for (const templateState of template.templateSkillStates) {
        const skillId = skillCodeToId.get(templateState.skillCode);

        if (!skillId) {
          skillsMissing.push(templateState.skillCode);
          continue;
        }

        // Check if baseline has an estimate for this skill
        const baselineEstimate = estimateMap.get(templateState.skillCode);

        // Use baseline estimate if available, otherwise use template default
        const masteryLevel = baselineEstimate
          ? baselineEstimate.estimatedLevel
          : Number(templateState.defaultMastery);

        const confidence = baselineEstimate
          ? baselineEstimate.confidence
          : 0.5;  // Default confidence for template-only skills

        // Create learner skill state
        await tx.learnerSkillState.create({
          data: {
            virtualBrainId: virtualBrain.id,
            skillId,
            masteryLevel,
            confidence,
            lastAssessedAt: new Date(),
            practiceCount: 0,
            correctStreak: 0,
          },
        });

        // Create BKT state with template parameters
        await tx.bKTSkillState.create({
          data: {
            virtualBrainId: virtualBrain.id,
            skillId,
            pLearn: Number(templateState.defaultPLearn),
            pTransit: Number(templateState.defaultPTransit),
            pGuess: Number(templateState.defaultPGuess),
            pSlip: Number(templateState.defaultPSlip),
            pKnow: masteryLevel / 10,  // Convert 0-10 to 0-1 probability
          },
        });

        skillsInitialized++;
        if (baselineEstimate) {
          skillsPersonalized++;
        }
      }

      return {
        virtualBrainId: virtualBrain.id,
        sourceTemplateId: template.id,
        templateVersion: template.version,
        skillsInitialized,
        skillsPersonalized,
        skillsMissing,
      };
    });

    return result;
  }

  /**
   * Update a template's default parameters.
   * Use this to tune the "Main AIVO Brain" based on aggregate learner data.
   */
  async updateTemplateDefaults(
    gradeBand: GradeBand,
    updates: {
      bktDefaults?: Record<string, { pLearn: number; pTransit: number; pGuess: number; pSlip: number }>;
      lexileRange?: { min: number; max: number };
      curriculumStandards?: string[];
    }
  ): Promise<void> {
    const template = await prisma.virtualBrainTemplate.findUnique({
      where: { gradeBand },
    });

    if (!template) {
      throw new Error(`Template not found for grade band ${gradeBand}`);
    }

    // Update template
    await prisma.virtualBrainTemplate.update({
      where: { id: template.id },
      data: {
        templateBktDefaults: updates.bktDefaults ?? template.templateBktDefaults,
        defaultLexileMin: updates.lexileRange?.min ?? template.defaultLexileMin,
        defaultLexileMax: updates.lexileRange?.max ?? template.defaultLexileMax,
        defaultCurriculumStandards: updates.curriculumStandards ?? template.defaultCurriculumStandards,
        version: `${parseFloat(template.version) + 0.1}`,
      },
    });
  }

  /**
   * Get all templates with their stats
   */
  async getAllTemplates(): Promise<Array<{
    gradeBand: GradeBand;
    name: string;
    version: string;
    skillCount: number;
    cloneCount: number;
  }>> {
    const templates = await prisma.virtualBrainTemplate.findMany({
      include: {
        templateSkillStates: {
          select: { id: true },
        },
      },
    });

    const results = await Promise.all(
      templates.map(async (t) => {
        const cloneCount = await prisma.virtualBrain.count({
          where: { sourceTemplateId: t.id },
        });

        return {
          gradeBand: t.gradeBand,
          name: t.name,
          version: t.version,
          skillCount: t.templateSkillStates.length,
          cloneCount,
        };
      })
    );

    return results;
  }
}

// Export singleton instance
export const virtualBrainTemplateService = new VirtualBrainTemplateService();
