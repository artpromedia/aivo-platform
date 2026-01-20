import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/**
 * File Validation Tests
 *
 * Tests for document validation including:
 * - File type validation
 * - File size validation
 * - MIME type validation
 * - Content validation
 * - Security validation
 */

// Validation schemas using Zod
const FileMetadataSchema = z.object({
  originalName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.number().positive('File size must be positive'),
  storagePath: z.string().optional(),
});

const IngestJobSchema = z.object({
  name: z.string().min(1, 'Job name is required').max(255, 'Job name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  sourceType: z.enum(['UPLOAD', 'URL', 'LMS_IMPORT', 'API', 'GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX', 'S3']),
  sourceUrl: z.string().url('Invalid URL format').optional(),
  targetCourseId: z.string().optional(),
  targetModuleId: z.string().optional(),
  options: z.record(z.any()).optional(),
});

const IngestItemSchema = z.object({
  originalName: z.string().min(1, 'Original name is required'),
  contentType: z.enum(['DOCUMENT', 'VIDEO', 'AUDIO', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'SCORM', 'LTI', 'URL', 'ARCHIVE']),
  mimeType: z.string().optional(),
  fileSize: z.number().nonnegative('File size cannot be negative').optional(),
  sourceUrl: z.string().url('Invalid source URL').optional(),
  storagePath: z.string().optional(),
});

const WebhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required').max(100, 'Name too long'),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
});

const TemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  contentType: z.enum(['DOCUMENT', 'VIDEO', 'AUDIO', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'SCORM', 'LTI', 'URL', 'ARCHIVE']),
  mappingRules: z.record(z.any()),
  transformers: z.record(z.any()).optional(),
  validators: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

describe('File Validation', () => {
  describe('File Extension Validation', () => {
    const allowedExtensions = [
      '.pdf', '.doc', '.docx',
      '.xls', '.xlsx',
      '.ppt', '.pptx',
      '.txt', '.rtf',
      '.mp4', '.webm', '.mov',
      '.mp3', '.wav', '.ogg',
      '.png', '.jpg', '.jpeg', '.gif',
      '.zip',
    ];

    const validateExtension = (filename: string): boolean => {
      const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
      return allowedExtensions.includes(ext);
    };

    it('should accept valid PDF files', () => {
      expect(validateExtension('document.pdf')).toBe(true);
      expect(validateExtension('Document.PDF')).toBe(true);
    });

    it('should accept valid Word documents', () => {
      expect(validateExtension('document.doc')).toBe(true);
      expect(validateExtension('document.docx')).toBe(true);
    });

    it('should accept valid Excel files', () => {
      expect(validateExtension('spreadsheet.xls')).toBe(true);
      expect(validateExtension('spreadsheet.xlsx')).toBe(true);
    });

    it('should accept valid PowerPoint files', () => {
      expect(validateExtension('presentation.ppt')).toBe(true);
      expect(validateExtension('presentation.pptx')).toBe(true);
    });

    it('should accept valid video files', () => {
      expect(validateExtension('video.mp4')).toBe(true);
      expect(validateExtension('video.webm')).toBe(true);
      expect(validateExtension('video.mov')).toBe(true);
    });

    it('should accept valid audio files', () => {
      expect(validateExtension('audio.mp3')).toBe(true);
      expect(validateExtension('audio.wav')).toBe(true);
      expect(validateExtension('audio.ogg')).toBe(true);
    });

    it('should accept valid image files', () => {
      expect(validateExtension('image.png')).toBe(true);
      expect(validateExtension('image.jpg')).toBe(true);
      expect(validateExtension('image.jpeg')).toBe(true);
      expect(validateExtension('image.gif')).toBe(true);
    });

    it('should reject invalid file extensions', () => {
      expect(validateExtension('script.exe')).toBe(false);
      expect(validateExtension('virus.bat')).toBe(false);
      expect(validateExtension('malware.sh')).toBe(false);
      expect(validateExtension('hack.js')).toBe(false);
    });

    it('should reject files with no extension', () => {
      expect(validateExtension('noextension')).toBe(false);
    });

    it('should handle filenames with multiple dots', () => {
      expect(validateExtension('my.document.file.pdf')).toBe(true);
      expect(validateExtension('my.document.file.exe')).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    const maxFileSize = 104857600; // 100MB in bytes

    const validateFileSize = (size: number, maxSize: number = maxFileSize): { valid: boolean; error?: string } => {
      if (size <= 0) {
        return { valid: false, error: 'File size must be positive' };
      }
      if (size > maxSize) {
        return { valid: false, error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB` };
      }
      return { valid: true };
    };

    it('should accept files within size limit', () => {
      expect(validateFileSize(1024)).toEqual({ valid: true }); // 1KB
      expect(validateFileSize(1048576)).toEqual({ valid: true }); // 1MB
      expect(validateFileSize(52428800)).toEqual({ valid: true }); // 50MB
      expect(validateFileSize(104857600)).toEqual({ valid: true }); // 100MB (exactly at limit)
    });

    it('should reject files exceeding size limit', () => {
      const result = validateFileSize(104857601);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should reject zero-size files', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be positive');
    });

    it('should reject negative file sizes', () => {
      const result = validateFileSize(-100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be positive');
    });

    it('should accept custom max size', () => {
      const customMax = 10485760; // 10MB
      expect(validateFileSize(5242880, customMax)).toEqual({ valid: true }); // 5MB
      expect(validateFileSize(10485761, customMax).valid).toBe(false);
    });
  });

  describe('MIME Type Validation', () => {
    const allowedMimeTypes: Record<string, string[]> = {
      DOCUMENT: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
      ],
      SPREADSHEET: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ],
      PRESENTATION: [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      VIDEO: [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
      ],
      AUDIO: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm',
      ],
      IMAGE: [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ],
      ARCHIVE: [
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
      ],
    };

    const validateMimeType = (mimeType: string, contentType?: string): { valid: boolean; detectedType?: string; error?: string } => {
      // Find which content type this MIME type belongs to
      for (const [type, mimes] of Object.entries(allowedMimeTypes)) {
        if (mimes.includes(mimeType)) {
          if (contentType && contentType !== type) {
            return {
              valid: false,
              detectedType: type,
              error: `MIME type ${mimeType} does not match content type ${contentType}`,
            };
          }
          return { valid: true, detectedType: type };
        }
      }
      return { valid: false, error: `MIME type ${mimeType} is not allowed` };
    };

    it('should accept valid document MIME types', () => {
      expect(validateMimeType('application/pdf')).toEqual({ valid: true, detectedType: 'DOCUMENT' });
      expect(validateMimeType('application/msword')).toEqual({ valid: true, detectedType: 'DOCUMENT' });
      expect(validateMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
        .toEqual({ valid: true, detectedType: 'DOCUMENT' });
    });

    it('should accept valid spreadsheet MIME types', () => {
      expect(validateMimeType('application/vnd.ms-excel')).toEqual({ valid: true, detectedType: 'SPREADSHEET' });
      expect(validateMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
        .toEqual({ valid: true, detectedType: 'SPREADSHEET' });
      expect(validateMimeType('text/csv')).toEqual({ valid: true, detectedType: 'SPREADSHEET' });
    });

    it('should accept valid video MIME types', () => {
      expect(validateMimeType('video/mp4')).toEqual({ valid: true, detectedType: 'VIDEO' });
      expect(validateMimeType('video/webm')).toEqual({ valid: true, detectedType: 'VIDEO' });
    });

    it('should accept valid audio MIME types', () => {
      expect(validateMimeType('audio/mpeg')).toEqual({ valid: true, detectedType: 'AUDIO' });
      expect(validateMimeType('audio/wav')).toEqual({ valid: true, detectedType: 'AUDIO' });
    });

    it('should reject invalid MIME types', () => {
      const result = validateMimeType('application/x-executable');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject mismatched content type', () => {
      const result = validateMimeType('application/pdf', 'SPREADSHEET');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match');
    });
  });

  describe('Zod Schema Validation', () => {
    describe('FileMetadataSchema', () => {
      it('should accept valid file metadata', () => {
        const validMetadata = {
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        };

        expect(() => FileMetadataSchema.parse(validMetadata)).not.toThrow();
      });

      it('should reject empty file name', () => {
        const invalidMetadata = {
          originalName: '',
          mimeType: 'application/pdf',
          fileSize: 1024,
        };

        expect(() => FileMetadataSchema.parse(invalidMetadata)).toThrow();
      });

      it('should reject negative file size', () => {
        const invalidMetadata = {
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: -100,
        };

        expect(() => FileMetadataSchema.parse(invalidMetadata)).toThrow();
      });

      it('should reject zero file size', () => {
        const invalidMetadata = {
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: 0,
        };

        expect(() => FileMetadataSchema.parse(invalidMetadata)).toThrow();
      });
    });

    describe('IngestJobSchema', () => {
      it('should accept valid job data', () => {
        const validJob = {
          name: 'Test Ingestion Job',
          sourceType: 'UPLOAD',
        };

        expect(() => IngestJobSchema.parse(validJob)).not.toThrow();
      });

      it('should accept job with all optional fields', () => {
        const fullJob = {
          name: 'Full Job',
          description: 'A complete job with all fields',
          sourceType: 'URL',
          sourceUrl: 'https://example.com/file.pdf',
          targetCourseId: 'course-123',
          targetModuleId: 'module-456',
          options: { extractImages: true },
        };

        expect(() => IngestJobSchema.parse(fullJob)).not.toThrow();
      });

      it('should reject empty job name', () => {
        const invalidJob = {
          name: '',
          sourceType: 'UPLOAD',
        };

        expect(() => IngestJobSchema.parse(invalidJob)).toThrow();
      });

      it('should reject too long job name', () => {
        const invalidJob = {
          name: 'a'.repeat(256),
          sourceType: 'UPLOAD',
        };

        expect(() => IngestJobSchema.parse(invalidJob)).toThrow();
      });

      it('should reject invalid source type', () => {
        const invalidJob = {
          name: 'Test Job',
          sourceType: 'INVALID_SOURCE',
        };

        expect(() => IngestJobSchema.parse(invalidJob)).toThrow();
      });

      it('should reject invalid URL format', () => {
        const invalidJob = {
          name: 'Test Job',
          sourceType: 'URL',
          sourceUrl: 'not-a-valid-url',
        };

        expect(() => IngestJobSchema.parse(invalidJob)).toThrow();
      });

      it('should accept all valid source types', () => {
        const sourceTypes = ['UPLOAD', 'URL', 'LMS_IMPORT', 'API', 'GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX', 'S3'];

        sourceTypes.forEach(sourceType => {
          const job = { name: 'Test', sourceType };
          expect(() => IngestJobSchema.parse(job)).not.toThrow();
        });
      });
    });

    describe('IngestItemSchema', () => {
      it('should accept valid item data', () => {
        const validItem = {
          originalName: 'document.pdf',
          contentType: 'DOCUMENT',
        };

        expect(() => IngestItemSchema.parse(validItem)).not.toThrow();
      });

      it('should accept item with all fields', () => {
        const fullItem = {
          originalName: 'document.pdf',
          contentType: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileSize: 1024,
          sourceUrl: 'https://example.com/document.pdf',
          storagePath: '/uploads/document.pdf',
        };

        expect(() => IngestItemSchema.parse(fullItem)).not.toThrow();
      });

      it('should reject invalid content type', () => {
        const invalidItem = {
          originalName: 'file.xyz',
          contentType: 'INVALID_TYPE',
        };

        expect(() => IngestItemSchema.parse(invalidItem)).toThrow();
      });

      it('should reject negative file size', () => {
        const invalidItem = {
          originalName: 'document.pdf',
          contentType: 'DOCUMENT',
          fileSize: -1,
        };

        expect(() => IngestItemSchema.parse(invalidItem)).toThrow();
      });

      it('should accept all valid content types', () => {
        const contentTypes = ['DOCUMENT', 'VIDEO', 'AUDIO', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'SCORM', 'LTI', 'URL', 'ARCHIVE'];

        contentTypes.forEach(contentType => {
          const item = { originalName: 'file.ext', contentType };
          expect(() => IngestItemSchema.parse(item)).not.toThrow();
        });
      });
    });

    describe('WebhookSchema', () => {
      it('should accept valid webhook data', () => {
        const validWebhook = {
          name: 'Completion Webhook',
          url: 'https://example.com/webhook',
          events: ['job.completed'],
        };

        expect(() => WebhookSchema.parse(validWebhook)).not.toThrow();
      });

      it('should accept webhook with multiple events', () => {
        const webhook = {
          name: 'All Events',
          url: 'https://example.com/webhook',
          events: ['job.created', 'job.completed', 'job.failed', 'item.processed'],
        };

        expect(() => WebhookSchema.parse(webhook)).not.toThrow();
      });

      it('should reject empty events array', () => {
        const invalidWebhook = {
          name: 'Empty Events',
          url: 'https://example.com/webhook',
          events: [],
        };

        expect(() => WebhookSchema.parse(invalidWebhook)).toThrow();
      });

      it('should reject invalid URL', () => {
        const invalidWebhook = {
          name: 'Invalid URL',
          url: 'not-a-url',
          events: ['job.completed'],
        };

        expect(() => WebhookSchema.parse(invalidWebhook)).toThrow();
      });
    });

    describe('TemplateSchema', () => {
      it('should accept valid template data', () => {
        const validTemplate = {
          name: 'Document Template',
          contentType: 'DOCUMENT',
          mappingRules: { title: 'heading1' },
        };

        expect(() => TemplateSchema.parse(validTemplate)).not.toThrow();
      });

      it('should accept template with all fields', () => {
        const fullTemplate = {
          name: 'Full Template',
          description: 'A complete template',
          contentType: 'DOCUMENT',
          mappingRules: { title: 'heading1', body: 'paragraphs' },
          transformers: { cleanHtml: true },
          validators: { minLength: 100 },
          isDefault: true,
        };

        expect(() => TemplateSchema.parse(fullTemplate)).not.toThrow();
      });

      it('should reject too long description', () => {
        const invalidTemplate = {
          name: 'Template',
          description: 'a'.repeat(501),
          contentType: 'DOCUMENT',
          mappingRules: {},
        };

        expect(() => TemplateSchema.parse(invalidTemplate)).toThrow();
      });
    });
  });

  describe('Security Validation', () => {
    describe('File Name Sanitization', () => {
      const sanitizeFilename = (filename: string): string => {
        // Remove path traversal attempts
        let sanitized = filename.replace(/\.\./g, '');
        // Remove leading/trailing whitespace
        sanitized = sanitized.trim();
        // Replace dangerous characters
        sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        // Limit length
        if (sanitized.length > 255) {
          const ext = sanitized.slice(sanitized.lastIndexOf('.'));
          sanitized = sanitized.slice(0, 255 - ext.length) + ext;
        }
        return sanitized;
      };

      it('should remove path traversal attempts', () => {
        expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
        expect(sanitizeFilename('..\\..\\windows\\system32')).not.toContain('..');
      });

      it('should replace dangerous characters', () => {
        const result = sanitizeFilename('file<>:"/\\|?*name.pdf');
        expect(result).not.toMatch(/[<>:"/\\|?*]/);
      });

      it('should trim whitespace', () => {
        expect(sanitizeFilename('  document.pdf  ')).toBe('document.pdf');
      });

      it('should truncate long filenames while preserving extension', () => {
        const longName = 'a'.repeat(300) + '.pdf';
        const result = sanitizeFilename(longName);
        expect(result.length).toBeLessThanOrEqual(255);
        expect(result).toMatch(/\.pdf$/);
      });

      it('should handle normal filenames unchanged', () => {
        expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
        expect(sanitizeFilename('my-file_2024.docx')).toBe('my-file_2024.docx');
      });
    });

    describe('Content Security Validation', () => {
      const containsMaliciousContent = (content: string): { safe: boolean; threats: string[] } => {
        const threats: string[] = [];

        // Check for script injection
        if (/<script[\s\S]*?>[\s\S]*?<\/script>/i.test(content)) {
          threats.push('Script injection detected');
        }

        // Check for iframe injection
        if (/<iframe[\s\S]*?>/i.test(content)) {
          threats.push('IFrame injection detected');
        }

        // Check for event handlers
        if (/on\w+\s*=/i.test(content)) {
          threats.push('Event handler injection detected');
        }

        // Check for javascript: URLs
        if (/javascript:/i.test(content)) {
          threats.push('JavaScript URL detected');
        }

        // Check for data: URLs with script content
        if (/data:text\/html/i.test(content)) {
          threats.push('Data URL with HTML detected');
        }

        return {
          safe: threats.length === 0,
          threats,
        };
      };

      it('should detect script injection', () => {
        const content = '<p>Hello</p><script>alert("xss")</script>';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('Script injection detected');
      });

      it('should detect iframe injection', () => {
        const content = '<iframe src="https://evil.com"></iframe>';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('IFrame injection detected');
      });

      it('should detect event handler injection', () => {
        const content = '<img src="x" onerror="alert(1)">';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('Event handler injection detected');
      });

      it('should detect javascript: URLs', () => {
        const content = '<a href="javascript:alert(1)">Click</a>';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('JavaScript URL detected');
      });

      it('should allow safe content', () => {
        const content = '<h1>Hello World</h1><p>This is safe content.</p>';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(true);
        expect(result.threats).toHaveLength(0);
      });

      it('should detect multiple threats', () => {
        const content = '<script>bad</script><iframe src="x"></iframe>';
        const result = containsMaliciousContent(content);
        expect(result.safe).toBe(false);
        expect(result.threats.length).toBeGreaterThan(1);
      });
    });

    describe('URL Validation', () => {
      const validateSourceUrl = (url: string): { valid: boolean; error?: string } => {
        try {
          const parsed = new URL(url);

          // Only allow http and https
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
          }

          // Block localhost and internal IPs
          const hostname = parsed.hostname.toLowerCase();
          if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            return { valid: false, error: 'Internal URLs are not allowed' };
          }

          // Block file:// URLs
          if (parsed.protocol === 'file:') {
            return { valid: false, error: 'File URLs are not allowed' };
          }

          return { valid: true };
        } catch {
          return { valid: false, error: 'Invalid URL format' };
        }
      };

      it('should accept valid HTTPS URLs', () => {
        expect(validateSourceUrl('https://example.com/document.pdf')).toEqual({ valid: true });
        expect(validateSourceUrl('https://cdn.example.org/files/doc.docx')).toEqual({ valid: true });
      });

      it('should accept valid HTTP URLs', () => {
        expect(validateSourceUrl('http://example.com/document.pdf')).toEqual({ valid: true });
      });

      it('should reject file:// URLs', () => {
        const result = validateSourceUrl('file:///etc/passwd');
        expect(result.valid).toBe(false);
      });

      it('should reject localhost URLs', () => {
        const result = validateSourceUrl('http://localhost:3000/file.pdf');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Internal URLs');
      });

      it('should reject internal IP addresses', () => {
        expect(validateSourceUrl('http://192.168.1.1/file.pdf').valid).toBe(false);
        expect(validateSourceUrl('http://10.0.0.1/file.pdf').valid).toBe(false);
        expect(validateSourceUrl('http://172.16.0.1/file.pdf').valid).toBe(false);
      });

      it('should reject javascript: URLs', () => {
        const result = validateSourceUrl('javascript:alert(1)');
        expect(result.valid).toBe(false);
      });

      it('should reject data: URLs', () => {
        const result = validateSourceUrl('data:text/html,<script>alert(1)</script>');
        expect(result.valid).toBe(false);
      });

      it('should reject invalid URL format', () => {
        const result = validateSourceUrl('not-a-url');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });
  });

  describe('Quota Validation', () => {
    interface Quota {
      dailyLimit: number;
      monthlyLimit: number;
      usedToday: number;
      usedThisMonth: number;
      maxFileSize: number;
      allowedTypes: string[];
    }

    const validateQuota = (
      quota: Quota,
      fileSize: number,
      fileType: string
    ): { allowed: boolean; error?: string } => {
      if (quota.usedToday >= quota.dailyLimit) {
        return { allowed: false, error: 'Daily quota exceeded' };
      }

      if (quota.usedThisMonth >= quota.monthlyLimit) {
        return { allowed: false, error: 'Monthly quota exceeded' };
      }

      if (fileSize > quota.maxFileSize) {
        return { allowed: false, error: `File exceeds maximum size of ${quota.maxFileSize / 1024 / 1024}MB` };
      }

      if (quota.allowedTypes.length > 0 && !quota.allowedTypes.includes(fileType)) {
        return { allowed: false, error: `File type ${fileType} is not allowed` };
      }

      return { allowed: true };
    };

    const defaultQuota: Quota = {
      dailyLimit: 100,
      monthlyLimit: 1000,
      usedToday: 50,
      usedThisMonth: 500,
      maxFileSize: 104857600,
      allowedTypes: [],
    };

    it('should allow upload within quota', () => {
      const result = validateQuota(defaultQuota, 1024, 'pdf');
      expect(result.allowed).toBe(true);
    });

    it('should reject when daily quota exceeded', () => {
      const exhaustedQuota = { ...defaultQuota, usedToday: 100 };
      const result = validateQuota(exhaustedQuota, 1024, 'pdf');
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Daily quota exceeded');
    });

    it('should reject when monthly quota exceeded', () => {
      const exhaustedQuota = { ...defaultQuota, usedThisMonth: 1000 };
      const result = validateQuota(exhaustedQuota, 1024, 'pdf');
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Monthly quota exceeded');
    });

    it('should reject file exceeding max size', () => {
      const result = validateQuota(defaultQuota, 200000000, 'pdf');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should reject disallowed file type when restrictions exist', () => {
      const restrictedQuota = { ...defaultQuota, allowedTypes: ['pdf', 'docx'] };
      const result = validateQuota(restrictedQuota, 1024, 'exe');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should allow file type when in allowed list', () => {
      const restrictedQuota = { ...defaultQuota, allowedTypes: ['pdf', 'docx'] };
      const result = validateQuota(restrictedQuota, 1024, 'pdf');
      expect(result.allowed).toBe(true);
    });

    it('should allow any file type when allowedTypes is empty', () => {
      const result = validateQuota(defaultQuota, 1024, 'any-type');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    interface FileRecord {
      id: string;
      hash: string;
      name: string;
      size: number;
    }

    const detectDuplicate = (
      newFile: { hash: string; name: string; size: number },
      existingFiles: FileRecord[]
    ): { isDuplicate: boolean; existingFile?: FileRecord } => {
      // Check by hash (exact content match)
      const hashMatch = existingFiles.find(f => f.hash === newFile.hash);
      if (hashMatch) {
        return { isDuplicate: true, existingFile: hashMatch };
      }

      // Check by name and size (potential duplicate)
      const nameAndSizeMatch = existingFiles.find(
        f => f.name === newFile.name && f.size === newFile.size
      );
      if (nameAndSizeMatch) {
        return { isDuplicate: true, existingFile: nameAndSizeMatch };
      }

      return { isDuplicate: false };
    };

    const existingFiles: FileRecord[] = [
      { id: '1', hash: 'abc123', name: 'document.pdf', size: 1024 },
      { id: '2', hash: 'def456', name: 'report.docx', size: 2048 },
    ];

    it('should detect duplicate by hash', () => {
      const newFile = { hash: 'abc123', name: 'different-name.pdf', size: 9999 };
      const result = detectDuplicate(newFile, existingFiles);
      expect(result.isDuplicate).toBe(true);
      expect(result.existingFile?.id).toBe('1');
    });

    it('should detect duplicate by name and size', () => {
      const newFile = { hash: 'new-hash', name: 'document.pdf', size: 1024 };
      const result = detectDuplicate(newFile, existingFiles);
      expect(result.isDuplicate).toBe(true);
      expect(result.existingFile?.id).toBe('1');
    });

    it('should not flag different files as duplicates', () => {
      const newFile = { hash: 'unique-hash', name: 'new-document.pdf', size: 3072 };
      const result = detectDuplicate(newFile, existingFiles);
      expect(result.isDuplicate).toBe(false);
    });

    it('should not flag same name but different size as duplicate', () => {
      const newFile = { hash: 'unique-hash', name: 'document.pdf', size: 2048 };
      const result = detectDuplicate(newFile, existingFiles);
      expect(result.isDuplicate).toBe(false);
    });

    it('should handle empty existing files list', () => {
      const newFile = { hash: 'abc123', name: 'document.pdf', size: 1024 };
      const result = detectDuplicate(newFile, []);
      expect(result.isDuplicate).toBe(false);
    });
  });
});
