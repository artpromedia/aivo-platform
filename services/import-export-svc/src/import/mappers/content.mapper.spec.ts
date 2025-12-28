// ══════════════════════════════════════════════════════════════════════════════
// CONTENT MAPPER UNIT TESTS
// Tests for mapping external formats to internal content model
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentMapper } from './content.mapper';

describe('ContentMapper', () => {
  let mapper: ContentMapper;

  beforeEach(() => {
    mapper = new ContentMapper();
  });

  describe('mapScormToContent', () => {
    it('should map SCORM 1.2 manifest to content structure', () => {
      const scormManifest = {
        identifier: 'course-123',
        version: '1.0',
        metadata: {
          schema: 'ADL SCORM',
          schemaversion: '1.2',
          title: 'Introduction to Math',
          description: 'Basic math concepts',
          language: 'en',
        },
        organizations: {
          default: 'org1',
          items: [
            {
              identifier: 'org1',
              title: 'Main Organization',
              items: [
                {
                  identifier: 'item1',
                  title: 'Lesson 1: Numbers',
                  resourceRef: 'res1',
                  masteryScore: 80,
                },
                {
                  identifier: 'item2',
                  title: 'Lesson 2: Addition',
                  resourceRef: 'res2',
                },
              ],
            },
          ],
        },
        resources: [
          {
            identifier: 'res1',
            type: 'webcontent',
            scormType: 'sco',
            href: 'lesson1/index.html',
            files: ['lesson1/index.html', 'lesson1/script.js'],
          },
          {
            identifier: 'res2',
            type: 'webcontent',
            scormType: 'sco',
            href: 'lesson2/index.html',
            files: ['lesson2/index.html'],
          },
        ],
      };

      const result = mapper.mapScormToContent(scormManifest);

      expect(result).toMatchObject({
        externalId: 'course-123',
        title: 'Introduction to Math',
        description: 'Basic math concepts',
        language: 'en',
        type: 'course',
        metadata: {
          scormVersion: '1.2',
          originalFormat: 'scorm',
        },
      });

      expect(result.modules).toHaveLength(2);
      expect(result.modules[0]).toMatchObject({
        externalId: 'item1',
        title: 'Lesson 1: Numbers',
        type: 'lesson',
        masteryScore: 80,
      });
    });

    it('should map SCORM 2004 sequencing rules', () => {
      const scormManifest = {
        identifier: 'course-456',
        metadata: {
          schemaversion: '2004 4th Edition',
        },
        organizations: {
          default: 'org1',
          items: [
            {
              identifier: 'org1',
              title: 'Course',
              items: [
                {
                  identifier: 'item1',
                  title: 'Module 1',
                  resourceRef: 'res1',
                  sequencing: {
                    controlMode: {
                      choice: true,
                      flow: true,
                    },
                    rollupRules: {
                      rollupObjectiveSatisfied: true,
                      objectiveMeasureWeight: 1.0,
                    },
                    objectives: [
                      {
                        objectiveID: 'obj1',
                        primary: true,
                        satisfiedByMeasure: true,
                        minNormalizedMeasure: 0.8,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        resources: [
          {
            identifier: 'res1',
            type: 'webcontent',
            scormType: 'sco',
            href: 'module1/index.html',
          },
        ],
      };

      const result = mapper.mapScormToContent(scormManifest);

      expect(result.modules[0].sequencing).toMatchObject({
        controlMode: { choice: true, flow: true },
        objectives: expect.arrayContaining([
          expect.objectContaining({
            id: 'obj1',
            minScore: 0.8,
          }),
        ]),
      });
    });

    it('should handle nested item structures', () => {
      const scormManifest = {
        identifier: 'course-789',
        metadata: {},
        organizations: {
          default: 'org1',
          items: [
            {
              identifier: 'org1',
              title: 'Course',
              items: [
                {
                  identifier: 'unit1',
                  title: 'Unit 1',
                  items: [
                    {
                      identifier: 'lesson1',
                      title: 'Lesson 1.1',
                      resourceRef: 'res1',
                    },
                    {
                      identifier: 'lesson2',
                      title: 'Lesson 1.2',
                      resourceRef: 'res2',
                    },
                  ],
                },
              ],
            },
          ],
        },
        resources: [
          { identifier: 'res1', href: 'l1.html', scormType: 'sco' },
          { identifier: 'res2', href: 'l2.html', scormType: 'sco' },
        ],
      };

      const result = mapper.mapScormToContent(scormManifest);

      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].title).toBe('Unit 1');
      expect(result.modules[0].children).toHaveLength(2);
    });
  });

  describe('mapQtiToAssessment', () => {
    it('should map QTI choice interaction to multiple choice question', () => {
      const qtiItem = {
        identifier: 'q1',
        title: 'Math Question',
        responseDeclarations: [
          {
            identifier: 'RESPONSE',
            cardinality: 'single',
            baseType: 'identifier',
            correctResponse: { values: ['B'] },
          },
        ],
        outcomeDeclarations: [
          {
            identifier: 'SCORE',
            cardinality: 'single',
            baseType: 'float',
            defaultValue: 0,
          },
        ],
        itemBody: {
          interactions: [
            {
              type: 'choiceInteraction',
              responseIdentifier: 'RESPONSE',
              shuffle: false,
              maxChoices: 1,
              prompt: 'What is 5 + 3?',
              choices: [
                { identifier: 'A', content: '7' },
                { identifier: 'B', content: '8' },
                { identifier: 'C', content: '9' },
              ],
            },
          ],
        },
        responseProcessing: {
          template: 'match_correct',
        },
      };

      const result = mapper.mapQtiToAssessment(qtiItem);

      expect(result).toMatchObject({
        externalId: 'q1',
        title: 'Math Question',
        type: 'multiple_choice',
        prompt: 'What is 5 + 3?',
        options: [
          { id: 'A', text: '7', isCorrect: false },
          { id: 'B', text: '8', isCorrect: true },
          { id: 'C', text: '9', isCorrect: false },
        ],
        scoring: {
          maxScore: expect.any(Number),
          template: 'match_correct',
        },
      });
    });

    it('should map QTI text entry to short answer question', () => {
      const qtiItem = {
        identifier: 'q2',
        title: 'Fill in the blank',
        responseDeclarations: [
          {
            identifier: 'RESPONSE',
            cardinality: 'single',
            baseType: 'string',
            correctResponse: { values: ['Paris', 'paris'] },
          },
        ],
        itemBody: {
          interactions: [
            {
              type: 'textEntryInteraction',
              responseIdentifier: 'RESPONSE',
              expectedLength: 20,
            },
          ],
          content: 'The capital of France is ______.',
        },
      };

      const result = mapper.mapQtiToAssessment(qtiItem);

      expect(result).toMatchObject({
        type: 'short_answer',
        acceptedAnswers: ['Paris', 'paris'],
        caseSensitive: false,
      });
    });

    it('should map QTI extended text to essay question', () => {
      const qtiItem = {
        identifier: 'q3',
        title: 'Essay Question',
        responseDeclarations: [
          {
            identifier: 'RESPONSE',
            cardinality: 'single',
            baseType: 'string',
          },
        ],
        itemBody: {
          interactions: [
            {
              type: 'extendedTextInteraction',
              responseIdentifier: 'RESPONSE',
              minStrings: 1,
              expectedLines: 10,
            },
          ],
          content: 'Explain the causes of World War I.',
        },
      };

      const result = mapper.mapQtiToAssessment(qtiItem);

      expect(result.type).toBe('essay');
      expect(result.rubric).toBeDefined();
    });

    it('should map QTI order interaction to ordering question', () => {
      const qtiItem = {
        identifier: 'q4',
        title: 'Order the steps',
        responseDeclarations: [
          {
            identifier: 'RESPONSE',
            cardinality: 'ordered',
            baseType: 'identifier',
            correctResponse: { values: ['S1', 'S2', 'S3', 'S4'] },
          },
        ],
        itemBody: {
          interactions: [
            {
              type: 'orderInteraction',
              responseIdentifier: 'RESPONSE',
              choices: [
                { identifier: 'S1', content: 'Step 1' },
                { identifier: 'S2', content: 'Step 2' },
                { identifier: 'S3', content: 'Step 3' },
                { identifier: 'S4', content: 'Step 4' },
              ],
            },
          ],
        },
      };

      const result = mapper.mapQtiToAssessment(qtiItem);

      expect(result.type).toBe('ordering');
      expect(result.correctOrder).toEqual(['S1', 'S2', 'S3', 'S4']);
    });

    it('should map QTI match interaction to matching question', () => {
      const qtiItem = {
        identifier: 'q5',
        title: 'Match the capitals',
        responseDeclarations: [
          {
            identifier: 'RESPONSE',
            cardinality: 'multiple',
            baseType: 'directedPair',
            correctResponse: {
              values: [
                ['France', 'Paris'],
                ['Germany', 'Berlin'],
                ['Italy', 'Rome'],
              ],
            },
          },
        ],
        itemBody: {
          interactions: [
            {
              type: 'matchInteraction',
              responseIdentifier: 'RESPONSE',
              sourceChoices: [
                { identifier: 'France', content: 'France' },
                { identifier: 'Germany', content: 'Germany' },
                { identifier: 'Italy', content: 'Italy' },
              ],
              targetChoices: [
                { identifier: 'Paris', content: 'Paris' },
                { identifier: 'Berlin', content: 'Berlin' },
                { identifier: 'Rome', content: 'Rome' },
              ],
            },
          ],
        },
      };

      const result = mapper.mapQtiToAssessment(qtiItem);

      expect(result.type).toBe('matching');
      expect(result.pairs).toHaveLength(3);
    });
  });

  describe('mapCommonCartridgeToContent', () => {
    it('should map CC manifest to course structure', () => {
      const ccManifest = {
        identifier: 'cc-course-1',
        metadata: {
          schema: 'IMS Common Cartridge',
          schemaversion: '1.3.0',
          title: 'History 101',
          description: 'Introduction to World History',
        },
        organizations: [
          {
            identifier: 'org1',
            structure: 'rooted-hierarchy',
            items: [
              {
                identifier: 'mod1',
                title: 'Ancient Civilizations',
                items: [
                  {
                    identifier: 'topic1',
                    title: 'Egypt',
                    resourceRef: 'res1',
                  },
                  {
                    identifier: 'topic2',
                    title: 'Mesopotamia',
                    resourceRef: 'res2',
                  },
                ],
              },
            ],
          },
        ],
        resources: [
          {
            identifier: 'res1',
            type: 'webcontent',
            href: 'egypt.html',
          },
          {
            identifier: 'res2',
            type: 'webcontent',
            href: 'mesopotamia.html',
          },
          {
            identifier: 'res3',
            type: 'imsqti_xmlv2p1/imscc_xmlv1p1/assessment',
            href: 'quiz1.xml',
          },
        ],
      };

      const result = mapper.mapCommonCartridgeToContent(ccManifest);

      expect(result).toMatchObject({
        externalId: 'cc-course-1',
        title: 'History 101',
        type: 'course',
        metadata: {
          ccVersion: '1.3.0',
          originalFormat: 'common_cartridge',
        },
      });

      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].children).toHaveLength(2);
    });

    it('should identify and map LTI links', () => {
      const ccManifest = {
        identifier: 'cc-with-lti',
        metadata: {},
        organizations: [],
        resources: [
          {
            identifier: 'lti1',
            type: 'imsbasiclti_xmlv1p0',
            href: 'lti/tool1.xml',
            metadata: {
              title: 'External Tool',
              description: 'An external LTI tool',
              launchUrl: 'https://tool.example.com/launch',
            },
          },
        ],
      };

      const result = mapper.mapCommonCartridgeToContent(ccManifest);

      expect(result.ltiLinks).toHaveLength(1);
      expect(result.ltiLinks[0]).toMatchObject({
        title: 'External Tool',
        launchUrl: 'https://tool.example.com/launch',
      });
    });

    it('should identify embedded QTI assessments', () => {
      const ccManifest = {
        identifier: 'cc-with-qti',
        metadata: {},
        organizations: [],
        resources: [
          {
            identifier: 'qti1',
            type: 'imsqti_xmlv2p1/imscc_xmlv1p1/assessment',
            href: 'assessments/quiz1.xml',
          },
        ],
      };

      const result = mapper.mapCommonCartridgeToContent(ccManifest);

      expect(result.assessments).toHaveLength(1);
      expect(result.assessments[0].externalId).toBe('qti1');
    });
  });

  describe('mapXapiStatementToActivity', () => {
    it('should map xAPI statement to activity record', () => {
      const statement = {
        id: 'stmt-123',
        actor: {
          mbox: 'mailto:learner@example.com',
          name: 'John Doe',
        },
        verb: {
          id: 'http://adlnet.gov/expapi/verbs/completed',
          display: { 'en-US': 'completed' },
        },
        object: {
          id: 'https://example.com/activities/lesson-1',
          definition: {
            name: { 'en-US': 'Lesson 1' },
            type: 'http://adlnet.gov/expapi/activities/lesson',
          },
        },
        result: {
          completion: true,
          success: true,
          score: { scaled: 0.85, raw: 85, max: 100 },
          duration: 'PT30M',
        },
        timestamp: '2024-01-15T10:30:00Z',
      };

      const result = mapper.mapXapiStatementToActivity(statement);

      expect(result).toMatchObject({
        externalId: 'stmt-123',
        actorEmail: 'learner@example.com',
        actorName: 'John Doe',
        verb: 'completed',
        objectId: 'https://example.com/activities/lesson-1',
        objectName: 'Lesson 1',
        completed: true,
        passed: true,
        score: 85,
        maxScore: 100,
        duration: 1800, // 30 minutes in seconds
        timestamp: expect.any(Date),
      });
    });

    it('should parse ISO 8601 duration correctly', () => {
      const durations = [
        { input: 'PT1H30M', expected: 5400 },
        { input: 'PT45S', expected: 45 },
        { input: 'PT2H', expected: 7200 },
        { input: 'P1DT2H30M', expected: 95400 },
      ];

      for (const { input, expected } of durations) {
        const statement = {
          id: 'test',
          actor: { mbox: 'mailto:test@test.com' },
          verb: { id: 'http://example.com/verb' },
          object: { id: 'http://example.com/object' },
          result: { duration: input },
        };

        const result = mapper.mapXapiStatementToActivity(statement);
        expect(result.duration).toBe(expected);
      }
    });
  });

  describe('normalizeMetadata', () => {
    it('should normalize IEEE LOM metadata', () => {
      const lomMetadata = {
        general: {
          identifier: { catalog: 'ISBN', entry: '978-0-123456-78-9' },
          title: { string: { '#text': 'Course Title', '@_language': 'en' } },
          language: 'en',
          description: { string: { '#text': 'Course description' } },
          keyword: [
            { string: { '#text': 'math' } },
            { string: { '#text': 'algebra' } },
          ],
        },
        lifeCycle: {
          version: { string: '1.0' },
          status: { source: 'LOMv1.0', value: 'Final' },
        },
        educational: {
          learningResourceType: { source: 'LOMv1.0', value: 'exercise' },
          intendedEndUserRole: { source: 'LOMv1.0', value: 'learner' },
          typicalAgeRange: { string: '12-18' },
        },
      };

      const result = mapper.normalizeMetadata(lomMetadata);

      expect(result).toMatchObject({
        title: 'Course Title',
        language: 'en',
        description: 'Course description',
        keywords: ['math', 'algebra'],
        version: '1.0',
        resourceType: 'exercise',
        targetAudience: 'learner',
        ageRange: '12-18',
      });
    });
  });
});
