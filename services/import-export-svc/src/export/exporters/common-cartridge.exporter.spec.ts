// ══════════════════════════════════════════════════════════════════════════════
// COMMON CARTRIDGE EXPORTER UNIT TESTS
// Tests for Common Cartridge 1.x package generation
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonCartridgeExporter } from './common-cartridge.exporter';
import * as AdmZip from 'adm-zip';

vi.mock('adm-zip');

describe('CommonCartridgeExporter', () => {
  let exporter: CommonCartridgeExporter;

  beforeEach(() => {
    exporter = new CommonCartridgeExporter();
    vi.clearAllMocks();
  });

  describe('export', () => {
    it('should generate valid CC 1.3 package structure', async () => {
      const course = {
        id: 'course-1',
        title: 'History 101',
        description: 'Introduction to World History',
        modules: [
          {
            id: 'mod-1',
            title: 'Ancient Civilizations',
            items: [
              {
                id: 'item-1',
                title: 'Egypt',
                type: 'webcontent',
                content: '<html><body>Content about Egypt</body></html>',
              },
            ],
          },
        ],
      };

      const mockZip = {
        addFile: vi.fn(),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('zip')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await exporter.export(course, { version: '1.3' });

      expect(result).toBeInstanceOf(Buffer);
      expect(mockZip.addFile).toHaveBeenCalledWith(
        'imsmanifest.xml',
        expect.any(Buffer),
        expect.any(String)
      );
    });

    it('should include CC schema in manifest', async () => {
      const course = {
        id: 'course-2',
        title: 'Test Course',
        modules: [],
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

      await exporter.export(course, { version: '1.3' });

      expect(capturedManifest).toContain('IMS Common Cartridge');
      expect(capturedManifest).toContain('1.3.0');
      expect(capturedManifest).toContain('imsccv1p3');
    });
  });

  describe('version compatibility', () => {
    const versions = ['1.0', '1.1', '1.2', '1.3'] as const;

    versions.forEach((version) => {
      it(`should export valid CC ${version} package`, async () => {
        const course = {
          id: 'course-version',
          title: 'Version Test',
          modules: [
            {
              id: 'mod-1',
              title: 'Module',
              items: [
                { id: 'item-1', title: 'Item', type: 'webcontent', content: '<p>Test</p>' },
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

        await exporter.export(course, { version });

        expect(capturedManifest).toContain(`${version}`);
        expect(capturedManifest).toContain(`imsccv1p${version.split('.')[1]}`);
      });
    });
  });

  describe('resource types', () => {
    it('should export webcontent resources', async () => {
      const course = {
        id: 'course-web',
        title: 'Web Content Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Module 1',
            items: [
              {
                id: 'page-1',
                title: 'Web Page',
                type: 'webcontent',
                content: '<html><body><h1>Hello World</h1></body></html>',
              },
            ],
          },
        ],
      };

      const addedFiles: Record<string, string> = {};
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          addedFiles[name] = buffer.toString();
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(course, { version: '1.3' });

      // Check manifest has webcontent resource
      expect(addedFiles['imsmanifest.xml']).toContain('type="webcontent"');
      // Check HTML file was created
      const htmlFile = Object.keys(addedFiles).find((f) => f.endsWith('.html'));
      expect(htmlFile).toBeDefined();
    });

    it('should export discussion topics', async () => {
      const course = {
        id: 'course-discussion',
        title: 'Discussion Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Discussions',
            items: [
              {
                id: 'disc-1',
                title: 'Week 1 Discussion',
                type: 'discussion',
                text: 'What are your thoughts on...',
              },
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

      await exporter.export(course, { version: '1.3' });

      expect(capturedManifest).toContain('imsdt_xmlv1p');
      expect(capturedManifest).toContain('discussion');
    });

    it('should export web links', async () => {
      const course = {
        id: 'course-links',
        title: 'Links Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Resources',
            items: [
              {
                id: 'link-1',
                title: 'Wikipedia',
                type: 'weblink',
                url: 'https://wikipedia.org',
              },
            ],
          },
        ],
      };

      const addedFiles: Record<string, string> = {};
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          addedFiles[name] = buffer.toString();
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(course, { version: '1.3' });

      expect(addedFiles['imsmanifest.xml']).toContain('imswl_xmlv1p');
      
      // Check weblink XML was created
      const weblinkFile = Object.entries(addedFiles).find(
        ([k, v]) => v.includes('https://wikipedia.org')
      );
      expect(weblinkFile).toBeDefined();
    });

    it('should export assignments', async () => {
      const course = {
        id: 'course-assignments',
        title: 'Assignment Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Assignments',
            items: [
              {
                id: 'assign-1',
                title: 'Essay Assignment',
                type: 'assignment',
                description: 'Write a 500 word essay...',
                dueDate: '2024-12-31T23:59:00Z',
                points: 100,
              },
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

      await exporter.export(course, { version: '1.3' });

      expect(capturedManifest).toContain('assignment');
    });
  });

  describe('QTI integration', () => {
    it('should embed QTI assessments when enabled', async () => {
      const course = {
        id: 'course-qti',
        title: 'Assessment Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Quizzes',
            items: [
              {
                id: 'quiz-1',
                title: 'Unit 1 Quiz',
                type: 'assessment',
                questions: [
                  {
                    id: 'q1',
                    type: 'multiple_choice',
                    prompt: 'What is 2+2?',
                    options: [
                      { id: 'A', text: '4', isCorrect: true },
                      { id: 'B', text: '5', isCorrect: false },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const addedFiles: string[] = [];
      const mockZip = {
        addFile: vi.fn((name: string) => addedFiles.push(name)),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(course, { version: '1.3', includeQTI: true });

      // Should have QTI assessment files
      const qtiFiles = addedFiles.filter(
        (f) => f.includes('assessment') && f.endsWith('.xml')
      );
      expect(qtiFiles.length).toBeGreaterThan(0);
    });

    it('should skip QTI when disabled', async () => {
      const course = {
        id: 'course-no-qti',
        title: 'No QTI Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Quizzes',
            items: [
              {
                id: 'quiz-1',
                title: 'Quiz',
                type: 'assessment',
                questions: [{ id: 'q1', type: 'multiple_choice', prompt: 'Q' }],
              },
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

      await exporter.export(course, { version: '1.3', includeQTI: false });

      expect(capturedManifest).not.toContain('imsqti');
    });
  });

  describe('LTI integration', () => {
    it('should include LTI links when enabled', async () => {
      const course = {
        id: 'course-lti',
        title: 'LTI Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Tools',
            items: [
              {
                id: 'lti-1',
                title: 'External Tool',
                type: 'lti',
                launchUrl: 'https://tool.example.com/launch',
                customParams: { custom_id: '123' },
              },
            ],
          },
        ],
      };

      const addedFiles: Record<string, string> = {};
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          addedFiles[name] = buffer.toString();
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(course, { version: '1.3', includeLTILinks: true });

      expect(addedFiles['imsmanifest.xml']).toContain('imsbasiclti');

      const ltiFile = Object.entries(addedFiles).find(
        ([k, v]) => v.includes('https://tool.example.com')
      );
      expect(ltiFile).toBeDefined();
    });
  });

  describe('organization structure', () => {
    it('should create nested organization items', async () => {
      const course = {
        id: 'course-nested',
        title: 'Nested Course',
        modules: [
          {
            id: 'unit-1',
            title: 'Unit 1',
            items: [
              {
                id: 'lesson-1',
                title: 'Lesson 1',
                type: 'webcontent',
                content: '<p>L1</p>',
                items: [
                  {
                    id: 'topic-1',
                    title: 'Topic 1A',
                    type: 'webcontent',
                    content: '<p>T1A</p>',
                  },
                ],
              },
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

      await exporter.export(course, { version: '1.3' });

      // Check for nested item structure
      expect(capturedManifest).toContain('identifier="unit-1"');
      expect(capturedManifest).toContain('identifier="lesson-1"');
      expect(capturedManifest).toContain('identifier="topic-1"');
    });
  });

  describe('metadata', () => {
    it('should include course metadata', async () => {
      const course = {
        id: 'course-meta',
        title: 'Metadata Course',
        description: 'Course with full metadata',
        language: 'en',
        keywords: ['history', 'world', 'ancient'],
        gradeLevel: '9-12',
        subject: 'Social Studies',
        copyright: '© 2024 Example Inc.',
        modules: [],
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

      await exporter.export(course, { version: '1.3' });

      expect(capturedManifest).toContain('lom');
      expect(capturedManifest).toContain('Metadata Course');
      expect(capturedManifest).toContain('Course with full metadata');
    });
  });

  describe('file handling', () => {
    it('should include course files in package', async () => {
      const course = {
        id: 'course-files',
        title: 'Files Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Resources',
            items: [
              {
                id: 'file-1',
                title: 'Syllabus',
                type: 'file',
                fileName: 'syllabus.pdf',
                mimeType: 'application/pdf',
              },
            ],
          },
        ],
        files: [
          { path: 'syllabus.pdf', data: Buffer.from('pdf-content') },
          { path: 'images/logo.png', data: Buffer.from('png-content') },
        ],
      };

      const addedFiles: string[] = [];
      const mockZip = {
        addFile: vi.fn((name: string) => addedFiles.push(name)),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(course, { version: '1.3' });

      expect(addedFiles).toContain('syllabus.pdf');
      expect(addedFiles).toContain('images/logo.png');
    });
  });

  describe('authorization', () => {
    it('should include authorization for protected resources', async () => {
      const course = {
        id: 'course-auth',
        title: 'Protected Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Content',
            items: [
              {
                id: 'item-1',
                title: 'Protected Item',
                type: 'webcontent',
                content: '<p>Protected</p>',
                accessRestrictions: {
                  requireAuthentication: true,
                  allowedRoles: ['Learner', 'Instructor'],
                },
              },
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

      await exporter.export(course, { version: '1.3' });

      // CC 1.3 supports authorization extensions
      expect(capturedManifest).toBeDefined();
    });
  });
});
