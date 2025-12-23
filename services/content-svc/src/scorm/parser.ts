/**
 * SCORM Parser Service
 *
 * Parses SCORM 1.2 and SCORM 2004 packages, extracting:
 * - Manifest metadata (imsmanifest.xml)
 * - Organization structure (SCO hierarchy)
 * - Resource references
 * - Sequencing rules (SCORM 2004)
 *
 * @see https://scorm.com/scorm-explained/technical-scorm/scorm-12-overview-for-developers/
 * @see https://scorm.com/scorm-explained/technical-scorm/scorm-2004-overview-for-developers/
 */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition */

import type { Readable } from 'stream';

import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ScormVersion = 'SCORM_1.2' | 'SCORM_2004_2ND' | 'SCORM_2004_3RD' | 'SCORM_2004_4TH';

export interface ScormMetadata {
  version: ScormVersion;
  identifier: string;
  title: string;
  description?: string;
  language?: string;
  duration?: string;
  keywords?: string[];
  copyright?: string;
  authors?: string[];
}

export interface ScormResource {
  identifier: string;
  type: string;
  href?: string;
  scormType?: 'sco' | 'asset';
  files: string[];
  dependencies: string[];
}

export interface ScormItem {
  identifier: string;
  title: string;
  identifierRef?: string;
  isVisible: boolean;
  parameters?: string;
  masterScore?: number;
  children: ScormItem[];
  // SCORM 2004 sequencing
  prerequisites?: string;
  completionThreshold?: number;
  attemptLimit?: number;
  timeLimitAction?: string;
}

export interface ScormOrganization {
  identifier: string;
  title: string;
  items: ScormItem[];
  objectivesGlobalToSystem?: boolean;
  sharedDataGlobalToSystem?: boolean;
}

export interface ScormSequencing {
  controlMode?: {
    choice: boolean;
    choiceExit: boolean;
    flow: boolean;
    forwardOnly: boolean;
  };
  deliveryControls?: {
    tracked: boolean;
    completionSetByContent: boolean;
    objectiveSetByContent: boolean;
  };
  constrainedChoiceConsiderations?: {
    preventActivation: boolean;
    constrainChoice: boolean;
  };
}

export interface ScormManifest {
  metadata: ScormMetadata;
  defaultOrganization: string;
  organizations: ScormOrganization[];
  resources: ScormResource[];
  sequencing?: ScormSequencing;
  raw?: Record<string, unknown>;
}

export interface ParsedScormPackage {
  manifest: ScormManifest;
  files: Map<string, ArrayBuffer>;
  launchUrl: string;
  errors: string[];
  warnings: string[];
}

export interface ScormParseOptions {
  includeRawManifest?: boolean;
  validateFiles?: boolean;
  extractFiles?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORM PARSER
// ══════════════════════════════════════════════════════════════════════════════

export class ScormParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      removeNSPrefix: true,
    });
  }

  /**
   * Parse a SCORM package from a zip file buffer
   */
  async parsePackage(
    zipBuffer: ArrayBuffer | Buffer | Readable,
    options: ScormParseOptions = {}
  ): Promise<ParsedScormPackage> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const files = new Map<string, ArrayBuffer>();

    try {
      // Load the zip file
      const zip = await JSZip.loadAsync(zipBuffer);

      // Find and parse imsmanifest.xml
      const manifestFile = zip.file('imsmanifest.xml');
      if (!manifestFile) {
        throw new Error('Invalid SCORM package: imsmanifest.xml not found');
      }

      const manifestXml = await manifestFile.async('string');
      const manifestObj = this.xmlParser.parse(manifestXml);

      // Detect SCORM version
      const version = this.detectVersion(manifestObj);

      // Parse the manifest
      const manifest = this.parseManifest(manifestObj, version, options);

      // Extract files if requested
      if (options.extractFiles) {
        for (const [path, file] of Object.entries(zip.files)) {
          if (!file.dir) {
            const content = await file.async('arraybuffer');
            files.set(path, content);
          }
        }
      }

      // Validate file references
      if (options.validateFiles) {
        for (const resource of manifest.resources) {
          for (const filePath of resource.files) {
            if (!zip.file(filePath)) {
              warnings.push(
                `Missing file: ${filePath} (referenced by resource ${resource.identifier})`
              );
            }
          }
        }
      }

      // Determine launch URL
      const launchUrl = this.determineLaunchUrl(manifest);

      return {
        manifest,
        files,
        launchUrl,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Detect SCORM version from manifest
   */
  private detectVersion(manifestObj: Record<string, unknown>): ScormVersion {
    const manifest = manifestObj.manifest as Record<string, unknown>;
    if (!manifest) {
      throw new Error('Invalid manifest structure');
    }

    const metadata = manifest.metadata as Record<string, unknown>;
    const schemaVersion = metadata?.schemaversion as string;

    if (schemaVersion) {
      if (schemaVersion.includes('1.2')) return 'SCORM_1.2';
      if (schemaVersion.includes('2004 4th')) return 'SCORM_2004_4TH';
      if (schemaVersion.includes('2004 3rd') || schemaVersion === 'CAM 1.3')
        return 'SCORM_2004_3RD';
      if (schemaVersion.includes('2004 2nd')) return 'SCORM_2004_2ND';
    }

    // Check xmlns for version hints
    const xmlns = manifest['@_xmlns:adlcp'] as string;
    if (xmlns) {
      if (xmlns.includes('2004')) return 'SCORM_2004_3RD';
      if (xmlns.includes('1p2') || xmlns.includes('1.2')) return 'SCORM_1.2';
    }

    // Default to SCORM 1.2
    return 'SCORM_1.2';
  }

  /**
   * Parse manifest into structured format
   */
  private parseManifest(
    manifestObj: Record<string, unknown>,
    version: ScormVersion,
    options: ScormParseOptions
  ): ScormManifest {
    const manifest = manifestObj.manifest as Record<string, unknown>;

    // Parse metadata
    const metadata = this.parseMetadata(manifest, version);

    // Parse organizations
    const orgsNode = manifest.organizations as Record<string, unknown>;
    const defaultOrg = (orgsNode?.['@_default'] as string) ?? '';
    const organizations = this.parseOrganizations(orgsNode, version);

    // Parse resources
    const resourcesNode = manifest.resources as Record<string, unknown>;
    const resources = this.parseResources(resourcesNode);

    // Parse sequencing (SCORM 2004 only)
    let sequencing: ScormSequencing | undefined;
    if (version.startsWith('SCORM_2004')) {
      sequencing = this.parseSequencing(orgsNode);
    }

    return {
      metadata,
      defaultOrganization: defaultOrg,
      organizations,
      resources,
      sequencing,
      raw: options.includeRawManifest ? manifest : undefined,
    };
  }

  /**
   * Parse metadata section
   */
  private parseMetadata(manifest: Record<string, unknown>, version: ScormVersion): ScormMetadata {
    const metaNode = manifest.metadata as Record<string, unknown>;
    const identifier = (manifest['@_identifier'] as string) ?? 'unknown';

    let title = identifier;
    let description: string | undefined;
    let language: string | undefined;
    let duration: string | undefined;
    let keywords: string[] | undefined;
    let copyright: string | undefined;
    let authors: string[] | undefined;

    // Try to get LOM metadata
    const lom = metaNode?.lom as Record<string, unknown>;
    if (lom) {
      const general = lom.general as Record<string, unknown>;
      if (general) {
        title = this.extractLangString(general.title) ?? title;
        description = this.extractLangString(general.description);
        language = general.language as string;
        const keywordNodes = general.keyword;
        if (keywordNodes) {
          keywords = this.extractKeywords(keywordNodes);
        }
      }

      const lifecycle = lom.lifecycle as Record<string, unknown>;
      if (lifecycle) {
        const contributeNodes = lifecycle.contribute;
        authors = this.extractContributors(contributeNodes, 'author');
      }

      const rights = lom.rights as Record<string, unknown>;
      if (rights) {
        copyright = this.extractLangString(rights.description);
      }

      const technical = lom.technical as Record<string, unknown>;
      if (technical) {
        duration = technical.duration as string;
      }
    }

    return {
      version,
      identifier,
      title,
      description,
      language,
      duration,
      keywords,
      copyright,
      authors,
    };
  }

  /**
   * Parse organizations section
   */
  private parseOrganizations(
    orgsNode: Record<string, unknown> | undefined,
    version: ScormVersion
  ): ScormOrganization[] {
    if (!orgsNode) return [];

    const orgNodes = this.ensureArray(orgsNode.organization);
    return orgNodes.map((org) => this.parseOrganization(org, version));
  }

  /**
   * Parse a single organization
   */
  private parseOrganization(
    org: Record<string, unknown>,
    version: ScormVersion
  ): ScormOrganization {
    const identifier = (org['@_identifier'] as string) ?? '';
    const title = (org.title as string) ?? identifier;
    const items = this.parseItems(org.item, version);

    // SCORM 2004 specific
    const objectivesGlobalToSystem = org['@_objectivesGlobalToSystem'] as boolean;
    const sharedDataGlobalToSystem = org['@_sharedDataGlobalToSystem'] as boolean;

    return {
      identifier,
      title,
      items,
      objectivesGlobalToSystem,
      sharedDataGlobalToSystem,
    };
  }

  /**
   * Parse items recursively
   */
  private parseItems(itemsNode: unknown, version: ScormVersion): ScormItem[] {
    if (!itemsNode) return [];

    const items = this.ensureArray(itemsNode as Record<string, unknown>[]);
    return items.map((item) => this.parseItem(item, version));
  }

  /**
   * Parse a single item
   */
  private parseItem(item: Record<string, unknown>, version: ScormVersion): ScormItem {
    const identifier = (item['@_identifier'] as string) ?? '';
    const title = (item.title as string) ?? identifier;
    const identifierRef = item['@_identifierref'] as string;
    const isVisible = item['@_isvisible'] !== false;
    const parameters = item['@_parameters'] as string;

    // SCORM 1.2 mastery score
    const masterScore = item.masteryscore as number;

    // SCORM 2004 specific
    const prerequisites = item.prerequisites as string;
    const completionThreshold = item['@_completionThreshold'] as number;
    const attemptLimit = item['@_attemptAbsoluteDurationLimit'] as number;
    const timeLimitAction = item['@_timeLimitAction'] as string;

    // Parse child items recursively
    const children = this.parseItems(item.item, version);

    return {
      identifier,
      title,
      identifierRef,
      isVisible,
      parameters,
      masterScore,
      children,
      prerequisites,
      completionThreshold,
      attemptLimit,
      timeLimitAction,
    };
  }

  /**
   * Parse resources section
   */
  private parseResources(resourcesNode: Record<string, unknown> | undefined): ScormResource[] {
    if (!resourcesNode) return [];

    const resNodes = this.ensureArray(resourcesNode.resource);
    return resNodes.map((res) => this.parseResource(res));
  }

  /**
   * Parse a single resource
   */
  private parseResource(res: Record<string, unknown>): ScormResource {
    const identifier = (res['@_identifier'] as string) ?? '';
    const type = (res['@_type'] as string) ?? 'webcontent';
    const href = res['@_href'] as string;
    const scormType = (res['@_adlcp:scormType'] ??
      res['@_scormType'] ??
      res['@_adlcp:scormtype']) as 'sco' | 'asset';

    // Parse file references
    const fileNodes = this.ensureArray(res.file);
    const files = fileNodes.map((f) => f['@_href'] as string).filter(Boolean);
    if (href && !files.includes(href)) {
      files.unshift(href);
    }

    // Parse dependencies
    const depNodes = this.ensureArray(res.dependency);
    const dependencies = depNodes.map((d) => d['@_identifierref'] as string).filter(Boolean);

    return {
      identifier,
      type,
      href,
      scormType,
      files,
      dependencies,
    };
  }

  /**
   * Parse SCORM 2004 sequencing rules
   */
  private parseSequencing(orgsNode: Record<string, unknown>): ScormSequencing | undefined {
    const seq = orgsNode.sequencing as Record<string, unknown>;
    if (!seq) return undefined;

    const controlMode = seq.controlMode as Record<string, unknown>;
    const deliveryControls = seq.deliveryControls as Record<string, unknown>;
    const constrainedChoice = seq.constrainedChoiceConsiderations as Record<string, unknown>;

    return {
      controlMode: controlMode
        ? {
            choice: controlMode['@_choice'] !== false,
            choiceExit: controlMode['@_choiceExit'] !== false,
            flow: controlMode['@_flow'] === true,
            forwardOnly: controlMode['@_forwardOnly'] === true,
          }
        : undefined,
      deliveryControls: deliveryControls
        ? {
            tracked: deliveryControls['@_tracked'] !== false,
            completionSetByContent: deliveryControls['@_completionSetByContent'] === true,
            objectiveSetByContent: deliveryControls['@_objectiveSetByContent'] === true,
          }
        : undefined,
      constrainedChoiceConsiderations: constrainedChoice
        ? {
            preventActivation: constrainedChoice['@_preventActivation'] === true,
            constrainChoice: constrainedChoice['@_constrainChoice'] === true,
          }
        : undefined,
    };
  }

  /**
   * Determine the launch URL for the package
   */
  private determineLaunchUrl(manifest: ScormManifest): string {
    // Find the default organization
    const defaultOrg =
      manifest.organizations.find((o) => o.identifier === manifest.defaultOrganization) ??
      manifest.organizations[0];

    if (!defaultOrg || defaultOrg.items.length === 0) {
      // Fall back to first SCO resource
      const sco = manifest.resources.find((r) => r.scormType === 'sco');
      return sco?.href ?? manifest.resources[0]?.href ?? '';
    }

    // Find first launchable item
    const firstItem = this.findFirstLaunchableItem(defaultOrg.items);
    if (!firstItem?.identifierRef) {
      return manifest.resources[0]?.href ?? '';
    }

    // Find associated resource
    const resource = manifest.resources.find((r) => r.identifier === firstItem.identifierRef);
    const baseUrl = resource?.href ?? '';
    const params = firstItem.parameters ?? '';

    return params ? `${baseUrl}?${params}` : baseUrl;
  }

  /**
   * Find first launchable item in tree
   */
  private findFirstLaunchableItem(items: ScormItem[]): ScormItem | undefined {
    for (const item of items) {
      if (item.identifierRef && item.isVisible) {
        return item;
      }
      if (item.children.length > 0) {
        const found = this.findFirstLaunchableItem(item.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private extractLangString(node: unknown): string | undefined {
    if (!node) return undefined;
    if (typeof node === 'string') return node;
    if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;
      const langstring = obj.langstring ?? obj.string;
      if (langstring) {
        if (Array.isArray(langstring)) {
          const first = langstring[0];
          return typeof first === 'string'
            ? first
            : ((first as Record<string, unknown>)?.['#text'] as string);
        }
        return typeof langstring === 'string'
          ? langstring
          : ((langstring as Record<string, unknown>)?.['#text'] as string);
      }
      return obj['#text'] as string;
    }
    return undefined;
  }

  private extractKeywords(node: unknown): string[] {
    if (!node) return [];
    const nodes = this.ensureArray(node as Record<string, unknown>[]);
    return nodes.map((n) => this.extractLangString(n)).filter((k): k is string => !!k);
  }

  private extractContributors(node: unknown, role: string): string[] {
    if (!node) return [];
    const nodes = this.ensureArray(node as Record<string, unknown>[]);
    return nodes
      .filter((n) => {
        const roleNode = n.role as Record<string, unknown>;
        const roleValue = this.extractLangString(roleNode?.value);
        return roleValue?.toLowerCase() === role.toLowerCase();
      })
      .flatMap((n) => {
        const entity = n.entity;
        if (!entity) return [];
        const entities = this.ensureArray(entity as string[]);
        return entities.map((e) => this.parseVCard(e));
      })
      .filter((name): name is string => !!name);
  }

  private parseVCard(vcard: unknown): string | undefined {
    if (typeof vcard !== 'string') return undefined;
    // Simple vCard name extraction
    const fnMatch = /FN:(.+)/i.exec(vcard);
    if (fnMatch) return fnMatch[1].trim();
    const nMatch = /N:([^;]+)/i.exec(vcard);
    if (nMatch) return nMatch[1].trim();
    return undefined;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const scormParser = new ScormParser();

export async function parseScormPackage(
  zipBuffer: ArrayBuffer | Buffer | Readable,
  options?: ScormParseOptions
): Promise<ParsedScormPackage> {
  return scormParser.parsePackage(zipBuffer, options);
}
