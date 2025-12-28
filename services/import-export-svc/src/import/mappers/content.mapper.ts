// ══════════════════════════════════════════════════════════════════════════════
// CONTENT MAPPER
// Maps external content formats to internal AIVO structures
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Content Mapper
 * 
 * Maps content from external formats to internal AIVO structures:
 * - SCORM SCOs → Lessons with SCORM blocks
 * - QTI Assessment Items → Questions
 * - QTI Assessment Tests → Assessments
 * - Common Cartridge resources → Various content types
 * 
 * Uses configurable mapping rules per tenant.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MappingContext {
  tenantId: string;
  userId: string;
  profileId: string;
  sourceFormat: string;
  options?: MappingOptions;
}

export interface MappingOptions {
  createDraft?: boolean;
  preserveMetadata?: boolean;
  mapTags?: boolean;
  customMappings?: Record<string, string>;
}

export interface MappedContent {
  id: string;
  type: string;
  externalId: string;
  title: string;
  internalId: string;
  internalType: string;
}

export interface SCORMContentData {
  identifier: string;
  title: string;
  description?: string;
  launchUrl: string;
  packageId: string;
  itemId: string;
  masteryScore?: number;
  maxTimeAllowed?: string;
  parameters?: string;
}

export interface QTIItemData {
  identifier: string;
  title: string;
  type: string;
  prompt: string;
  choices?: Array<{ id: string; text: string; correct: boolean }>;
  correctResponse?: Record<string, string[]>;
  rubric?: any;
  feedbacks?: any;
}

export interface QTITestData {
  identifier: string;
  title: string;
  description?: string;
  timeLimits?: { maxTime?: number; minTime?: number };
  testParts: Array<{
    identifier: string;
    sections: Array<{
      identifier: string;
      title: string;
      itemRefs: Array<{ identifier: string; href: string }>;
    }>;
  }>;
}

export interface CCResourceData {
  identifier: string;
  type: string;
  title: string;
  href?: string;
  content?: string;
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Mapper Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ContentMapper {
  private readonly logger = new Logger(ContentMapper.name);
  
  // Question type mappings from QTI to internal
  private readonly QUESTION_TYPE_MAP: Record<string, string> = {
    'choice': 'multiple_choice',
    'choiceInteraction': 'multiple_choice',
    'extendedText': 'essay',
    'extendedTextInteraction': 'essay',
    'textEntry': 'fill_blank',
    'textEntryInteraction': 'fill_blank',
    'inlineChoice': 'fill_blank',
    'inlineChoiceInteraction': 'fill_blank',
    'match': 'matching',
    'matchInteraction': 'matching',
    'order': 'ordering',
    'orderInteraction': 'ordering',
    'associate': 'matching',
    'associateInteraction': 'matching',
    'gapMatch': 'fill_blank',
    'gapMatchInteraction': 'fill_blank',
    'hotspot': 'hotspot',
    'hotspotInteraction': 'hotspot',
    'selectPoint': 'hotspot',
    'selectPointInteraction': 'hotspot',
    'slider': 'numeric',
    'sliderInteraction': 'numeric',
    'upload': 'file_upload',
    'uploadInteraction': 'file_upload',
    'drawing': 'drawing',
    'drawingInteraction': 'drawing',
  };

  // CC resource type mappings
  private readonly CC_TYPE_MAP: Record<string, string> = {
    'webcontent': 'resource',
    'imswl_xmlv1p0': 'web_link',
    'imswl_xmlv1p1': 'web_link',
    'imswl_xmlv1p2': 'web_link',
    'imsqti_xmlv2p1': 'assessment',
    'imsqti_xmlv2p2': 'assessment',
    'imsdt_xmlv1p0': 'discussion',
    'imsdt_xmlv1p1': 'discussion',
    'imsdt_xmlv1p2': 'discussion',
    'imsbasiclti_xmlv1p0': 'lti_link',
    'imsbasiclti_xmlv1p1': 'lti_link',
    'imsbasiclti_xmlv1p3': 'lti_link',
    'associatedcontent/imscc_xmlv1p0/learning-application-resource': 'resource',
    'associatedcontent/imscc_xmlv1p1/learning-application-resource': 'resource',
  };

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // SCORM MAPPING
  // ============================================================================

  /**
   * Map SCORM SCO to Lesson
   */
  async mapSCORMToLesson(
    data: SCORMContentData,
    context: MappingContext
  ): Promise<MappedContent> {
    this.logger.debug(`Mapping SCORM SCO to lesson identifier=${data.identifier} title=${data.title}`);

    const lessonId = uuidv4();

    // Create lesson record
    const lesson = await this.prisma.lesson.create({
      data: {
        id: lessonId,
        tenantId: context.tenantId,
        createdBy: context.profileId,
        title: data.title,
        description: data.description || `Imported SCORM content: ${data.title}`,
        status: context.options?.createDraft ? 'draft' : 'published',
        version: 1,
        type: 'scorm',
        settings: {
          scormPackageId: data.packageId,
          scormItemId: data.itemId,
          launchUrl: data.launchUrl,
          masteryScore: data.masteryScore,
          maxTimeAllowed: data.maxTimeAllowed,
          parameters: data.parameters,
        },
        metadata: context.options?.preserveMetadata ? {
          sourceFormat: 'scorm',
          externalId: data.identifier,
          importedAt: new Date().toISOString(),
          importedBy: context.userId,
        } : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create SCORM content block
    await this.prisma.block.create({
      data: {
        id: uuidv4(),
        lessonId: lesson.id,
        type: 'scorm',
        order: 0,
        data: {
          scormPackageId: data.packageId,
          scormItemId: data.itemId,
          launchUrl: data.launchUrl,
          width: '100%',
          height: '600px',
          allowFullscreen: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'sco',
      externalId: data.identifier,
      title: data.title,
      internalId: lesson.id,
      internalType: 'lesson',
    };
  }

  /**
   * Map SCORM asset to Resource
   */
  async mapSCORMAssetToResource(
    data: { identifier: string; title: string; href: string; type: string },
    context: MappingContext
  ): Promise<MappedContent> {
    const resourceId = uuidv4();

    // Create resource record
    await this.prisma.resource.create({
      data: {
        id: resourceId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        title: data.title,
        type: this.detectResourceType(data.href),
        url: data.href,
        metadata: {
          sourceFormat: 'scorm',
          externalId: data.identifier,
          originalType: data.type,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'asset',
      externalId: data.identifier,
      title: data.title,
      internalId: resourceId,
      internalType: 'resource',
    };
  }

  // ============================================================================
  // QTI MAPPING
  // ============================================================================

  /**
   * Map QTI Assessment Item to Question
   */
  async mapQTIItemToQuestion(
    data: QTIItemData,
    context: MappingContext
  ): Promise<MappedContent> {
    this.logger.debug(`Mapping QTI item to question identifier=${data.identifier} type=${data.type}`);

    const questionId = uuidv4();
    const questionType = this.mapQuestionType(data.type);
    const questionData = this.buildQuestionData(data, questionType);

    // Create question record
    const question = await this.prisma.question.create({
      data: {
        id: questionId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        type: questionType,
        stem: data.prompt,
        stemHtml: data.prompt,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        correctAnswers: questionData.correctAnswers,
        blanks: questionData.blanks,
        pairs: questionData.pairs,
        correctOrder: questionData.correctOrder,
        rubric: data.rubric,
        feedback: this.mapFeedback(data.feedbacks),
        points: 1,
        difficulty: 'medium',
        tags: [],
        status: 'active',
        externalId: data.identifier,
        sourceFormat: context.sourceFormat,
        sourceData: data as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'assessmentItem',
      externalId: data.identifier,
      title: data.title,
      internalId: question.id,
      internalType: 'question',
    };
  }

  /**
   * Map QTI Assessment Test to Assessment
   */
  async mapQTITestToAssessment(
    data: QTITestData,
    questionMap: Map<string, string>, // external ID -> internal question ID
    context: MappingContext
  ): Promise<MappedContent> {
    this.logger.debug(`Mapping QTI test to assessment identifier=${data.identifier} title=${data.title}`);

    const assessmentId = uuidv4();

    // Create assessment record
    const assessment = await this.prisma.assessment.create({
      data: {
        id: assessmentId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        title: data.title,
        description: data.description,
        type: 'test',
        status: context.options?.createDraft ? 'draft' : 'published',
        externalId: data.identifier,
        sourceFormat: context.sourceFormat,
        sourceData: data as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create assessment settings
    await this.prisma.assessmentSettings.create({
      data: {
        id: uuidv4(),
        assessmentId: assessment.id,
        timeLimit: data.timeLimits?.maxTime,
        shuffleQuestions: false,
        showResults: true,
        attemptsAllowed: 1,
        passingScore: 70,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create sections and add questions
    let questionOrder = 0;
    for (const part of data.testParts) {
      for (const section of part.sections) {
        // Create section
        const sectionId = uuidv4();
        await this.prisma.assessmentSection.create({
          data: {
            id: sectionId,
            assessmentId: assessment.id,
            title: section.title,
            order: questionOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Add questions to section
        for (const itemRef of section.itemRefs) {
          const questionId = questionMap.get(itemRef.identifier);
          if (questionId) {
            await this.prisma.assessmentQuestion.create({
              data: {
                id: uuidv4(),
                assessmentId: assessment.id,
                sectionId: sectionId,
                questionId: questionId,
                order: questionOrder++,
                points: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
        }
      }
    }

    return {
      id: uuidv4(),
      type: 'assessmentTest',
      externalId: data.identifier,
      title: data.title,
      internalId: assessment.id,
      internalType: 'assessment',
    };
  }

  // ============================================================================
  // COMMON CARTRIDGE MAPPING
  // ============================================================================

  /**
   * Map Common Cartridge resource
   */
  async mapCCResource(
    data: CCResourceData,
    context: MappingContext
  ): Promise<MappedContent | null> {
    const targetType = this.CC_TYPE_MAP[data.type.toLowerCase()] || 'resource';

    switch (targetType) {
      case 'web_link':
        return this.mapCCWebLink(data, context);
      case 'assessment':
        // QTI items in CC are handled by QTI mapper
        return null;
      case 'discussion':
        return this.mapCCDiscussion(data, context);
      case 'lti_link':
        return this.mapCCLTILink(data, context);
      case 'resource':
      default:
        return this.mapCCGenericResource(data, context);
    }
  }

  /**
   * Map CC web link
   */
  private async mapCCWebLink(
    data: CCResourceData,
    context: MappingContext
  ): Promise<MappedContent> {
    const resourceId = uuidv4();

    await this.prisma.resource.create({
      data: {
        id: resourceId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        title: data.title,
        type: 'link',
        url: data.href || '',
        metadata: {
          sourceFormat: 'common_cartridge',
          externalId: data.identifier,
          ...data.metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'webLink',
      externalId: data.identifier,
      title: data.title,
      internalId: resourceId,
      internalType: 'resource',
    };
  }

  /**
   * Map CC discussion topic
   */
  private async mapCCDiscussion(
    data: CCResourceData,
    context: MappingContext
  ): Promise<MappedContent> {
    const discussionId = uuidv4();

    await this.prisma.discussion.create({
      data: {
        id: discussionId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        title: data.title,
        description: data.content || '',
        type: 'topic',
        status: 'active',
        metadata: {
          sourceFormat: 'common_cartridge',
          externalId: data.identifier,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'discussion',
      externalId: data.identifier,
      title: data.title,
      internalId: discussionId,
      internalType: 'discussion',
    };
  }

  /**
   * Map CC LTI link
   */
  private async mapCCLTILink(
    data: CCResourceData,
    context: MappingContext
  ): Promise<MappedContent> {
    const linkId = uuidv4();

    // Extract LTI configuration from metadata
    const ltiConfig = data.metadata?.lti || {};

    await this.prisma.ltiResourceLink.create({
      data: {
        id: linkId,
        tenantId: context.tenantId,
        toolId: ltiConfig.toolId || 'pending',
        resourceLinkId: data.identifier,
        title: data.title,
        description: data.content,
        customParameters: ltiConfig.customParameters,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'ltiLink',
      externalId: data.identifier,
      title: data.title,
      internalId: linkId,
      internalType: 'lti_resource_link',
    };
  }

  /**
   * Map CC generic resource
   */
  private async mapCCGenericResource(
    data: CCResourceData,
    context: MappingContext
  ): Promise<MappedContent> {
    const resourceId = uuidv4();

    await this.prisma.resource.create({
      data: {
        id: resourceId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        title: data.title,
        type: this.detectResourceType(data.href || ''),
        url: data.href || '',
        content: data.content,
        metadata: {
          sourceFormat: 'common_cartridge',
          externalId: data.identifier,
          originalType: data.type,
          ...data.metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: uuidv4(),
      type: 'resource',
      externalId: data.identifier,
      title: data.title,
      internalId: resourceId,
      internalType: 'resource',
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Map QTI interaction type to internal question type
   */
  private mapQuestionType(qtiType: string): string {
    return this.QUESTION_TYPE_MAP[qtiType] || 'short_answer';
  }

  /**
   * Build question data based on type
   */
  private buildQuestionData(data: QTIItemData, questionType: string): any {
    const result: any = {};

    switch (questionType) {
      case 'multiple_choice':
        if (data.choices) {
          result.options = data.choices.map(c => ({
            id: c.id,
            text: c.text,
          }));
          const correct = data.choices.find(c => c.correct);
          result.correctAnswer = correct?.id;
        }
        break;

      case 'multi_select':
        if (data.choices) {
          result.options = data.choices.map(c => ({
            id: c.id,
            text: c.text,
          }));
          result.correctAnswers = data.choices
            .filter(c => c.correct)
            .map(c => c.id);
        }
        break;

      case 'fill_blank':
        if (data.correctResponse) {
          result.blanks = Object.entries(data.correctResponse).map(
            ([id, values]) => ({
              id,
              acceptedAnswers: Array.isArray(values) ? values : [values],
            })
          );
        }
        break;

      case 'matching':
        // Extract pairs from response - would need more QTI parsing
        result.pairs = [];
        break;

      case 'ordering':
        if (data.correctResponse) {
          result.correctOrder = Object.values(data.correctResponse).flat();
        }
        break;

      case 'essay':
      case 'short_answer':
        if (data.rubric) {
          result.rubric = data.rubric;
        }
        break;
    }

    return result;
  }

  /**
   * Map QTI feedback to internal format
   */
  private mapFeedback(feedbacks: any): any {
    if (!feedbacks || feedbacks.length === 0) return null;

    const result: any = {};

    for (const fb of feedbacks) {
      if (fb.identifier === 'correct' || fb.outcomeIdentifier === 'FEEDBACK_CORRECT') {
        result.correct = fb.content;
      } else if (fb.identifier === 'incorrect' || fb.outcomeIdentifier === 'FEEDBACK_INCORRECT') {
        result.incorrect = fb.content;
      } else if (fb.identifier) {
        result[fb.identifier] = fb.content;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Detect resource type from file extension
   */
  private detectResourceType(href: string): string {
    const ext = href.split('.').pop()?.toLowerCase() || '';
    
    const typeMap: Record<string, string> = {
      // Documents
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document',
      'txt': 'document',
      'rtf': 'document',
      
      // Presentations
      'ppt': 'presentation',
      'pptx': 'presentation',
      'odp': 'presentation',
      
      // Spreadsheets
      'xls': 'spreadsheet',
      'xlsx': 'spreadsheet',
      'csv': 'spreadsheet',
      
      // Images
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      
      // Videos
      'mp4': 'video',
      'webm': 'video',
      'avi': 'video',
      'mov': 'video',
      'm4v': 'video',
      
      // Audio
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'm4a': 'audio',
      
      // Web
      'html': 'webpage',
      'htm': 'webpage',
      
      // Archives
      'zip': 'archive',
      'rar': 'archive',
      '7z': 'archive',
    };

    return typeMap[ext] || 'file';
  }

  /**
   * Get mapping rules for tenant
   */
  async getMappingRules(
    tenantId: string,
    sourceFormat: string,
    sourceType: string
  ): Promise<any[]> {
    const rules = await this.prisma.contentMappingRule.findMany({
      where: {
        tenantId,
        sourceFormat,
        sourceType,
        isActive: true,
      },
      orderBy: [
        { priority: 'desc' },
        { isDefault: 'desc' },
      ],
    });

    // If no tenant-specific rules, get defaults
    if (rules.length === 0) {
      return this.prisma.contentMappingRule.findMany({
        where: {
          sourceFormat,
          sourceType,
          isDefault: true,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
    }

    return rules;
  }

  /**
   * Apply custom mapping rules
   */
  async applyMappingRules(
    data: any,
    rules: any[],
    context: MappingContext
  ): Promise<any> {
    let result = { ...data };

    for (const rule of rules) {
      const mappingRules = rule.mappingRules as Record<string, any>;

      // Apply field mappings
      if (mappingRules.fieldMappings) {
        for (const [source, target] of Object.entries(mappingRules.fieldMappings)) {
          if (result[source] !== undefined) {
            result[target as string] = result[source];
          }
        }
      }

      // Apply transformations
      if (mappingRules.transformations) {
        for (const transform of mappingRules.transformations) {
          result = this.applyTransformation(result, transform);
        }
      }

      // Apply defaults
      if (mappingRules.defaults) {
        for (const [field, value] of Object.entries(mappingRules.defaults)) {
          if (result[field] === undefined) {
            result[field] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Apply a single transformation
   */
  private applyTransformation(data: any, transform: any): any {
    switch (transform.type) {
      case 'rename':
        if (data[transform.from] !== undefined) {
          data[transform.to] = data[transform.from];
          delete data[transform.from];
        }
        break;

      case 'concat':
        data[transform.target] = transform.fields
          .map((f: string) => data[f] || '')
          .join(transform.separator || ' ');
        break;

      case 'lookup':
        if (transform.map && data[transform.field]) {
          data[transform.field] = transform.map[data[transform.field]] || data[transform.field];
        }
        break;

      case 'default':
        if (data[transform.field] === undefined) {
          data[transform.field] = transform.value;
        }
        break;
    }

    return data;
  }
}
