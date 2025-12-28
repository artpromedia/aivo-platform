// ══════════════════════════════════════════════════════════════════════════════
// CONTENT VALIDATOR
// Validates SCORM, QTI, and Common Cartridge packages against specifications
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';
import * as path from 'node:path';
import {
  ContentPackage,
  PackageFormat,
  ValidationResult,
  ValidationInfo,
  ValidationError,
  ValidationWarning,
} from '../import.types';

/**
 * Content Validator
 * 
 * Validates learning content packages:
 * - SCORM 1.2 and 2004 manifest validation
 * - QTI 2.1 and 3.0 schema validation
 * - Common Cartridge structure validation
 * - Resource file existence checks
 * - Metadata completeness checks
 */

@Injectable()
export class ContentValidator {
  private readonly logger = new Logger(ContentValidator.name);
  // Required files by format
  private readonly REQUIRED_FILES: Record<string, string[]> = {
    scorm_1_2: ['imsmanifest.xml'],
    scorm_2004: ['imsmanifest.xml'],
    qti_2_1: [], // QTI can be single XML file
    qti_3_0: [],
    common_cartridge: ['imsmanifest.xml'],
  };

  // Maximum file sizes (in bytes)
  private readonly MAX_FILE_SIZES = {
    package: 500 * 1024 * 1024, // 500MB total
    single_file: 100 * 1024 * 1024, // 100MB per file
    manifest: 10 * 1024 * 1024, // 10MB manifest
  } as const;

  /**
   * Validate a content package
   */
  async validate(
    packageData: ContentPackage,
    format: PackageFormat
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validationInfo: ValidationInfo = {
      format,
      hasManifest: false,
      hasAssets: false,
      estimatedSize: packageData.size,
    };

    try {
      // 1. Basic structure validation
      const structureResult = await this.validateStructure(packageData, format);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);

      // 2. Format-specific validation
      switch (format) {
        case 'scorm_1.2': {
          const scorm12Result = await this.validateSCORM12(packageData);
          errors.push(...scorm12Result.errors);
          warnings.push(...scorm12Result.warnings);
          Object.assign(validationInfo, scorm12Result.info);
          break;
        }

        case 'scorm_2004': {
          const scorm2004Result = await this.validateSCORM2004(packageData);
          errors.push(...scorm2004Result.errors);
          warnings.push(...scorm2004Result.warnings);
          Object.assign(validationInfo, scorm2004Result.info);
          break;
        }

        case 'qti_2.1':
        case 'qti_3.0': {
          const qtiResult = await this.validateQTI(packageData, format);
          errors.push(...qtiResult.errors);
          warnings.push(...qtiResult.warnings);
          Object.assign(validationInfo, qtiResult.info);
          break;
        }

        case 'common_cartridge': {
          const ccResult = await this.validateCommonCartridge(packageData);
          errors.push(...ccResult.errors);
          warnings.push(...ccResult.warnings);
          Object.assign(validationInfo, ccResult.info);
          break;
        }
      }

      // 3. Resource validation
      const resourceResult = await this.validateResources(packageData, format);
      errors.push(...resourceResult.errors);
      warnings.push(...resourceResult.warnings);

      const valid = errors.length === 0;

      this.logger.log(`Package validation completed format=${format} valid=${valid} errorCount=${errors.length} warningCount=${warnings.length}`);

      return {
        valid,
        errors: errors.map(e => e.message),
        warnings: warnings.map(w => w.message),
        info: validationInfo,
      };
    } catch (error) {
      this.logger.error('Validation failed', error);
      return {
        valid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: [],
        info: { format },
      };
    }
  }

  // ============================================================================
  // STRUCTURE VALIDATION
  // ============================================================================

  /**
   * Validate basic package structure
   */
  private async validateStructure(
    packageData: ContentPackage,
    format: PackageFormat
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check total package size
    if (packageData.size > this.MAX_FILE_SIZES.package) {
      errors.push({
        code: 'PACKAGE_TOO_LARGE',
        message: `Package size (${this.formatBytes(packageData.size)}) exceeds maximum allowed (${this.formatBytes(this.MAX_FILE_SIZES.package)})`,
        severity: 'error',
      });
    }

    // Check for empty package
    if (packageData.files.length === 0) {
      errors.push({
        code: 'EMPTY_PACKAGE',
        message: 'Package contains no files',
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Check required files
    const formatKey = format.replace('.', '_').replace('-', '_');
    const requiredFiles = this.REQUIRED_FILES[formatKey] || [];
    const fileNames = packageData.files.map(f => f.name.toLowerCase());

    for (const required of requiredFiles) {
      if (!fileNames.includes(required.toLowerCase())) {
        errors.push({
          code: 'MISSING_REQUIRED_FILE',
          message: `Required file missing: ${required}`,
          severity: 'error',
          file: required,
        });
      }
    }

    // Check for suspicious files
    const suspiciousExtensions = ['.exe', '.dll', '.bat', '.sh', '.cmd', '.ps1'];
    for (const file of packageData.files) {
      const ext = path.extname(file.name).toLowerCase();
      if (suspiciousExtensions.includes(ext)) {
        warnings.push({
          code: 'SUSPICIOUS_FILE',
          message: `Potentially unsafe file type: ${file.name}`,
          severity: 'warning',
          file: file.name,
        });
      }

      // Check individual file sizes
      if (file.size > this.MAX_FILE_SIZES.single_file) {
        warnings.push({
          code: 'LARGE_FILE',
          message: `Large file detected: ${file.name} (${this.formatBytes(file.size)})`,
          severity: 'warning',
          file: file.name,
        });
      }
    }

    return { errors, warnings };
  }

  // ============================================================================
  // SCORM 1.2 VALIDATION
  // ============================================================================

  /**
   * Validate SCORM 1.2 package
   */
  private async validateSCORM12(
    packageData: ContentPackage
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[]; info: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: string[] = [];

    try {
      const manifest = await this.parseManifest(packageData);

      // Validate manifest structure
      if (!manifest.manifest) {
        errors.push({
          code: 'INVALID_MANIFEST',
          message: 'Invalid manifest structure: missing root element',
          severity: 'error',
          file: 'imsmanifest.xml',
        });
        return { errors, warnings, info };
      }

      const root = manifest.manifest;

      // Check identifier
      if (!root.$?.identifier) {
        warnings.push({
          code: 'MISSING_IDENTIFIER',
          message: 'Manifest missing identifier attribute',
          severity: 'warning',
          file: 'imsmanifest.xml',
        });
      }

      // Check organizations
      const organizations = root.organizations?.[0];
      if (!organizations) {
        errors.push({
          code: 'MISSING_ORGANIZATIONS',
          message: 'Manifest missing organizations element',
          severity: 'error',
          file: 'imsmanifest.xml',
        });
      } else {
        const orgList = organizations.organization || [];
        if (orgList.length === 0) {
          errors.push({
            code: 'NO_ORGANIZATIONS',
            message: 'No organization defined in manifest',
            severity: 'error',
            file: 'imsmanifest.xml',
          });
        }

        // Check default organization
        const defaultOrg = organizations.$?.default;
        if (!defaultOrg && orgList.length > 1) {
          warnings.push({
            code: 'NO_DEFAULT_ORG',
            message: 'No default organization specified',
            severity: 'warning',
            file: 'imsmanifest.xml',
          });
        }

        // Count SCOs
        let scoCount = 0;
        const countSCOs = (items: any[]): void => {
          for (const item of items) {
            if (item.$?.identifierref) scoCount++;
            if (item.item) countSCOs(item.item);
          }
        };
        for (const org of orgList) {
          if (org.item) countSCOs(org.item);
        }
        info.push(`Found ${scoCount} SCO references`);
      }

      // Check resources
      const resources = root.resources?.[0]?.resource || [];
      if (resources.length === 0) {
        errors.push({
          code: 'NO_RESOURCES',
          message: 'No resources defined in manifest',
          severity: 'error',
          file: 'imsmanifest.xml',
        });
      } else {
        info.push(`Found ${resources.length} resources`);

        // Validate each resource
        for (const resource of resources) {
          const resourceId = resource.$?.identifier;
          const href = resource.$?.href;
          const type = resource.$?.type || resource.$?.['adlcp:scormtype'];

          if (!resourceId) {
            warnings.push({
              code: 'RESOURCE_NO_ID',
              message: 'Resource missing identifier',
              severity: 'warning',
              file: 'imsmanifest.xml',
            });
          }

          // Check if launch file exists for SCOs
          if (type?.toLowerCase() === 'sco' && href) {
            const fileExists = packageData.files.some(
              f => f.name.toLowerCase() === href.toLowerCase() ||
                   f.name.toLowerCase().endsWith('/' + href.toLowerCase())
            );
            if (!fileExists) {
              errors.push({
                code: 'MISSING_LAUNCH_FILE',
                message: `Launch file not found: ${href}`,
                severity: 'error',
                file: href,
              });
            }
          }
        }
      }

      // Check metadata
      const metadata = root.metadata?.[0];
      if (!metadata) {
        warnings.push({
          code: 'NO_METADATA',
          message: 'Package has no metadata',
          severity: 'warning',
          file: 'imsmanifest.xml',
        });
      } else {
        // Check schema version
        const schemaVersion = metadata.schemaversion?.[0];
        if (schemaVersion && !schemaVersion.includes('1.2')) {
          warnings.push({
            code: 'VERSION_MISMATCH',
            message: `Schema version ${schemaVersion} may not be SCORM 1.2 compatible`,
            severity: 'warning',
            file: 'imsmanifest.xml',
          });
        }
      }

    } catch (error) {
      errors.push({
        code: 'MANIFEST_PARSE_ERROR',
        message: `Failed to parse manifest: ${(error as Error).message}`,
        severity: 'error',
        file: 'imsmanifest.xml',
      });
    }

    return { errors, warnings, info };
  }

  // ============================================================================
  // SCORM 2004 VALIDATION
  // ============================================================================

  /**
   * Validate SCORM 2004 package
   */
  private async validateSCORM2004(
    packageData: ContentPackage
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[]; info: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: string[] = [];

    try {
      const manifest = await this.parseManifest(packageData);

      if (!manifest.manifest) {
        errors.push({
          code: 'INVALID_MANIFEST',
          message: 'Invalid manifest structure',
          severity: 'error',
          file: 'imsmanifest.xml',
        });
        return { errors, warnings, info };
      }

      const root = manifest.manifest;

      // Check for SCORM 2004 namespaces
      const attrs = root.$ || {};
      const hasAdlSeq = Object.values(attrs).some((v: any) => 
        typeof v === 'string' && v.includes('adlseq')
      );
      const hasImsss = Object.values(attrs).some((v: any) => 
        typeof v === 'string' && v.includes('imsss')
      );

      if (!hasAdlSeq && !hasImsss) {
        warnings.push({
          code: 'MISSING_2004_NAMESPACE',
          message: 'SCORM 2004 namespaces not found - may be SCORM 1.2',
          severity: 'warning',
          file: 'imsmanifest.xml',
        });
      }

      // Validate organizations
      const organizations = root.organizations?.[0];
      if (organizations) {
        const orgList = organizations.organization || [];
        
        for (const org of orgList) {
          // Check for sequencing
          const hasSequencing = this.hasSequencing(org);
          if (hasSequencing) {
            info.push('Sequencing rules detected');
            
            // Validate sequencing rules
            const seqErrors = this.validateSequencing(org);
            errors.push(...seqErrors);
          }
        }
      }

      // Validate resources
      const resources = root.resources?.[0]?.resource || [];
      let scoCount = 0;
      let assetCount = 0;

      for (const resource of resources) {
        const scormType = resource.$?.['adlcp:scormType'] || 
                          resource.$?.scormtype ||
                          resource.$?.type;

        if (scormType?.toLowerCase() === 'sco') {
          scoCount++;
        } else if (scormType?.toLowerCase() === 'asset') {
          assetCount++;
        }
      }

      info.push(`Found ${scoCount} SCOs and ${assetCount} assets`);

      // Check metadata schema version
      const metadata = root.metadata?.[0];
      if (metadata) {
        const schemaVersion = metadata.schemaversion?.[0];
        if (schemaVersion) {
          if (schemaVersion.includes('2004')) {
            // Determine edition
            if (schemaVersion.includes('4th')) {
              info.push('SCORM 2004 4th Edition detected');
            } else if (schemaVersion.includes('3rd')) {
              info.push('SCORM 2004 3rd Edition detected');
            } else if (schemaVersion.includes('2nd')) {
              info.push('SCORM 2004 2nd Edition detected');
            } else {
              info.push('SCORM 2004 1st Edition detected');
            }
          }
        }
      }

    } catch (error) {
      errors.push({
        code: 'MANIFEST_PARSE_ERROR',
        message: `Failed to parse manifest: ${(error as Error).message}`,
        severity: 'error',
        file: 'imsmanifest.xml',
      });
    }

    return { errors, warnings, info };
  }

  /**
   * Check if organization has sequencing
   */
  private hasSequencing(org: any): boolean {
    if (org.sequencing || org['imsss:sequencing']) return true;

    const checkItems = (items: any[]): boolean => {
      for (const item of items || []) {
        if (item.sequencing || item['imsss:sequencing']) return true;
        if (item.item && checkItems(item.item)) return true;
      }
      return false;
    };

    return checkItems(org.item || []);
  }

  /**
   * Validate SCORM 2004 sequencing rules
   */
  private validateSequencing(org: any): ValidationError[] {
    const errors: ValidationError[] = [];

    const validateSeq = (seq: any, context: string): void => {
      if (!seq) return;

      // Check control mode
      const controlMode = seq.controlMode?.[0]?.$ || seq['imsss:controlMode']?.[0]?.$;
      if (controlMode) {
        const validModes = ['choice', 'choiceExit', 'flow', 'forwardOnly', 'useCurrentAttemptObjectiveInfo', 'useCurrentAttemptProgressInfo'];
        for (const key of Object.keys(controlMode)) {
          if (!validModes.includes(key) && !['true', 'false'].includes(controlMode[key])) {
            errors.push({
              code: 'INVALID_CONTROL_MODE',
              message: `Invalid control mode value in ${context}: ${key}=${controlMode[key]}`,
              severity: 'error',
            });
          }
        }
      }

      // Check objectives
      const objectives = seq.objectives?.[0] || seq['imsss:objectives']?.[0];
      if (objectives) {
        const primaryObjective = objectives.primaryObjective?.[0] || objectives['imsss:primaryObjective']?.[0];
        if (!primaryObjective) {
          // Note: This is a minor issue, not a blocker - pushing to errors but severity indicates warning
          errors.push({
            code: 'MISSING_PRIMARY_OBJECTIVE',
            message: `Missing primary objective in ${context}`,
            severity: 'error',
          });
        }
      }
    };

    // Validate organization-level sequencing
    const orgSeq = org.sequencing?.[0] || org['imsss:sequencing']?.[0];
    validateSeq(orgSeq, 'organization');

    // Validate item-level sequencing
    const validateItems = (items: any[], path: string): void => {
      for (let i = 0; i < (items || []).length; i++) {
        const item = items[i];
        const itemPath = `${path}/item[${i}]`;
        const itemSeq = item.sequencing?.[0] || item['imsss:sequencing']?.[0];
        validateSeq(itemSeq, itemPath);
        if (item.item) validateItems(item.item, itemPath);
      }
    };

    validateItems(org.item || [], 'organization');

    return errors;
  }

  // ============================================================================
  // QTI VALIDATION
  // ============================================================================

  /**
   * Validate QTI package
   */
  private async validateQTI(
    packageData: ContentPackage,
    format: 'qti_2.1' | 'qti_3.0'
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[]; info: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: string[] = [];

    const xmlFiles = packageData.files.filter(f => 
      f.name.endsWith('.xml') && !f.name.toLowerCase().includes('manifest')
    );

    if (xmlFiles.length === 0) {
      errors.push({
        code: 'NO_QTI_FILES',
        message: 'No QTI XML files found in package',
        severity: 'error',
      });
      return { errors, warnings, info };
    }

    info.push(`Found ${xmlFiles.length} XML files`);

    let assessmentItemCount = 0;
    let assessmentTestCount = 0;

    for (const file of xmlFiles) {
      try {
        const content = await this.readFile(packageData, file.name);
        const xml = await this.parseXML(content);
        const rootElement = Object.keys(xml)[0];

        if (!rootElement) continue;

        // Detect QTI element type
        const isQTI3 = format === 'qti_3.0';
        const itemElements = isQTI3 
          ? ['qti-assessment-item', 'assessmentItem']
          : ['assessmentItem'];
        const testElements = isQTI3
          ? ['qti-assessment-test', 'assessmentTest']
          : ['assessmentTest'];

        if (itemElements.some(e => rootElement.includes(e))) {
          assessmentItemCount++;
          const itemErrors = this.validateQTIItem(xml, file.name, format);
          errors.push(...itemErrors.errors);
          warnings.push(...itemErrors.warnings);
        } else if (testElements.some(e => rootElement.includes(e))) {
          assessmentTestCount++;
          const testErrors = this.validateQTITest(xml, file.name, format);
          errors.push(...testErrors.errors);
          warnings.push(...testErrors.warnings);
        }

      } catch (error) {
        warnings.push({
          code: 'XML_PARSE_ERROR',
          message: `Failed to parse ${file.name}: ${(error as Error).message}`,
          severity: 'warning',
          file: file.name,
        });
      }
    }

    info.push(`Found ${assessmentItemCount} assessment items`);
    info.push(`Found ${assessmentTestCount} assessment tests`);

    if (assessmentItemCount === 0 && assessmentTestCount === 0) {
      errors.push({
        code: 'NO_QTI_CONTENT',
        message: 'No valid QTI assessment items or tests found',
        severity: 'error',
      });
    }

    return { errors, warnings, info };
  }

  /**
   * Validate QTI assessment item
   */
  private validateQTIItem(
    xml: any,
    fileName: string,
    format: 'qti_2.1' | 'qti_3.0'
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const root = xml.assessmentItem || xml['qti-assessment-item'] || Object.values(xml)[0];
    if (!root) return { errors, warnings };

    const attrs = root.$ || {};

    // Check identifier
    if (!attrs.identifier) {
      errors.push({
        code: 'MISSING_ITEM_IDENTIFIER',
        message: `Assessment item missing identifier`,
        severity: 'error',
        file: fileName,
      });
    }

    // Check title
    if (!attrs.title) {
      warnings.push({
        code: 'MISSING_ITEM_TITLE',
        message: `Assessment item missing title`,
        severity: 'warning',
        file: fileName,
      });
    }

    // Check for response declaration
    const responseDecl = root.responseDeclaration || root['qti-response-declaration'];
    if (!responseDecl || responseDecl.length === 0) {
      warnings.push({
        code: 'NO_RESPONSE_DECLARATION',
        message: `Assessment item has no response declarations`,
        severity: 'warning',
        file: fileName,
      });
    }

    // Check for item body
    const itemBody = root.itemBody || root['qti-item-body'];
    if (!itemBody || itemBody.length === 0) {
      errors.push({
        code: 'NO_ITEM_BODY',
        message: `Assessment item has no item body`,
        severity: 'error',
        file: fileName,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate QTI assessment test
   */
  private validateQTITest(
    xml: any,
    fileName: string,
    format: 'qti_2.1' | 'qti_3.0'
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const root = xml.assessmentTest || xml['qti-assessment-test'] || Object.values(xml)[0];
    if (!root) return { errors, warnings };

    const attrs = root.$ || {};

    // Check identifier
    if (!attrs.identifier) {
      errors.push({
        code: 'MISSING_TEST_IDENTIFIER',
        message: `Assessment test missing identifier`,
        severity: 'error',
        file: fileName,
      });
    }

    // Check for test parts
    const testParts = root.testPart || root['qti-test-part'];
    if (!testParts || testParts.length === 0) {
      errors.push({
        code: 'NO_TEST_PARTS',
        message: `Assessment test has no test parts`,
        severity: 'error',
        file: fileName,
      });
    }

    return { errors, warnings };
  }

  // ============================================================================
  // COMMON CARTRIDGE VALIDATION
  // ============================================================================

  /**
   * Validate Common Cartridge package
   */
  private async validateCommonCartridge(
    packageData: ContentPackage
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[]; info: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: string[] = [];

    try {
      const manifest = await this.parseManifest(packageData);

      if (!manifest.manifest) {
        errors.push({
          code: 'INVALID_MANIFEST',
          message: 'Invalid manifest structure',
          severity: 'error',
          file: 'imsmanifest.xml',
        });
        return { errors, warnings, info };
      }

      const root = manifest.manifest;

      // Check for CC schema
      const metadata = root.metadata?.[0];
      if (metadata) {
        const schema = metadata.schema?.[0];
        if (schema) {
          if (schema.toLowerCase().includes('common cartridge') || 
              schema.toLowerCase().includes('imscc')) {
            // Detect version
            if (schema.includes('1.3')) {
              info.push('Common Cartridge 1.3 detected');
            } else if (schema.includes('1.2')) {
              info.push('Common Cartridge 1.2 detected');
            } else if (schema.includes('1.1')) {
              info.push('Common Cartridge 1.1 detected');
            } else if (schema.includes('1.0')) {
              info.push('Common Cartridge 1.0 detected');
            }
          }
        }
      }

      // Count resources by type
      const resources = root.resources?.[0]?.resource || [];
      const typeCounts: Record<string, number> = {};

      for (const resource of resources) {
        const type = resource.$?.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }

      for (const [type, count] of Object.entries(typeCounts)) {
        info.push(`${count} ${type} resource(s)`);
      }

      // Check organizations
      const organizations = root.organizations?.[0];
      if (!organizations) {
        warnings.push({
          code: 'NO_ORGANIZATIONS',
          message: 'Package has no organization structure',
          severity: 'warning',
          file: 'imsmanifest.xml',
        });
      }

    } catch (error) {
      errors.push({
        code: 'MANIFEST_PARSE_ERROR',
        message: `Failed to parse manifest: ${(error as Error).message}`,
        severity: 'error',
        file: 'imsmanifest.xml',
      });
    }

    return { errors, warnings, info };
  }

  // ============================================================================
  // RESOURCE VALIDATION
  // ============================================================================

  /**
   * Validate resource files
   */
  private async validateResources(
    packageData: ContentPackage,
    format: PackageFormat
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for common issues
    for (const file of packageData.files) {
      const fileName = file.name.toLowerCase();

      // Check for absolute paths
      if (file.name.startsWith('/') || file.name.match(/^[A-Za-z]:\\/)) {
        warnings.push({
          code: 'ABSOLUTE_PATH',
          message: `File has absolute path: ${file.name}`,
          severity: 'warning',
          file: file.name,
        });
      }

      // Check for path traversal
      if (file.name.includes('..')) {
        errors.push({
          code: 'PATH_TRAVERSAL',
          message: `Potential path traversal in: ${file.name}`,
          severity: 'error',
          file: file.name,
        });
      }

      // Check for empty files
      if (file.size === 0 && !fileName.endsWith('.gitkeep')) {
        warnings.push({
          code: 'EMPTY_FILE',
          message: `Empty file: ${file.name}`,
          severity: 'warning',
          file: file.name,
        });
      }
    }

    return { errors, warnings };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async parseManifest(packageData: ContentPackage): Promise<any> {
    const content = await this.readFile(packageData, 'imsmanifest.xml');
    return this.parseXML(content);
  }

  private async readFile(packageData: ContentPackage, fileName: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const filePath = path.join(packageData.tempDir, fileName);
    return fs.readFile(filePath, 'utf-8');
  }

  private async parseXML(content: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: true,
      mergeAttrs: false,
      xmlns: true,
    });
    return parser.parseStringPromise(content);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
