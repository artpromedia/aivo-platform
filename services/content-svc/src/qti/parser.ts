/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars */
/**
 * QTI Parser Service
 *
 * Parses QTI (Question and Test Interoperability) packages.
 * Supports QTI 2.1 and QTI 3.0 specifications.
 *
 * @see https://www.imsglobal.org/question/index.html
 */

import type { Readable } from 'stream';

import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type QtiVersion = 'QTI_2.1' | 'QTI_2.2' | 'QTI_3.0';

export type QtiInteractionType =
  | 'choiceInteraction'
  | 'orderInteraction'
  | 'associateInteraction'
  | 'matchInteraction'
  | 'gapMatchInteraction'
  | 'inlineChoiceInteraction'
  | 'textEntryInteraction'
  | 'extendedTextInteraction'
  | 'hottextInteraction'
  | 'hotspotInteraction'
  | 'selectPointInteraction'
  | 'graphicOrderInteraction'
  | 'graphicAssociateInteraction'
  | 'graphicGapMatchInteraction'
  | 'positionObjectInteraction'
  | 'sliderInteraction'
  | 'mediaInteraction'
  | 'drawingInteraction'
  | 'uploadInteraction'
  | 'customInteraction'
  | 'endAttemptInteraction';

export type QtiBaseType =
  | 'boolean'
  | 'directedPair'
  | 'duration'
  | 'file'
  | 'float'
  | 'identifier'
  | 'integer'
  | 'pair'
  | 'point'
  | 'string'
  | 'uri';

export type QtiCardinality = 'single' | 'multiple' | 'ordered' | 'record';

export interface QtiChoice {
  identifier: string;
  content: string;
  fixed?: boolean;
  templateIdentifier?: string;
  showHide?: 'show' | 'hide';
}

export interface QtiResponseDeclaration {
  identifier: string;
  cardinality: QtiCardinality;
  baseType: QtiBaseType;
  defaultValue?: string | string[];
  correctResponse?: string | string[];
  mapping?: QtiMapping;
  areaMapping?: QtiAreaMapping;
}

export interface QtiMapping {
  lowerBound?: number;
  upperBound?: number;
  defaultValue?: number;
  entries: QtiMapEntry[];
}

export interface QtiMapEntry {
  mapKey: string;
  mappedValue: number;
  caseSensitive?: boolean;
}

export interface QtiAreaMapping {
  lowerBound?: number;
  upperBound?: number;
  defaultValue?: number;
  entries: QtiAreaMapEntry[];
}

export interface QtiAreaMapEntry {
  shape: 'circle' | 'rect' | 'poly' | 'ellipse';
  coords: string;
  mappedValue: number;
}

export interface QtiOutcomeDeclaration {
  identifier: string;
  cardinality: QtiCardinality;
  baseType: QtiBaseType;
  defaultValue?: string | number;
  interpretation?: string;
  normalMaximum?: number;
  normalMinimum?: number;
  masteryValue?: number;
}

export interface QtiInteraction {
  type: QtiInteractionType;
  responseIdentifier: string;
  prompt?: string;
  choices?: QtiChoice[];
  shuffle?: boolean;
  maxChoices?: number;
  minChoices?: number;
  orientation?: 'horizontal' | 'vertical';
  expectedLength?: number;
  expectedLines?: number;
  format?: 'plain' | 'preFormatted' | 'xhtml';
  base?: string;
  // Media-specific
  object?: QtiMediaObject;
  // Slider-specific
  lowerBound?: number;
  upperBound?: number;
  step?: number;
  stepLabel?: boolean;
  // Raw content for complex interactions
  raw?: Record<string, unknown>;
}

export interface QtiMediaObject {
  type: string;
  data: string;
  width?: number;
  height?: number;
}

export interface QtiRubricBlock {
  view: string[];
  content: string;
  use?: string;
}

export interface QtiResponseProcessingRule {
  type: 'responseCondition' | 'setOutcomeValue' | 'lookupOutcomeValue' | 'exitResponse';
  raw: Record<string, unknown>;
}

export interface QtiModalFeedback {
  identifier: string;
  outcomeIdentifier: string;
  showHide: 'show' | 'hide';
  content: string;
}

export interface QtiAssessmentItem {
  identifier: string;
  title: string;
  label?: string;
  language?: string;
  adaptive: boolean;
  timeDependent: boolean;
  toolName?: string;
  toolVersion?: string;
  responseDeclarations: QtiResponseDeclaration[];
  outcomeDeclarations: QtiOutcomeDeclaration[];
  templateDeclarations?: Record<string, unknown>[];
  stylesheets?: string[];
  itemBody: {
    content: string;
    interactions: QtiInteraction[];
  };
  responseProcessing?: {
    template?: string;
    rules?: QtiResponseProcessingRule[];
  };
  modalFeedback?: QtiModalFeedback[];
  raw?: Record<string, unknown>;
}

export interface QtiTestPart {
  identifier: string;
  navigationMode: 'linear' | 'nonlinear';
  submissionMode: 'individual' | 'simultaneous';
  preConditions?: string[];
  branchRules?: Record<string, unknown>[];
  itemSessionControl?: QtiItemSessionControl;
  timeLimits?: QtiTimeLimits;
  sections: QtiSection[];
}

export interface QtiSection {
  identifier: string;
  title: string;
  visible: boolean;
  keepTogether?: boolean;
  required?: boolean;
  fixed?: boolean;
  selection?: QtiSelection;
  ordering?: { shuffle: boolean; extensions?: string[] };
  rubricBlock?: QtiRubricBlock[];
  itemSessionControl?: QtiItemSessionControl;
  timeLimits?: QtiTimeLimits;
  items: QtiItemRef[];
  sections?: QtiSection[];
}

export interface QtiItemRef {
  identifier: string;
  href: string;
  required?: boolean;
  fixed?: boolean;
  categories?: string[];
  weights?: Record<string, number>;
  variableMapping?: Record<string, string>;
  templateDefaults?: Record<string, string>;
}

export interface QtiSelection {
  select?: number;
  withReplacement?: boolean;
  extensions?: string[];
}

export interface QtiItemSessionControl {
  maxAttempts?: number;
  showFeedback?: boolean;
  allowReview?: boolean;
  showSolution?: boolean;
  allowComment?: boolean;
  allowSkipping?: boolean;
  validateResponses?: boolean;
}

export interface QtiTimeLimits {
  minTime?: number;
  maxTime?: number;
  allowLateSubmission?: boolean;
}

export interface QtiAssessmentTest {
  identifier: string;
  title: string;
  toolName?: string;
  toolVersion?: string;
  outcomeDeclarations?: QtiOutcomeDeclaration[];
  timeLimits?: QtiTimeLimits;
  testParts: QtiTestPart[];
  outcomeProcessing?: Record<string, unknown>;
  testFeedback?: QtiModalFeedback[];
}

export interface QtiMetadata {
  version: QtiVersion;
  schema?: string;
  schemaLocation?: string;
}

export interface ParsedQtiItem {
  metadata: QtiMetadata;
  item: QtiAssessmentItem;
  errors: string[];
  warnings: string[];
}

export interface ParsedQtiTest {
  metadata: QtiMetadata;
  test: QtiAssessmentTest;
  items: Map<string, QtiAssessmentItem>;
  errors: string[];
  warnings: string[];
}

export interface ParsedQtiPackage {
  metadata: QtiMetadata;
  manifest: QtiManifest;
  items: Map<string, QtiAssessmentItem>;
  tests: Map<string, QtiAssessmentTest>;
  resources: Map<string, ArrayBuffer>;
  errors: string[];
  warnings: string[];
}

export interface QtiManifest {
  identifier: string;
  resources: QtiPackageResource[];
}

export interface QtiPackageResource {
  identifier: string;
  type:
    | 'imsqti_item_xmlv2p1'
    | 'imsqti_test_xmlv2p1'
    | 'imsqti_item_xmlv3p0'
    | 'webcontent'
    | string;
  href: string;
  files: string[];
  dependencies: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// QTI PARSER
// ══════════════════════════════════════════════════════════════════════════════

export class QtiParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      removeNSPrefix: true,
      preserveOrder: false,
      trimValues: true,
    });
  }

  /**
   * Parse a single QTI assessment item from XML string
   */
  parseItem(xmlString: string): ParsedQtiItem {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = this.xmlParser.parse(xmlString);
      const itemNode = parsed.assessmentItem;

      if (!itemNode) {
        throw new Error('Invalid QTI item: assessmentItem element not found');
      }

      const metadata = this.detectItemVersion(parsed);
      const item = this.parseAssessmentItem(itemNode, metadata.version);

      return { metadata, item, errors, warnings };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Parse a QTI assessment test from XML string
   */
  parseTest(xmlString: string): ParsedQtiTest {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items = new Map<string, QtiAssessmentItem>();

    try {
      const parsed = this.xmlParser.parse(xmlString);
      const testNode = parsed.assessmentTest;

      if (!testNode) {
        throw new Error('Invalid QTI test: assessmentTest element not found');
      }

      const metadata = this.detectTestVersion(parsed);
      const test = this.parseAssessmentTest(testNode, metadata.version);

      return { metadata, test, items, errors, warnings };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Parse a complete QTI content package (zip file)
   */
  async parsePackage(zipBuffer: ArrayBuffer | Buffer | Readable): Promise<ParsedQtiPackage> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items = new Map<string, QtiAssessmentItem>();
    const tests = new Map<string, QtiAssessmentTest>();
    const resources = new Map<string, ArrayBuffer>();

    try {
      const zip = await JSZip.loadAsync(zipBuffer);

      // Find and parse manifest
      const manifestFile = zip.file('imsmanifest.xml');
      if (!manifestFile) {
        throw new Error('Invalid QTI package: imsmanifest.xml not found');
      }

      const manifestXml = await manifestFile.async('string');
      const manifestParsed = this.xmlParser.parse(manifestXml);
      const manifest = this.parseManifest(manifestParsed);

      // Detect version from manifest
      const metadata = this.detectPackageVersion(manifest);

      // Parse all items and tests
      for (const resource of manifest.resources) {
        try {
          const file = zip.file(resource.href);
          if (!file) {
            warnings.push(`Missing file: ${resource.href}`);
            continue;
          }

          const content = await file.async('string');

          if (resource.type.includes('item')) {
            const parsed = this.parseItem(content);
            items.set(resource.identifier, parsed.item);
            warnings.push(...parsed.warnings);
          } else if (resource.type.includes('test')) {
            const parsed = this.parseTest(content);
            tests.set(resource.identifier, parsed.test);
            warnings.push(...parsed.warnings);
          } else if (resource.type === 'webcontent') {
            const buffer = await file.async('arraybuffer');
            resources.set(resource.href, buffer);
          }
        } catch (err) {
          errors.push(
            `Error parsing ${resource.href}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      return {
        metadata,
        manifest,
        items,
        tests,
        resources,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VERSION DETECTION
  // ════════════════════════════════════════════════════════════════════════════

  private detectItemVersion(parsed: Record<string, unknown>): QtiMetadata {
    const item = parsed.assessmentItem as Record<string, unknown>;
    const xmlns = (item?.['@_xmlns'] as string) ?? '';
    const schemaLocation = (item?.['@_xsi:schemaLocation'] as string) ?? '';

    if (xmlns.includes('qti/3.0') || schemaLocation.includes('qti/3.0')) {
      return { version: 'QTI_3.0', schema: xmlns, schemaLocation };
    }
    if (xmlns.includes('2p2') || schemaLocation.includes('2p2')) {
      return { version: 'QTI_2.2', schema: xmlns, schemaLocation };
    }
    return { version: 'QTI_2.1', schema: xmlns, schemaLocation };
  }

  private detectTestVersion(parsed: Record<string, unknown>): QtiMetadata {
    const test = parsed.assessmentTest as Record<string, unknown>;
    const xmlns = (test?.['@_xmlns'] as string) ?? '';
    const schemaLocation = (test?.['@_xsi:schemaLocation'] as string) ?? '';

    if (xmlns.includes('qti/3.0') || schemaLocation.includes('qti/3.0')) {
      return { version: 'QTI_3.0', schema: xmlns, schemaLocation };
    }
    if (xmlns.includes('2p2') || schemaLocation.includes('2p2')) {
      return { version: 'QTI_2.2', schema: xmlns, schemaLocation };
    }
    return { version: 'QTI_2.1', schema: xmlns, schemaLocation };
  }

  private detectPackageVersion(manifest: QtiManifest): QtiMetadata {
    for (const resource of manifest.resources) {
      if (resource.type.includes('v3p0') || resource.type.includes('v3.0')) {
        return { version: 'QTI_3.0' };
      }
      if (resource.type.includes('v2p2') || resource.type.includes('v2.2')) {
        return { version: 'QTI_2.2' };
      }
    }
    return { version: 'QTI_2.1' };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MANIFEST PARSING
  // ════════════════════════════════════════════════════════════════════════════

  private parseManifest(parsed: Record<string, unknown>): QtiManifest {
    const manifest = parsed.manifest as Record<string, unknown>;
    const identifier = (manifest?.['@_identifier'] as string) ?? '';

    const resourcesNode = manifest?.resources as Record<string, unknown>;
    const resourceNodes = this.ensureArray(resourcesNode?.resource);

    const resources: QtiPackageResource[] = resourceNodes.map((res) => ({
      identifier: (res['@_identifier'] as string) ?? '',
      type: (res['@_type'] as string) ?? '',
      href: (res['@_href'] as string) ?? '',
      files: this.ensureArray(res.file)
        .map((f) => f['@_href'] as string)
        .filter(Boolean),
      dependencies: this.ensureArray(res.dependency)
        .map((d) => d['@_identifierref'] as string)
        .filter(Boolean),
    }));

    return { identifier, resources };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ITEM PARSING
  // ════════════════════════════════════════════════════════════════════════════

  private parseAssessmentItem(
    node: Record<string, unknown>,
    version: QtiVersion
  ): QtiAssessmentItem {
    const identifier = (node['@_identifier'] as string) ?? '';
    const title = (node['@_title'] as string) ?? identifier;
    const label = node['@_label'] as string;
    const language = node['@_xml:lang'] as string;
    const adaptive = node['@_adaptive'] === true || node['@_adaptive'] === 'true';
    const timeDependent = node['@_timeDependent'] === true || node['@_timeDependent'] === 'true';
    const toolName = node['@_toolName'] as string;
    const toolVersion = node['@_toolVersion'] as string;

    // Parse response declarations
    const responseDeclarations = this.ensureArray(node.responseDeclaration).map((rd) =>
      this.parseResponseDeclaration(rd)
    );

    // Parse outcome declarations
    const outcomeDeclarations = this.ensureArray(node.outcomeDeclaration).map((od) =>
      this.parseOutcomeDeclaration(od)
    );

    // Parse stylesheets
    const stylesheets = this.ensureArray(node.stylesheet)
      .map((ss) => ss['@_href'] as string)
      .filter(Boolean);

    // Parse item body
    const itemBodyNode = node.itemBody as Record<string, unknown>;
    const itemBody = this.parseItemBody(itemBodyNode, version);

    // Parse response processing
    const rpNode = node.responseProcessing as Record<string, unknown>;
    const responseProcessing = rpNode ? this.parseResponseProcessing(rpNode) : undefined;

    // Parse modal feedback
    const modalFeedback = this.ensureArray(node.modalFeedback).map((mf) =>
      this.parseModalFeedback(mf)
    );

    return {
      identifier,
      title,
      label,
      language,
      adaptive,
      timeDependent,
      toolName,
      toolVersion,
      responseDeclarations,
      outcomeDeclarations,
      stylesheets,
      itemBody,
      responseProcessing,
      modalFeedback,
      raw: node,
    };
  }

  private parseResponseDeclaration(node: Record<string, unknown>): QtiResponseDeclaration {
    const identifier = (node['@_identifier'] as string) ?? '';
    const cardinality = (node['@_cardinality'] ?? 'single') as QtiCardinality;
    const baseType = (node['@_baseType'] ?? 'identifier') as QtiBaseType;

    let defaultValue: string | string[] | undefined;
    const dvNode = node.defaultValue as Record<string, unknown>;
    if (dvNode) {
      const values = this.ensureArray(dvNode.value);
      defaultValue = values.length === 1 ? (values[0] as string) : values.map((v) => v as string);
    }

    let correctResponse: string | string[] | undefined;
    const crNode = node.correctResponse as Record<string, unknown>;
    if (crNode) {
      const values = this.ensureArray(crNode.value);
      correctResponse =
        values.length === 1 ? (values[0] as string) : values.map((v) => v as string);
    }

    let mapping: QtiMapping | undefined;
    const mapNode = node.mapping as Record<string, unknown>;
    if (mapNode) {
      mapping = {
        lowerBound: mapNode['@_lowerBound'] as number,
        upperBound: mapNode['@_upperBound'] as number,
        defaultValue: (mapNode['@_defaultValue'] as number) ?? 0,
        entries: this.ensureArray(mapNode.mapEntry).map((me) => ({
          mapKey: me['@_mapKey'] as string,
          mappedValue: me['@_mappedValue'] as number,
          caseSensitive: me['@_caseSensitive'] as boolean,
        })),
      };
    }

    return {
      identifier,
      cardinality,
      baseType,
      defaultValue,
      correctResponse,
      mapping,
    };
  }

  private parseOutcomeDeclaration(node: Record<string, unknown>): QtiOutcomeDeclaration {
    const identifier = (node['@_identifier'] as string) ?? '';
    const cardinality = (node['@_cardinality'] ?? 'single') as QtiCardinality;
    const baseType = (node['@_baseType'] ?? 'float') as QtiBaseType;
    const interpretation = node['@_interpretation'] as string;
    const normalMaximum = node['@_normalMaximum'] as number;
    const normalMinimum = node['@_normalMinimum'] as number;
    const masteryValue = node['@_masteryValue'] as number;

    let defaultValue: string | number | undefined;
    const dvNode = node.defaultValue as Record<string, unknown>;
    if (dvNode) {
      const value = (dvNode.value ?? dvNode['#text']) as string | number;
      defaultValue = value;
    }

    return {
      identifier,
      cardinality,
      baseType,
      defaultValue,
      interpretation,
      normalMaximum,
      normalMinimum,
      masteryValue,
    };
  }

  private parseItemBody(
    node: Record<string, unknown> | undefined,
    version: QtiVersion
  ): { content: string; interactions: QtiInteraction[] } {
    if (!node) {
      return { content: '', interactions: [] };
    }

    const interactions: QtiInteraction[] = [];

    // Find all interactions
    const interactionTypes: QtiInteractionType[] = [
      'choiceInteraction',
      'orderInteraction',
      'associateInteraction',
      'matchInteraction',
      'gapMatchInteraction',
      'inlineChoiceInteraction',
      'textEntryInteraction',
      'extendedTextInteraction',
      'hottextInteraction',
      'hotspotInteraction',
      'selectPointInteraction',
      'graphicOrderInteraction',
      'graphicAssociateInteraction',
      'graphicGapMatchInteraction',
      'positionObjectInteraction',
      'sliderInteraction',
      'mediaInteraction',
      'drawingInteraction',
      'uploadInteraction',
      'customInteraction',
      'endAttemptInteraction',
    ];

    for (const type of interactionTypes) {
      const interactionNodes = this.ensureArray(node[type]);
      for (const intNode of interactionNodes) {
        interactions.push(this.parseInteraction(type, intNode, version));
      }
    }

    // Serialize body content (simplified)
    const content = JSON.stringify(node);

    return { content, interactions };
  }

  private parseInteraction(
    type: QtiInteractionType,
    node: Record<string, unknown>,
    version: QtiVersion
  ): QtiInteraction {
    const responseIdentifier = (node['@_responseIdentifier'] as string) ?? '';
    const prompt = this.extractText(node.prompt);
    const shuffle = node['@_shuffle'] as boolean;
    const maxChoices = node['@_maxChoices'] as number;
    const minChoices = node['@_minChoices'] as number;
    const orientation = node['@_orientation'] as 'horizontal' | 'vertical';

    // Parse choices for choice-based interactions
    let choices: QtiChoice[] | undefined;
    if (['choiceInteraction', 'orderInteraction', 'inlineChoiceInteraction'].includes(type)) {
      const choiceNodeName = type === 'inlineChoiceInteraction' ? 'inlineChoice' : 'simpleChoice';
      choices = this.ensureArray(node[choiceNodeName]).map((c) => ({
        identifier: c['@_identifier'] as string,
        content: this.extractText(c),
        fixed: c['@_fixed'] as boolean,
        templateIdentifier: c['@_templateIdentifier'] as string,
        showHide: c['@_showHide'] as 'show' | 'hide',
      }));
    }

    // Text entry specific
    const expectedLength = node['@_expectedLength'] as number;

    // Extended text specific
    const expectedLines = node['@_expectedLines'] as number;
    const format = node['@_format'] as 'plain' | 'preFormatted' | 'xhtml';

    // Slider specific
    const lowerBound = node['@_lowerBound'] as number;
    const upperBound = node['@_upperBound'] as number;
    const step = node['@_step'] as number;
    const stepLabel = node['@_stepLabel'] as boolean;

    // Media object
    const objectNode = node.object as Record<string, unknown>;
    const object = objectNode
      ? {
          type: objectNode['@_type'] as string,
          data: objectNode['@_data'] as string,
          width: objectNode['@_width'] as number,
          height: objectNode['@_height'] as number,
        }
      : undefined;

    return {
      type,
      responseIdentifier,
      prompt,
      choices,
      shuffle,
      maxChoices,
      minChoices,
      orientation,
      expectedLength,
      expectedLines,
      format,
      lowerBound,
      upperBound,
      step,
      stepLabel,
      object,
      raw: node,
    };
  }

  private parseResponseProcessing(node: Record<string, unknown>): {
    template?: string;
    rules?: QtiResponseProcessingRule[];
  } {
    const template = node['@_template'] as string;

    const rules: QtiResponseProcessingRule[] = [];

    // Parse response conditions
    const conditions = this.ensureArray(node.responseCondition);
    for (const cond of conditions) {
      rules.push({ type: 'responseCondition', raw: cond });
    }

    // Parse set outcome value
    const setOutcomes = this.ensureArray(node.setOutcomeValue);
    for (const so of setOutcomes) {
      rules.push({ type: 'setOutcomeValue', raw: so });
    }

    return { template, rules: rules.length > 0 ? rules : undefined };
  }

  private parseModalFeedback(node: Record<string, unknown>): QtiModalFeedback {
    return {
      identifier: (node['@_identifier'] as string) ?? '',
      outcomeIdentifier: (node['@_outcomeIdentifier'] as string) ?? '',
      showHide: (node['@_showHide'] ?? 'show') as 'show' | 'hide',
      content: this.extractText(node),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEST PARSING
  // ════════════════════════════════════════════════════════════════════════════

  private parseAssessmentTest(
    node: Record<string, unknown>,
    version: QtiVersion
  ): QtiAssessmentTest {
    const identifier = (node['@_identifier'] as string) ?? '';
    const title = (node['@_title'] as string) ?? identifier;
    const toolName = node['@_toolName'] as string;
    const toolVersion = node['@_toolVersion'] as string;

    // Parse outcome declarations
    const outcomeDeclarations = this.ensureArray(node.outcomeDeclaration).map((od) =>
      this.parseOutcomeDeclaration(od)
    );

    // Parse time limits
    const tlNode = node.timeLimits as Record<string, unknown>;
    const timeLimits = tlNode
      ? {
          minTime: tlNode['@_minTime'] as number,
          maxTime: tlNode['@_maxTime'] as number,
          allowLateSubmission: tlNode['@_allowLateSubmission'] as boolean,
        }
      : undefined;

    // Parse test parts
    const testParts = this.ensureArray(node.testPart).map((tp) => this.parseTestPart(tp, version));

    // Outcome processing
    const outcomeProcessing = node.outcomeProcessing as Record<string, unknown>;

    return {
      identifier,
      title,
      toolName,
      toolVersion,
      outcomeDeclarations,
      timeLimits,
      testParts,
      outcomeProcessing,
    };
  }

  private parseTestPart(node: Record<string, unknown>, version: QtiVersion): QtiTestPart {
    const identifier = (node['@_identifier'] as string) ?? '';
    const navigationMode = (node['@_navigationMode'] ?? 'linear') as 'linear' | 'nonlinear';
    const submissionMode = (node['@_submissionMode'] ?? 'individual') as
      | 'individual'
      | 'simultaneous';

    // Parse sections
    const sections = this.ensureArray(node.assessmentSection).map((s) =>
      this.parseSection(s, version)
    );

    // Parse item session control
    const iscNode = node.itemSessionControl as Record<string, unknown>;
    const itemSessionControl = iscNode ? this.parseItemSessionControl(iscNode) : undefined;

    // Parse time limits
    const tlNode = node.timeLimits as Record<string, unknown>;
    const timeLimits = tlNode
      ? {
          minTime: tlNode['@_minTime'] as number,
          maxTime: tlNode['@_maxTime'] as number,
          allowLateSubmission: tlNode['@_allowLateSubmission'] as boolean,
        }
      : undefined;

    return {
      identifier,
      navigationMode,
      submissionMode,
      itemSessionControl,
      timeLimits,
      sections,
    };
  }

  private parseSection(node: Record<string, unknown>, version: QtiVersion): QtiSection {
    const identifier = (node['@_identifier'] as string) ?? '';
    const title = (node['@_title'] as string) ?? identifier;
    const visible = node['@_visible'] !== false;
    const keepTogether = node['@_keepTogether'] as boolean;
    const required = node['@_required'] as boolean;
    const fixed = node['@_fixed'] as boolean;

    // Parse item references
    const items = this.ensureArray(node.assessmentItemRef).map((ir) => this.parseItemRef(ir));

    // Parse nested sections
    const sections = this.ensureArray(node.assessmentSection).map((s) =>
      this.parseSection(s, version)
    );

    // Parse selection
    const selNode = node.selection as Record<string, unknown>;
    const selection = selNode
      ? {
          select: selNode['@_select'] as number,
          withReplacement: selNode['@_withReplacement'] as boolean,
        }
      : undefined;

    // Parse ordering
    const ordNode = node.ordering as Record<string, unknown>;
    const ordering = ordNode
      ? {
          shuffle: ordNode['@_shuffle'] === true,
        }
      : undefined;

    // Parse item session control
    const iscNode = node.itemSessionControl as Record<string, unknown>;
    const itemSessionControl = iscNode ? this.parseItemSessionControl(iscNode) : undefined;

    // Parse time limits
    const tlNode = node.timeLimits as Record<string, unknown>;
    const timeLimits = tlNode
      ? {
          minTime: tlNode['@_minTime'] as number,
          maxTime: tlNode['@_maxTime'] as number,
          allowLateSubmission: tlNode['@_allowLateSubmission'] as boolean,
        }
      : undefined;

    return {
      identifier,
      title,
      visible,
      keepTogether,
      required,
      fixed,
      selection,
      ordering,
      itemSessionControl,
      timeLimits,
      items,
      sections: sections.length > 0 ? sections : undefined,
    };
  }

  private parseItemRef(node: Record<string, unknown>): QtiItemRef {
    return {
      identifier: (node['@_identifier'] as string) ?? '',
      href: (node['@_href'] as string) ?? '',
      required: node['@_required'] as boolean,
      fixed: node['@_fixed'] as boolean,
      categories: this.ensureArray(node['@_category']).map((c) => c as string),
    };
  }

  private parseItemSessionControl(node: Record<string, unknown>): QtiItemSessionControl {
    return {
      maxAttempts: node['@_maxAttempts'] as number,
      showFeedback: node['@_showFeedback'] as boolean,
      allowReview: node['@_allowReview'] as boolean,
      showSolution: node['@_showSolution'] as boolean,
      allowComment: node['@_allowComment'] as boolean,
      allowSkipping: node['@_allowSkipping'] as boolean,
      validateResponses: node['@_validateResponses'] as boolean,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════════════════════════════════════

  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private extractText(node: unknown): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;
      if (obj['#text']) return obj['#text'] as string;
      // For complex nodes, try to extract text content
      const values = Object.values(obj).filter((v) => typeof v === 'string');
      if (values.length > 0) return values.join(' ');
    }
    return '';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const qtiParser = new QtiParser();

export function parseQtiItem(xmlString: string): ParsedQtiItem {
  return qtiParser.parseItem(xmlString);
}

export function parseQtiTest(xmlString: string): ParsedQtiTest {
  return qtiParser.parseTest(xmlString);
}

export async function parseQtiPackage(
  zipBuffer: ArrayBuffer | Buffer | Readable
): Promise<ParsedQtiPackage> {
  return qtiParser.parsePackage(zipBuffer);
}
