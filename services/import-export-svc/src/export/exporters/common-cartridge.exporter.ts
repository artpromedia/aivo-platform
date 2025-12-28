// ══════════════════════════════════════════════════════════════════════════════
// COMMON CARTRIDGE EXPORTER - Exports to CC 1.0, 1.1, 1.2, 1.3 formats
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { Builder } from 'xml2js';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportResult, ContentType, CCExportOptions, LOMMetadata, ExportMetadata } from '../export.types';

type CCVersion = '1.0' | '1.1' | '1.2' | '1.3';

interface CCResource {
  id: string;
  type: string;
  href: string;
  files: string[];
  metadata?: any;
}

@Injectable()
export class CommonCartridgeExporter {
  private readonly logger = new Logger(CommonCartridgeExporter.name);
  private xmlBuilder = new Builder({ headless: false, renderOpts: { pretty: true } });

  constructor(private prisma: PrismaService) {}

  async export(
    tenantId: string,
    contentType: ContentType,
    contentIds: string[],
    options: CCExportOptions = {}
  ): Promise<ExportResult> {
    const version = options.version ?? '1.3';
    this.logger.log(`Starting Common Cartridge export version=${version} contentType=${contentType} count=${contentIds.length}`);
    options.onProgress?.(5, 'Loading content...');

    const content = await this.loadContent(contentType, contentIds, tenantId);
    options.onProgress?.(15, 'Generating package structure...');

    const zip = new AdmZip();
    const resources: CCResource[] = [];
    const warnings: string[] = [];

    // Export content items
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      const progress = 15 + (55 * (i + 1) / content.length);
      options.onProgress?.(progress, `Exporting ${item.title || item.id}...`);

      const itemResources = await this.exportContentItem(zip, item, contentType, version);
      resources.push(...itemResources);
    }

    // Add QTI assessments if included
    if (options.includeQTI !== false && contentType === 'course') {
      options.onProgress?.(75, 'Adding assessments...');
      const assessmentResources = await this.exportAssessments(zip, content, tenantId, version);
      resources.push(...assessmentResources);
    }

    // Generate manifest
    options.onProgress?.(85, 'Creating manifest...');
    const lomMetadata = options.metadata ?? this.getDefaultMetadata(content);
    const manifest = this.createManifest(resources, lomMetadata, version);
    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));

    options.onProgress?.(100, 'Complete');

    const buffer = zip.toBuffer();
    const exportMetadata: ExportMetadata = {
      format: 'common_cartridge',
      version,
      itemCount: content.length,
      assetCount: resources.length,
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
      fileName: `common_cartridge_${version.replace('.', '')}_${Date.now()}.imscc`,
      fileSize: buffer.length,
      contentType: 'application/zip',
      metadata: exportMetadata,
      warnings,
    };
  }

  private async loadContent(contentType: ContentType, ids: string[], tenantId: string): Promise<any[]> {
    switch (contentType) {
      case 'course':
        return this.prisma.course.findMany({
          where: { id: { in: ids }, tenantId },
          include: { lessons: { include: { blocks: true } }, metadata: true },
        });
      case 'lesson':
        return this.prisma.lesson.findMany({
          where: { id: { in: ids }, tenantId },
          include: { blocks: true },
        });
      default:
        return [];
    }
  }

  private async exportContentItem(
    zip: AdmZip,
    item: any,
    contentType: ContentType,
    version: CCVersion
  ): Promise<CCResource[]> {
    const resources: CCResource[] = [];

    if (contentType === 'course') {
      // Export course as web content with lessons
      const lessons = item.lessons || [];
      for (const lesson of lessons) {
        const res = this.exportLesson(zip, lesson, item.id);
        resources.push(res);
      }

      // Add course overview
      const overviewHtml = this.generateCourseOverview(item);
      const overviewPath = `webcontent/${item.id}/overview.html`;
      zip.addFile(overviewPath, Buffer.from(overviewHtml, 'utf-8'));
      resources.push({
        id: `overview_${item.id}`,
        type: 'webcontent',
        href: overviewPath,
        files: [overviewPath],
      });
    } else if (contentType === 'lesson') {
      const res = this.exportLesson(zip, item, '');
      resources.push(res);
    }

    return resources;
  }

  private exportLesson(zip: AdmZip, lesson: any, courseId: string): CCResource {
    const html = this.generateLessonHTML(lesson);
    const basePath = courseId ? `webcontent/${courseId}/${lesson.id}` : `webcontent/${lesson.id}`;
    const filePath = `${basePath}/index.html`;

    zip.addFile(filePath, Buffer.from(html, 'utf-8'));

    // Export any embedded assets
    const files = [filePath];
    if (lesson.blocks) {
      for (const block of lesson.blocks) {
        if (block.type === 'image' && block.content?.url) {
          // In production: download and add asset
        }
      }
    }

    return {
      id: `lesson_${lesson.id}`,
      type: 'webcontent',
      href: filePath,
      files,
      metadata: { title: lesson.title },
    };
  }

  private generateLessonHTML(lesson: any): string {
    const blocks = lesson.blocks || [];
    const content = blocks.map((b: any) => this.renderBlock(b)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lesson.title || 'Lesson'}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    .block { margin: 16px 0; }
    img { max-width: 100%; height: auto; }
    video { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${lesson.title || 'Lesson'}</h1>
  ${content}
</body>
</html>`;
  }

  private renderBlock(block: any): string {
    switch (block.type) {
      case 'text':
        return `<div class="block text">${block.content?.html || ''}</div>`;
      case 'heading':
        const lvl = block.content?.level || 2;
        return `<h${lvl} class="block">${block.content?.text || ''}</h${lvl}>`;
      case 'image':
        return `<figure class="block"><img src="${block.content?.url || ''}" alt="${block.content?.alt || ''}" /></figure>`;
      case 'video':
        return `<div class="block"><video src="${block.content?.url || ''}" controls></video></div>`;
      case 'list':
        const items = block.content?.items || [];
        const tag = block.content?.ordered ? 'ol' : 'ul';
        return `<${tag} class="block">${items.map((i: string) => `<li>${i}</li>`).join('')}</${tag}>`;
      default:
        return `<div class="block">${JSON.stringify(block.content || {})}</div>`;
    }
  }

  private generateCourseOverview(course: any): string {
    const lessons = course.lessons || [];
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${course.title || 'Course'}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .lesson-list { list-style: none; padding: 0; }
    .lesson-list li { padding: 12px; margin: 8px 0; background: #f5f5f5; border-radius: 4px; }
    .lesson-list a { text-decoration: none; color: #0066cc; }
  </style>
</head>
<body>
  <h1>${course.title || 'Course'}</h1>
  <p>${course.description || ''}</p>
  <h2>Lessons</h2>
  <ul class="lesson-list">
    ${lessons.map((l: any) => `<li><a href="${l.id}/index.html">${l.title}</a></li>`).join('\n')}
  </ul>
</body>
</html>`;
  }

  private async exportAssessments(
    zip: AdmZip,
    courses: any[],
    tenantId: string,
    version: CCVersion
  ): Promise<CCResource[]> {
    const resources: CCResource[] = [];

    for (const course of courses) {
      const assessments = await this.prisma.assessment.findMany({
        where: { courseId: course.id, tenantId },
        include: { questions: true },
      });

      for (const assessment of assessments) {
        const qtiXml = this.generateQTIAssessment(assessment);
        const path = `assessments/${assessment.id}/assessment.xml`;
        zip.addFile(path, Buffer.from(qtiXml, 'utf-8'));

        resources.push({
          id: `assessment_${assessment.id}`,
          type: 'imsqti_xmlv1p2/imscc_xmlv1p1/assessment',
          href: path,
          files: [path],
          metadata: { title: assessment.title },
        });
      }
    }

    return resources;
  }

  private generateQTIAssessment(assessment: any): string {
    const questions = assessment.questions || [];
    const items = questions.map((q: any, i: number) => this.generateQTIItem(q, i));

    const qti = {
      questestinterop: {
        $: { xmlns: 'http://www.imsglobal.org/xsd/ims_qtiasiv1p2' },
        assessment: [{
          $: { ident: assessment.id, title: assessment.title },
          section: [{
            $: { ident: 'root_section' },
            item: items,
          }],
        }],
      },
    };

    return this.xmlBuilder.buildObject(qti);
  }

  private generateQTIItem(question: any, index: number): any {
    const choices = question.options || question.choices || [];
    const correctIdx = choices.findIndex((c: any) => c.isCorrect || c.correct);

    return {
      $: { ident: question.id, title: `Question ${index + 1}` },
      presentation: [{
        material: [{ mattext: [{ $: { texttype: 'text/html' }, _: question.text || question.prompt }] }],
        response_lid: [{
          $: { ident: 'response1', rcardinality: 'Single' },
          render_choice: [{
            response_label: choices.map((c: any, i: number) => ({
              $: { ident: `choice_${i}` },
              material: [{ mattext: [c.text || c] }],
            })),
          }],
        }],
      }],
      resprocessing: [{
        respcondition: [{
          $: { continue: 'No' },
          conditionvar: [{ varequal: [{ $: { respident: 'response1' }, _: `choice_${correctIdx}` }] }],
          setvar: [{ $: { action: 'Set', varname: 'SCORE' }, _: '100' }],
        }],
      }],
    };
  }

  private createManifest(resources: CCResource[], metadata: LOMMetadata, version: CCVersion): string {
    const schemaVersionMap: Record<CCVersion, string> = {
      '1.0': '1.0.0', '1.1': '1.1.0', '1.2': '1.2.0', '1.3': '1.3.0',
    };

    const manifest = {
      manifest: {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imsccv1p3/imscp_v1p1',
          'xmlns:lom': 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/resource',
          'xmlns:lomimscc': 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/manifest',
          identifier: `CC_${Date.now()}`,
        },
        metadata: [{
          schema: ['IMS Common Cartridge'],
          schemaversion: [schemaVersionMap[version]],
          'lomimscc:lom': [{
            'lomimscc:general': [{
              'lomimscc:title': [{ 'lomimscc:string': [metadata.general?.title || 'AIVO Export'] }],
            }],
          }],
        }],
        organizations: [{
          organization: [{
            $: { identifier: 'org1', structure: 'rooted-hierarchy' },
            item: resources.map(r => ({
              $: { identifier: `item_${r.id}`, identifierref: r.id },
              title: [r.metadata?.title || r.id],
            })),
          }],
        }],
        resources: [{
          resource: resources.map(r => ({
            $: { identifier: r.id, type: r.type, href: r.href },
            file: r.files.map(f => ({ $: { href: f } })),
          })),
        }],
      },
    };

    return this.xmlBuilder.buildObject(manifest);
  }

  private getDefaultMetadata(content: { title?: string; description?: string }[]): LOMMetadata {
    const first = content[0];
    return {
      general: {
        title: { string: first?.title ?? 'AIVO Export' },
        description: { string: first?.description ?? '' },
        language: ['en'],
      },
    };
  }
}
