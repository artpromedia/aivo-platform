/**
 * Common Cartridge Importer
 *
 * Imports IMS Common Cartridge packages (v1.0, v1.1, v1.2, v1.3):
 * - Course structure and modules
 * - Web content and files
 * - Discussion topics
 * - Assessments (QTI wrapped)
 * - Web links
 * - LTI tool links
 * - Learning outcomes
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as xml2js from 'xml2js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentPackage,
  ImportResult,
  ImportOptions,
  ImportedItem,
} from '../import.types';

/**
 * Resource types in Common Cartridge
 */
type CCResourceType =
  | 'webcontent'
  | 'weblink'
  | 'discussion'
  | 'assessment'
  | 'associatedcontent'
  | 'lti_link'
  | 'assignment'
  | 'learning_outcome';

/**
 * Parsed CC manifest
 */
interface ParsedCCManifest {
  identifier: string;
  title: string;
  description?: string;
  version: string;
  resources: CCResource[];
  organizations: unknown[];
}

/**
 * Parsed CC resource
 */
interface CCResource {
  identifier: string;
  type: CCResourceType;
  href?: string;
  files: string[];
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Parsed CC item
 */
interface CCItem {
  identifier: string;
  title: string;
  resource?: CCResource;
  children: CCItem[];
}

/**
 * Common context for processing CC items
 */
interface CCProcessingContext {
  courseId: string;
  tenantId: string;
  userId: string;
  tempDir: string;
  warnings: string[];
}

/**
 * Options for processing organization items
 */
interface ProcessOrganizationItemOptions extends CCProcessingContext {
  item: CCItem;
  parentModuleId: string | null;
  position: number;
  resourceMap: Map<string, CCResource>;
}

/**
 * Options for processing resources
 */
interface ProcessResourceOptions extends CCProcessingContext {
  resource: CCResource;
  title: string;
  moduleId: string | null;
  position: number;
}

/**
 * Options for creating content items
 */
interface CreateItemOptions {
  resource: CCResource;
  title: string;
  courseId: string;
  moduleId: string | null;
  position: number;
  tenantId: string;
  userId: string;
  tempDir: string;
}

@Injectable()
export class CommonCartridgeImporter {
  private readonly logger = new Logger(CommonCartridgeImporter.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: this.config.get<string>('AWS_REGION') ?? 'us-east-1',
    });
    this.bucket = this.config.get<string>('S3_CONTENT_BUCKET') ?? 'aivo-content';
  }

  /**
   * Import Common Cartridge package
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
      // Parse manifest
      const manifestPath = path.join(packageData.tempDir, 'imsmanifest.xml');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifestXml = await this.parseXML(manifestContent);
      const manifest = this.parseManifest(manifestXml);

      // Detect version
      const version = this.detectVersion(manifestXml);
      this.logger.log(`Common Cartridge version detected: ${version}`);

      // Get teacher profile
      const profile = await this.prisma.profile.findFirst({
        where: { userId, tenantId, role: 'teacher' },
      });

      if (!profile) {
        throw new Error('Teacher profile not found');
      }

      // Create course structure
      const course = await this.createCourse(
        manifest,
        tenantId,
        userId,
        options
      );

      items.push({
        externalId: manifest.identifier,
        type: 'course',
        title: manifest.title,
        description: manifest.description ?? null,
        sourceFormat: `cc_${version}`,
        data: { courseId: course.id },
        mappedTo: course.id,
      });

      // Process resources
      const resources = this.parseResources(manifestXml);
      const resourceMap = new Map<string, CCResource>();
      resources.forEach((r) => resourceMap.set(r.identifier, r));

      // Process organization structure
      const organization = this.parseOrganization(manifestXml, resourceMap);

      // Upload web content files
      const totalItems =
        organization.length + resources.filter((r) => r.type === 'webcontent').length;
      let processed = 0;

      for (const resource of resources) {
        if (resource.type === 'webcontent') {
          await this.uploadResourceFiles(
            resource,
            packageData.tempDir,
            tenantId,
            course.id
          );
          processed++;
          onProgress?.(processed / totalItems);
        }
      }

      // Process each top-level item
      let position = 0;
      for (const item of organization) {
        const moduleResult = await this.processOrganizationItem({
          item,
          courseId: course.id,
          parentModuleId: null,
          position: position++,
          tenantId,
          userId,
          tempDir: packageData.tempDir,
          resourceMap,
          warnings,
        });

        if (moduleResult) {
          items.push(...moduleResult);
        }

        processed++;
        onProgress?.(processed / totalItems);
      }

      return { items, warnings };
    } catch (error) {
      this.logger.error('Common Cartridge import failed', error);
      throw error;
    }
  }

  /**
   * Detect CC version
   */
  private detectVersion(manifestXml: Record<string, unknown>): string {
    const manifest = manifestXml['manifest'] as Record<string, unknown>;
    const attrs = (manifest?.['$'] as Record<string, unknown>) ?? {};
    const namespaces = Object.entries(attrs).filter(([k]) =>
      k.startsWith('xmlns')
    );

    for (const [, ns] of namespaces) {
      if (typeof ns === 'string') {
        if (ns.includes('1.3')) return '1.3';
        if (ns.includes('1.2')) return '1.2';
        if (ns.includes('1.1')) return '1.1';
        if (ns.includes('1.0')) return '1.0';
      }
    }

    return '1.1'; // Default
  }

  /**
   * Parse manifest metadata
   */
  private parseManifest(manifestXml: Record<string, unknown>): ParsedCCManifest {
    const manifest = manifestXml['manifest'] as Record<string, unknown>;
    const attrs = (manifest?.['$'] as Record<string, unknown>) ?? {};

    // Extract metadata
    const metadata = (manifest?.['metadata'] as unknown[])?.[0] as Record<string, unknown>;
    const lom =
      (metadata?.['lom'] as unknown[])?.[0] as Record<string, unknown> ??
      (metadata?.['lom:lom'] as unknown[])?.[0] as Record<string, unknown>;

    const general =
      (lom?.['general'] as unknown[])?.[0] as Record<string, unknown> ??
      (lom?.['lom:general'] as unknown[])?.[0] as Record<string, unknown>;

    const title = this.extractLOMString(general, 'title');
    const descriptionRaw = this.extractLOMString(general, 'description');

    const result: ParsedCCManifest = {
      identifier: (attrs['identifier'] as string) ?? uuidv4(),
      title: title ?? 'Untitled Course',
      version: this.detectVersion(manifestXml),
      resources: [],
      organizations: [],
    };

    if (descriptionRaw !== null) {
      result.description = descriptionRaw;
    }

    return result;
  }

  /**
   * Parse resources section
   */
  private parseResources(manifestXml: Record<string, unknown>): CCResource[] {
    const manifest = manifestXml['manifest'] as Record<string, unknown>;
    const resourcesNode = (manifest?.['resources'] as unknown[])?.[0] as Record<
      string,
      unknown
    >;
    const resources =
      (resourcesNode?.['resource'] as unknown[]) ??
      [];

    return resources.map((res: unknown) => {
      const resource = res as Record<string, unknown>;
      const attrs = resource['$'] as Record<string, unknown>;

      // Parse files
      const filesNode = (resource['file'] as unknown[]) ?? [];
      const files = filesNode.map((f: unknown) => {
        const file = f as Record<string, unknown>;
        const fileAttrs = file['$'] as Record<string, unknown>;
        return fileAttrs?.['href'] as string;
      });

      // Parse dependencies
      const depsNode = (resource['dependency'] as unknown[]) ?? [];
      const dependencies = depsNode.map((d: unknown) => {
        const dep = d as Record<string, unknown>;
        const depAttrs = dep['$'] as Record<string, unknown>;
        return depAttrs?.['identifierref'] as string;
      });

      return {
        identifier: attrs?.['identifier'] as string,
        type: this.parseResourceType(attrs?.['type'] as string),
        href: attrs?.['href'] as string,
        files: files.filter(Boolean),
        dependencies: dependencies.filter(Boolean),
      };
    });
  }

  /**
   * Parse resource type string
   */
  private parseResourceType(typeString: string): CCResourceType {
    if (!typeString) return 'webcontent';

    const type = typeString.toLowerCase();

    if (type.includes('webcontent')) return 'webcontent';
    if (type.includes('weblink')) return 'weblink';
    if (type.includes('discussion') || type.includes('topic')) return 'discussion';
    if (type.includes('assessment') || type.includes('qti')) return 'assessment';
    if (type.includes('associated')) return 'associatedcontent';
    if (type.includes('lti') || type.includes('basiclti')) return 'lti_link';
    if (type.includes('assignment')) return 'assignment';
    if (type.includes('outcome')) return 'learning_outcome';

    return 'webcontent';
  }

  /**
   * Parse organization structure
   */
  private parseOrganization(
    manifestXml: Record<string, unknown>,
    resourceMap: Map<string, CCResource>
  ): CCItem[] {
    const manifest = manifestXml['manifest'] as Record<string, unknown>;
    const organizations = (manifest?.['organizations'] as unknown[])?.[0] as Record<
      string,
      unknown
    >;
    const organization = (organizations?.['organization'] as unknown[])?.[0] as Record<
      string,
      unknown
    >;

    if (!organization) return [];

    const items = (organization['item'] as unknown[]) ?? [];
    return items.map((item: unknown) => this.parseItem(item, resourceMap));
  }

  /**
   * Parse organization item
   */
  private parseItem(
    item: unknown,
    resourceMap: Map<string, CCResource>
  ): CCItem {
    const itemRecord = item as Record<string, unknown>;
    const attrs = itemRecord['$'] as Record<string, unknown>;

    const title =
      ((itemRecord['title'] as unknown[])?.[0] as string) ?? 'Untitled';
    const identifierref = attrs?.['identifierref'] as string;

    const children = (itemRecord['item'] as unknown[]) ?? [];
    const resource = identifierref ? resourceMap.get(identifierref) : undefined;

    const result: CCItem = {
      identifier: attrs?.['identifier'] as string,
      title,
      children: children.map((child: unknown) =>
        this.parseItem(child, resourceMap)
      ),
    };

    if (resource) {
      result.resource = resource;
    }

    return result;
  }

  /**
   * Create course from manifest
   */
  private async createCourse(
    manifest: ParsedCCManifest,
    tenantId: string,
    userId: string,
    _options: ImportOptions
  ): Promise<{ id: string }> {
    const course = await this.prisma.course.create({
      data: {
        id: uuidv4(),
        tenantId,
        createdBy: userId,
        title: manifest.title,
        description: manifest.description,
        status: 'draft',
        externalId: manifest.identifier,
        sourceFormat: 'common_cartridge',
        sourceData: manifest as unknown as Record<string, unknown>,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return course;
  }

  /**
   * Upload resource files to S3
   */
  private async uploadResourceFiles(
    resource: CCResource,
    tempDir: string,
    tenantId: string,
    courseId: string
  ): Promise<void> {
    for (const filePath of resource.files) {
      try {
        const fullPath = path.join(tempDir, filePath);
        const content = await fs.readFile(fullPath);
        const s3Key = `content/${tenantId}/${courseId}/resources/${resource.identifier}/${path.basename(filePath)}`;

        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3Key,
            Body: content,
            ContentType: this.getContentType(filePath),
          })
        );
      } catch (error) {
        this.logger.warn(`Failed to upload resource file: ${filePath}`, error);
      }
    }
  }

  /**
   * Process organization item recursively
   */
  private async processOrganizationItem(
    opts: ProcessOrganizationItemOptions
  ): Promise<ImportedItem[]> {
    const { item, courseId, parentModuleId, position, tenantId, userId, tempDir, resourceMap, warnings } = opts;
    const items: ImportedItem[] = [];

    // If item has children, it's a module/folder
    if (item.children.length > 0) {
      const module = await this.prisma.courseModule.create({
        data: {
          id: uuidv4(),
          courseId,
          parentId: parentModuleId,
          title: item.title,
          position,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      items.push({
        externalId: item.identifier,
        type: 'module',
        title: item.title,
        description: null,
        sourceFormat: 'common_cartridge',
        data: { moduleId: module.id },
        mappedTo: module.id,
      });

      // Process children
      let childPosition = 0;
      for (const child of item.children) {
        const childItems = await this.processOrganizationItem({
          item: child,
          courseId,
          parentModuleId: module.id,
          position: childPosition++,
          tenantId,
          userId,
          tempDir,
          resourceMap,
          warnings,
        });
        items.push(...childItems);
      }
    }

    // Process resource if present
    if (item.resource) {
      const resourceItems = await this.processResource({
        resource: item.resource,
        title: item.title,
        courseId,
        moduleId: parentModuleId,
        position,
        tenantId,
        userId,
        tempDir,
        warnings,
      });
      items.push(...resourceItems);
    }

    return items;
  }

  /**
   * Process a resource based on type
   */
  private async processResource(
    opts: ProcessResourceOptions
  ): Promise<ImportedItem[]> {
    const { resource, title, courseId, moduleId, position, tenantId, userId, tempDir, warnings } = opts;
    const createOpts: CreateItemOptions = { resource, title, courseId, moduleId, position, tenantId, userId, tempDir };
    const items: ImportedItem[] = [];

    try {
      switch (resource.type) {
        case 'webcontent': {
          const pageResult = await this.createWebContentItem(createOpts);
          if (pageResult) {
            items.push(pageResult);
          }
          break;
        }

        case 'weblink': {
          const linkResult = await this.createWeblinkItem(createOpts);
          if (linkResult) {
            items.push(linkResult);
          }
          break;
        }

        case 'discussion': {
          const discussionResult = await this.createDiscussionItem(createOpts);
          if (discussionResult) {
            items.push(discussionResult);
          }
          break;
        }

        case 'assessment': {
          const assessmentResult = await this.createAssessmentItem(createOpts);
          if (assessmentResult) {
            items.push(assessmentResult);
          }
          break;
        }

        case 'lti_link': {
          const ltiResult = await this.createLTILinkItem(createOpts);
          if (ltiResult) {
            items.push(ltiResult);
          }
          break;
        }

        case 'assignment': {
          const assignmentResult = await this.createAssignmentItem(createOpts);
          if (assignmentResult) {
            items.push(assignmentResult);
          }
          break;
        }

        case 'learning_outcome':
          // Store learning outcomes for later mapping
          break;

        default:
          warnings.push(
            `Unsupported resource type: ${resource.type} for ${resource.identifier}`
          );
      }
    } catch (error) {
      warnings.push(
        `Failed to process resource ${resource.identifier}: ${(error as Error).message}`
      );
      this.logger.warn(`Failed to process CC resource: ${resource.identifier}`, error);
    }

    return items;
  }

  /**
   * Create web content item
   */
  private async createWebContentItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, position, tenantId, tempDir } = opts;
    if (!resource.href) return null;

    // Read HTML content
    const fullPath = path.join(tempDir, resource.href);
    let content = '';

    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }

    // Update asset URLs to point to S3
    content = this.rewriteAssetUrls(
      content,
      resource.identifier,
      tenantId,
      courseId
    );

    const page = await this.prisma.coursePage.create({
      data: {
        id: uuidv4(),
        courseId,
        moduleId,
        title,
        content,
        contentType: 'html',
        position,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'page',
      title,
      description: null,
      sourceFormat: 'common_cartridge',
      data: { pageId: page.id },
      mappedTo: page.id,
    };
  }

  /**
   * Create weblink item
   */
  private async createWeblinkItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, position, tempDir } = opts;
    if (!resource.href) return null;

    // Parse weblink XML
    const fullPath = path.join(tempDir, resource.href);
    let url = '';

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const xml = await this.parseXML(content);
      const webLink = xml['webLink'] as Record<string, unknown>;
      const urlNode = (webLink?.['url'] as unknown[])?.[0] as Record<
        string,
        unknown
      >;
      url = (urlNode?.['$'] as Record<string, string>)?.['href'] ?? '';
    } catch {
      return null;
    }

    if (!url) return null;

    const link = await this.prisma.courseExternalLink.create({
      data: {
        id: uuidv4(),
        courseId,
        moduleId,
        title,
        url,
        position,
        openInNewTab: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'external_link',
      title,
      description: null,
      sourceFormat: 'common_cartridge',
      data: { linkId: link.id, url },
      mappedTo: link.id,
    };
  }

  /**
   * Create discussion item
   */
  private async createDiscussionItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, userId, tempDir } = opts;
    if (!resource.href) return null;

    // Parse discussion topic XML
    const fullPath = path.join(tempDir, resource.href);
    let prompt = '';

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const xml = await this.parseXML(content);
      const topic = xml['topic'] as Record<string, unknown>;
      const textNode = (topic?.['text'] as unknown[])?.[0] as Record<
        string,
        unknown
      >;
      prompt = (textNode?.['_'] as string) ?? '';
    } catch {
      return null;
    }

    const discussion = await this.prisma.discussionTopic.create({
      data: {
        id: uuidv4(),
        courseId,
        moduleId,
        createdBy: userId,
        title,
        prompt,
        type: 'discussion',
        status: 'active',
        allowReplies: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'discussion',
      title,
      description: prompt.substring(0, 200),
      sourceFormat: 'common_cartridge',
      data: { discussionId: discussion.id },
      mappedTo: discussion.id,
    };
  }

  /**
   * Create assessment item from QTI resource
   */
  private async createAssessmentItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, tenantId, userId } = opts;
    if (!resource.href) return null;

    // For now, just create a placeholder
    // Full QTI parsing would use the QTI importer
    const assessment = await this.prisma.assessment.create({
      data: {
        id: uuidv4(),
        tenantId,
        courseId,
        moduleId,
        createdBy: userId,
        title,
        description: null,
        type: 'quiz',
        status: 'draft',
        externalId: resource.identifier,
        sourceFormat: 'common_cartridge_qti',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'assessment',
      title,
      description: null,
      sourceFormat: 'common_cartridge_qti',
      data: { assessmentId: assessment.id },
      mappedTo: assessment.id,
    };
  }

  /**
   * Create LTI link item
   */
  private async createLTILinkItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, position, tempDir } = opts;
    if (!resource.href) return null;

    // Parse LTI link XML
    const fullPath = path.join(tempDir, resource.href);
    let launchUrl = '';
    let customParams: Record<string, string> = {};

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const xml = await this.parseXML(content);
      const cartridgeBasicLTILink =
        (xml['cartridge_basiclti_link'] as Record<string, unknown>) ??
        (xml['blti:cartridge_basiclti_link'] as Record<string, unknown>);

      if (cartridgeBasicLTILink) {
        launchUrl =
          (
            (cartridgeBasicLTILink['blti:launch_url'] as string[]) ??
            (cartridgeBasicLTILink['launch_url'] as string[])
          )?.[0] ?? '';

        const custom =
          (cartridgeBasicLTILink['blti:custom'] as unknown[])?.[0] ??
          (cartridgeBasicLTILink['custom'] as unknown[])?.[0];

        if (custom) {
          const customRecord = custom as Record<string, unknown>;
          const params =
            (customRecord['lticm:property'] as unknown[]) ??
            (customRecord['property'] as unknown[]) ??
            [];

          for (const param of params) {
            const paramRecord = param as Record<string, unknown>;
            const paramAttrs = paramRecord['$'] as Record<string, string>;
            const name = paramAttrs?.['name'];
            const value = (paramRecord['_'] as string) ?? '';
            if (name) {
              customParams[name] = value;
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse LTI link: ${resource.identifier}`, error);
      return null;
    }

    if (!launchUrl) return null;

    const ltiLink = await this.prisma.ltiToolLink.create({
      data: {
        id: uuidv4(),
        courseId,
        moduleId,
        title,
        launchUrl,
        customParameters: customParams,
        position,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'lti_link',
      title,
      description: null,
      sourceFormat: 'common_cartridge',
      data: { ltiLinkId: ltiLink.id, launchUrl },
      mappedTo: ltiLink.id,
    };
  }

  /**
   * Create assignment item
   */
  private async createAssignmentItem(
    opts: CreateItemOptions
  ): Promise<ImportedItem | null> {
    const { resource, title, courseId, moduleId, tenantId, userId, tempDir } = opts;
    if (!resource.href) return null;

    // Parse assignment XML (CC 1.3+)
    const fullPath = path.join(tempDir, resource.href);
    let instructions = '';
    let points: number | null = null;

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const xml = await this.parseXML(content);
      const assignment = xml['assignment'] as Record<string, unknown>;

      if (assignment) {
        const textNode = (assignment['text'] as unknown[])?.[0] as Record<
          string,
          unknown
        >;
        instructions = (textNode?.['_'] as string) ?? '';

        const gradableNode = (assignment['gradable'] as unknown[])?.[0] as
          | Record<string, unknown>
          | string;
        if (typeof gradableNode === 'object') {
          points = Number.parseFloat(
            (gradableNode['$'] as Record<
              string,
              string
            >)?.['points_possible'] ?? '0'
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse assignment: ${resource.identifier}`, error);
      return null;
    }

    const assignmentRecord = await this.prisma.assignment.create({
      data: {
        id: uuidv4(),
        tenantId,
        courseId,
        moduleId,
        createdBy: userId,
        title,
        instructions,
        pointsPossible: points,
        status: 'draft',
        submissionTypes: ['online_text_entry'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      externalId: resource.identifier,
      type: 'assignment',
      title,
      description: instructions.substring(0, 200),
      sourceFormat: 'common_cartridge',
      data: { assignmentId: assignmentRecord.id },
      mappedTo: assignmentRecord.id,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async parseXML(content: string): Promise<Record<string, unknown>> {
    const parser = new xml2js.Parser({
      explicitArray: true,
      mergeAttrs: false,
      xmlns: true,
    });

    return parser.parseStringPromise(content);
  }

  private extractLOMString(
    lom: Record<string, unknown> | undefined,
    field: string
  ): string | null {
    if (!lom) return null;

    const fieldNode =
      (lom[field] as unknown[])?.[0] as Record<string, unknown> ??
      (lom[`lom:${field}`] as unknown[])?.[0] as Record<string, unknown>;

    if (!fieldNode) return null;

    const stringNode =
      (fieldNode['string'] as unknown[])?.[0] ??
      (fieldNode['lom:string'] as unknown[])?.[0];

    if (typeof stringNode === 'string') return stringNode;
    if (typeof stringNode === 'object') {
      return (stringNode as Record<string, string>)['_'] ?? null;
    }

    return null;
  }

  private rewriteAssetUrls(
    html: string,
    resourceId: string,
    tenantId: string,
    courseId: string
  ): string {
    const baseUrl = `https://${this.bucket}.s3.amazonaws.com/content/${tenantId}/${courseId}/resources/${resourceId}`;

    // Replace relative URLs in src and href attributes
    return html
      .replaceAll(/(src=["'])((?!http|\/\/)[^"']+)(["'])/gi, `$1${baseUrl}/$2$3`)
      .replaceAll(/(href=["'])((?!http|\/\/|#)[^"']+)(["'])/gi, `$1${baseUrl}/$2$3`);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
    };

    return types[ext] ?? 'application/octet-stream';
  }
}
