/**
 * PDF Report Generator
 *
 * Generates professional PDF progress reports for parents.
 */

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { logger, metrics } from '@aivo/ts-observability';
import { I18nService } from '../i18n/i18n.service.js';
import { ProgressReport, WeeklySummary } from '../parent/parent.types.js';

interface ReportData {
  studentName: string;
  parentName: string;
  report: ProgressReport;
  language: string;
}

interface WeeklyReportData {
  studentName: string;
  parentName: string;
  summary: WeeklySummary;
  language: string;
}

@Injectable()
export class PdfReportService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * Generate a PDF progress report
   */
  async generateProgressReport(data: ReportData): Promise<Buffer> {
    const { studentName, parentName, report, language } = data;
    const t = (key: string, vars?: Record<string, string | number>) =>
      this.i18n.t(`pdf.${key}`, language, vars);

    return new Promise((resolve, reject) => {
      try {
        const chunks: Uint8Array[] = [];
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 50,
          info: {
            Title: t('progress.title', { student: studentName }),
            Author: 'AIVO Learning',
            Subject: 'Student Progress Report',
          },
        });

        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          metrics.increment('pdf.generated', { type: 'progress' });
          resolve(buffer);
        });
        doc.on('error', reject);

        // Header
        this.renderHeader(doc, studentName, t);

        // Report period
        doc
          .fontSize(12)
          .fillColor('#666')
          .text(
            `${t('progress.period')}: ${this.formatDate(report.periodStart, language)} - ${this.formatDate(report.periodEnd, language)}`,
            { align: 'center' }
          );

        doc.moveDown(2);

        // Overview Section
        this.renderSectionTitle(doc, t('progress.overview'));

        const overviewY = doc.y;
        const colWidth = 150;

        // Overview metrics
        this.renderMetricBox(doc, 50, overviewY, colWidth, t('progress.timeSpent'), report.overallTimeSpent, 'minutes');
        this.renderMetricBox(doc, 220, overviewY, colWidth, t('progress.avgScore'), report.overallAverage.toString(), '%');
        this.renderMetricBox(doc, 390, overviewY, colWidth, t('progress.activities'), report.totalActivities.toString());

        doc.y = overviewY + 80;
        doc.moveDown();

        // Subject Progress
        this.renderSectionTitle(doc, t('progress.bySubject'));

        for (const subject of report.subjectProgress) {
          this.renderSubjectProgress(doc, subject, language, t);
        }

        // Page break if needed
        if (doc.y > 650) {
          doc.addPage();
        }

        // Teacher Notes
        if (report.teacherNotes && report.teacherNotes.length > 0) {
          this.renderSectionTitle(doc, t('progress.teacherNotes'));
          
          for (const note of report.teacherNotes) {
            doc
              .fontSize(10)
              .fillColor('#333')
              .text(note.content, { indent: 20 })
              .moveDown(0.5);
          }
        }

        // Footer
        this.renderFooter(doc, t);

        doc.end();
      } catch (error) {
        logger.error('Failed to generate PDF', { error });
        reject(error);
      }
    });
  }

  /**
   * Generate a weekly summary PDF
   */
  async generateWeeklySummary(data: WeeklyReportData): Promise<Buffer> {
    const { studentName, parentName, summary, language } = data;
    const t = (key: string, vars?: Record<string, string | number>) =>
      this.i18n.t(`pdf.${key}`, language, vars);

    return new Promise((resolve, reject) => {
      try {
        const chunks: Uint8Array[] = [];
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 50,
        });

        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          metrics.increment('pdf.generated', { type: 'weekly' });
          resolve(buffer);
        });
        doc.on('error', reject);

        // Header
        this.renderHeader(doc, studentName, t);

        // Week period
        doc
          .fontSize(12)
          .fillColor('#666')
          .text(
            `${t('weekly.week')}: ${this.formatDate(summary.weekStart, language)} - ${this.formatDate(summary.weekEnd, language)}`,
            { align: 'center' }
          );

        doc.moveDown(2);

        // Quick Stats
        this.renderSectionTitle(doc, t('weekly.quickStats'));

        const statsY = doc.y;
        this.renderMetricBox(doc, 50, statsY, 120, t('weekly.activeDays'), summary.activeDays.toString());
        this.renderMetricBox(doc, 190, statsY, 120, t('weekly.totalTime'), summary.totalTimeSpent.toString(), 'min');
        this.renderMetricBox(doc, 330, statsY, 120, t('weekly.completed'), summary.activitiesCompleted.toString());

        doc.y = statsY + 80;
        doc.moveDown();

        // Highlights
        if (summary.highlights && summary.highlights.length > 0) {
          this.renderSectionTitle(doc, t('weekly.highlights'));
          
          for (const highlight of summary.highlights) {
            doc
              .fontSize(11)
              .fillColor('#2e7d32')
              .text(`✓ ${highlight}`, { indent: 20 })
              .moveDown(0.3);
          }

          doc.moveDown();
        }

        // Areas for Improvement
        if (summary.areasForImprovement && summary.areasForImprovement.length > 0) {
          this.renderSectionTitle(doc, t('weekly.areasForImprovement'));
          
          for (const area of summary.areasForImprovement) {
            doc
              .fontSize(11)
              .fillColor('#c62828')
              .text(`• ${area}`, { indent: 20 })
              .moveDown(0.3);
          }

          doc.moveDown();
        }

        // Upcoming Goals
        if (summary.upcomingGoals && summary.upcomingGoals.length > 0) {
          this.renderSectionTitle(doc, t('weekly.upcomingGoals'));
          
          for (const goal of summary.upcomingGoals) {
            doc
              .fontSize(11)
              .fillColor('#1565c0')
              .text(`→ ${goal}`, { indent: 20 })
              .moveDown(0.3);
          }
        }

        // Footer
        this.renderFooter(doc, t);

        doc.end();
      } catch (error) {
        logger.error('Failed to generate weekly PDF', { error });
        reject(error);
      }
    });
  }

  /**
   * Render document header
   */
  private renderHeader(
    doc: PDFKit.PDFDocument,
    studentName: string,
    t: (key: string, vars?: Record<string, string | number>) => string
  ): void {
    // Logo placeholder
    doc
      .fontSize(24)
      .fillColor('#1a237e')
      .text('AIVO', { align: 'center' })
      .fontSize(10)
      .fillColor('#666')
      .text(t('header.subtitle'), { align: 'center' })
      .moveDown();

    // Student name
    doc
      .fontSize(18)
      .fillColor('#333')
      .text(t('header.reportFor', { student: studentName }), { align: 'center' })
      .moveDown();
  }

  /**
   * Render section title
   */
  private renderSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(14)
      .fillColor('#1a237e')
      .text(title)
      .moveDown(0.5);

    // Underline
    const lineY = doc.y - 5;
    doc
      .strokeColor('#1a237e')
      .lineWidth(1)
      .moveTo(50, lineY)
      .lineTo(200, lineY)
      .stroke();

    doc.moveDown(0.5);
  }

  /**
   * Render a metric box
   */
  private renderMetricBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    unit?: string
  ): void {
    const height = 60;

    // Box background
    doc
      .roundedRect(x, y, width, height, 5)
      .fillColor('#f5f5f5')
      .fill();

    // Value
    doc
      .fontSize(20)
      .fillColor('#1a237e')
      .text(value + (unit ? ` ${unit}` : ''), x, y + 12, {
        width,
        align: 'center',
      });

    // Label
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(label, x, y + 38, {
        width,
        align: 'center',
      });
  }

  /**
   * Render subject progress
   */
  private renderSubjectProgress(
    doc: PDFKit.PDFDocument,
    subject: { subject: string; average: number; timeSpent: number; trend: string },
    _language: string,
    t: (key: string, vars?: Record<string, string | number>) => string
  ): void {
    const startY = doc.y;
    const barWidth = 300;
    const barHeight = 15;

    // Subject name
    doc
      .fontSize(11)
      .fillColor('#333')
      .text(subject.subject, 50, startY);

    // Progress bar background
    doc
      .roundedRect(180, startY, barWidth, barHeight, 3)
      .fillColor('#e0e0e0')
      .fill();

    // Progress bar fill
    const fillWidth = (subject.average / 100) * barWidth;
    const fillColor = subject.average >= 70 ? '#4caf50' : subject.average >= 50 ? '#ff9800' : '#f44336';
    doc
      .roundedRect(180, startY, fillWidth, barHeight, 3)
      .fillColor(fillColor)
      .fill();

    // Percentage
    doc
      .fontSize(10)
      .fillColor('#333')
      .text(`${subject.average}%`, 490, startY);

    // Trend indicator
    const trendSymbol = subject.trend === 'up' ? '↑' : subject.trend === 'down' ? '↓' : '→';
    const trendColor = subject.trend === 'up' ? '#4caf50' : subject.trend === 'down' ? '#f44336' : '#666';
    doc
      .fillColor(trendColor)
      .text(trendSymbol, 530, startY);

    doc.y = startY + 25;
  }

  /**
   * Render footer
   */
  private renderFooter(
    doc: PDFKit.PDFDocument,
    t: (key: string, vars?: Record<string, string | number>) => string
  ): void {
    const pageCount = doc.bufferedPageRange().count;
    
    doc
      .fontSize(8)
      .fillColor('#999')
      .text(
        t('footer.generated', { date: new Date().toLocaleDateString() }),
        50,
        750,
        { align: 'center', width: 500 }
      )
      .text(
        t('footer.confidential'),
        50,
        760,
        { align: 'center', width: 500 }
      );
  }

  /**
   * Format date based on language
   */
  private formatDate(date: Date, language: string): string {
    return new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
}
