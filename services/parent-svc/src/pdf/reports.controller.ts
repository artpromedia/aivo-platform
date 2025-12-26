/**
 * Reports Controller
 *
 * REST API endpoints for generating and downloading reports.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ParentService } from '../parent/parent.service.js';
import { PdfReportService } from './pdf-report.service.js';
import { ParentAuthRequest } from '../auth/parent-auth.middleware.js';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly parentService: ParentService,
    private readonly pdfService: PdfReportService,
  ) {}

  /**
   * Generate and download progress report PDF
   */
  @Get('students/:studentId/progress.pdf')
  async downloadProgressReport(
    @Req() req: ParentAuthRequest,
    @Res() res: Response,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const report = await this.parentService.getProgressReport(
      req.parent!.id,
      studentId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    );

    const summary = await this.parentService.getStudentSummary(req.parent!.id, studentId);

    const pdf = await this.pdfService.generateProgressReport({
      studentName: summary.name,
      parentName: `${req.parent!.firstName} ${req.parent!.lastName}`,
      report,
      language: req.parent!.language,
    });

    const filename = `progress-report-${summary.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  /**
   * Generate and download weekly summary PDF
   */
  @Get('students/:studentId/weekly.pdf')
  async downloadWeeklySummary(
    @Req() req: ParentAuthRequest,
    @Res() res: Response,
    @Param('studentId') studentId: string,
    @Query('weekOf') weekOf?: string
  ) {
    const summary = await this.parentService.generateWeeklySummary(
      req.parent!.id,
      studentId,
      weekOf ? new Date(weekOf) : new Date()
    );

    const studentSummary = await this.parentService.getStudentSummary(req.parent!.id, studentId);

    const pdf = await this.pdfService.generateWeeklySummary({
      studentName: studentSummary.name,
      parentName: `${req.parent!.firstName} ${req.parent!.lastName}`,
      summary,
      language: req.parent!.language,
    });

    const filename = `weekly-summary-${studentSummary.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  /**
   * Get list of available reports
   */
  @Get('available')
  async getAvailableReports(@Req() req: ParentAuthRequest) {
    const profile = await this.parentService.getParentProfile(req.parent!.id);

    return {
      reports: profile.students.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        available: [
          {
            type: 'progress',
            name: 'Progress Report',
            description: 'Detailed progress across all subjects',
            formats: ['pdf'],
          },
          {
            type: 'weekly',
            name: 'Weekly Summary',
            description: 'Week-by-week learning summary',
            formats: ['pdf'],
          },
        ],
      })),
    };
  }
}
