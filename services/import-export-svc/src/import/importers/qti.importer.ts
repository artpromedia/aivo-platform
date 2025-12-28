/**
 * QTI Importer
 *
 * Imports QTI 2.1 and 3.0 assessment items and tests:
 * - Assessment items (questions)
 * - Assessment tests
 * - Item banks
 * - Rubrics and scoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentPackage,
  ImportResult,
  ImportOptions,
  ImportedItem,
} from '../import.types';

/**
 * Internal QTI item representation
 */
interface QTIItem {
  identifier: string;
  title: string;
  type: string;
  prompt: string;
  choices?: Array<{ id: string; text: string; correct: boolean }>;
  correctResponse?: Record<string, unknown>;
  responseDeclaration?: Record<string, unknown>;
  outcomeDeclaration?: Record<string, unknown>;
  rubric?: Record<string, unknown>[];
  feedbacks?: Array<{
    type: string;
    outcomeIdentifier?: string;
    showHide?: string;
    identifier?: string;
    content: string;
  }>;
}

@Injectable()
export class QTIImporter {
  private readonly logger = new Logger(QTIImporter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Import QTI package
   */
  async import(
    packageData: ContentPackage,
    tenantId: string,
    userId: string,
    options: ImportOptions & { onProgress?: (progress: number) => void }
  ): Promise<ImportResult> {
    const items: ImportedItem[] = [];
    const warnings: string[] = [];
    const { onProgress } = options;

    try {
      // Find all QTI XML files
      const qtiFiles = packageData.files.filter(
        (f) => f.name.endsWith('.xml') && !f.name.includes('manifest')
      );

      const totalFiles = qtiFiles.length;
      let processedFiles = 0;

      for (const file of qtiFiles) {
        try {
          const content = await this.readFile(packageData, file.name);
          const xml = await this.parseXML(content);

          // Detect QTI version and element type
          const { version, type } = this.detectQTIType(xml);

          if (type === 'assessmentItem') {
            const qtiItem = this.parseAssessmentItem(xml, version);
            const question = await this.createQuestion(
              qtiItem,
              tenantId,
              userId,
              options
            );

            items.push({
              externalId: qtiItem.identifier,
              type: 'question',
              title: qtiItem.title,
              description: null,
              sourceFormat: `qti_${version}`,
              data: { qtiItem, questionId: question.id },
              mappedTo: question.id,
            });
          } else if (type === 'assessmentTest') {
            const test = this.parseAssessmentTest(xml, version);
            const assessment = await this.createAssessment(
              test,
              tenantId,
              userId,
              options
            );

            items.push({
              externalId: test.identifier,
              type: 'assessment',
              title: test.title,
              description: test.description,
              sourceFormat: `qti_${version}`,
              data: { test, assessmentId: assessment.id },
              mappedTo: assessment.id,
            });
          }
        } catch (error) {
          warnings.push(
            `Failed to process ${file.name}: ${(error as Error).message}`
          );
          this.logger.warn(`Failed to process QTI file: ${file.name}`, error);
        }

        processedFiles++;
        onProgress?.(processedFiles / totalFiles);
      }

      return { items, warnings };
    } catch (error) {
      this.logger.error('QTI import failed', error);
      throw error;
    }
  }

  /**
   * Detect QTI version and element type
   */
  private detectQTIType(xml: Record<string, unknown>): {
    version: '2.1' | '3.0';
    type: string;
  } {
    const keys = Object.keys(xml);
    if (keys.length === 0 || !keys[0]) {
      return { version: '2.1', type: 'unknown' };
    }
    const rootElement = keys[0];
    
    const root = xml[rootElement] as Record<string, unknown>;
    const attrs = (root?.['$'] as Record<string, unknown>) ?? {};
    const namespaces = Object.values(attrs).filter((v): v is string => typeof v === 'string');

    let version: '2.1' | '3.0' = '2.1';

    if (
      namespaces.some(
        (ns) =>
          ns.includes('qti/v3') ||
          ns.includes('qtiv3')
      )
    ) {
      version = '3.0';
    }

    // Normalize element type
    const type = rootElement.replace(/^.*:/, ''); // Remove namespace prefix

    return { version, type };
  }

  /**
   * Parse QTI 2.1/3.0 assessment item
   */
  private parseAssessmentItem(
    xml: Record<string, unknown>,
    version: '2.1' | '3.0'
  ): QTIItem {
    const rootKey = Object.keys(xml).find(
      (k) =>
        k === 'assessmentItem' ||
        k === 'qti-assessment-item' ||
        k.endsWith(':assessmentItem')
    );
    const root = (xml[rootKey!] as Record<string, unknown>) ?? Object.values(xml)[0];
    const attrs = (root?.['$'] as Record<string, unknown>) ?? {};

    const choices = this.extractChoices(root, version);
    const rubric = this.extractRubric(root, version);
    const feedbacks = this.extractFeedbacks(root, version);
    const responseDeclaration = 
      (root['responseDeclaration'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-response-declaration'] as unknown[])?.[0] as Record<string, unknown>;
    const outcomeDeclaration =
      (root['outcomeDeclaration'] as Record<string, unknown>) ??
      (root['qti-outcome-declaration'] as Record<string, unknown>);

    const item: QTIItem = {
      identifier: (attrs['identifier'] as string) ?? uuidv4(),
      title: (attrs['title'] as string) ?? 'Untitled Question',
      type: this.detectInteractionType(root, version),
      prompt: this.extractPrompt(root, version),
      correctResponse: this.extractCorrectResponse(root, version),
    };

    // Add optional properties only if they have values
    if (choices) {
      item.choices = choices;
    }
    if (responseDeclaration) {
      item.responseDeclaration = responseDeclaration;
    }
    if (outcomeDeclaration) {
      item.outcomeDeclaration = outcomeDeclaration;
    }
    if (rubric) {
      item.rubric = rubric;
    }
    if (feedbacks) {
      item.feedbacks = feedbacks;
    }

    return item;
  }

  /**
   * Detect interaction type
   */
  private detectInteractionType(
    root: Record<string, unknown>,
    version: '2.1' | '3.0'
  ): string {
    const itemBody =
      (root['itemBody'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-item-body'] as unknown[])?.[0] as Record<string, unknown>;
    if (!itemBody) return 'unknown';

    // Check for different interaction types
    const interactions = [
      'choiceInteraction',
      'qti-choice-interaction',
      'extendedTextInteraction',
      'qti-extended-text-interaction',
      'textEntryInteraction',
      'qti-text-entry-interaction',
      'inlineChoiceInteraction',
      'qti-inline-choice-interaction',
      'matchInteraction',
      'qti-match-interaction',
      'orderInteraction',
      'qti-order-interaction',
      'associateInteraction',
      'qti-associate-interaction',
      'gapMatchInteraction',
      'qti-gap-match-interaction',
      'hotspotInteraction',
      'qti-hotspot-interaction',
      'selectPointInteraction',
      'qti-select-point-interaction',
      'graphicOrderInteraction',
      'qti-graphic-order-interaction',
      'sliderInteraction',
      'qti-slider-interaction',
    ];

    for (const interaction of interactions) {
      if (this.findElement(itemBody, interaction)) {
        return interaction.replace('qti-', '').replace('Interaction', '');
      }
    }

    return 'unknown';
  }

  /**
   * Extract prompt/question text
   */
  private extractPrompt(
    root: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ): string {
    const itemBody =
      (root['itemBody'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-item-body'] as unknown[])?.[0] as Record<string, unknown>;
    if (!itemBody) return '';

    // Look for prompt element
    const prompt =
      this.findElement(itemBody, 'prompt') ??
      this.findElement(itemBody, 'qti-prompt');

    if (prompt) {
      return this.extractText(prompt);
    }

    // Look for any text content before interaction
    const content: string[] = [];
    this.extractAllText(itemBody, content);
    return content.join(' ').trim();
  }

  /**
   * Extract choices for choice-based interactions
   */
  private extractChoices(
    root: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ): Array<{ id: string; text: string; correct: boolean }> | undefined {
    const itemBody =
      (root['itemBody'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-item-body'] as unknown[])?.[0] as Record<string, unknown>;
    if (!itemBody) return undefined;

    const interaction =
      this.findElement(itemBody, 'choiceInteraction') ??
      this.findElement(itemBody, 'qti-choice-interaction');

    if (!interaction) return undefined;

    const interactionAttrs = interaction['$'] as Record<string, unknown>;
    const responseIdentifier = interactionAttrs?.['responseIdentifier'] as string;
    const correctResponses = this.getCorrectResponseValues(
      root,
      responseIdentifier,
      _version
    );

    const choices =
      interaction['simpleChoice'] ??
      interaction['qti-simple-choice'] ??
      [];

    return (choices as unknown[]).map((choice: unknown) => {
      const choiceRecord = choice as Record<string, unknown>;
      const choiceAttrs = choiceRecord['$'] as Record<string, unknown>;
      const id = choiceAttrs?.['identifier'] as string;
      return {
        id,
        text: this.extractText(choiceRecord),
        correct: correctResponses.includes(id),
      };
    });
  }

  /**
   * Get correct response values
   */
  private getCorrectResponseValues(
    root: Record<string, unknown>,
    responseIdentifier: string,
    _version: '2.1' | '3.0'
  ): string[] {
    const declarations =
      (root['responseDeclaration'] as unknown[]) ??
      (root['qti-response-declaration'] as unknown[]) ??
      [];

    for (const decl of declarations) {
      const declRecord = decl as Record<string, unknown>;
      const declAttrs = declRecord['$'] as Record<string, unknown>;
      if (declAttrs?.['identifier'] === responseIdentifier) {
        const correctResponse =
          (declRecord['correctResponse'] as unknown[])?.[0] as Record<string, unknown> ??
          (declRecord['qti-correct-response'] as unknown[])?.[0] as Record<string, unknown>;
        if (correctResponse) {
          const values =
            (correctResponse['value'] as unknown[]) ??
            (correctResponse['qti-value'] as unknown[]) ??
            [];
          return values.map((v: unknown) =>
            typeof v === 'string' ? v : ((v as Record<string, string>)['_'] ?? String(v))
          );
        }
      }
    }

    return [];
  }

  /**
   * Extract correct response
   */
  private extractCorrectResponse(
    root: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ): Record<string, unknown> {
    const declarations =
      (root['responseDeclaration'] as unknown[]) ??
      (root['qti-response-declaration'] as unknown[]) ??
      [];

    const responses: Record<string, unknown> = {};

    for (const decl of declarations) {
      const declRecord = decl as Record<string, unknown>;
      const declAttrs = declRecord['$'] as Record<string, unknown>;
      const identifier = declAttrs?.['identifier'] as string;
      const correctResponse =
        (declRecord['correctResponse'] as unknown[])?.[0] as Record<string, unknown> ??
        (declRecord['qti-correct-response'] as unknown[])?.[0] as Record<string, unknown>;

      if (correctResponse) {
        const values =
          (correctResponse['value'] as unknown[]) ??
          (correctResponse['qti-value'] as unknown[]) ??
          [];
        responses[identifier] = values.map((v: unknown) =>
          typeof v === 'string' ? v : ((v as Record<string, string>)['_'] ?? String(v))
        );
      }
    }

    return responses;
  }

  /**
   * Extract rubric
   */
  private extractRubric(
    root: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ): Record<string, unknown>[] | undefined {
    const rubricBlock =
      (root['rubricBlock'] as unknown[]) ??
      (root['qti-rubric-block'] as unknown[]);
    if (!rubricBlock || rubricBlock.length === 0) return undefined;

    return rubricBlock.map((block: unknown) => {
      const blockRecord = block as Record<string, unknown>;
      const blockAttrs = blockRecord['$'] as Record<string, unknown>;
      return {
        view: blockAttrs?.['view'],
        content: this.extractText(blockRecord),
      };
    });
  }

  /**
   * Extract feedbacks
   */
  private extractFeedbacks(
    root: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ):
    | Array<{
        type: string;
        outcomeIdentifier?: string;
        showHide?: string;
        identifier?: string;
        content: string;
      }>
    | undefined {
    const feedbacks: Array<{
      type: string;
      outcomeIdentifier?: string;
      showHide?: string;
      identifier?: string;
      content: string;
    }> = [];

    // Modal feedback
    const modalFeedback =
      (root['modalFeedback'] as unknown[]) ??
      (root['qti-modal-feedback'] as unknown[]) ??
      [];
    for (const fb of modalFeedback) {
      const fbRecord = fb as Record<string, unknown>;
      const fbAttrs = fbRecord['$'] as Record<string, unknown>;
      feedbacks.push({
        type: 'modal',
        outcomeIdentifier: fbAttrs?.['outcomeIdentifier'] as string,
        showHide: fbAttrs?.['showHide'] as string,
        identifier: fbAttrs?.['identifier'] as string,
        content: this.extractText(fbRecord),
      });
    }

    // Inline feedback from item body
    const itemBody =
      (root['itemBody'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-item-body'] as unknown[])?.[0] as Record<string, unknown>;
    if (itemBody) {
      const inlineFeedback =
        this.findAllElements(itemBody, 'feedbackInline') ??
        this.findAllElements(itemBody, 'qti-feedback-inline') ??
        [];
      for (const fb of inlineFeedback) {
        const fbAttrs = fb['$'] as Record<string, unknown>;
        feedbacks.push({
          type: 'inline',
          outcomeIdentifier: fbAttrs?.['outcomeIdentifier'] as string,
          showHide: fbAttrs?.['showHide'] as string,
          identifier: fbAttrs?.['identifier'] as string,
          content: this.extractText(fb),
        });
      }
    }

    return feedbacks.length > 0 ? feedbacks : undefined;
  }

  /**
   * Parse assessment test
   */
  private parseAssessmentTest(
    xml: Record<string, unknown>,
    version: '2.1' | '3.0'
  ): {
    identifier: string;
    title: string;
    description: string | null;
    timeLimits: Record<string, unknown> | null;
    testParts: unknown[];
    outcomeDeclarations: unknown;
  } {
    const rootKey = Object.keys(xml).find(
      (k) =>
        k === 'assessmentTest' ||
        k === 'qti-assessment-test' ||
        k.endsWith(':assessmentTest')
    );
    const root = (xml[rootKey!] as Record<string, unknown>) ?? Object.values(xml)[0];
    const attrs = (root?.['$'] as Record<string, unknown>) ?? {};

    return {
      identifier: (attrs['identifier'] as string) ?? uuidv4(),
      title: (attrs['title'] as string) ?? 'Untitled Assessment',
      description: this.extractTestDescription(root),
      timeLimits: this.extractTimeLimits(root),
      testParts: this.parseTestParts(root, version),
      outcomeDeclarations:
        root['outcomeDeclaration'] ?? root['qti-outcome-declaration'],
    };
  }

  /**
   * Parse test parts
   */
  private parseTestParts(
    root: Record<string, unknown>,
    version: '2.1' | '3.0'
  ): unknown[] {
    const parts =
      (root['testPart'] as unknown[]) ??
      (root['qti-test-part'] as unknown[]) ??
      [];

    return parts.map((part: unknown) => {
      const partRecord = part as Record<string, unknown>;
      const partAttrs = partRecord['$'] as Record<string, unknown>;
      return {
        identifier: partAttrs?.['identifier'],
        navigationMode: partAttrs?.['navigationMode'],
        submissionMode: partAttrs?.['submissionMode'],
        sections: this.parseAssessmentSections(partRecord, version),
      };
    });
  }

  /**
   * Parse assessment sections
   */
  private parseAssessmentSections(
    part: Record<string, unknown>,
    version: '2.1' | '3.0'
  ): unknown[] {
    const sections =
      (part['assessmentSection'] as unknown[]) ??
      (part['qti-assessment-section'] as unknown[]) ??
      [];

    return sections.map((section: unknown) => {
      const sectionRecord = section as Record<string, unknown>;
      const sectionAttrs = sectionRecord['$'] as Record<string, unknown>;
      const getAttr = (key: string): unknown => {
        const val = (sectionRecord[key] as unknown[])?.[0];
        return val && typeof val === 'object' ? (val as Record<string, unknown>)['$'] : undefined;
      };
      return {
        identifier: sectionAttrs?.['identifier'],
        title: sectionAttrs?.['title'],
        visible: sectionAttrs?.['visible'] !== 'false',
        keepTogether: sectionAttrs?.['keepTogether'] === 'true',
        itemRefs: this.parseItemRefs(sectionRecord, version),
        selection: getAttr('selection') ?? getAttr('qti-selection'),
        ordering: getAttr('ordering') ?? getAttr('qti-ordering'),
        rubricBlock:
          sectionRecord['rubricBlock'] ?? sectionRecord['qti-rubric-block'],
      };
    });
  }

  /**
   * Parse item references
   */
  private parseItemRefs(
    section: Record<string, unknown>,
    _version: '2.1' | '3.0'
  ): unknown[] {
    const refs =
      (section['assessmentItemRef'] as unknown[]) ??
      (section['qti-assessment-item-ref'] as unknown[]) ??
      [];

    return refs.map((ref: unknown) => {
      const refRecord = ref as Record<string, unknown>;
      const refAttrs = refRecord['$'] as Record<string, unknown>;
      const weightArr = refRecord['weight'] as unknown[] | undefined;
      const weightVal = weightArr?.[0];
      const weightAttr = weightVal && typeof weightVal === 'object' 
        ? (weightVal as Record<string, unknown>)['$'] as Record<string, unknown> | undefined
        : undefined;
      return {
        identifier: refAttrs?.['identifier'],
        href: refAttrs?.['href'],
        required: refAttrs?.['required'] !== 'false',
        fixed: refAttrs?.['fixed'] === 'true',
        weight: weightAttr?.['value'],
        categories: (refAttrs?.['category'] as string)?.split(' ') ?? [],
      };
    });
  }

  /**
   * Create question from QTI item
   */
  private async createQuestion(
    qtiItem: QTIItem,
    tenantId: string,
    userId: string,
    _options: ImportOptions
  ): Promise<{ id: string }> {
    // Get teacher profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, tenantId, role: 'teacher' },
    });

    if (!profile) {
      throw new Error('Teacher profile not found');
    }

    // Map QTI interaction type to internal question type
    const questionType = this.mapQuestionType(qtiItem.type);

    // Build question data based on type
    const questionData = this.buildQuestionData(qtiItem, questionType);

    // Create question record
    const question = await this.prisma.question.create({
      data: {
        id: uuidv4(),
        tenantId,
        createdBy: userId,
        type: questionType,
        stem: qtiItem.prompt,
        stemHtml: qtiItem.prompt,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        correctAnswers: questionData.correctAnswers,
        blanks: questionData.blanks,
        pairs: questionData.pairs,
        correctOrder: questionData.correctOrder,
        rubric: qtiItem.rubric,
        feedback: this.buildFeedback(qtiItem.feedbacks),
        points: 1,
        difficulty: 'medium',
        tags: [],
        status: 'active',
        externalId: qtiItem.identifier,
        sourceFormat: 'qti',
        sourceData: qtiItem as unknown as Record<string, unknown>,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return question;
  }

  /**
   * Map QTI interaction type to internal type
   */
  private mapQuestionType(qtiType: string): string {
    const typeMap: Record<string, string> = {
      choice: 'multiple_choice',
      choiceInteraction: 'multiple_choice',
      extendedText: 'essay',
      extendedTextInteraction: 'essay',
      textEntry: 'fill_blank',
      textEntryInteraction: 'fill_blank',
      inlineChoice: 'fill_blank',
      match: 'matching',
      matchInteraction: 'matching',
      order: 'ordering',
      orderInteraction: 'ordering',
      associate: 'matching',
      gapMatch: 'fill_blank',
      hotspot: 'hotspot',
      selectPoint: 'hotspot',
      slider: 'numeric',
    };

    return typeMap[qtiType] || 'short_answer';
  }

  /**
   * Build question data based on type
   */
  private buildQuestionData(
    qtiItem: QTIItem,
    questionType: string
  ): {
    options?: unknown[];
    correctAnswer?: string;
    correctAnswers?: string[];
    blanks?: unknown[];
    pairs?: unknown[];
    correctOrder?: string[];
  } {
    const data: {
      options?: unknown[];
      correctAnswer?: string;
      correctAnswers?: string[];
      blanks?: unknown[];
      pairs?: unknown[];
      correctOrder?: string[];
    } = {};

    switch (questionType) {
      case 'multiple_choice':
        if (qtiItem.choices) {
          data.options = qtiItem.choices.map((c) => ({
            id: c.id,
            text: c.text,
          }));

          const correct = qtiItem.choices.find((c) => c.correct);
          if (correct?.id !== undefined) {
            data.correctAnswer = correct.id;
          }
        }
        break;

      case 'multi_select':
        if (qtiItem.choices) {
          data.options = qtiItem.choices.map((c) => ({
            id: c.id,
            text: c.text,
          }));
          data.correctAnswers = qtiItem.choices
            .filter((c) => c.correct)
            .map((c) => c.id);
        }
        break;

      case 'fill_blank':
        // Extract blanks from correct response
        if (qtiItem.correctResponse) {
          const blanks = Object.entries(qtiItem.correctResponse).map(
            ([id, values]) => ({
              id,
              acceptedAnswers: Array.isArray(values) ? values : [values],
            })
          );
          data.blanks = blanks;
        }
        break;

      case 'matching':
        // Build pairs from response declaration
        if (qtiItem.responseDeclaration) {
          const pairs = this.extractMatchingPairs(qtiItem);
          data.pairs = pairs;
        }
        break;

      case 'ordering':
        if (qtiItem.correctResponse) {
          const order = Object.values(qtiItem.correctResponse).flat();
          data.correctOrder = order as string[];
        }
        break;

      case 'essay':
      case 'short_answer':
        // These don't have correct answers typically
        break;
    }

    return data;
  }

  /**
   * Extract matching pairs from QTI
   */
  private extractMatchingPairs(_qtiItem: QTIItem): unknown[] {
    // This would need more sophisticated parsing based on the
    // specific QTI match interaction structure
    return [];
  }

  /**
   * Build feedback structure
   */
  private buildFeedback(
    feedbacks:
      | Array<{
          type: string;
          outcomeIdentifier?: string;
          showHide?: string;
          identifier?: string;
          content: string;
        }>
      | undefined
  ): Record<string, string> | null {
    if (!feedbacks || feedbacks.length === 0) return null;

    const result: Record<string, string> = {};

    for (const fb of feedbacks) {
      if (fb.identifier === 'correct' || fb.showHide === 'show') {
        result['correct'] = fb.content;
      } else if (fb.identifier === 'incorrect') {
        result['incorrect'] = fb.content;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Create assessment from QTI test
   */
  private async createAssessment(
    test: {
      identifier: string;
      title: string;
      description: string | null;
      timeLimits: Record<string, unknown> | null;
      testParts: unknown[];
      outcomeDeclarations: unknown;
    },
    tenantId: string,
    userId: string,
    _options: ImportOptions
  ): Promise<{ id: string }> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, tenantId, role: 'teacher' },
    });

    if (!profile) {
      throw new Error('Teacher profile not found');
    }

    // Create assessment
    const testPart = test.testParts?.[0] as Record<string, unknown> | undefined;
    const sections = testPart?.['sections'] as unknown[] | undefined;
    const firstSection = sections?.[0] as Record<string, unknown> | undefined;
    const ordering = firstSection?.['ordering'] as Record<string, unknown> | undefined;
    const shuffleQuestions = ordering?.['shuffle'] === 'true';

    const assessment = await this.prisma.assessment.create({
      data: {
        id: uuidv4(),
        tenantId,
        createdBy: userId,
        title: test.title,
        description: test.description,
        type: 'test',
        status: 'draft',
        externalId: test.identifier,
        sourceFormat: 'qti',
        sourceData: test as unknown as Record<string, unknown>,
        settings: {
          timeLimit: test.timeLimits?.['maxTime'],
          shuffleQuestions,
          attemptsAllowed: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return assessment;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async readFile(
    packageData: ContentPackage,
    fileName: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const file = packageData.files.find((f) => f.name === fileName);

    if (!file) {
      throw new Error(`File not found: ${fileName}`);
    }

    const fullPath = path.join(packageData.tempDir, file.name);
    return fs.readFile(fullPath, 'utf-8');
  }

  private async parseXML(content: string): Promise<Record<string, unknown>> {
    const parser = new xml2js.Parser({
      explicitArray: true,
      mergeAttrs: false,
      xmlns: true,
    });

    return parser.parseStringPromise(content);
  }

  private findElement(
    obj: Record<string, unknown>,
    name: string
  ): Record<string, unknown> | null {
    if (!obj) return null;

    if (obj[name]) {
      const val = obj[name];
      return (Array.isArray(val) ? val[0] : val) as Record<string, unknown>;
    }

    for (const key of Object.keys(obj)) {
      if (key.endsWith(':' + name) || key === name) {
        const val = obj[key];
        return (Array.isArray(val) ? val[0] : val) as Record<string, unknown>;
      }

      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const found = this.findElement(value as Record<string, unknown>, name);
        if (found) return found;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const found = this.findElement(item as Record<string, unknown>, name);
            if (found) return found;
          }
        }
      }
    }

    return null;
  }

  private findAllElements(
    obj: Record<string, unknown>,
    name: string
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];

    const search = (o: Record<string, unknown>) => {
      if (!o) return;

      if (o[name]) {
        const val = o[name];
        results.push(
          ...(Array.isArray(val)
            ? (val as Record<string, unknown>[])
            : [val as Record<string, unknown>])
        );
      }

      for (const key of Object.keys(o)) {
        if (key.endsWith(':' + name)) {
          const val = o[key];
          results.push(
            ...(Array.isArray(val)
              ? (val as Record<string, unknown>[])
              : [val as Record<string, unknown>])
          );
        }

        const value = o[key];
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item: unknown) => {
              if (typeof item === 'object' && item !== null) {
                search(item as Record<string, unknown>);
              }
            });
          } else {
            search(value as Record<string, unknown>);
          }
        }
      }
    };

    search(obj);
    return results;
  }

  private extractText(element: unknown): string {
    if (!element) return '';
    if (typeof element === 'string') return element;

    const record = element as Record<string, unknown>;
    if (record['_']) return record['_'] as string;

    const parts: string[] = [];

    const extract = (obj: unknown) => {
      if (typeof obj === 'string') {
        parts.push(obj);
      } else if (obj && typeof obj === 'object') {
        const record = obj as Record<string, unknown>;
        if (record['_']) {
          parts.push(record['_'] as string);
        } else if (Array.isArray(obj)) {
          obj.forEach((item) => extract(item));
        } else {
          Object.entries(record).forEach(([key, value]) => {
            if (key !== '$' && key !== 'xmlns') {
              extract(value);
            }
          });
        }
      }
    };

    extract(element);
    return parts.join(' ').trim();
  }

  private extractAllText(element: unknown, results: string[]): void {
    if (!element) return;
    if (typeof element === 'string') {
      results.push(element.trim());
      return;
    }

    const record = element as Record<string, unknown>;
    if (record['_']) {
      results.push((record['_'] as string).trim());
    }

    Object.entries(record).forEach(([key, value]) => {
      if (key !== '$' && key !== 'xmlns' && !key.includes('Interaction')) {
        if (Array.isArray(value)) {
          value.forEach((v) => this.extractAllText(v, results));
        } else {
          this.extractAllText(value, results);
        }
      }
    });
  }

  private extractTestDescription(_root: Record<string, unknown>): string | null {
    // Try to find description in metadata or first rubric block
    return null;
  }

  private extractTimeLimits(
    root: Record<string, unknown>
  ): Record<string, unknown> | null {
    const timeLimits =
      (root['timeLimits'] as unknown[])?.[0] as Record<string, unknown> ??
      (root['qti-time-limits'] as unknown[])?.[0] as Record<string, unknown>;
    if (!timeLimits) return null;

    const attrs = timeLimits['$'] as Record<string, unknown>;
    return {
      maxTime: attrs?.['maxTime'],
      minTime: attrs?.['minTime'],
      allowLateSubmission: attrs?.['allowLateSubmission'] === 'true',
    };
  }
}
