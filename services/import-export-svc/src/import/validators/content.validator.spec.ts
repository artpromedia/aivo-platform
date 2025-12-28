// ══════════════════════════════════════════════════════════════════════════════
// CONTENT VALIDATOR UNIT TESTS
// Tests for SCORM, QTI, and Common Cartridge package validation
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentValidator, ValidationResult } from './content.validator';
import * as AdmZip from 'adm-zip';

// Mock AdmZip
vi.mock('adm-zip');

describe('ContentValidator', () => {
  let validator: ContentValidator;

  beforeEach(() => {
    validator = new ContentValidator();
    vi.clearAllMocks();
  });

  describe('detectFormat', () => {
    it('should detect SCORM 1.2 format', async () => {
      const mockZip = createMockZip([
        'imsmanifest.xml',
        'adlcp_rootv1p2.xsd',
        'content/index.html',
      ]);
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.detectFormat(Buffer.from(''));
      
      expect(result).toEqual({
        format: 'scorm',
        version: '1.2',
        confidence: expect.any(Number),
      });
    });

    it('should detect SCORM 2004 format', async () => {
      const mockZip = createMockZip([
        'imsmanifest.xml',
        'adlcp_v1p3.xsd',
        'content/index.html',
      ]);
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.detectFormat(Buffer.from(''));
      
      expect(result).toEqual({
        format: 'scorm',
        version: '2004',
        confidence: expect.any(Number),
      });
    });

    it('should detect QTI 2.1 format', async () => {
      const mockZip = createMockZip([
        'imsmanifest.xml',
        'assessment.xml',
      ]);
      const manifestContent = `
        <manifest xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1">
        </manifest>
      `;
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'imsmanifest.xml') {
          return { getData: () => Buffer.from(manifestContent) };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.detectFormat(Buffer.from(''));
      
      expect(result.format).toBe('qti');
    });

    it('should detect Common Cartridge format', async () => {
      const mockZip = createMockZip([
        'imsmanifest.xml',
        'imscc_rootv1p3.xsd',
      ]);
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.detectFormat(Buffer.from(''));
      
      expect(result).toEqual({
        format: 'common_cartridge',
        version: expect.any(String),
        confidence: expect.any(Number),
      });
    });

    it('should return unknown for unrecognized format', async () => {
      const mockZip = createMockZip(['random.txt', 'data.json']);
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.detectFormat(Buffer.from(''));
      
      expect(result.format).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('validateScormPackage', () => {
    it('should validate a valid SCORM 1.2 package', async () => {
      const manifestXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <manifest identifier="test-course" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
          <metadata>
            <schema>ADL SCORM</schema>
            <schemaversion>1.2</schemaversion>
          </metadata>
          <organizations default="org1">
            <organization identifier="org1">
              <title>Test Course</title>
              <item identifier="item1" identifierref="res1">
                <title>Lesson 1</title>
              </item>
            </organization>
          </organizations>
          <resources>
            <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="content/index.html">
              <file href="content/index.html"/>
            </resource>
          </resources>
        </manifest>
      `;

      const mockZip = createMockZip(['imsmanifest.xml', 'content/index.html']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'imsmanifest.xml') {
          return { getData: () => Buffer.from(manifestXml) };
        }
        if (name === 'content/index.html') {
          return { getData: () => Buffer.from('<html></html>') };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateScormPackage(Buffer.from(''));
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when manifest is missing', async () => {
      const mockZip = createMockZip(['content/index.html']);
      mockZip.getEntry = vi.fn(() => null);
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateScormPackage(Buffer.from(''));
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_MANIFEST',
        })
      );
    });

    it('should fail validation when referenced files are missing', async () => {
      const manifestXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <manifest identifier="test-course">
          <organizations default="org1">
            <organization identifier="org1">
              <item identifier="item1" identifierref="res1"/>
            </organization>
          </organizations>
          <resources>
            <resource identifier="res1" type="webcontent" href="missing.html">
              <file href="missing.html"/>
            </resource>
          </resources>
        </manifest>
      `;

      const mockZip = createMockZip(['imsmanifest.xml']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'imsmanifest.xml') {
          return { getData: () => Buffer.from(manifestXml) };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateScormPackage(Buffer.from(''));
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_RESOURCE',
        })
      );
    });

    it('should warn about missing metadata', async () => {
      const manifestXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <manifest identifier="test-course">
          <organizations default="org1">
            <organization identifier="org1">
              <item identifier="item1" identifierref="res1"/>
            </organization>
          </organizations>
          <resources>
            <resource identifier="res1" type="webcontent" href="index.html">
              <file href="index.html"/>
            </resource>
          </resources>
        </manifest>
      `;

      const mockZip = createMockZip(['imsmanifest.xml', 'index.html']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'imsmanifest.xml') {
          return { getData: () => Buffer.from(manifestXml) };
        }
        if (name === 'index.html') {
          return { getData: () => Buffer.from('<html></html>') };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateScormPackage(Buffer.from(''));
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_METADATA',
        })
      );
    });
  });

  describe('validateQtiPackage', () => {
    it('should validate a valid QTI 2.1 assessment', async () => {
      const assessmentXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
          identifier="q1" title="Test Question" adaptive="false" timeDependent="false">
          <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
            <correctResponse>
              <value>A</value>
            </correctResponse>
          </responseDeclaration>
          <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"/>
          <itemBody>
            <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
              <prompt>What is 2+2?</prompt>
              <simpleChoice identifier="A">4</simpleChoice>
              <simpleChoice identifier="B">5</simpleChoice>
            </choiceInteraction>
          </itemBody>
          <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
        </assessmentItem>
      `;

      const mockZip = createMockZip(['assessment.xml']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'assessment.xml') {
          return { getData: () => Buffer.from(assessmentXml) };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateQtiPackage(Buffer.from(''));
      
      expect(result.isValid).toBe(true);
    });

    it('should fail when response declaration is missing', async () => {
      const assessmentXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
          identifier="q1" title="Test Question">
          <itemBody>
            <choiceInteraction responseIdentifier="RESPONSE" maxChoices="1">
              <simpleChoice identifier="A">Option A</simpleChoice>
            </choiceInteraction>
          </itemBody>
        </assessmentItem>
      `;

      const mockZip = createMockZip(['assessment.xml']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'assessment.xml') {
          return { getData: () => Buffer.from(assessmentXml) };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateQtiPackage(Buffer.from(''));
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_RESPONSE_DECLARATION',
        })
      );
    });
  });

  describe('validateCommonCartridge', () => {
    it('should validate a valid Common Cartridge 1.3 package', async () => {
      const manifestXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <manifest identifier="cc-course"
          xmlns="http://www.imsglobal.org/xsd/imsccv1p3/imscp_v1p1">
          <metadata>
            <schema>IMS Common Cartridge</schema>
            <schemaversion>1.3.0</schemaversion>
          </metadata>
          <organizations>
            <organization identifier="org1" structure="rooted-hierarchy">
              <item identifier="module1">
                <title>Module 1</title>
              </item>
            </organization>
          </organizations>
          <resources>
            <resource identifier="res1" type="webcontent" href="content/page.html">
              <file href="content/page.html"/>
            </resource>
          </resources>
        </manifest>
      `;

      const mockZip = createMockZip(['imsmanifest.xml', 'content/page.html']);
      mockZip.getEntry = vi.fn((name: string) => {
        if (name === 'imsmanifest.xml') {
          return { getData: () => Buffer.from(manifestXml) };
        }
        if (name === 'content/page.html') {
          return { getData: () => Buffer.from('<html></html>') };
        }
        return null;
      });
      vi.mocked(AdmZip).mockImplementation(() => mockZip as any);

      const result = await validator.validateCommonCartridge(Buffer.from(''));
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = validator.sanitizeHtml(html);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    it('should remove event handlers', () => {
      const html = '<img src="x" onerror="alert(1)" />';
      const result = validator.sanitizeHtml(html);
      
      expect(result).not.toContain('onerror');
    });

    it('should allow safe attributes', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>';
      const result = validator.sanitizeHtml(html);
      
      expect(result).toContain('href="https://example.com"');
    });

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = validator.sanitizeHtml(html);
      
      expect(result).not.toContain('javascript:');
    });
  });
});

// Helper to create mock zip
function createMockZip(entries: string[]) {
  return {
    getEntries: () =>
      entries.map((name) => ({
        entryName: name,
        isDirectory: name.endsWith('/'),
        getData: () => Buffer.from(''),
      })),
    getEntry: vi.fn((name: string) => {
      if (entries.includes(name)) {
        return { getData: () => Buffer.from('') };
      }
      return null;
    }),
    extractAllTo: vi.fn(),
  };
}
