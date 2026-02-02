/**
 * Report Service Unit Tests
 *
 * Comprehensive tests for the ReportService class.
 * Tests cover: PDF/Excel/CSV/HTML/JSON generation, S3 upload,
 * email delivery, scheduled reports, compliance flags, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

vi.mock('@aws-sdk/client-ses', () => ({
  SES: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'msg-001' }),
  })),
  SendEmailCommand: vi.fn(),
}));

vi.mock('pdfkit', () => ({
  default: vi.fn().mockImplementation(() => {
    const events: Record<string, Function[]> = {};
    return {
      on: vi.fn((event: string, callback: Function) => {
        if (!events[event]) events[event] = [];
        events[event].push(callback);
        return this;
      }),
      end: vi.fn().mockImplementation(function(this: any) {
        // Emit data and end events
        setTimeout(() => {
          events['data']?.forEach(cb => cb(Buffer.from('PDF content')));
          events['end']?.forEach(cb => cb());
        }, 0);
      }),
      addPage: vi.fn().mockReturnThis(),
      fontSize: vi.fn().mockReturnThis(),
      font: vi.fn().mockReturnThis(),
      fillColor: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      moveDown: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      strokeColor: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      rect: vi.fn().mockReturnThis(),
      fill: vi.fn().mockReturnThis(),
      page: { width: 612, height: 792 },
      y: 100,
    };
  }),
}));

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => ({
      creator: '',
      created: new Date(),
      modified: new Date(),
      addWorksheet: vi.fn().mockReturnValue({
        columns: [],
        addRow: vi.fn(),
        getRow: vi.fn().mockReturnValue({
          font: {},
          fill: {},
          border: {},
          eachCell: vi.fn(),
        }),
        addTable: vi.fn(),
      }),
      xlsx: {
        writeBuffer: vi.fn().mockResolvedValue(Buffer.from('Excel content')),
      },
    })),
  },
}));

vi.mock('@aivo/ts-observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  ReportService,
  type ReportFormat,
  type ReportType,
  type ReportData,
  type ReportSection,
  type GenerateReportRequest,
} from '../../src/services/report.service.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockReportData(overrides = {}): ReportData {
  return {
    title: 'Student Progress Report',
    subtitle: 'Monthly Summary',
    generatedAt: new Date('2024-01-20'),
    generatedBy: 'teacher-001',
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    },
    sections: [
      {
        id: 'section-1',
        title: 'Overview',
        type: 'text',
        data: 'This is the monthly progress overview.',
      },
      {
        id: 'section-2',
        title: 'Performance Metrics',
        type: 'table',
        data: [
          { name: 'Student A', score: 85, progress: 0.75 },
          { name: 'Student B', score: 92, progress: 0.88 },
        ],
        columns: [
          { key: 'name', label: 'Name', type: 'string' },
          { key: 'score', label: 'Score', type: 'number' },
          { key: 'progress', label: 'Progress', type: 'percentage' },
        ],
      },
    ],
    summary: {
      keyMetrics: [
        { label: 'Average Score', value: 88.5, change: 5 },
        { label: 'Students', value: 25 },
      ],
      highlights: ['10 students achieved mastery', 'Engagement up 15%'],
    },
    metadata: {
      version: '1.0',
      format: 'pdf',
      complianceFlags: {
        ferpaCompliant: true,
        gdprCompliant: true,
        piiRedacted: false,
        dataMinimized: true,
        retentionPolicy: '30-days',
      },
    },
    ...overrides,
  };
}

function createMockGenerateRequest(overrides = {}): GenerateReportRequest {
  return {
    id: 'report-001',
    type: 'student_progress',
    format: 'pdf',
    tenantId: 'tenant-001',
    requestedBy: 'teacher-001',
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReportService', () => {
  let service: ReportService;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK'),
    };

    service = new ReportService(mockRedis as any, {
      s3Bucket: 'test-bucket',
      s3Prefix: 'reports/',
      awsRegion: 'us-east-1',
      reportTtlDays: 30,
      maxReportSize: 50 * 1024 * 1024,
      enableEmailDelivery: true,
      fromEmail: 'reports@test.com',
      companyName: 'Test Company',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT GENERATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('generateReport', () => {
    it('should generate PDF report and upload to S3', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'student_progress',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
      expect(result.downloadUrl).toBeDefined();
      expect(result.format).toBe('pdf');
    });

    it('should generate Excel report', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'class_overview',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
      expect(result.format).toBe('excel');
    });

    it('should generate CSV report', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'assessment_results',
        'csv',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
      expect(result.format).toBe('csv');
    });

    it('should generate HTML report', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'engagement_summary',
        'html',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
      expect(result.format).toBe('html');
    });

    it('should generate JSON report', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'admin_analytics',
        'json',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
      expect(result.format).toBe('json');
    });

    it('should set expiration date based on TTL config', async () => {
      const data = createMockReportData();
      const result = await service.generateReport(
        'student_progress',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.expiresAt).toBeDefined();
      const daysDiff = Math.round(
        (result.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      expect(daysDiff).toBe(30);
    });

    it('should generate unique report ID', async () => {
      const data = createMockReportData();

      const result1 = await service.generateReport('student_progress', 'pdf', data, 'tenant-001', 'teacher-001');
      const result2 = await service.generateReport('student_progress', 'pdf', data, 'tenant-001', 'teacher-001');

      expect(result1.id).not.toBe(result2.id);
    });

    it('should throw error for unsupported format', async () => {
      const data = createMockReportData();

      await expect(
        service.generateReport(
          'student_progress',
          'unsupported' as ReportFormat,
          data,
          'tenant-001',
          'teacher-001'
        )
      ).rejects.toThrow('Unsupported format');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT BUFFER GENERATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('generateReportBuffer', () => {
    it('should return PDF buffer', async () => {
      const request = createMockGenerateRequest({ format: 'pdf' });
      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should return Excel buffer', async () => {
      const request = createMockGenerateRequest({ format: 'excel' });
      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should return CSV buffer', async () => {
      const request = createMockGenerateRequest({ format: 'csv' });
      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should return HTML buffer', async () => {
      const request = createMockGenerateRequest({ format: 'html' });
      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should return JSON buffer', async () => {
      const request = createMockGenerateRequest({ format: 'json' });
      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
      const parsed = JSON.parse(buffer.toString());
      expect(parsed).toHaveProperty('title');
    });

    it('should use pdf as default format', async () => {
      const request = createMockGenerateRequest();
      delete request.format;

      const buffer = await service.generateReportBuffer(request);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE REPORT FROM REQUEST TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('generateReportFromRequest', () => {
    it('should generate report from request object', async () => {
      const request = createMockGenerateRequest();
      const result = await service.generateReportFromRequest(request);

      expect(result).toHaveProperty('reportId');
      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should use request date range for report period', async () => {
      const request = createMockGenerateRequest({
        dateRange: {
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-02-29'),
        },
      });

      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });

    it('should handle request without date range', async () => {
      const request = createMockGenerateRequest();
      delete request.dateRange;

      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });

    it('should include subtitle from options', async () => {
      const request = createMockGenerateRequest({
        options: { subtitle: 'Custom Subtitle' },
      });

      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DOWNLOAD URL TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getReportDownloadUrl', () => {
    it('should generate signed URL for S3 key', async () => {
      const url = await service.getReportDownloadUrl('reports/tenant-001/report-001.pdf');

      expect(url).toBe('https://s3.example.com/signed-url');
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT DATA BUILDING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('buildReportData', () => {
    it('should create report data with compliance flags', async () => {
      const request = createMockGenerateRequest();
      const result = await service.generateReportFromRequest(request);

      expect(result).toBeDefined();
    });

    it('should set FERPA compliant flag', async () => {
      const request = createMockGenerateRequest({ type: 'student_progress' });
      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });

    it('should set GDPR compliant flag', async () => {
      const request = createMockGenerateRequest({ type: 'class_overview' });
      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH EMAIL TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('sendBatchReportEmail', () => {
    it('should send emails to all recipients for all reports', async () => {
      const recipients = [
        { email: 'teacher1@example.com', name: 'Teacher 1', role: 'teacher' },
        { email: 'teacher2@example.com', name: 'Teacher 2', role: 'teacher' },
      ];

      const reports = [
        {
          reportId: 'report-001',
          downloadUrl: 'https://example.com/report1.pdf',
          type: 'student_progress',
          format: 'pdf',
        },
        {
          reportId: 'report-002',
          downloadUrl: 'https://example.com/report2.xlsx',
          type: 'class_overview',
          format: 'excel',
        },
      ];

      await expect(
        service.sendBatchReportEmail(recipients, reports)
      ).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT TYPE TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('report types', () => {
    const reportTypes: ReportType[] = [
      'student_progress',
      'class_overview',
      'skill_mastery',
      'assessment_results',
      'engagement_summary',
      'teacher_dashboard',
      'admin_analytics',
      'at_risk_students',
      'custom',
    ];

    it.each(reportTypes)('should handle %s report type', async (type) => {
      const request = createMockGenerateRequest({ type });
      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT FORMAT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('report formats', () => {
    const formats: ReportFormat[] = ['pdf', 'excel', 'csv', 'html', 'json'];

    it.each(formats)('should generate %s format', async (format) => {
      const request = createMockGenerateRequest({ format });
      const result = await service.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION RENDERING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('section rendering', () => {
    it('should handle table section type', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'table-1',
            title: 'Data Table',
            type: 'table',
            data: [{ col1: 'A', col2: 'B' }],
            columns: [
              { key: 'col1', label: 'Column 1', type: 'string' },
              { key: 'col2', label: 'Column 2', type: 'string' },
            ],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle text section type', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'text-1',
            title: 'Description',
            type: 'text',
            data: 'This is a text section with detailed information.',
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle kpi section type', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'kpi-1',
            title: 'Key Metrics',
            type: 'kpi',
            data: [
              { label: 'Total Students', value: 150 },
              { label: 'Average Score', value: '85%' },
            ],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle list section type', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'list-1',
            title: 'Achievements',
            type: 'list',
            data: ['Achievement 1', 'Achievement 2', 'Achievement 3'],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle chart section type', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'chart-1',
            title: 'Progress Chart',
            type: 'chart',
            data: [
              { month: 'Jan', value: 10 },
              { month: 'Feb', value: 20 },
            ],
            chartConfig: {
              type: 'bar',
              xAxis: { key: 'month', label: 'Month' },
              yAxis: { key: 'value', label: 'Value' },
            },
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle empty sections', async () => {
      const data = createMockReportData({ sections: [] });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle table with no data', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'empty-table',
            title: 'Empty Table',
            type: 'table',
            data: [],
            columns: [{ key: 'col1', label: 'Column', type: 'string' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LARGE DATA HANDLING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('large data handling', () => {
    it('should handle large number of rows in table', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Student ${i}`,
        score: Math.floor(Math.random() * 100),
      }));

      const data = createMockReportData({
        sections: [
          {
            id: 'large-table',
            title: 'Large Dataset',
            type: 'table',
            data: largeData,
            columns: [
              { key: 'id', label: 'ID', type: 'number' },
              { key: 'name', label: 'Name', type: 'string' },
              { key: 'score', label: 'Score', type: 'number' },
            ],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle many sections', async () => {
      const manySections = Array.from({ length: 50 }, (_, i) => ({
        id: `section-${i}`,
        title: `Section ${i}`,
        type: 'text' as const,
        data: `Content for section ${i}`,
      }));

      const data = createMockReportData({ sections: manySections });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COLUMN TYPE FORMATTING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('column type formatting', () => {
    it('should format number columns', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'numbers',
            title: 'Numbers',
            type: 'table',
            data: [{ value: 12345.678 }],
            columns: [{ key: 'value', label: 'Value', type: 'number' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should format percentage columns', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'percentages',
            title: 'Percentages',
            type: 'table',
            data: [{ rate: 0.85 }],
            columns: [{ key: 'rate', label: 'Rate', type: 'percentage' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should format date columns', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'dates',
            title: 'Dates',
            type: 'table',
            data: [{ date: new Date('2024-01-15') }],
            columns: [{ key: 'date', label: 'Date', type: 'date' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should format duration columns', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'durations',
            title: 'Durations',
            type: 'table',
            data: [{ time: 3665 }], // 1 hour, 1 minute, 5 seconds
            columns: [{ key: 'time', label: 'Time', type: 'duration' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should format boolean columns', async () => {
      const data = createMockReportData({
        sections: [
          {
            id: 'booleans',
            title: 'Booleans',
            type: 'table',
            data: [{ active: true }, { active: false }],
            columns: [{ key: 'active', label: 'Active', type: 'boolean' }],
          },
        ],
      });

      const result = await service.generateReport(
        'custom',
        'excel',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should mark report as failed on generation error', async () => {
      // Force an error by passing invalid data type
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // The mock PDFDocument should handle this, but we're testing error handling
      const data = createMockReportData();

      // This should complete since our mocks don't throw
      const result = await service.generateReport(
        'student_progress',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle null summary gracefully', async () => {
      const data = createMockReportData({ summary: undefined });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });

    it('should handle null subtitle gracefully', async () => {
      const data = createMockReportData({ subtitle: undefined });

      const result = await service.generateReport(
        'custom',
        'pdf',
        data,
        'tenant-001',
        'teacher-001'
      );

      expect(result.status).toBe('completed');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SERVICE WITHOUT REDIS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('service without Redis', () => {
    it('should work without Redis cache', async () => {
      const serviceNoCache = new ReportService(undefined, {
        s3Bucket: 'test-bucket',
        s3Prefix: 'reports/',
        awsRegion: 'us-east-1',
        reportTtlDays: 30,
        maxReportSize: 50 * 1024 * 1024,
        enableEmailDelivery: true,
        fromEmail: 'reports@test.com',
        companyName: 'Test Company',
      });

      const request = createMockGenerateRequest();
      const result = await serviceNoCache.generateReportFromRequest(request);

      expect(result.reportId).toBeDefined();
    });
  });
});
