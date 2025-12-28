// ══════════════════════════════════════════════════════════════════════════════
// QTI EXPORTER UNIT TESTS
// Tests for QTI 2.1 and 3.0 assessment package generation
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QtiExporter } from './qti.exporter';
import * as AdmZip from 'adm-zip';

vi.mock('adm-zip');

describe('QtiExporter', () => {
  let exporter: QtiExporter;

  beforeEach(() => {
    exporter = new QtiExporter();
    vi.clearAllMocks();
  });

  describe('exportQti21', () => {
    it('should generate valid QTI 2.1 package', async () => {
      const assessment = {
        id: 'quiz-1',
        title: 'Math Quiz',
        description: 'Basic math assessment',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'What is 2 + 2?',
            options: [
              { id: 'A', text: '3', isCorrect: false },
              { id: 'B', text: '4', isCorrect: true },
              { id: 'C', text: '5', isCorrect: false },
            ],
          },
        ],
      };

      const mockZip = {
        addFile: vi.fn(),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('zip')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await exporter.export(assessment, { version: '2.1' });

      expect(result).toBeInstanceOf(Buffer);
      expect(mockZip.addFile).toHaveBeenCalledWith(
        'imsmanifest.xml',
        expect.any(Buffer),
        expect.any(String)
      );
    });

    it('should generate correct choice interaction XML', async () => {
      const assessment = {
        id: 'quiz-2',
        title: 'Choice Test',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'Select the correct answer',
            options: [
              { id: 'A', text: 'Option A', isCorrect: false },
              { id: 'B', text: 'Option B', isCorrect: true },
            ],
            shuffle: true,
          },
        ],
      };

      let capturedItem: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name.endsWith('q1.xml')) {
            capturedItem = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(assessment, { version: '2.1' });

      expect(capturedItem).toContain('choiceInteraction');
      expect(capturedItem).toContain('shuffle="true"');
      expect(capturedItem).toContain('simpleChoice identifier="A"');
      expect(capturedItem).toContain('simpleChoice identifier="B"');
      expect(capturedItem).toContain('responseDeclaration');
      expect(capturedItem).toContain('correctResponse');
    });

    it('should include response processing template', async () => {
      const assessment = {
        id: 'quiz-3',
        title: 'Processing Test',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'Test',
            options: [{ id: 'A', text: 'A', isCorrect: true }],
          },
        ],
      };

      let capturedItem: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name.endsWith('.xml') && !name.includes('manifest')) {
            capturedItem = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(assessment, {
        version: '2.1',
        includeResponseProcessing: true,
      });

      expect(capturedItem).toContain('responseProcessing');
      expect(capturedItem).toContain('match_correct');
    });
  });

  describe('exportQti30', () => {
    it('should generate valid QTI 3.0 package', async () => {
      const assessment = {
        id: 'quiz-4',
        title: 'QTI 3.0 Quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'Question',
            options: [{ id: 'A', text: 'A', isCorrect: true }],
          },
        ],
      };

      let capturedItem: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name.endsWith('.xml') && !name.includes('manifest')) {
            capturedItem = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(assessment, { version: '3.0' });

      expect(capturedItem).toContain('qti-assessment-item');
      expect(capturedItem).toContain('http://www.imsglobal.org/xsd/imsqtiasi_v3p0');
    });
  });

  describe('question types', () => {
    const mockZip = () => {
      const files: Record<string, string> = {};
      return {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          files[name] = buffer.toString();
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
        getFiles: () => files,
      };
    };

    it('should export text entry (short answer) questions', async () => {
      const assessment = {
        id: 'quiz-text',
        title: 'Text Entry Test',
        questions: [
          {
            id: 'q1',
            type: 'short_answer',
            prompt: 'What is the capital of France?',
            acceptedAnswers: ['Paris', 'paris'],
            caseSensitive: false,
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('textEntryInteraction');
      expect(itemXml).toContain('baseType="string"');
    });

    it('should export extended text (essay) questions', async () => {
      const assessment = {
        id: 'quiz-essay',
        title: 'Essay Test',
        questions: [
          {
            id: 'q1',
            type: 'essay',
            prompt: 'Explain the significance of...',
            rubric: {
              maxScore: 10,
              criteria: [
                { description: 'Content', points: 5 },
                { description: 'Structure', points: 5 },
              ],
            },
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('extendedTextInteraction');
    });

    it('should export order interaction questions', async () => {
      const assessment = {
        id: 'quiz-order',
        title: 'Ordering Test',
        questions: [
          {
            id: 'q1',
            type: 'ordering',
            prompt: 'Put these in order',
            items: [
              { id: 'S1', text: 'First' },
              { id: 'S2', text: 'Second' },
              { id: 'S3', text: 'Third' },
            ],
            correctOrder: ['S1', 'S2', 'S3'],
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('orderInteraction');
      expect(itemXml).toContain('cardinality="ordered"');
    });

    it('should export match interaction questions', async () => {
      const assessment = {
        id: 'quiz-match',
        title: 'Matching Test',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match the pairs',
            pairs: [
              { source: 'A', target: '1' },
              { source: 'B', target: '2' },
            ],
            sourceItems: [
              { id: 'A', text: 'Item A' },
              { id: 'B', text: 'Item B' },
            ],
            targetItems: [
              { id: '1', text: 'Match 1' },
              { id: '2', text: 'Match 2' },
            ],
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('matchInteraction');
      expect(itemXml).toContain('simpleMatchSet');
    });

    it('should export hotspot questions', async () => {
      const assessment = {
        id: 'quiz-hotspot',
        title: 'Hotspot Test',
        questions: [
          {
            id: 'q1',
            type: 'hotspot',
            prompt: 'Click on the correct area',
            image: 'images/diagram.png',
            hotspots: [
              { id: 'H1', shape: 'circle', coords: '100,100,50', isCorrect: true },
              { id: 'H2', shape: 'rect', coords: '200,200,300,300', isCorrect: false },
            ],
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('hotspotInteraction');
      expect(itemXml).toContain('hotspotChoice');
    });

    it('should export inline choice (dropdown) questions', async () => {
      const assessment = {
        id: 'quiz-inline',
        title: 'Inline Choice Test',
        questions: [
          {
            id: 'q1',
            type: 'inline_choice',
            content: 'The capital of France is {GAP1}.',
            gaps: [
              {
                id: 'GAP1',
                options: [
                  { id: 'A', text: 'Paris', isCorrect: true },
                  { id: 'B', text: 'London', isCorrect: false },
                ],
              },
            ],
          },
        ],
      };

      const mock = mockZip();
      vi.mocked(AdmZip).mockImplementation(() => mock as any);

      await exporter.export(assessment, { version: '2.1' });

      const files = mock.getFiles();
      const itemXml = Object.entries(files).find(
        ([k]) => k.includes('q1')
      )?.[1];

      expect(itemXml).toContain('inlineChoiceInteraction');
    });
  });

  describe('metadata', () => {
    it('should include IEEE LOM metadata when enabled', async () => {
      const assessment = {
        id: 'quiz-meta',
        title: 'Metadata Test',
        description: 'Test assessment',
        keywords: ['math', 'quiz'],
        language: 'en',
        gradeLevel: '9-12',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'Test',
            options: [{ id: 'A', text: 'A', isCorrect: true }],
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

      await exporter.export(assessment, {
        version: '2.1',
        includeMetadata: true,
      });

      expect(capturedManifest).toContain('lom');
      expect(capturedManifest).toContain('Metadata Test');
    });
  });

  describe('test and section structure', () => {
    it('should generate assessmentTest for multiple sections', async () => {
      const assessment = {
        id: 'test-1',
        title: 'Full Test',
        sections: [
          {
            id: 'section1',
            title: 'Section 1',
            questions: [
              {
                id: 'q1',
                type: 'multiple_choice',
                prompt: 'Q1',
                options: [{ id: 'A', text: 'A', isCorrect: true }],
              },
            ],
          },
          {
            id: 'section2',
            title: 'Section 2',
            questions: [
              {
                id: 'q2',
                type: 'multiple_choice',
                prompt: 'Q2',
                options: [{ id: 'A', text: 'A', isCorrect: true }],
              },
            ],
          },
        ],
      };

      let capturedTest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name.includes('test') && name.endsWith('.xml')) {
            capturedTest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(assessment, { version: '2.1' });

      expect(capturedTest).toContain('assessmentTest');
      expect(capturedTest).toContain('testPart');
      expect(capturedTest).toContain('assessmentSection');
    });

    it('should apply time limits when specified', async () => {
      const assessment = {
        id: 'timed-test',
        title: 'Timed Test',
        timeLimit: 3600, // 1 hour in seconds
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'Q1',
            options: [{ id: 'A', text: 'A', isCorrect: true }],
          },
        ],
      };

      let capturedTest: string = '';
      const mockZip = {
        addFile: vi.fn((name: string, buffer: Buffer) => {
          if (name.includes('test') && name.endsWith('.xml')) {
            capturedTest = buffer.toString();
          }
        }),
        toBuffer: vi.fn().mockReturnValue(Buffer.from('')),
      };
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      await exporter.export(assessment, { version: '2.1' });

      expect(capturedTest).toContain('timeLimits');
      expect(capturedTest).toContain('maxTime="PT1H"');
    });
  });
});
