/**
 * Data Export ZIP Service
 *
 * Sprint T2-05: Generates a comprehensive FERPA data export ZIP package
 * for parent download, containing:
 *  - Cover letter (PDF) explaining the export
 *  - IEP documents (PDF) for each active IEP
 *  - Progress reports (CSV) with learning activity data
 *  - Assessment results (CSV)
 *  - Consent records (CSV)
 *
 * The ZIP is generated in-memory and streamed to the caller.
 */

import archiver from 'archiver';
import PDFDocument from 'pdfkit';
import { Readable } from 'node:stream';

import type { DataExport } from './data-rights.service.js';

// ════════════════════════════════════════════════════════════════════════════════
// ZIP GENERATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete FERPA data export ZIP archive from the export payload.
 * Returns an in-memory Buffer of the ZIP file.
 */
export async function generateDataExportZip(data: DataExport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err: Error) => reject(err));

    // ── 1. Cover Letter PDF ──────────────────────────────────────────────

    const coverLetterPdf = generateCoverLetterPdf(data);
    archive.append(coverLetterPdf, { name: 'cover-letter.pdf' });

    // ── 2. IEP Documents PDF ─────────────────────────────────────────────

    if (data.dataCategories.iepRecords.totalIEPs > 0) {
      const iepPdf = generateIepRecordsPdf(data);
      archive.append(iepPdf, { name: 'iep-records.pdf' });
    }

    // ── 3. Progress / Learning Activity CSV ──────────────────────────────

    const progressCsv = generateProgressCsv(data);
    archive.append(progressCsv, { name: 'learning-activity.csv' });

    // ── 4. Assessment Results CSV ────────────────────────────────────────

    const assessmentCsv = generateAssessmentCsv(data);
    archive.append(assessmentCsv, { name: 'assessment-results.csv' });

    // ── 5. Consent Records CSV ───────────────────────────────────────────

    const consentCsv = generateConsentCsv(data);
    archive.append(consentCsv, { name: 'consent-records.csv' });

    // ── 6. Full JSON export (raw data) ───────────────────────────────────

    archive.append(JSON.stringify(data, null, 2), { name: 'full-export.json' });

    archive.finalize();
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// COVER LETTER PDF
// ════════════════════════════════════════════════════════════════════════════════

function generateCoverLetterPdf(data: DataExport): Readable {
  const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const stream = new Readable({ read() { /* no-op: PDFKit pushes data via events */ } });

  doc.on('data', (chunk: Uint8Array) => stream.push(chunk));
  doc.on('end', () => stream.push(null));

  const dateStr = new Date(data.exportDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const studentName = `${data.dataCategories.profile.givenName} ${data.dataCategories.profile.familyName}`;

  // Header
  doc
    .fontSize(22)
    .fillColor('#1a237e')
    .text('AIVO', { align: 'center' })
    .fontSize(10)
    .fillColor('#666')
    .text('Inclusive Learning Platform', { align: 'center' })
    .moveDown(2);

  // Title
  doc
    .fontSize(18)
    .fillColor('#212121')
    .text('FERPA Data Export — Cover Letter', { align: 'center' })
    .moveDown(1.5);

  // Date & recipient
  doc.fontSize(11).fillColor('#333');
  doc.text(dateStr).moveDown(0.5);
  doc.text(`Export ID: ${data.exportId}`).moveDown(0.5);
  doc.text(`Student: ${studentName}`).moveDown(1);

  // Body
  doc.fontSize(11).fillColor('#333');
  doc.text(
    `Dear Parent/Guardian,\n\n` +
      `In accordance with the Family Educational Rights and Privacy Act (FERPA, 20 U.S.C. § 1232g; 34 CFR Part 99), ` +
      `we are providing you with a complete copy of your child's education records maintained on the AIVO platform.\n\n` +
      `This data export package contains the following files:\n`
  );

  const items = [
    ['cover-letter.pdf', 'This document'],
    ['iep-records.pdf', 'All Individualized Education Program (IEP) records including goals, accommodations, and services'],
    ['learning-activity.csv', 'Learning session history with dates, durations, and lessons completed'],
    ['assessment-results.csv', 'All assessment results including scores and subjects'],
    ['consent-records.csv', 'Parental consent history'],
    ['full-export.json', 'Complete machine-readable data export in JSON format'],
  ];

  for (const [file, desc] of items) {
    doc
      .fontSize(10)
      .fillColor('#1a237e')
      .text(`• ${file}`, { continued: true })
      .fillColor('#333')
      .text(` — ${desc}`);
  }

  doc.moveDown(1);
  doc.fontSize(11).fillColor('#333');
  doc.text(
    `If you believe any records are inaccurate, misleading, or in violation of your child's privacy rights, ` +
      `you may request an amendment under FERPA 34 CFR § 99.20 through the parent portal.\n\n` +
      `This export was generated on ${dateStr} and reflects data as of that date. ` +
      `The download link for this export will expire after 7 days.\n\n` +
      `If you have any questions, please contact your school's FERPA compliance officer or email support@aivo.ai.`
  );

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#999').text('CONFIDENTIAL — FERPA Protected Education Records', {
    align: 'center',
  });

  doc.end();
  return stream;
}

// ════════════════════════════════════════════════════════════════════════════════
// IEP RECORDS PDF
// ════════════════════════════════════════════════════════════════════════════════

function generateIepRecordsPdf(data: DataExport): Readable {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const stream = new Readable({ read() { /* no-op: PDFKit pushes data via events */ } });

  doc.on('data', (chunk: Uint8Array) => stream.push(chunk));
  doc.on('end', () => stream.push(null));

  const studentName = `${data.dataCategories.profile.givenName} ${data.dataCategories.profile.familyName}`;

  // Cover
  doc
    .fontSize(22)
    .fillColor('#1a237e')
    .text('AIVO', { align: 'center' })
    .fontSize(10)
    .fillColor('#666')
    .text('Inclusive Learning Platform', { align: 'center' })
    .moveDown(2);

  doc
    .fontSize(18)
    .fillColor('#212121')
    .text('Individualized Education Program Records', { align: 'center' })
    .moveDown(0.5)
    .fontSize(13)
    .text(`Student: ${studentName}`, { align: 'center' })
    .moveDown(2);

  const { ieps } = data.dataCategories.iepRecords;

  for (let i = 0; i < ieps.length; i++) {
    const iep = ieps[i];
    if (i > 0) doc.addPage();

    // IEP header
    doc
      .fontSize(15)
      .fillColor('#1a237e')
      .text(`IEP #${iep.iepNumber || i + 1}`)
      .moveDown(0.3);

    doc.strokeColor('#1a237e').lineWidth(1).moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#333');
    doc.text(`Status: ${iep.status}`);
    if (iep.effectiveDate) doc.text(`Effective Date: ${iep.effectiveDate}`);
    if (iep.annualReviewDate) doc.text(`Annual Review Date: ${iep.annualReviewDate}`);
    doc.moveDown(0.7);

    // Accommodations
    if (iep.accommodations.length > 0) {
      doc.fontSize(12).fillColor('#1a237e').text('Accommodations').moveDown(0.3);
      for (const acc of iep.accommodations) {
        doc.fontSize(10).fillColor('#333').text(`  • ${acc}`);
      }
      doc.moveDown(0.5);
    }

    // Services
    if (iep.services.length > 0) {
      doc.fontSize(12).fillColor('#1a237e').text('Services').moveDown(0.3);
      for (const svc of iep.services) {
        doc.fontSize(10).fillColor('#333').text(`  • ${svc}`);
      }
      doc.moveDown(0.5);
    }

    // Goals
    if (iep.goals.length > 0) {
      doc.fontSize(12).fillColor('#1a237e').text('Goals').moveDown(0.3);

      for (const goal of iep.goals) {
        // Page break if near bottom
        if (doc.y > 680) doc.addPage();

        doc.fontSize(10).fillColor('#333');
        doc.text(`Goal ${goal.goalNumber}: ${goal.description}`);
        doc.fontSize(9).fillColor('#666');
        doc.text(
          `  Status: ${goal.status}` +
            (goal.targetDate ? ` | Target: ${goal.targetDate}` : '') +
            (goal.currentProgress != null ? ` | Progress: ${goal.currentProgress}%` : '')
        );
        doc.moveDown(0.3);
      }
    }
  }

  // Footer
  doc
    .fontSize(7)
    .fillColor('#999')
    .text('CONFIDENTIAL — FERPA Protected Education Records', 50, 740, {
      align: 'center',
      width: 500,
    });

  doc.end();
  return stream;
}

// ════════════════════════════════════════════════════════════════════════════════
// CSV GENERATORS
// ════════════════════════════════════════════════════════════════════════════════

function generateProgressCsv(data: DataExport): string {
  const { learningActivity } = data.dataCategories;

  const lines = [
    'AIVO Learning Activity Export',
    `Student ID,${data.studentId}`,
    `Total Sessions,${learningActivity.totalSessions}`,
    `Total Minutes Learned,${learningActivity.totalMinutesLearned}`,
    '',
    'Date,Duration (minutes),Lessons Completed',
  ];

  for (const session of learningActivity.sessionsLast30Days) {
    lines.push(`${session.date},${session.duration},${session.lessonsCompleted}`);
  }

  return lines.join('\n');
}

function generateAssessmentCsv(data: DataExport): string {
  const { assessments } = data.dataCategories;

  const lines = [
    'AIVO Assessment Results Export',
    `Student ID,${data.studentId}`,
    `Total Assessments,${assessments.totalAssessments}`,
    '',
    'Assessment ID,Type,Score,Subject,Completed At',
  ];

  for (const a of assessments.assessmentResults) {
    const score = a.score != null ? String(a.score) : '';
    lines.push(`${a.assessmentId},${a.assessmentType},${score},${a.subject || ''},${a.completedAt}`);
  }

  return lines.join('\n');
}

function generateConsentCsv(data: DataExport): string {
  const { consents } = data.dataCategories;

  const lines = [
    'AIVO Consent Records Export',
    `Student ID,${data.studentId}`,
    '',
    'Consent Type,Granted,Granted At,Revoked At',
  ];

  for (const c of consents.consents) {
    lines.push(`${c.type},${c.granted},${c.grantedAt || ''},${c.revokedAt || ''}`);
  }

  return lines.join('\n');
}
