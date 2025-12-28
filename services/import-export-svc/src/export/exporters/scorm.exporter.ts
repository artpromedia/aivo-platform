// ══════════════════════════════════════════════════════════════════════════════
// SCORM EXPORTER - Exports content to SCORM 1.2 and 2004 packages
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { Builder } from 'xml2js';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportResult, ContentType, SCORMExportOptions, LOMMetadata, ExportMetadata, SequencingRules } from '../export.types';

type SCORMVersion = '1.2' | '2004';

interface ExportContext {
  tenantId: string;
  version: SCORMVersion;
  options: SCORMExportOptions;
  onProgress?: (progress: number, message?: string) => void;
}

@Injectable()
export class SCORMExporter {
  private readonly logger = new Logger(SCORMExporter.name);
  private xmlBuilder = new Builder({ headless: false, renderOpts: { pretty: true } });

  constructor(private prisma: PrismaService) {}

  async export(
    tenantId: string,
    contentType: ContentType,
    contentIds: string[],
    version: SCORMVersion,
    options: SCORMExportOptions = {}
  ): Promise<ExportResult> {
    const ctx: ExportContext = { tenantId, version, options };
    if (options.onProgress) {
      ctx.onProgress = options.onProgress;
    }
    
    this.logger.log(`Starting SCORM export version=${version} contentType=${contentType} count=${contentIds.length}`);
    ctx.onProgress?.(5, 'Loading content...');

    // Load content based on type
    const content = await this.loadContent(contentType, contentIds, tenantId);
    ctx.onProgress?.(20, 'Generating SCORM package...');

    // Create ZIP archive
    const zip = new AdmZip();

    // Add SCORM API wrapper
    this.addSCORMAPI(zip, version);
    ctx.onProgress?.(30, 'Adding SCORM runtime...');

    // Generate and add content
    const items = await this.generateContent(zip, content, contentType, ctx);
    ctx.onProgress?.(60, 'Creating manifest...');

    // Generate manifest
    const manifest = this.generateManifest(items, content, ctx);
    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
    ctx.onProgress?.(80, 'Finalizing package...');

    // Generate package
    const buffer = zip.toBuffer();
    const fileName = `scorm_${version.replace('.', '')}_${Date.now()}.zip`;

    ctx.onProgress?.(100, 'Complete');

    const exportMetadata: ExportMetadata = {
      format: version === '1.2' ? 'scorm_1.2' : 'scorm_2004',
      version,
      itemCount: items.length,
      totalSize: buffer.length,
      exportedAt: new Date(),
      exportedBy: tenantId,
      contentSummary: content.map((item: { id: string; title?: string }) => ({
        id: item.id,
        type: contentType,
        title: item.title ?? 'Untitled',
        exported: true,
      })),
    };

    return {
      buffer,
      fileName,
      fileSize: buffer.length,
      contentType: 'application/zip',
      metadata: exportMetadata,
      warnings: [],
    };
  }

  private async loadContent(
    contentType: ContentType,
    contentIds: string[],
    tenantId: string
  ): Promise<any[]> {
    switch (contentType) {
      case 'lesson':
        return this.prisma.lesson.findMany({
          where: { id: { in: contentIds }, tenantId },
          include: { blocks: true, metadata: true },
        });
      case 'course':
        return this.prisma.course.findMany({
          where: { id: { in: contentIds }, tenantId },
          include: { lessons: { include: { blocks: true } }, metadata: true },
        });
      case 'assessment':
        return this.prisma.assessment.findMany({
          where: { id: { in: contentIds }, tenantId },
          include: { questions: true, metadata: true },
        });
      default:
        return [];
    }
  }

  private addSCORMAPI(zip: AdmZip, version: SCORMVersion): void {
    const apiCode = version === '1.2' 
      ? this.getSCORM12APICode() 
      : this.getSCORM2004APICode();
    
    zip.addFile('scripts/scorm-api.js', Buffer.from(apiCode, 'utf-8'));
  }

  private async generateContent(
    zip: AdmZip,
    content: any[],
    contentType: ContentType,
    ctx: ExportContext
  ): Promise<{ id: string; title: string; href: string }[]> {
    const items: { id: string; title: string; href: string }[] = [];

    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      const html = this.generateHTML(item, contentType, ctx.version);
      const fileName = `content/${item.id}/index.html`;
      
      zip.addFile(fileName, Buffer.from(html, 'utf-8'));
      items.push({ id: item.id, title: item.title || item.name, href: fileName });

      // Add any assets
      if (item.blocks) {
        for (const block of item.blocks) {
          if (block.type === 'image' && block.content?.url) {
            // Note: In production, fetch and add actual assets
          }
        }
      }
    }

    return items;
  }

  private generateHTML(item: any, contentType: ContentType, version: SCORMVersion): string {
    const apiInit = version === '1.2' 
      ? 'API.LMSInitialize("")' 
      : 'API_1484_11.Initialize("")';
    
    const apiFinish = version === '1.2' 
      ? 'API.LMSFinish("")' 
      : 'API_1484_11.Terminate("")';

    let bodyContent = '';
    
    if (contentType === 'lesson' && item.blocks) {
      bodyContent = item.blocks.map((block: any) => this.renderBlock(block)).join('\n');
    } else if (contentType === 'assessment' && item.questions) {
      bodyContent = this.renderAssessment(item);
    } else {
      bodyContent = `<h1>${item.title || item.name}</h1><p>${item.description || ''}</p>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${item.title || item.name}</title>
  <script src="../scripts/scorm-api.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .block { margin: 20px 0; }
    .question { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
  </style>
</head>
<body>
  <script>
    window.onload = function() { ${apiInit}; };
    window.onunload = function() { ${apiFinish}; };
  </script>
  ${bodyContent}
</body>
</html>`;
  }

  private renderBlock(block: any): string {
    switch (block.type) {
      case 'text':
        return `<div class="block text-block">${block.content?.html || ''}</div>`;
      case 'image':
        return `<div class="block image-block"><img src="${block.content?.url || ''}" alt="${block.content?.alt || ''}" /></div>`;
      case 'video':
        return `<div class="block video-block"><video src="${block.content?.url || ''}" controls></video></div>`;
      case 'heading':
        const level = block.content?.level || 2;
        return `<h${level} class="block heading-block">${block.content?.text || ''}</h${level}>`;
      default:
        return `<div class="block">${JSON.stringify(block.content)}</div>`;
    }
  }

  private renderAssessment(assessment: any): string {
    const questions = assessment.questions || [];
    return `
      <h1>${assessment.title}</h1>
      <form id="assessment-form">
        ${questions.map((q: any, i: number) => `
          <div class="question">
            <p><strong>Question ${i + 1}:</strong> ${q.text || q.prompt}</p>
            ${this.renderQuestionOptions(q)}
          </div>
        `).join('')}
        <button type="submit">Submit</button>
      </form>
    `;
  }

  private renderQuestionOptions(question: any): string {
    const options = question.options || question.choices || [];
    return options.map((opt: any, i: number) => `
      <label>
        <input type="radio" name="q_${question.id}" value="${i}" />
        ${opt.text || opt}
      </label><br/>
    `).join('');
  }

  private generateManifest(
    items: { id: string; title: string; href: string }[],
    content: { id: string; title?: string; description?: string }[],
    ctx: ExportContext
  ): string {
    const { version, options } = ctx;
    const orgId = `ORG-${Date.now()}`;
    const metadata = options.lomMetadata ?? this.getDefaultMetadata(content);

    if (version === '1.2') {
      return this.generateSCORM12Manifest(items, orgId, metadata);
    } else {
      return this.generateSCORM2004Manifest(items, orgId, metadata, options);
    }
  }

  private generateSCORM12Manifest(
    items: { id: string; title: string; href: string }[],
    orgId: string,
    metadata: LOMMetadata
  ): string {
    const manifest = {
      manifest: {
        $: {
          identifier: `MANIFEST-${Date.now()}`,
          version: '1.0',
          xmlns: 'http://www.imsproject.org/xsd/imscp_rootv1p1p2',
          'xmlns:adlcp': 'http://www.adlnet.org/xsd/adlcp_rootv1p2',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        },
        metadata: [{
          schema: ['ADL SCORM'],
          schemaversion: ['1.2'],
          'lom:lom': [this.buildLOMMetadata(metadata)],
        }],
        organizations: [{
          $: { default: orgId },
          organization: [{
            $: { identifier: orgId },
            title: [metadata.general?.title || 'AIVO Export'],
            item: items.map(item => ({
              $: { identifier: `ITEM-${item.id}`, identifierref: `RES-${item.id}` },
              title: [item.title],
            })),
          }],
        }],
        resources: [{
          resource: items.map(item => ({
            $: {
              identifier: `RES-${item.id}`,
              type: 'webcontent',
              'adlcp:scormtype': 'sco',
              href: item.href,
            },
            file: [{ $: { href: item.href } }, { $: { href: 'scripts/scorm-api.js' } }],
          })),
        }],
      },
    };

    return this.xmlBuilder.buildObject(manifest);
  }

  private generateSCORM2004Manifest(
    items: { id: string; title: string; href: string }[],
    orgId: string,
    metadata: LOMMetadata,
    options: SCORMExportOptions
  ): string {
    const manifest = {
      manifest: {
        $: {
          identifier: `MANIFEST-${Date.now()}`,
          version: '1.3',
          xmlns: 'http://www.imsglobal.org/xsd/imscp_v1p1',
          'xmlns:adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
          'xmlns:adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
          'xmlns:adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
          'xmlns:imsss': 'http://www.imsglobal.org/xsd/imsss',
        },
        metadata: [{
          schema: ['ADL SCORM'],
          schemaversion: ['2004 4th Edition'],
        }],
        organizations: [{
          $: { default: orgId },
          organization: [{
            $: { identifier: orgId },
            title: [metadata.general?.title || 'AIVO Export'],
            item: items.map(item => ({
              $: { identifier: `ITEM-${item.id}`, identifierref: `RES-${item.id}` },
              title: [item.title],
              ...(options.sequencingRules ? { 'imsss:sequencing': [this.buildSequencing(options.sequencingRules)] } : {}),
            })),
          }],
        }],
        resources: [{
          resource: items.map(item => ({
            $: {
              identifier: `RES-${item.id}`,
              type: 'webcontent',
              'adlcp:scormType': 'sco',
              href: item.href,
            },
            file: [{ $: { href: item.href } }],
          })),
        }],
      },
    };

    return this.xmlBuilder.buildObject(manifest);
  }

  private buildLOMMetadata(metadata: LOMMetadata): Record<string, unknown> {
    const title = typeof metadata.general?.title === 'object' ? metadata.general.title.string : metadata.general?.title;
    const description = typeof metadata.general?.description === 'object' ? metadata.general.description.string : metadata.general?.description;
    const language = Array.isArray(metadata.general?.language) ? metadata.general.language[0] : metadata.general?.language;
    return {
      'lom:general': [{
        'lom:title': [{ 'lom:string': [title ?? 'AIVO Content'] }],
        'lom:description': [{ 'lom:string': [description ?? ''] }],
        'lom:language': [language ?? 'en'],
      }],
    };
  }

  private buildSequencing(rules: SequencingRules): Record<string, unknown> {
    return {
      'imsss:controlMode': [{
        $: { 
          choice: rules.controlMode?.choice !== false ? 'true' : 'false',
          flow: 'true',
        },
      }],
    };
  }

  private getDefaultMetadata(content: { title?: string; name?: string; description?: string }[]): LOMMetadata {
    const first = content[0];
    return {
      general: {
        title: { string: first?.title ?? first?.name ?? 'AIVO Export' },
        description: { string: first?.description ?? '' },
        language: ['en'],
      },
    };
  }

  private getSCORM12APICode(): string {
    return `// SCORM 1.2 API Wrapper
var API = {
  LMSInitialize: function(param) { console.log('LMSInitialize'); return "true"; },
  LMSFinish: function(param) { console.log('LMSFinish'); return "true"; },
  LMSGetValue: function(element) { return ""; },
  LMSSetValue: function(element, value) { return "true"; },
  LMSCommit: function(param) { return "true"; },
  LMSGetLastError: function() { return "0"; },
  LMSGetErrorString: function(code) { return "No error"; },
  LMSGetDiagnostic: function(code) { return ""; }
};`;
  }

  private getSCORM2004APICode(): string {
    return `// SCORM 2004 API Wrapper
var API_1484_11 = {
  Initialize: function(param) { console.log('Initialize'); return "true"; },
  Terminate: function(param) { console.log('Terminate'); return "true"; },
  GetValue: function(element) { return ""; },
  SetValue: function(element, value) { return "true"; },
  Commit: function(param) { return "true"; },
  GetLastError: function() { return "0"; },
  GetErrorString: function(code) { return "No error"; },
  GetDiagnostic: function(code) { return ""; }
};`;
  }
}
