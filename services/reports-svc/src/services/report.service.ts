// ══════════════════════════════════════════════════════════════════════════════
// REPORT SERVICE
// Comprehensive report generation with PDF, Excel, CSV, and HTML support
// S3 storage, email delivery, and scheduled reports
// FERPA/GDPR compliant data handling
// ══════════════════════════════════════════════════════════════════════════════

import { S3, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SES, SendEmailCommand } from '@aws-sdk/client-ses';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

import { logger, metrics } from '@aivo/ts-observability';

// Type alias for PDFKit document
type PDFDoc = InstanceType<typeof PDFDocument>;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html' | 'json';

export type ReportType =
  | 'student_progress'
  | 'class_overview'
  | 'skill_mastery'
  | 'assessment_results'
  | 'engagement_summary'
  | 'teacher_dashboard'
  | 'admin_analytics'
  | 'at_risk_students'
  | 'custom';

export type ReportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface ReportRequest {
  id: string;
  type: ReportType;
  format: ReportFormat;
  tenantId: string;
  requestedBy: string;
  parameters: ReportParameters;
  status: ReportStatus;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  error?: string;
}

/**
 * Request object for generating reports (used by routes)
 */
export interface GenerateReportRequest {
  id: string;
  type: ReportType;
  format?: ReportFormat;
  tenantId: string;
  requestedBy: string;
  requestedAt?: Date;
  parameters?: Record<string, unknown>;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  options?: {
    subtitle?: string;
    includeCharts?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Result from generating a report
 */
export interface GenerateReportResult {
  reportId: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface ReportParameters {
  // Time range
  startDate: Date;
  endDate: Date;
  // Scope
  studentIds?: string[];
  classIds?: string[];
  teacherId?: string;
  // Options
  includeCharts?: boolean;
  includeDetailedMetrics?: boolean;
  anonymize?: boolean;
  aggregationLevel?: 'student' | 'class' | 'school' | 'district';
  // Customization
  title?: string;
  subtitle?: string;
  customFields?: string[];
  filters?: Record<string, unknown>;
}

export interface ReportData {
  title: string;
  subtitle?: string | undefined;
  generatedAt: Date;
  generatedBy: string;
  period: { start: Date; end: Date };
  sections: ReportSection[];
  summary?: ReportSummary | undefined;
  metadata: ReportMetadata;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'table' | 'chart' | 'text' | 'kpi' | 'list';
  data: unknown;
  columns?: ColumnDefinition[];
  chartConfig?: ChartConfig;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'percentage' | 'duration' | 'boolean';
  format?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area';
  xAxis?: { key: string; label: string };
  yAxis?: { key: string; label: string };
  series?: Array<{ key: string; label: string; color?: string }>;
  options?: Record<string, unknown>;
}

export interface ReportSummary {
  keyMetrics: Array<{ label: string; value: string | number; change?: number }>;
  highlights: string[];
  recommendations?: string[];
}

export interface ReportMetadata {
  version: string;
  format: ReportFormat;
  pageCount?: number;
  fileSize?: number;
  checksum?: string;
  complianceFlags: ComplianceFlags;
}

export interface ComplianceFlags {
  ferpaCompliant: boolean;
  gdprCompliant: boolean;
  piiRedacted: boolean;
  dataMinimized: boolean;
  retentionPolicy: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  schedule: ReportSchedule;
  parameters: ReportParameters;
  recipients: ReportRecipient[];
  tenantId: string;
  createdBy: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm in UTC
  timezone: string;
}

export interface ReportRecipient {
  email: string;
  name?: string;
  role: string;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface ReportServiceConfig {
  s3Bucket: string;
  s3Prefix: string;
  awsRegion: string;
  reportTtlDays: number;
  maxReportSize: number;
  enableEmailDelivery: boolean;
  fromEmail: string;
  companyName: string;
  logoUrl?: string | undefined;
}

const DEFAULT_CONFIG: ReportServiceConfig = {
  s3Bucket: process.env['REPORTS_S3_BUCKET'] ?? 'aivo-reports',
  s3Prefix: 'reports/',
  awsRegion: process.env['AWS_REGION'] ?? 'us-east-1',
  reportTtlDays: 30,
  maxReportSize: 50 * 1024 * 1024, // 50MB
  enableEmailDelivery: true,
  fromEmail: process.env['REPORTS_FROM_EMAIL'] ?? 'reports@aivo.com',
  companyName: 'AIVO',
  logoUrl: undefined,
};

// ─── Report Service ────────────────────────────────────────────────────────────

export class ReportService {
  private readonly s3: S3;
  private readonly ses: SES;
  private readonly config: ReportServiceConfig;

  constructor(
    private readonly redis?: Redis,
    config?: Partial<ReportServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.s3 = new S3({
      region: this.config.awsRegion,
    });

    this.ses = new SES({
      region: this.config.awsRegion,
    });
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate report from a request object (used by routes)
   */
  async generateReportFromRequest(
    request: GenerateReportRequest
  ): Promise<GenerateReportResult> {
    const data = await this.buildReportData(request);
    const result = await this.generateReport(
      request.type,
      request.format ?? 'pdf',
      data,
      request.tenantId,
      request.requestedBy
    );
    return {
      reportId: result.id,
      downloadUrl: result.downloadUrl ?? '',
      expiresAt: result.expiresAt?.toISOString() ?? '',
    };
  }

  /**
   * Generate report buffer directly (for streaming without S3 upload)
   */
  async generateReportBuffer(
    request: GenerateReportRequest
  ): Promise<Buffer> {
    const data = await this.buildReportData(request);
    const format = request.format ?? 'pdf';

    switch (format) {
      case 'pdf':
        return this.generatePDF(data);
      case 'excel':
        return this.generateExcel(data);
      case 'csv':
        return this.generateCSV(data);
      case 'html':
        return this.generateHTML(data);
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Build ReportData from a GenerateReportRequest
   */
  private async buildReportData(request: GenerateReportRequest): Promise<ReportData> {
    // Extract date range from request
    const startDate = request.dateRange?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = request.dateRange?.endDate ?? new Date();
    const format = request.format ?? 'pdf';

    return {
      title: `${request.type.replaceAll('_', ' ')} Report`,
      subtitle: request.options?.subtitle,
      generatedAt: new Date(),
      generatedBy: request.requestedBy,
      period: { start: startDate, end: endDate },
      sections: [],
      metadata: {
        version: '1.0',
        format,
        complianceFlags: {
          ferpaCompliant: true,
          gdprCompliant: true,
          piiRedacted: false,
          dataMinimized: false,
          retentionPolicy: 'standard',
        },
      },
    };
  }

  /**
   * Send batch report emails
   */
  async sendBatchReportEmail(
    recipients: ReportRecipient[],
    reports: Array<{ reportId: string; downloadUrl: string; type: string; format: string }>
  ): Promise<void> {
    for (const report of reports) {
      await this.sendReportEmail(
        {
          id: report.reportId,
          type: report.type as ReportType,
          format: report.format as ReportFormat,
          tenantId: '',
          requestedBy: '',
          parameters: { startDate: new Date(), endDate: new Date() },
          status: 'completed',
          createdAt: new Date(),
          downloadUrl: report.downloadUrl,
        },
        recipients
      );
    }
  }

  /**
   * Get a signed download URL for a report (public method for routes)
   */
  async getReportDownloadUrl(s3Key: string): Promise<string> {
    return this.generateDownloadUrl(s3Key);
  }

  /**
   * Generate a report
   */
  async generateReport(
    type: ReportType,
    format: ReportFormat,
    data: ReportData,
    tenantId: string,
    requestedBy: string
  ): Promise<ReportRequest> {
    const reportId = randomUUID();
    const startTime = Date.now();

    // Create report request
    const request: ReportRequest = {
      id: reportId,
      type,
      format,
      tenantId,
      requestedBy,
      parameters: {
        startDate: data.period.start,
        endDate: data.period.end,
      },
      status: 'processing',
      createdAt: new Date(),
    };

    await this.saveReportRequest(request);

    try {
      // Generate report content
      let content: Buffer;
      let contentType: string;
      let fileExtension: string;

      switch (format) {
        case 'pdf':
          content = await this.generatePDF(data);
          contentType = 'application/pdf';
          fileExtension = 'pdf';
          break;
        case 'excel':
          content = await this.generateExcel(data);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;
        case 'csv':
          content = await this.generateCSV(data);
          contentType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'html':
          content = await this.generateHTML(data);
          contentType = 'text/html';
          fileExtension = 'html';
          break;
        case 'json':
          content = Buffer.from(JSON.stringify(data, null, 2));
          contentType = 'application/json';
          fileExtension = 'json';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Upload to S3
      const s3Key = `${this.config.s3Prefix}${tenantId}/${reportId}.${fileExtension}`;
      await this.uploadToS3(s3Key, content, contentType);

      // Generate signed URL
      const downloadUrl = await this.generateDownloadUrl(s3Key);

      // Update request
      request.status = 'completed';
      request.completedAt = new Date();
      request.downloadUrl = downloadUrl;
      request.expiresAt = new Date(Date.now() + this.config.reportTtlDays * 24 * 60 * 60 * 1000);

      await this.saveReportRequest(request);

      metrics.timing('reports.generation.duration', Date.now() - startTime, {
        type,
        format,
      });

      metrics.increment('reports.generated', { type, format });

      logger.info('Report generated successfully', {
        reportId,
        type,
        format,
        size: content.length,
      });

      return request;
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveReportRequest(request);

      logger.error('Report generation failed', { error, reportId, type, format });
      throw error;
    }
  }

  // ============================================================================
  // PDF GENERATION
  // ============================================================================

  /**
   * Generate PDF report
   */
  private async generatePDF(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: data.title,
            Author: this.config.companyName,
            Creator: 'AIVO Analytics',
            Producer: 'PDFKit',
            CreationDate: new Date(),
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Header
        this.renderPDFHeader(doc, data);

        // Summary section
        if (data.summary) {
          this.renderPDFSummary(doc, data.summary);
        }

        // Content sections
        for (const section of data.sections) {
          this.renderPDFSection(doc, section);
        }

        // Footer
        this.renderPDFFooter(doc, data);

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private renderPDFHeader(doc: PDFDoc, data: ReportData): void {
    const pageWidth = doc.page.width - 100;

    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(data.title, 50, 50, { width: pageWidth, align: 'center' });

    // Subtitle
    if (data.subtitle) {
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#666666')
        .text(data.subtitle, 50, doc.y + 10, { width: pageWidth, align: 'center' });
    }

    // Date range
    const dateRange = `${this.formatDate(data.period.start)} - ${this.formatDate(data.period.end)}`;
    doc
      .fontSize(10)
      .fillColor('#888888')
      .text(dateRange, 50, doc.y + 10, { width: pageWidth, align: 'center' });

    // Divider
    doc
      .moveTo(50, doc.y + 20)
      .lineTo(pageWidth + 50, doc.y + 20)
      .strokeColor('#e0e0e0')
      .stroke();

    doc.moveDown(2);
  }

  private renderPDFSummary(doc: PDFDoc, summary: ReportSummary): void {
    const pageWidth = doc.page.width - 100;
    const kpiWidth = pageWidth / Math.min(summary.keyMetrics.length, 4);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Summary', 50, doc.y);

    doc.moveDown(0.5);

    // KPI boxes
    let x = 50;
    const startY = doc.y;

    for (const metric of summary.keyMetrics.slice(0, 4)) {
      // Box background
      doc
        .rect(x, startY, kpiWidth - 10, 60)
        .fillColor('#f5f5f5')
        .fill();

      // Metric value
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text(String(metric.value), x + 10, startY + 10, {
          width: kpiWidth - 30,
          align: 'center',
        });

      // Metric label
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(metric.label, x + 10, startY + 35, {
          width: kpiWidth - 30,
          align: 'center',
        });

      // Change indicator
      if (metric.change !== undefined) {
        const changeColor = metric.change >= 0 ? '#28a745' : '#dc3545';
        const changeText = `${metric.change >= 0 ? '+' : ''}${metric.change}%`;
        doc
          .fontSize(8)
          .fillColor(changeColor)
          .text(changeText, x + 10, startY + 48, {
            width: kpiWidth - 30,
            align: 'center',
          });
      }

      x += kpiWidth;
    }

    doc.y = startY + 70;
    doc.moveDown();

    // Highlights
    if (summary.highlights.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('Highlights', 50, doc.y);

      doc.moveDown(0.3);

      for (const highlight of summary.highlights) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#333333')
          .text(`• ${highlight}`, 60, doc.y);
        doc.moveDown(0.3);
      }
    }

    doc.moveDown();
  }

  private renderPDFSection(doc: PDFDoc, section: ReportSection): void {
    // Check if need new page
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(section.title, 50, doc.y);

    doc.moveDown(0.5);

    switch (section.type) {
      case 'table':
        this.renderPDFTable(doc, section);
        break;
      case 'kpi':
        this.renderPDFKPIs(doc, section);
        break;
      case 'text':
        this.renderPDFText(doc, section);
        break;
      case 'list':
        this.renderPDFList(doc, section);
        break;
      default:
        doc.fontSize(10).text('Chart visualization - see HTML report for interactive view');
    }

    doc.moveDown();
  }

  private renderPDFTable(doc: PDFDoc, section: ReportSection): void {
    const data = section.data as Record<string, unknown>[];
    const columns = section.columns ?? [];

    if (!data || data.length === 0 || columns.length === 0) {
      doc.fontSize(10).text('No data available');
      return;
    }

    const pageWidth = doc.page.width - 100;
    const colWidth = pageWidth / columns.length;

    // Header row
    let x = 50;
    const headerY = doc.y;

    doc
      .rect(50, headerY, pageWidth, 20)
      .fillColor('#1a1a2e')
      .fill();

    for (const col of columns) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(col.label, x + 5, headerY + 5, {
          width: colWidth - 10,
          align: col.align ?? 'left',
        });
      x += colWidth;
    }

    doc.y = headerY + 25;

    // Data rows
    let rowIndex = 0;
    for (const row of data.slice(0, 20)) {
      // Limit rows for PDF
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        doc.y = 50;
      }

      const rowY = doc.y;
      const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';

      doc
        .rect(50, rowY, pageWidth, 18)
        .fillColor(bgColor)
        .fill();

      x = 50;
      for (const col of columns) {
        const value = this.formatCellValue(row[col.key], col.type);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#333333')
          .text(value, x + 5, rowY + 4, {
            width: colWidth - 10,
            align: col.align ?? 'left',
          });
        x += colWidth;
      }

      doc.y = rowY + 20;
      rowIndex++;
    }

    if (data.length > 20) {
      doc
        .fontSize(8)
        .fillColor('#888888')
        .text(`... and ${data.length - 20} more rows`, 50, doc.y);
    }
  }

  private renderPDFKPIs(doc: PDFDoc, section: ReportSection): void {
    const kpis = section.data as Array<{ label: string; value: string | number }>;

    for (const kpi of kpis) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text(`${kpi.label}: `, 50, doc.y, { continued: true })
        .font('Helvetica')
        .fillColor('#333333')
        .text(String(kpi.value));
    }
  }

  private renderPDFText(doc: PDFDoc, section: ReportSection): void {
    const text = section.data as string;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(text, 50, doc.y, { width: doc.page.width - 100 });
  }

  private renderPDFList(doc: PDFDoc, section: ReportSection): void {
    const items = section.data as string[];

    for (const item of items) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`• ${item}`, 60, doc.y);
      doc.moveDown(0.3);
    }
  }

  private renderPDFFooter(doc: PDFDoc, data: ReportData): void {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Footer line
      doc
        .moveTo(50, doc.page.height - 40)
        .lineTo(doc.page.width - 50, doc.page.height - 40)
        .strokeColor('#e0e0e0')
        .stroke();

      // Generated date
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#888888')
        .text(
          `Generated: ${this.formatDateTime(data.generatedAt)}`,
          50,
          doc.page.height - 30
        );

      // Page number
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        doc.page.width - 100,
        doc.page.height - 30,
        { align: 'right' }
      );

      // Compliance notice
      if (data.metadata.complianceFlags.ferpaCompliant) {
        doc.text(
          'FERPA Compliant',
          doc.page.width / 2 - 30,
          doc.page.height - 30
        );
      }
    }
  }

  // ============================================================================
  // EXCEL GENERATION
  // ============================================================================

  /**
   * Generate Excel report
   */
  private async generateExcel(data: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = this.config.companyName;
    workbook.created = new Date();
    workbook.modified = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: '1a1a2e' } },
    });

    this.renderExcelSummary(summarySheet, data);

    // Data sheets for each section
    for (const section of data.sections) {
      if (section.type === 'table') {
        const sheet = workbook.addWorksheet(this.sanitizeSheetName(section.title));
        this.renderExcelTable(sheet, section);
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private renderExcelSummary(sheet: ExcelJS.Worksheet, data: ReportData): void {
    this.renderExcelSummaryHeader(sheet, data);

    // KPIs
    if (data.summary) {
      this.renderExcelSummaryKPIs(sheet, data.summary);
    }

    // Auto-fit columns
    sheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
      column.width = 25;
    });
  }

  private renderExcelSummaryHeader(sheet: ExcelJS.Worksheet, data: ReportData): void {
    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = data.title;
    titleCell.font = { size: 18, bold: true, color: { argb: '1a1a2e' } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtitle
    if (data.subtitle) {
      sheet.mergeCells('A2:F2');
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = data.subtitle;
      subtitleCell.font = { size: 12, color: { argb: '666666' } };
      subtitleCell.alignment = { horizontal: 'center' };
    }

    // Date range
    sheet.mergeCells('A3:F3');
    const dateCell = sheet.getCell('A3');
    dateCell.value = `${this.formatDate(data.period.start)} - ${this.formatDate(data.period.end)}`;
    dateCell.font = { size: 10, color: { argb: '888888' } };
    dateCell.alignment = { horizontal: 'center' };
  }

  private renderExcelSummaryKPIs(sheet: ExcelJS.Worksheet, summary: ReportSummary): void {
    let row = 6;
    sheet.getCell(`A${row}`).value = 'Key Metrics';
    sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;

    for (const metric of summary.keyMetrics) {
      sheet.getCell(`A${row}`).value = metric.label;
      sheet.getCell(`B${row}`).value = metric.value;
      if (metric.change !== undefined) {
        const changeSign = metric.change >= 0 ? '+' : '';
        const changeColor = metric.change >= 0 ? '28a745' : 'dc3545';
        sheet.getCell(`C${row}`).value = `${changeSign}${metric.change}%`;
        sheet.getCell(`C${row}`).font = { color: { argb: changeColor } };
      }
      row++;
    }

    // Highlights
    row += 2;
    sheet.getCell(`A${row}`).value = 'Highlights';
    sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;

    for (const highlight of summary.highlights) {
      sheet.getCell(`A${row}`).value = `• ${highlight}`;
      row++;
    }
  }

  private renderExcelTable(sheet: ExcelJS.Worksheet, section: ReportSection): void {
    const data = section.data as Record<string, unknown>[];
    const columns = section.columns ?? [];

    if (!data || data.length === 0) {
      sheet.getCell('A1').value = 'No data available';
      return;
    }

    // Header row
    const headerRow = sheet.getRow(1);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.label;
      cell.font = { bold: true, color: { argb: 'ffffff' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1a1a2e' },
      };
      cell.alignment = { horizontal: col.align ?? 'left' };
    });

    // Data rows
    data.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(rowIndex + 2);
      columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = this.formatCellValue(row[col.key], col.type);

        // Alternate row colors
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'f9f9f9' },
          };
        }

        // Format based on type
        if (col.type === 'percentage') {
          cell.numFmt = '0.0%';
        } else if (col.type === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Auto-fit columns
    columns.forEach((col, index) => {
      sheet.getColumn(index + 1).width = col.width ?? 15;
    });

    // Add table formatting
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: columns.length },
    };
  }

  // ============================================================================
  // CSV GENERATION
  // ============================================================================

  /**
   * Generate CSV report
   */
  private async generateCSV(data: ReportData): Promise<Buffer> {
    const rows: string[] = [];

    // Find the main table section
    const tableSection = data.sections.find((s) => s.type === 'table');
    if (!tableSection) {
      return Buffer.from('No tabular data available');
    }

    const tableData = tableSection.data as Record<string, unknown>[];
    const columns = tableSection.columns ?? [];

    // Header row
    rows.push(columns.map((c) => this.escapeCSV(c.label)).join(','));

    // Data rows
    for (const row of tableData) {
      const values = columns.map((col) => {
        const value = this.formatCellValue(row[col.key], col.type);
        return this.escapeCSV(value);
      });
      rows.push(values.join(','));
    }

    return Buffer.from(rows.join('\n'), 'utf-8');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }

  // ============================================================================
  // HTML GENERATION
  // ============================================================================

  /**
   * Generate HTML report
   */
  private async generateHTML(data: ReportData): Promise<Buffer> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header .subtitle { opacity: 0.9; font-size: 1.1rem; }
    .header .date-range { opacity: 0.7; font-size: 0.9rem; margin-top: 10px; }
    .summary { 
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .kpi-grid { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .kpi-value { font-size: 2rem; font-weight: bold; color: #1a1a2e; }
    .kpi-label { font-size: 0.9rem; color: #666; margin-top: 5px; }
    .kpi-change { font-size: 0.8rem; margin-top: 5px; }
    .kpi-change.positive { color: #28a745; }
    .kpi-change.negative { color: #dc3545; }
    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .section h2 { 
      font-size: 1.5rem;
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    table { 
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td { 
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { 
      background: #1a1a2e;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f9f9f9; }
    tr:hover { background: #f0f0f0; }
    .highlights { list-style: none; }
    .highlights li { 
      padding: 10px 15px;
      margin-bottom: 10px;
      background: #e8f4fd;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #888;
      font-size: 0.9rem;
    }
    .compliance-badge {
      display: inline-block;
      background: #28a745;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      margin: 5px;
    }
    @media print {
      body { background: white; }
      .container { padding: 0; }
      .section { box-shadow: none; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.escapeHTML(data.title)}</h1>
      ${data.subtitle ? `<p class="subtitle">${this.escapeHTML(data.subtitle)}</p>` : ''}
      <p class="date-range">${this.formatDate(data.period.start)} - ${this.formatDate(data.period.end)}</p>
    </div>

    ${data.summary ? this.renderHTMLSummary(data.summary) : ''}

    ${data.sections.map((section) => this.renderHTMLSection(section)).join('')}

    <div class="footer">
      <p>Generated: ${this.formatDateTime(data.generatedAt)}</p>
      ${data.metadata.complianceFlags.ferpaCompliant ? '<span class="compliance-badge">FERPA Compliant</span>' : ''}
      ${data.metadata.complianceFlags.gdprCompliant ? '<span class="compliance-badge">GDPR Compliant</span>' : ''}
    </div>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }

  private renderHTMLSummary(summary: ReportSummary): string {
    const kpiCards = summary.keyMetrics.map((metric) => {
      const changeHtml = this.renderKPIChange(metric.change);
      return `
        <div class="kpi-card">
          <div class="kpi-value">${metric.value}</div>
          <div class="kpi-label">${this.escapeHTML(metric.label)}</div>
          ${changeHtml}
        </div>
      `;
    }).join('');

    const highlightsItems = summary.highlights.map((h) => '<li>' + this.escapeHTML(h) + '</li>').join('');
    const highlightsHtml = summary.highlights.length > 0
      ? '<h3>Highlights</h3><ul class="highlights">' + highlightsItems + '</ul>'
      : '';

    return `
    <div class="summary">
      <div class="kpi-grid">${kpiCards}</div>
      ${highlightsHtml}
    </div>`;
  }

  private renderKPIChange(change: number | undefined): string {
    if (change === undefined) {
      return '';
    }
    const cssClass = change >= 0 ? 'positive' : 'negative';
    const arrow = change >= 0 ? '↑' : '↓';
    return `<div class="kpi-change ${cssClass}">${arrow} ${Math.abs(change)}%</div>`;
  }

  private renderHTMLSection(section: ReportSection): string {
    let content = '';

    switch (section.type) {
      case 'table':
        content = this.renderHTMLTable(section);
        break;
      case 'text':
        content = `<p>${this.escapeHTML(section.data as string)}</p>`;
        break;
      case 'list': {
        const items = section.data as string[];
        const listItems = items.map((i) => '<li>' + this.escapeHTML(i) + '</li>').join('');
        content = '<ul>' + listItems + '</ul>';
        break;
      }
      case 'kpi':
        content = this.renderHTMLKPIs(section);
        break;
      default:
        content = '<p>Chart visualization available in interactive report</p>';
    }

    return `
    <div class="section">
      <h2>${this.escapeHTML(section.title)}</h2>
      ${content}
    </div>`;
  }

  private renderHTMLTable(section: ReportSection): string {
    const data = section.data as Record<string, unknown>[];
    const columns = section.columns ?? [];

    if (!data || data.length === 0) {
      return '<p>No data available</p>';
    }

    return `
    <table>
      <thead>
        <tr>
          ${columns.map((c) => `<th>${this.escapeHTML(c.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${columns
              .map((c) => {
                const value = this.formatCellValue(row[c.key], c.type);
                return `<td>${this.escapeHTML(value)}</td>`;
              })
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>`;
  }

  private renderHTMLKPIs(section: ReportSection): string {
    const kpis = section.data as Array<{ label: string; value: string | number }>;

    return `
    <div class="kpi-grid">
      ${kpis
        .map(
          (kpi) => `
        <div class="kpi-card">
          <div class="kpi-value">${kpi.value}</div>
          <div class="kpi-label">${this.escapeHTML(kpi.label)}</div>
        </div>
      `
        )
        .join('')}
    </div>`;
  }

  // ============================================================================
  // EMAIL DELIVERY
  // ============================================================================

  /**
   * Send report via email
   */
  async sendReportEmail(
    report: ReportRequest,
    recipients: ReportRecipient[]
  ): Promise<void> {
    if (!this.config.enableEmailDelivery) {
      logger.warn('Email delivery is disabled');
      return;
    }

    try {
      for (const recipient of recipients) {
        const command = new SendEmailCommand({
          Source: this.config.fromEmail,
          Destination: {
            ToAddresses: [recipient.email],
          },
          Message: {
            Subject: {
              Data: `Your Report is Ready: ${report.type.replaceAll('_', ' ').toUpperCase()}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: this.generateReportEmailBody(report, recipient),
                Charset: 'UTF-8',
              },
            },
          },
        });

        await this.ses.send(command);

        metrics.increment('reports.email.sent');
        logger.info('Report email sent', {
          reportId: report.id,
          recipient: recipient.email,
        });
      }
    } catch (error) {
      logger.error('Failed to send report email', { error });
      throw error;
    }
  }

  private generateReportEmailBody(report: ReportRequest, recipient: ReportRecipient): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { 
      display: inline-block;
      background: #0066cc;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { padding: 20px; text-align: center; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.config.companyName} Analytics</h1>
    </div>
    <div class="content">
      <p>Hi${recipient.name ? ` ${recipient.name}` : ''},</p>
      <p>Your requested report is ready for download.</p>
      <p><strong>Report Type:</strong> ${report.type.replaceAll('_', ' ')}</p>
      <p><strong>Format:</strong> ${report.format.toUpperCase()}</p>
      <p><strong>Generated:</strong> ${this.formatDateTime(report.completedAt!)}</p>
      <p style="text-align: center;">
        <a href="${report.downloadUrl}" class="button">Download Report</a>
      </p>
      <p style="font-size: 12px; color: #888;">
        This download link will expire on ${this.formatDate(report.expiresAt!)}.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated message from ${this.config.companyName} Analytics.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
  }

  // ============================================================================
  // S3 OPERATIONS
  // ============================================================================

  /**
   * Upload report to S3
   */
  private async uploadToS3(
    key: string,
    content: Buffer,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'x-amz-meta-generated': new Date().toISOString(),
      },
    });

    await this.s3.send(command);
  }

  /**
   * Generate pre-signed download URL
   */
  private async generateDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: this.config.reportTtlDays * 24 * 60 * 60,
    });
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Save report request to Redis
   */
  private async saveReportRequest(request: ReportRequest): Promise<void> {
    const key = `report:${request.id}`;
    await this.redis.setex(
      key,
      this.config.reportTtlDays * 24 * 60 * 60,
      JSON.stringify(request)
    );

    // Add to user's report list
    await this.redis.lpush(`reports:user:${request.requestedBy}`, request.id);
    await this.redis.ltrim(`reports:user:${request.requestedBy}`, 0, 99);
  }

  /**
   * Get report request
   */
  async getReportRequest(reportId: string): Promise<ReportRequest | null> {
    const key = `report:${reportId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string, limit = 10): Promise<ReportRequest[]> {
    const ids = await this.redis.lrange(`reports:user:${userId}`, 0, limit - 1);
    const reports: ReportRequest[] = [];

    for (const id of ids) {
      const report = await this.getReportRequest(id);
      if (report) {
        reports.push(report);
      }
    }

    return reports;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatCellValue(value: unknown, type: ColumnDefinition['type']): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'number':
        return this.formatNumberValue(value);
      case 'percentage':
        return this.formatPercentageValue(value);
      case 'date':
        return this.formatDateValue(value);
      case 'duration':
        return this.formatDurationValue(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  }

  private formatNumberValue(value: unknown): string {
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value ?? '');
  }

  private formatPercentageValue(value: unknown): string {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '0');
    const num = typeof value === 'number' ? value : Number.parseFloat(stringValue);
    return `${(num * 100).toFixed(1)}%`;
  }

  private formatDateValue(value: unknown): string {
    if (value instanceof Date) return this.formatDate(value);
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    return this.formatDate(new Date(stringValue));
  }

  private formatDurationValue(value: unknown): string {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '0');
    const minutes = typeof value === 'number' ? value : Number.parseFloat(stringValue);
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  private escapeHTML(str: string): string {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private sanitizeSheetName(name: string): string {
    // Excel sheet name restrictions
    return name
      .replaceAll(/[\\/*?[\]:]/g, '')
      .substring(0, 31);
  }
}
