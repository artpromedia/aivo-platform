/**
 * Compliance Report PDF Generator
 *
 * Sprint T2-05: Generates formatted PDF compliance reports for district
 * board presentations using PDFKit.
 *
 * Report includes:
 *  - Cover page with district/tenant branding
 *  - Compliance summary metrics table
 *  - Open alerts table with severity highlighting
 *  - Goal on-time rate section
 */

import PDFDocument from 'pdfkit';

interface ComplianceReportData {
  meta: {
    reportType: string;
    tenantId: string;
    generatedAt: string;
    format: string;
  };
  summary: {
    compliancePercentage: number;
    totalStudents: number;
    activeIEPs: number;
    overdueAnnualReviews: number;
    overdueReevaluations: number;
    totalOpenAlerts: number;
    goalOnTimeRate: number;
    goalsTotal: number;
    goalsCompleted: number;
    goalsOverdue: number;
  };
  alerts: {
    id: string;
    alertType: string;
    severity: string;
    studentId: string;
    iepId: string;
    description: string;
    dueDate: string | null;
    status: string;
  }[];
}

const COLORS = {
  primary: '#1a237e',
  success: '#2e7d32',
  warning: '#e65100',
  danger: '#c62828',
  gray: '#666666',
  lightGray: '#f5f5f5',
  white: '#ffffff',
  black: '#212121',
};

export function generateComplianceReportPdf(report: ComplianceReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: 'IEP Compliance Report',
          Author: 'AIVO Platform',
          Subject: 'District IEP Compliance Status',
        },
      });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ═══════════════════════════════════════════════════════════════
      // COVER / HEADER
      // ═══════════════════════════════════════════════════════════════
      doc
        .fontSize(28)
        .fillColor(COLORS.primary)
        .text('AIVO', { align: 'center' })
        .fontSize(10)
        .fillColor(COLORS.gray)
        .text('Inclusive Learning Platform', { align: 'center' })
        .moveDown(2);

      doc
        .fontSize(20)
        .fillColor(COLORS.black)
        .text('IEP Compliance Report', { align: 'center' })
        .moveDown(0.5);

      const dateStr = new Date(report.meta.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc
        .fontSize(11)
        .fillColor(COLORS.gray)
        .text(`Generated: ${dateStr}`, { align: 'center' })
        .text(`Tenant: ${report.meta.tenantId}`, { align: 'center' })
        .moveDown(2);

      // ═══════════════════════════════════════════════════════════════
      // COMPLIANCE SUMMARY
      // ═══════════════════════════════════════════════════════════════

      renderSectionTitle(doc, 'Compliance Summary');

      const { summary } = report;
      const complianceColor =
        summary.compliancePercentage >= 90
          ? COLORS.success
          : summary.compliancePercentage >= 70
            ? COLORS.warning
            : COLORS.danger;

      // Key metric callout
      const metricY = doc.y;
      doc
        .roundedRect(50, metricY, 160, 70, 5)
        .fillColor(COLORS.lightGray)
        .fill();

      doc
        .fontSize(28)
        .fillColor(complianceColor)
        .text(`${summary.compliancePercentage}%`, 50, metricY + 12, {
          width: 160,
          align: 'center',
        });

      doc
        .fontSize(9)
        .fillColor(COLORS.gray)
        .text('Overall Compliance', 50, metricY + 48, { width: 160, align: 'center' });

      // Side metrics
      const sideX = 230;
      const metrics = [
        ['Total Students', summary.totalStudents],
        ['Active IEPs', summary.activeIEPs],
        ['Overdue Annual Reviews', summary.overdueAnnualReviews],
        ['Overdue Reevaluations', summary.overdueReevaluations],
        ['Open Alerts', summary.totalOpenAlerts],
      ] as const;

      let my = metricY;
      for (const [label, value] of metrics) {
        doc.fontSize(10).fillColor(COLORS.black).text(`${value}`, sideX, my, { continued: true });
        doc.fillColor(COLORS.gray).text(`  ${label}`);
        my += 14;
      }

      doc.y = Math.max(doc.y, metricY + 80);
      doc.moveDown(1.5);

      // ═══════════════════════════════════════════════════════════════
      // GOAL PERFORMANCE
      // ═══════════════════════════════════════════════════════════════

      renderSectionTitle(doc, 'Goal Performance');

      const goalMetrics = [
        ['Goal On-Time Rate', `${summary.goalOnTimeRate}%`],
        ['Total Goals', summary.goalsTotal],
        ['Completed', summary.goalsCompleted],
        ['Overdue', summary.goalsOverdue],
      ] as const;

      for (const [label, value] of goalMetrics) {
        doc
          .fontSize(10)
          .fillColor(COLORS.black)
          .text(`${label}: `, { continued: true })
          .fillColor(COLORS.primary)
          .text(`${value}`);
      }

      doc.moveDown(1.5);

      // ═══════════════════════════════════════════════════════════════
      // OPEN ALERTS TABLE
      // ═══════════════════════════════════════════════════════════════

      if (report.alerts.length > 0) {
        renderSectionTitle(doc, `Open Compliance Alerts (${report.alerts.length})`);

        // Table header
        const tableX = 50;
        const colWidths = [120, 65, 80, 160, 80];
        const headerY = doc.y;

        doc.roundedRect(tableX, headerY, 505, 18, 2).fillColor(COLORS.primary).fill();

        const headers = ['Alert Type', 'Severity', 'Student ID', 'Description', 'Due Date'];
        let hx = tableX + 4;
        for (let i = 0; i < headers.length; i++) {
          const cw = colWidths[i] ?? 80;
          doc
            .fontSize(8)
            .fillColor(COLORS.white)
            .text(headers[i] ?? '', hx, headerY + 4, { width: cw - 8 });
          hx += cw;
        }

        doc.y = headerY + 20;

        // Table rows (cap at 40 for PDF readability)
        const displayAlerts = report.alerts.slice(0, 40);

        for (let r = 0; r < displayAlerts.length; r++) {
          const alert = displayAlerts[r] as (typeof displayAlerts)[number];
          const rowY = doc.y;

          // Page break if near bottom
          if (rowY > 700) {
            doc.addPage();
            // Re-render header on new page
            const newHeaderY = doc.y;
            doc.roundedRect(tableX, newHeaderY, 505, 18, 2).fillColor(COLORS.primary).fill();
            let nhx = tableX + 4;
            for (let i = 0; i < headers.length; i++) {
              const cw = colWidths[i] ?? 80;
              doc
                .fontSize(8)
                .fillColor(COLORS.white)
                .text(headers[i] ?? '', nhx, newHeaderY + 4, { width: cw - 8 });
              nhx += cw;
            }
            doc.y = newHeaderY + 20;
          }

          // Alternating row background
          if (r % 2 === 0) {
            doc.roundedRect(tableX, doc.y, 505, 16, 0).fillColor('#fafafa').fill();
          }

          const ry = doc.y + 3;
          const sevColor =
            alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
              ? COLORS.danger
              : alert.severity === 'MEDIUM'
                ? COLORS.warning
                : COLORS.gray;

          let rx = tableX + 4;
          const cw0 = colWidths[0] ?? 120;
          const cw1 = colWidths[1] ?? 65;
          const cw2 = colWidths[2] ?? 80;
          const cw3 = colWidths[3] ?? 160;
          const cw4 = colWidths[4] ?? 80;

          doc.fontSize(7).fillColor(COLORS.black).text(alert.alertType, rx, ry, {
            width: cw0 - 8,
          });
          rx += cw0;
          doc.fillColor(sevColor).text(alert.severity, rx, ry, { width: cw1 - 8 });
          rx += cw1;
          doc.fillColor(COLORS.black).text(alert.studentId.substring(0, 12), rx, ry, {
            width: cw2 - 8,
          });
          rx += cw2;
          doc.text((alert.description || '').substring(0, 60), rx, ry, {
            width: cw3 - 8,
          });
          rx += cw3;
          doc.text(alert.dueDate || 'N/A', rx, ry, { width: cw4 - 8 });

          doc.y = ry + 13;
        }

        if (report.alerts.length > 40) {
          doc.moveDown(0.5);
          doc
            .fontSize(8)
            .fillColor(COLORS.gray)
            .text(
              `Showing 40 of ${report.alerts.length} alerts. Use CSV export for the complete list.`,
              { align: 'center' }
            );
        }
      } else {
        renderSectionTitle(doc, 'Compliance Alerts');
        doc.fontSize(11).fillColor(COLORS.success).text('No open compliance alerts. ✓');
      }

      // ═══════════════════════════════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════════════════════════════

      doc
        .fontSize(7)
        .fillColor('#999')
        .text(
          `AIVO IEP Compliance Report — Generated ${dateStr} — CONFIDENTIAL`,
          50,
          740,
          { align: 'center', width: 500 }
        );

      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function renderSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string): void {
  doc.fontSize(14).fillColor(COLORS.primary).text(title).moveDown(0.3);

  const lineY = doc.y - 3;
  doc.strokeColor(COLORS.primary).lineWidth(1).moveTo(50, lineY).lineTo(250, lineY).stroke();

  doc.moveDown(0.5);
}
