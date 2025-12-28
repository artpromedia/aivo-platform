// ══════════════════════════════════════════════════════════════════════════════
// QTI EXPORTER - Exports assessments to QTI 2.1 and 3.0 formats
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { Builder } from 'xml2js';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportResult, ContentType, QTIExportOptions, ExportMetadata } from '../export.types';

type QTIVersion = '2.1' | '3.0';

@Injectable()
export class QTIExporter {
  private readonly logger = new Logger(QTIExporter.name);
  private xmlBuilder = new Builder({ headless: false, renderOpts: { pretty: true } });

  constructor(private prisma: PrismaService) {}

  async export(
    tenantId: string,
    contentType: ContentType,
    contentIds: string[],
    version: QTIVersion,
    options: QTIExportOptions = {}
  ): Promise<ExportResult> {
    this.logger.log(`Starting QTI export version=${version} contentType=${contentType} count=${contentIds.length}`);
    options.onProgress?.(5, 'Loading assessments...');

    const content = await this.loadContent(contentType, contentIds, tenantId);
    options.onProgress?.(20, 'Generating QTI items...');

    const zip = new AdmZip();
    const warnings: string[] = [];

    // Export each item/assessment
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      const progress = 20 + (60 * (i + 1) / content.length);
      options.onProgress?.(progress, `Exporting ${item.title || item.id}...`);

      if (contentType === 'question') {
        const xml = this.exportQuestion(item, version);
        zip.addFile(`items/${item.id}.xml`, Buffer.from(xml, 'utf-8'));
      } else if (contentType === 'assessment') {
        const { testXml, itemXmls } = this.exportAssessment(item, version);
        zip.addFile(`tests/${item.id}.xml`, Buffer.from(testXml, 'utf-8'));
        itemXmls.forEach((xml, idx) => {
          zip.addFile(`items/${item.id}_q${idx + 1}.xml`, Buffer.from(xml, 'utf-8'));
        });
      }
    }

    // Add manifest
    options.onProgress?.(85, 'Creating manifest...');
    const manifest = this.createManifest(content, contentType, version);
    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));

    options.onProgress?.(100, 'Complete');

    const buffer = zip.toBuffer();
    const exportMetadata: ExportMetadata = {
      format: version === '3.0' ? 'qti_3.0' : 'qti_2.1',
      version,
      itemCount: content.length,
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
      fileName: `qti_${version.replace('.', '')}_${Date.now()}.zip`,
      fileSize: buffer.length,
      contentType: 'application/zip',
      metadata: exportMetadata,
      warnings,
    };
  }

  private async loadContent(contentType: ContentType, ids: string[], tenantId: string): Promise<any[]> {
    if (contentType === 'question') {
      return this.prisma.question.findMany({ where: { id: { in: ids }, tenantId } });
    }
    return this.prisma.assessment.findMany({
      where: { id: { in: ids }, tenantId },
      include: { questions: true },
    });
  }

  private exportQuestion(question: any, version: QTIVersion): string {
    if (version === '3.0') return this.exportQuestionQTI3(question);
    return this.exportQuestionQTI21(question);
  }

  private exportQuestionQTI21(q: any): string {
    const responseDecl = this.buildResponseDeclaration21(q);
    const outcomeDecl = this.buildOutcomeDeclaration21();
    const itemBody = this.buildItemBody21(q);
    const responseProcessing = this.buildResponseProcessing21(q);

    const item = {
      assessmentItem: {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imsqti_v2p1',
          identifier: q.id,
          title: q.title || q.text?.substring(0, 50) || 'Question',
          adaptive: 'false',
          timeDependent: 'false',
        },
        responseDeclaration: [responseDecl],
        outcomeDeclaration: [outcomeDecl],
        itemBody: [itemBody],
        responseProcessing: [responseProcessing],
      },
    };

    return this.xmlBuilder.buildObject(item);
  }

  private exportQuestionQTI3(q: any): string {
    const item = {
      'qti-assessment-item': {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0',
          identifier: q.id,
          title: q.title || 'Question',
          adaptive: 'false',
          'time-dependent': 'false',
        },
        'qti-response-declaration': [this.buildResponseDeclaration3(q)],
        'qti-outcome-declaration': [{ $: { identifier: 'SCORE', cardinality: 'single', 'base-type': 'float' } }],
        'qti-item-body': [this.buildItemBody3(q)],
        'qti-response-processing': [{ $: { template: 'http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct' } }],
      },
    };

    return this.xmlBuilder.buildObject(item);
  }

  private buildResponseDeclaration21(q: any): any {
    const type = q.type || 'multiple_choice';
    const correctAnswer = this.getCorrectAnswer(q);

    return {
      $: {
        identifier: 'RESPONSE',
        cardinality: type === 'multiple_select' ? 'multiple' : 'single',
        baseType: 'identifier',
      },
      correctResponse: [{ value: [correctAnswer] }],
    };
  }

  private buildResponseDeclaration3(q: any): any {
    return {
      $: { identifier: 'RESPONSE', cardinality: 'single', 'base-type': 'identifier' },
      'qti-correct-response': [{ 'qti-value': [this.getCorrectAnswer(q)] }],
    };
  }

  private buildOutcomeDeclaration21(): any {
    return {
      $: { identifier: 'SCORE', cardinality: 'single', baseType: 'float' },
      defaultValue: [{ value: ['0'] }],
    };
  }

  private buildItemBody21(q: any): any {
    const type = q.type || 'multiple_choice';
    const prompt = q.text || q.prompt || '';
    const choices = q.options || q.choices || [];

    if (type === 'multiple_choice' || type === 'multiple_select') {
      return {
        choiceInteraction: [{
          $: { responseIdentifier: 'RESPONSE', shuffle: 'true', maxChoices: type === 'multiple_select' ? '0' : '1' },
          prompt: [prompt],
          simpleChoice: choices.map((c: any, i: number) => ({
            $: { identifier: `choice_${i}` },
            _: c.text || c,
          })),
        }],
      };
    }

    if (type === 'text' || type === 'short_answer') {
      return {
        extendedTextInteraction: [{
          $: { responseIdentifier: 'RESPONSE' },
          prompt: [prompt],
        }],
      };
    }

    return { p: [prompt] };
  }

  private buildItemBody3(q: any): any {
    const choices = q.options || q.choices || [];
    return {
      'qti-choice-interaction': [{
        $: { 'response-identifier': 'RESPONSE', shuffle: 'true', 'max-choices': '1' },
        'qti-prompt': [q.text || q.prompt || ''],
        'qti-simple-choice': choices.map((c: any, i: number) => ({
          $: { identifier: `choice_${i}` },
          _: c.text || c,
        })),
      }],
    };
  }

  private buildResponseProcessing21(q: any): any {
    return { $: { template: 'http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct' } };
  }

  private getCorrectAnswer(q: any): string {
    const choices = q.options || q.choices || [];
    const correctIdx = choices.findIndex((c: any) => c.isCorrect || c.correct);
    return correctIdx >= 0 ? `choice_${correctIdx}` : 'choice_0';
  }

  private exportAssessment(assessment: any, version: QTIVersion): { testXml: string; itemXmls: string[] } {
    const questions = assessment.questions || [];
    const itemXmls = questions.map((q: any) => this.exportQuestion(q, version));

    const testXml = version === '3.0'
      ? this.buildAssessmentTest3(assessment, questions)
      : this.buildAssessmentTest21(assessment, questions);

    return { testXml, itemXmls };
  }

  private buildAssessmentTest21(assessment: any, questions: any[]): string {
    const test = {
      assessmentTest: {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imsqti_v2p1',
          identifier: assessment.id,
          title: assessment.title,
        },
        testPart: [{
          $: { identifier: 'part1', navigationMode: 'linear', submissionMode: 'individual' },
          assessmentSection: [{
            $: { identifier: 'section1', title: 'Main Section', visible: 'true' },
            assessmentItemRef: questions.map((q: any, i: number) => ({
              $: { identifier: `itemref_${i}`, href: `../items/${assessment.id}_q${i + 1}.xml` },
            })),
          }],
        }],
      },
    };

    return this.xmlBuilder.buildObject(test);
  }

  private buildAssessmentTest3(assessment: any, questions: any[]): string {
    const test = {
      'qti-assessment-test': {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0',
          identifier: assessment.id,
          title: assessment.title,
        },
        'qti-test-part': [{
          $: { identifier: 'part1', 'navigation-mode': 'linear', 'submission-mode': 'individual' },
          'qti-assessment-section': [{
            $: { identifier: 'section1', title: 'Main Section', visible: 'true' },
            'qti-assessment-item-ref': questions.map((q: any, i: number) => ({
              $: { identifier: `itemref_${i}`, href: `../items/${assessment.id}_q${i + 1}.xml` },
            })),
          }],
        }],
      },
    };

    return this.xmlBuilder.buildObject(test);
  }

  private createManifest(content: any[], contentType: ContentType, version: QTIVersion): string {
    const resources = content.map(item => ({
      $: { identifier: `res_${item.id}`, type: 'imsqti_item_xmlv2p1', href: `items/${item.id}.xml` },
      file: [{ $: { href: `items/${item.id}.xml` } }],
    }));

    const manifest = {
      manifest: {
        $: {
          xmlns: 'http://www.imsglobal.org/xsd/imscp_v1p1',
          identifier: `QTI_${Date.now()}`,
        },
        organizations: [{}],
        resources: [{ resource: resources }],
      },
    };

    return this.xmlBuilder.buildObject(manifest);
  }
}
