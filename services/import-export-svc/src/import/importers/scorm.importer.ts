/**
 * SCORM Importer
 *
 * Imports SCORM 1.2 and SCORM 2004 packages:
 * - Parses imsmanifest.xml
 * - Extracts organization structure
 * - Maps SCOs to lessons
 * - Uploads assets to S3
 * - Creates SCORM runtime records
 */

import { Injectable, Logger } from '@nestjs/common';
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';
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
  SCORMManifest,
  SCORMOrganization,
  SCORMItem,
  SCORMResource,
} from '../import.types';

@Injectable()
export class SCORMImporter {
  private readonly logger = new Logger(SCORMImporter.name);
  private readonly s3: S3;
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3({ region: config.get('AWS_REGION', 'us-east-1') });
    this.bucketName = config.get('CONTENT_BUCKET', 'aivo-content');
  }

  /**
   * Import SCORM package
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
      onProgress?.(0);
      const manifest = await this.parseManifest(packageData);

      // Determine SCORM version
      const version = this.detectVersion(manifest);
      this.logger.log(`SCORM version detected: ${version}`);

      // Create SCORM package record
      const scormPackage = await this.createPackageRecord(
        manifest,
        version,
        tenantId,
        userId,
        packageData
      );

      onProgress?.(10);

      // Upload all assets to S3
      const assetMap = await this.uploadAssets(
        packageData,
        tenantId,
        scormPackage.id,
        (progress) => onProgress?.(10 + progress * 40)
      );

      onProgress?.(50);

      // Process organizations
      const organizations =
        (manifest.organizations?.[0] as Record<string, unknown>)?.['organization'] as
          | SCORMOrganization[]
          | undefined;

      if (organizations) {
        for (const org of organizations) {
          // Check if this is the default organization (used for sorting priority)
          const resources =
            (manifest.resources?.[0] as Record<string, unknown>)?.['resource'] as
              | SCORMResource[]
              | undefined;

          const orgItems = await this.processOrganization({
            org,
            resources: resources ?? [],
            packageId: scormPackage.id,
            tenantId,
            userId,
            assetMap,
            options,
          });
          items.push(...orgItems);
        }
      }

      onProgress?.(90);

      // Update package with structure
      await this.prisma.scormPackage.update({
        where: { id: scormPackage.id },
        data: {
          itemCount: items.length,
          structure: this.buildStructure(organizations ?? []),
          status: 'ready',
        },
      });

      onProgress?.(100);

      return {
        items,
        warnings,
        metadata: {
          packageId: scormPackage.id,
          version,
          title:
            manifest.metadata?.[0]?.schema?.[0] || 'Untitled SCORM Package',
          itemCount: items.length,
        },
      };
    } catch (error) {
      this.logger.error('SCORM import failed', error);
      throw error;
    }
  }

  /**
   * Parse SCORM manifest
   */
  private async parseManifest(packageData: ContentPackage): Promise<SCORMManifest> {
    const fs = await import('node:fs/promises');
    const manifestPath = path.join(packageData.tempDir, 'imsmanifest.xml');
    const content = await fs.readFile(manifestPath, 'utf-8');

    const parser = new xml2js.Parser({
      explicitArray: true,
      mergeAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      attrNameProcessors: [xml2js.processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(content);
    return result.manifest as SCORMManifest;
  }

  /**
   * Detect SCORM version from manifest
   */
  private detectVersion(manifest: SCORMManifest): '1.2' | '2004' {
    // Check schemaversion
    const schemaVersion = manifest.metadata?.[0]?.schemaversion?.[0];
    if (schemaVersion) {
      if (schemaVersion.includes('2004') || schemaVersion.includes('1.3')) {
        return '2004';
      }
      if (schemaVersion.includes('1.2')) {
        return '1.2';
      }
    }

    // Check for SCORM 2004 specific elements
    const hasSequencing = this.hasSequencing(manifest);
    if (hasSequencing) {
      return '2004';
    }

    // Check namespace hints in resources
    const resources =
      (manifest.resources?.[0] as Record<string, unknown>)?.['resource'] as
        | SCORMResource[]
        | undefined;
    if (resources) {
      for (const resource of resources) {
        const type = resource.$?.type || resource.$?.['adlcp:scormtype'];
        if (type && (type.includes('2004') || type.includes('asset'))) {
          return '2004';
        }
      }
    }

    // Default to 1.2
    return '1.2';
  }

  /**
   * Check if manifest has SCORM 2004 sequencing
   */
  private hasSequencing(manifest: SCORMManifest): boolean {
    const organizations =
      (manifest.organizations?.[0] as Record<string, unknown>)?.['organization'] as
        | SCORMOrganization[]
        | undefined;

    if (!organizations) return false;

    const checkItems = (items: SCORMItem[]): boolean => {
      for (const item of items) {
        if (item.sequencing || item['imsss:sequencing']) {
          return true;
        }
        if (item.item && checkItems(item.item)) {
          return true;
        }
      }
      return false;
    };

    for (const org of organizations) {
      if (org.sequencing || org['imsss:sequencing']) {
        return true;
      }
      if (org.item && checkItems(org.item)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create SCORM package record
   */
  private async createPackageRecord(
    manifest: SCORMManifest,
    version: '1.2' | '2004',
    tenantId: string,
    userId: string,
    packageData: ContentPackage
  ): Promise<{ id: string }> {
    const metadata = manifest.metadata?.[0];
    const title =
      this.extractTitle(metadata) ||
      packageData.originalFileName.replace(/\.(zip|imscc)$/i, '');

    return this.prisma.scormPackage.create({
      data: {
        id: uuidv4(),
        tenantId,
        createdBy: userId,
        title,
        description: this.extractDescription(metadata),
        version,
        manifestIdentifier: manifest.$?.identifier,
        originalFileName: packageData.originalFileName,
        status: 'processing',
        createdAt: new Date(),
      },
    });
  }

  /**
   * Upload package assets to S3
   */
  private async uploadAssets(
    packageData: ContentPackage,
    tenantId: string,
    packageId: string,
    onProgress?: (progress: number) => void
  ): Promise<Map<string, string>> {
    const assetMap = new Map<string, string>();
    const fs = await import('node:fs/promises');
    const mime = await import('mime-types');

    const totalFiles = packageData.files.length;
    let uploadedFiles = 0;

    for (const file of packageData.files) {
      const s3Key = `scorm/${tenantId}/${packageId}/${file.name}`;
      const filePath = path.join(packageData.tempDir, file.name);

      try {
        const content = await fs.readFile(filePath);
        const contentType =
          mime.lookup(file.name) || 'application/octet-stream';

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: content,
          ContentType: contentType,
        });

        await this.s3.send(command);

        assetMap.set(file.name, s3Key);

        uploadedFiles++;
        onProgress?.(uploadedFiles / totalFiles);
      } catch (error) {
        this.logger.warn(`Failed to upload asset: ${file.name}`, error);
      }
    }

    return assetMap;
  }

  /**
   * Process SCORM organization
   */
  private async processOrganization(params: {
    org: SCORMOrganization;
    resources: SCORMResource[];
    packageId: string;
    tenantId: string;
    userId: string;
    assetMap: Map<string, string>;
    options: ImportOptions;
  }): Promise<ImportedItem[]> {
    const { org, resources, packageId, tenantId, userId, assetMap, options } = params;
    const items: ImportedItem[] = [];
    const resourceMap = new Map(resources.map((r) => [r.$?.identifier, r]));

    const processItem = async (
      item: SCORMItem,
      parentId: string | null,
      order: number,
      depth: number
    ): Promise<void> => {
      const identifier = item.$?.identifier;
      const resourceRef = item.$?.identifierref;
      const title = item.title?.[0] || `Item ${identifier}`;

      // Get associated resource
      const resource = resourceRef ? resourceMap.get(resourceRef) : null;
      const isSCO = resource ? this.isSCO(resource) : false;

      // Create item record
      const scormItem = await this.prisma.scormItem.create({
        data: {
          id: uuidv4(),
          packageId,
          identifier,
          title,
          parentId,
          orderIndex: order,
          depth,
          resourceIdentifier: resourceRef,
          isSCO,
          launchUrl: resource ? this.getLaunchUrl(resource, assetMap) : null,
          parameters: item.$?.parameters,
          prerequisites: this.extractPrerequisites(item),
          masteryScore: this.extractMasteryScore(item),
          maxTimeAllowed: this.extractMaxTime(item),
          timeLimitAction: this.extractTimeLimitAction(item),
          sequencingRules: this.extractSequencing(item),
          createdAt: new Date(),
        },
      });

      // If it's a SCO and mapping is enabled, create a lesson
      if (isSCO && options.createLessons !== false) {
        const lesson = await this.createLessonFromSCO(
          scormItem,
          resource!,
          tenantId,
          userId,
          assetMap,
          options
        );

        items.push({
          externalId: identifier || uuidv4(),
          type: 'lesson',
          title,
          description: null,
          sourceFormat: 'scorm',
          data: {
            scormItemId: scormItem.id,
            lessonId: lesson.id,
            isSCO: true,
          },
          mappedTo: lesson.id,
        });
      } else if (!isSCO) {
        items.push({
          externalId: identifier || uuidv4(),
          type: 'folder',
          title,
          description: null,
          sourceFormat: 'scorm',
          data: {
            scormItemId: scormItem.id,
          },
          mappedTo: null,
        });
      }

      // Process child items
      const childItems = item.item || [];
      for (let i = 0; i < childItems.length; i++) {
        const childItem = childItems[i];
        if (childItem) {
          await processItem(childItem, scormItem.id, i, depth + 1);
        }
      }
    };

    // Process top-level items
    const topLevelItems = org.item || [];
    for (let i = 0; i < topLevelItems.length; i++) {
      const topItem = topLevelItems[i];
      if (topItem) {
        await processItem(topItem, null, i, 0);
      }
    }

    return items;
  }

  /**
   * Check if resource is a SCO
   */
  private isSCO(resource: SCORMResource): boolean {
    const type =
      resource.$?.['adlcp:scormtype'] ||
      resource.$?.scormType ||
      resource.$?.type;

    return type?.toLowerCase() === 'sco';
  }

  /**
   * Get launch URL for resource
   */
  private getLaunchUrl(
    resource: SCORMResource,
    assetMap: Map<string, string>
  ): string | null {
    const href = resource.$?.href;
    if (!href) return null;

    // Return the S3 key for the launch file
    const s3Key = assetMap.get(href);
    return s3Key || href;
  }

  /**
   * Create lesson from SCO
   */
  private async createLessonFromSCO(
    scormItem: { id: string; packageId: string; title: string; launchUrl: string | null; masteryScore: number | null; maxTimeAllowed: string | null },
    _resource: SCORMResource,
    tenantId: string,
    userId: string,
    _assetMap: Map<string, string>,
    _options: ImportOptions
  ): Promise<{ id: string }> {
    // Get teacher profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, tenantId, role: 'teacher' },
    });

    if (!profile) {
      throw new Error('Teacher profile not found');
    }

    // Create lesson with SCORM content block
    const lesson = await this.prisma.lesson.create({
      data: {
        id: uuidv4(),
        tenantId,
        createdBy: profile.id,
        title: scormItem.title,
        description: 'Imported SCORM content',
        status: 'draft',
        version: 1,
        type: 'scorm',
        settings: {
          scormPackageId: scormItem.packageId,
          scormItemId: scormItem.id,
          launchUrl: scormItem.launchUrl,
          masteryScore: scormItem.masteryScore,
          maxTimeAllowed: scormItem.maxTimeAllowed,
        },
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
          scormItemId: scormItem.id,
          launchUrl: scormItem.launchUrl,
          width: '100%',
          height: '600px',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update SCORM item with lesson reference
    await this.prisma.scormItem.update({
      where: { id: scormItem.id },
      data: { mappedLessonId: lesson.id },
    });

    return lesson;
  }

  /**
   * Extract title from metadata
   */
  private extractTitle(metadata: Record<string, unknown> | undefined): string | null {
    if (!metadata) return null;

    // Try LOM title
    const lom = (metadata['lom'] as Array<Record<string, unknown>>)?.[0];
    if (lom) {
      const general = (lom['general'] as Array<Record<string, unknown>>)?.[0];
      const title = (general?.['title'] as Array<Record<string, unknown>>)?.[0];
      const str = (title?.['string'] as Array<string | Record<string, unknown>>)?.[0];
      if (str) {
        return typeof str === 'string' ? str : (str as Record<string, string>)['_'] || null;
      }
    }

    // Try schema
    const schema = (metadata['schema'] as string[])?.[0];
    if (schema) {
      return schema;
    }

    return null;
  }

  /**
   * Extract description from metadata
   */
  private extractDescription(metadata: Record<string, unknown> | undefined): string | null {
    if (!metadata) return null;

    const lom = (metadata['lom'] as Array<Record<string, unknown>>)?.[0];
    if (lom) {
      const general = (lom['general'] as Array<Record<string, unknown>>)?.[0];
      const desc = (general?.['description'] as Array<Record<string, unknown>>)?.[0];
      const str = (desc?.['string'] as Array<string | Record<string, unknown>>)?.[0];
      if (str) {
        return typeof str === 'string' ? str : (str as Record<string, string>)['_'] || null;
      }
    }

    return null;
  }

  /**
   * Extract prerequisites (SCORM 1.2)
   */
  private extractPrerequisites(item: SCORMItem): string | null {
    return (
      item.$?.prerequisites ||
      item['adlcp:prerequisites']?.[0] ||
      null
    );
  }

  /**
   * Extract mastery score
   */
  private extractMasteryScore(item: SCORMItem): number | null {
    const score =
      item.$?.masteryScore ||
      item['adlcp:masteryscore']?.[0];

    return score ? Number.parseFloat(score) : null;
  }

  /**
   * Extract max time allowed
   */
  private extractMaxTime(item: SCORMItem): string | null {
    return (
      item.$?.maxTimeAllowed ||
      item['adlcp:maxtimeallowed']?.[0] ||
      null
    );
  }

  /**
   * Extract time limit action
   */
  private extractTimeLimitAction(item: SCORMItem): string | null {
    return (
      item.$?.timeLimitAction ||
      item['adlcp:timelimitaction']?.[0] ||
      null
    );
  }

  /**
   * Extract sequencing rules (SCORM 2004)
   */
  private extractSequencing(item: SCORMItem): Record<string, unknown> | null {
    const sequencing = item.sequencing?.[0] || item['imsss:sequencing']?.[0];
    if (!sequencing) return null;

    const seq = sequencing as Record<string, unknown[]>;
    const getAttr = (key: string) => {
      const val = seq[key]?.[0];
      return val && typeof val === 'object' ? (val as Record<string, unknown>)['$'] : undefined;
    };

    return {
      controlMode: getAttr('controlMode'),
      sequencingRules: seq['sequencingRules']?.[0],
      limitConditions: getAttr('limitConditions'),
      rollupRules: seq['rollupRules']?.[0],
      objectives: seq['objectives']?.[0],
      randomizationControls: getAttr('randomizationControls'),
      deliveryControls: getAttr('deliveryControls'),
    };
  }

  /**
   * Build structure tree for storage
   */
  private buildStructure(organizations: SCORMOrganization[]): Record<string, unknown>[] {
    const buildTree = (items: SCORMItem[]): Record<string, unknown>[] => {
      return items.map((item) => ({
        identifier: item.$?.identifier,
        title: item.title?.[0] || 'Untitled',
        resourceRef: item.$?.identifierref,
        children: item.item ? buildTree(item.item) : [],
      }));
    };

    return organizations.map((org) => ({
      identifier: org.$?.identifier,
      title: org.title?.[0] || 'Untitled',
      items: org.item ? buildTree(org.item) : [],
    }));
  }
}
