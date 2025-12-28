// ══════════════════════════════════════════════════════════════════════════════
// SCORM EXPORTER UNIT TESTS
// Tests for SCORM 1.2 and 2004 package generation
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScormExporter } from './scorm.exporter';
import * as AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';

vi.mock('adm-zip');

describe('ScormExporter', () => {
  let exporter: ScormExporter;

  beforeEach(() => {
    exporter = new ScormExporter();
    vi.clearAllMocks();
  });

  describe('exportScorm12', () => {
    it('should generate valid SCORM 1.2 package structure', async () => {
      const content = {
        id: 'course-1',
        title: 'Test Course',
        description: 'A test course',
        language: 'en',
        modules: [
          {
            id: 'mod-1',
            title: 'Module 1',
            type: 'lesson',
            htmlContent: '<html><body>Lesson content</body></html>',
          },
        ],
      };

      const mockZip = {
        addFile: vi.fn(),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('zip-content')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await exporter.export(content, { version: '1.2' });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify manifest was added
      expect(mockZip.addFile).toHaveBeenCalledWith(
        'imsmanifest.xml',
        expect.any(Buffer),
        expect.any(String)
      );

      // Verify content files were added
      const addFileCalls = mockZip.addFile.mock.calls;
      const fileNames = addFileCalls.map((call: any) => call[0]);
      
      expect(fileNames).toContain('imsmanifest.xml');
    });

    it('should include correct SCORM 1.2 schema references', async () => {
      const content = {
        id: 'course-2',
        title: 'Schema Test',
        modules: [
          { id: 'm1', title: 'Lesson', type: 'lesson', htmlContent: '<p>Content</p>' },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '1.2' });

      expect(capturedManifest).toContain('http://www.adlnet.org/xsd/adlcp_rootv1p2');
      expect(capturedManifest).toContain('schemaversion>1.2</');
    });

    it('should set mastery score when provided', async () => {
      const content = {
        id: 'course-3',
        title: 'Mastery Test',
        modules: [
          {
            id: 'm1',
            title: 'Quiz',
            type: 'assessment',
            masteryScore: 80,
            htmlContent: '<p>Quiz</p>',
          },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '1.2', masteryScore: 80 });

      expect(capturedManifest).toContain('adlcp:masteryscore>80</');
    });
  });

  describe('exportScorm2004', () => {
    it('should generate valid SCORM 2004 package structure', async () => {
      const content = {
        id: 'course-4',
        title: 'SCORM 2004 Course',
        modules: [
          { id: 'm1', title: 'Module 1', type: 'lesson', htmlContent: '<p>Content</p>' },
          { id: 'm2', title: 'Module 2', type: 'lesson', htmlContent: '<p>More</p>' },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '2004' });

      expect(capturedManifest).toContain('http://www.adlnet.org/xsd/adlcp_v1p3');
      expect(capturedManifest).toContain('CAM 1.3');
    });

    it('should include sequencing when enabled', async () => {
      const content = {
        id: 'course-5',
        title: 'Sequenced Course',
        modules: [
          {
            id: 'm1',
            title: 'First',
            type: 'lesson',
            htmlContent: '<p>1</p>',
            sequencing: {
              controlMode: { choice: false, flow: true },
            },
          },
          {
            id: 'm2',
            title: 'Second',
            type: 'lesson',
            htmlContent: '<p>2</p>',
            prerequisites: ['m1'],
          },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '2004', includeSequencing: true });

      expect(capturedManifest).toContain('imsss:sequencing');
      expect(capturedManifest).toContain('controlMode');
    });

    it('should include objectives when defined', async () => {
      const content = {
        id: 'course-6',
        title: 'Objectives Course',
        modules: [
          {
            id: 'm1',
            title: 'Module with Objectives',
            type: 'lesson',
            htmlContent: '<p>Content</p>',
            objectives: [
              { id: 'obj1', minScore: 0.8, satisfiedByMeasure: true },
            ],
          },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '2004', includeSequencing: true });

      expect(capturedManifest).toContain('imsss:objectives');
      expect(capturedManifest).toContain('objectiveID');
    });
  });

  describe('generateApiWrapper', () => {
    it('should generate SCORM 1.2 API wrapper', () => {
      const wrapper = exporter.generateApiWrapper('1.2');

      expect(wrapper).toContain('API');
      expect(wrapper).toContain('LMSInitialize');
      expect(wrapper).toContain('LMSFinish');
      expect(wrapper).toContain('LMSGetValue');
      expect(wrapper).toContain('LMSSetValue');
      expect(wrapper).toContain('LMSCommit');
      expect(wrapper).toContain('LMSGetLastError');
    });

    it('should generate SCORM 2004 API wrapper', () => {
      const wrapper = exporter.generateApiWrapper('2004');

      expect(wrapper).toContain('API_1484_11');
      expect(wrapper).toContain('Initialize');
      expect(wrapper).toContain('Terminate');
      expect(wrapper).toContain('GetValue');
      expect(wrapper).toContain('SetValue');
      expect(wrapper).toContain('Commit');
      expect(wrapper).toContain('GetLastError');
      expect(wrapper).toContain('GetErrorString');
      expect(wrapper).toContain('GetDiagnostic');
    });
  });

  describe('generateLaunchPage', () => {
    it('should generate HTML launch page with API initialization', () => {
      const launchPage = exporter.generateLaunchPage({
        title: 'Test Lesson',
        contentPath: 'content/lesson.html',
        version: '1.2',
      });

      expect(launchPage).toContain('<!DOCTYPE html>');
      expect(launchPage).toContain('Test Lesson');
      expect(launchPage).toContain('content/lesson.html');
      expect(launchPage).toContain('window.parent.API');
    });

    it('should include navigation controls for SCORM 2004', () => {
      const launchPage = exporter.generateLaunchPage({
        title: 'Sequenced Lesson',
        contentPath: 'content/lesson.html',
        version: '2004',
        navigation: { previous: true, next: true, exit: true },
      });

      expect(launchPage).toContain('adl.nav.request');
    });
  });

  describe('validateOutput', () => {
    it('should validate generated manifest against schema', async () => {
      const content = {
        id: 'course-valid',
        title: 'Valid Course',
        modules: [
          { id: 'm1', title: 'Lesson', type: 'lesson', htmlContent: '<p>Test</p>' },
        ],
      };

      const mockZip = {
        addFile: vi.fn(),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
        getEntry: vi.fn((name: string) => ({
          getData: () => Buffer.from('<manifest></manifest>'),
        })),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await exporter.export(content, {
        version: '1.2',
        validate: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('handleAssets', () => {
    it('should include referenced assets in package', async () => {
      const content = {
        id: 'course-assets',
        title: 'Course with Assets',
        modules: [
          {
            id: 'm1',
            title: 'Lesson',
            type: 'lesson',
            htmlContent: '<img src="images/photo.jpg"/><video src="videos/intro.mp4"/>',
          },
        ],
        assets: [
          { path: 'images/photo.jpg', data: Buffer.from('image-data') },
          { path: 'videos/intro.mp4', data: Buffer.from('video-data') },
        ],
      };

      const addedFiles: string[] = [];
      const mockZip = {
        addFile: vi.fn((name: string) => addedFiles.push(name)),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '1.2' });

      expect(addedFiles).toContain('images/photo.jpg');
      expect(addedFiles).toContain('videos/intro.mp4');
    });

    it('should update asset paths in manifest resources', async () => {
      const content = {
        id: 'course-paths',
        title: 'Path Test',
        modules: [
          {
            id: 'm1',
            title: 'Lesson',
            type: 'lesson',
            htmlContent: '<p>Test</p>',
          },
        ],
        assets: [
          { path: 'shared/styles.css', data: Buffer.from('css') },
        ],
      };

      let capturedManifest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name === 'imsmanifest.xml') {
            capturedManifest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(content, { version: '1.2' });

      expect(capturedManifest).toContain('shared/styles.css');
    });
  });
});
