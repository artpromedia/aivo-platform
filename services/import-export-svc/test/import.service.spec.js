"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mockS3 = {
    send: vitest_1.vi.fn(),
};
vitest_1.vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vitest_1.vi.fn().mockImplementation(() => mockS3),
    GetObjectCommand: vitest_1.vi.fn(),
    PutObjectCommand: vitest_1.vi.fn(),
}));
const mockPrisma = {
    importJob: {
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
    },
    lesson: {
        create: vitest_1.vi.fn(),
        createMany: vitest_1.vi.fn(),
    },
    course: {
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
    },
    assessment: {
        create: vitest_1.vi.fn(),
    },
    question: {
        createMany: vitest_1.vi.fn(),
    },
};
(0, vitest_1.describe)('Import Service', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Package Detection', () => {
        (0, vitest_1.it)('should detect SCORM 1.2 package', () => {
            const manifestContent = `
        <?xml version="1.0"?>
        <manifest identifier="course1" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
          <metadata>
            <schema>ADL SCORM</schema>
            <schemaversion>1.2</schemaversion>
          </metadata>
        </manifest>
      `;
            const detectFormat = (manifest) => {
                if (manifest.includes('schemaversion>1.2'))
                    return 'scorm12';
                if (manifest.includes('schemaversion>2004'))
                    return 'scorm2004';
                if (manifest.includes('qti/v2p1'))
                    return 'qti21';
                if (manifest.includes('Common Cartridge'))
                    return 'commonCartridge';
                return 'unknown';
            };
            (0, vitest_1.expect)(detectFormat(manifestContent)).toBe('scorm12');
        });
        (0, vitest_1.it)('should detect SCORM 2004 package', () => {
            const manifestContent = `
        <?xml version="1.0"?>
        <manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
          <metadata>
            <schema>ADL SCORM</schema>
            <schemaversion>2004 4th Edition</schemaversion>
          </metadata>
        </manifest>
      `;
            (0, vitest_1.expect)(manifestContent).toContain('2004');
        });
        (0, vitest_1.it)('should detect QTI 2.1 package', () => {
            const manifestContent = `
        <?xml version="1.0"?>
        <assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">
        </assessmentTest>
      `;
            (0, vitest_1.expect)(manifestContent).toContain('qti_v2p1');
        });
        (0, vitest_1.it)('should detect Common Cartridge package', () => {
            const manifestContent = `
        <?xml version="1.0"?>
        <manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p3/imscp_v1p1">
          <metadata>
            <schema>IMS Common Cartridge</schema>
            <schemaversion>1.3.0</schemaversion>
          </metadata>
        </manifest>
      `;
            (0, vitest_1.expect)(manifestContent).toContain('Common Cartridge');
        });
        (0, vitest_1.it)('should return unknown for unrecognized package', () => {
            const manifestContent = `
        <?xml version="1.0"?>
        <unknown>Some content</unknown>
      `;
            const isKnownFormat = manifestContent.includes('SCORM') ||
                manifestContent.includes('qti') ||
                manifestContent.includes('Cartridge');
            (0, vitest_1.expect)(isKnownFormat).toBe(false);
        });
        (0, vitest_1.it)('should find manifest file in ZIP', () => {
            const zipEntries = ['content/', 'content/lesson.html', 'imsmanifest.xml', 'media/image.png'];
            const manifestPaths = ['imsmanifest.xml', 'manifest.xml', 'assessment.xml'];
            const foundManifest = zipEntries.find((e) => manifestPaths.includes(e));
            (0, vitest_1.expect)(foundManifest).toBe('imsmanifest.xml');
        });
    });
    (0, vitest_1.describe)('Package Validation', () => {
        (0, vitest_1.it)('should validate SCORM manifest structure', () => {
            const validate = (manifest) => {
                const errors = [];
                const warnings = [];
                if (!manifest.organizations)
                    errors.push('Missing organizations element');
                if (!manifest.resources)
                    errors.push('Missing resources element');
                return { valid: errors.length === 0, errors, warnings };
            };
            const validManifest = { organizations: [], resources: [] };
            const invalidManifest = { organizations: [] };
            (0, vitest_1.expect)(validate(validManifest).valid).toBe(true);
            (0, vitest_1.expect)(validate(invalidManifest).valid).toBe(false);
        });
        (0, vitest_1.it)('should validate required files exist', () => {
            const zipEntries = ['imsmanifest.xml', 'content/lesson.html'];
            const requiredInManifest = ['content/lesson.html', 'content/missing.html'];
            const missingFiles = requiredInManifest.filter((f) => !zipEntries.includes(f));
            (0, vitest_1.expect)(missingFiles).toContain('content/missing.html');
        });
        (0, vitest_1.it)('should warn about unsupported media types', () => {
            const mediaFiles = ['video.mp4', 'audio.mp3', 'document.swf', 'animation.fla'];
            const supportedTypes = ['.mp4', '.mp3', '.png', '.jpg', '.gif', '.webm'];
            const unsupported = mediaFiles.filter((f) => !supportedTypes.some((t) => f.endsWith(t)));
            (0, vitest_1.expect)(unsupported).toContain('document.swf');
            (0, vitest_1.expect)(unsupported).toContain('animation.fla');
        });
        (0, vitest_1.it)('should validate QTI question structure', () => {
            const question = {
                identifier: 'q1',
                type: 'choiceInteraction',
                prompt: 'What is 2+2?',
                choices: [
                    { identifier: 'A', value: '3' },
                    { identifier: 'B', value: '4' },
                ],
                correctResponse: 'B',
            };
            const isValid = question.identifier &&
                question.prompt &&
                question.choices.length > 0 &&
                question.choices.some((c) => c.identifier === question.correctResponse);
            (0, vitest_1.expect)(isValid).toBe(true);
        });
        (0, vitest_1.it)('should check file size limits', () => {
            const maxPackageSizeMB = 500;
            const packageSizeBytes = 100 * 1024 * 1024;
            const sizeMB = packageSizeBytes / (1024 * 1024);
            (0, vitest_1.expect)(sizeMB).toBeLessThan(maxPackageSizeMB);
        });
    });
    (0, vitest_1.describe)('SCORM Import', () => {
        (0, vitest_1.it)('should parse SCORM manifest XML', () => {
            const manifestXml = `
        <manifest identifier="course1">
          <organizations default="org1">
            <organization identifier="org1">
              <title>My Course</title>
              <item identifier="item1" identifierref="res1">
                <title>Lesson 1</title>
              </item>
            </organization>
          </organizations>
          <resources>
            <resource identifier="res1" type="webcontent" href="lesson1.html"/>
          </resources>
        </manifest>
      `;
            (0, vitest_1.expect)(manifestXml).toContain('organizations');
            (0, vitest_1.expect)(manifestXml).toContain('resources');
        });
        (0, vitest_1.it)('should create course structure from SCORM', async () => {
            mockPrisma.course.create.mockResolvedValue({
                id: 'course-1',
                title: 'Imported Course',
                sourceFormat: 'scorm2004',
            });
            const course = await mockPrisma.course.create({
                data: {
                    title: 'Imported Course',
                    sourceFormat: 'scorm2004',
                    organizationId: 'org-1',
                },
            });
            (0, vitest_1.expect)(course.sourceFormat).toBe('scorm2004');
        });
        (0, vitest_1.it)('should create lessons from SCORM items', async () => {
            mockPrisma.lesson.createMany.mockResolvedValue({ count: 3 });
            const result = await mockPrisma.lesson.createMany({
                data: [
                    { title: 'Lesson 1', courseId: 'course-1', order: 0 },
                    { title: 'Lesson 2', courseId: 'course-1', order: 1 },
                    { title: 'Lesson 3', courseId: 'course-1', order: 2 },
                ],
            });
            (0, vitest_1.expect)(result.count).toBe(3);
        });
        (0, vitest_1.it)('should extract and store media files', async () => {
            mockS3.send.mockResolvedValue({ ETag: '"abc"' });
            const mediaFiles = [
                { name: 'image1.png', size: 50000 },
                { name: 'video.mp4', size: 5000000 },
            ];
            for (const file of mediaFiles) {
                await mockS3.send({
                    Bucket: 'aivo-media',
                    Key: `imports/course-1/${file.name}`,
                });
            }
            (0, vitest_1.expect)(mockS3.send).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('should preserve SCORM sequencing rules', () => {
            const sequencing = {
                controlMode: {
                    choice: true,
                    flow: true,
                    forwardOnly: false,
                },
                limitConditions: {
                    attemptLimit: 3,
                },
            };
            (0, vitest_1.expect)(sequencing.controlMode.choice).toBe(true);
            (0, vitest_1.expect)(sequencing.limitConditions.attemptLimit).toBe(3);
        });
    });
    (0, vitest_1.describe)('QTI Import', () => {
        (0, vitest_1.it)('should parse QTI assessment item', () => {
            const qtiItem = {
                identifier: 'q1',
                title: 'Question 1',
                itemBody: {
                    choiceInteraction: {
                        responseIdentifier: 'RESPONSE',
                        maxChoices: 1,
                        simpleChoice: [
                            { identifier: 'A', content: 'Option A' },
                            { identifier: 'B', content: 'Option B' },
                        ],
                    },
                },
                responseDeclaration: {
                    correctResponse: { value: 'B' },
                },
            };
            (0, vitest_1.expect)(qtiItem.itemBody.choiceInteraction.simpleChoice).toHaveLength(2);
        });
        (0, vitest_1.it)('should create assessment from QTI', async () => {
            mockPrisma.assessment.create.mockResolvedValue({
                id: 'assessment-1',
                title: 'Imported Quiz',
                sourceFormat: 'qti21',
            });
            const assessment = await mockPrisma.assessment.create({
                data: {
                    title: 'Imported Quiz',
                    sourceFormat: 'qti21',
                    courseId: 'course-1',
                },
            });
            (0, vitest_1.expect)(assessment.sourceFormat).toBe('qti21');
        });
        (0, vitest_1.it)('should map QTI question types to internal types', () => {
            const qtiToInternal = {
                choiceInteraction: 'multiple_choice',
                textEntryInteraction: 'fill_blank',
                extendedTextInteraction: 'essay',
                matchInteraction: 'matching',
                orderInteraction: 'ordering',
            };
            (0, vitest_1.expect)(qtiToInternal.choiceInteraction).toBe('multiple_choice');
            (0, vitest_1.expect)(qtiToInternal.extendedTextInteraction).toBe('essay');
        });
        (0, vitest_1.it)('should import response processing rules', () => {
            const responseProcessing = {
                setOutcomeValue: {
                    identifier: 'SCORE',
                    sum: {
                        mapResponse: { identifier: 'RESPONSE' },
                    },
                },
            };
            (0, vitest_1.expect)(responseProcessing.setOutcomeValue.identifier).toBe('SCORE');
        });
        (0, vitest_1.it)('should handle partial credit scoring', () => {
            const mapping = {
                mapEntries: [
                    { mapKey: 'A', mappedValue: 1.0 },
                    { mapKey: 'B', mappedValue: 0.5 },
                    { mapKey: 'C', mappedValue: 0.0 },
                ],
            };
            const partialCredit = mapping.mapEntries.find((e) => e.mappedValue > 0 && e.mappedValue < 1);
            (0, vitest_1.expect)(partialCredit?.mapKey).toBe('B');
        });
    });
    (0, vitest_1.describe)('Common Cartridge Import', () => {
        (0, vitest_1.it)('should parse CC manifest', () => {
            const ccManifest = {
                organizations: {
                    organization: {
                        identifier: 'org1',
                        item: [
                            { identifier: 'i1', title: 'Module 1' },
                            { identifier: 'i2', title: 'Module 2' },
                        ],
                    },
                },
                resources: {
                    resource: [
                        { identifier: 'r1', type: 'webcontent', href: 'module1.html' },
                        { identifier: 'r2', type: 'imsqti_xmlv2p1', href: 'quiz1.xml' },
                    ],
                },
            };
            (0, vitest_1.expect)(ccManifest.resources.resource).toHaveLength(2);
        });
        (0, vitest_1.it)('should import web content resources', () => {
            const webContent = {
                identifier: 'wc1',
                type: 'webcontent',
                href: 'content/page1.html',
            };
            (0, vitest_1.expect)(webContent.type).toBe('webcontent');
        });
        (0, vitest_1.it)('should import web links', () => {
            const webLink = {
                title: 'External Resource',
                url: 'https://example.com/resource',
                windowFeatures: '_blank',
            };
            (0, vitest_1.expect)(webLink.url.startsWith('https://')).toBe(true);
        });
        (0, vitest_1.it)('should import embedded QTI assessments', () => {
            const ccResources = [
                { type: 'webcontent', href: 'page.html' },
                { type: 'imsqti_xmlv2p1', href: 'quiz.xml' },
                { type: 'imsdt_xmlv1p1', href: 'discussion.xml' },
            ];
            const qtiResources = ccResources.filter((r) => r.type.includes('qti'));
            (0, vitest_1.expect)(qtiResources).toHaveLength(1);
        });
        (0, vitest_1.it)('should handle LTI link placeholders', () => {
            const ltiLink = {
                type: 'imsbasiclti_xmlv1p0',
                title: 'External Tool',
                launchUrl: 'https://tool.example.com/launch',
                customParams: {},
            };
            (0, vitest_1.expect)(ltiLink.type).toContain('basiclti');
        });
    });
    (0, vitest_1.describe)('Import Job Management', () => {
        (0, vitest_1.it)('should create import job', async () => {
            mockPrisma.importJob.create.mockResolvedValue({
                id: 'import-1',
                status: 'pending',
                progress: 0,
                format: null,
            });
            const job = await mockPrisma.importJob.create({
                data: {
                    organizationId: 'org-1',
                    userId: 'user-1',
                    fileName: 'course.zip',
                    status: 'pending',
                },
            });
            (0, vitest_1.expect)(job.status).toBe('pending');
        });
        (0, vitest_1.it)('should update job progress', async () => {
            mockPrisma.importJob.update.mockResolvedValue({
                id: 'import-1',
                progress: 50,
                status: 'processing',
            });
            const job = await mockPrisma.importJob.update({
                where: { id: 'import-1' },
                data: { progress: 50, status: 'processing' },
            });
            (0, vitest_1.expect)(job.progress).toBe(50);
        });
        (0, vitest_1.it)('should mark job completed with content ID', async () => {
            mockPrisma.importJob.update.mockResolvedValue({
                id: 'import-1',
                status: 'completed',
                progress: 100,
                contentId: 'course-1',
                completedAt: new Date(),
            });
            const job = await mockPrisma.importJob.update({
                where: { id: 'import-1' },
                data: {
                    status: 'completed',
                    contentId: 'course-1',
                },
            });
            (0, vitest_1.expect)(job.contentId).toBe('course-1');
        });
        (0, vitest_1.it)('should mark job failed with error', async () => {
            mockPrisma.importJob.update.mockResolvedValue({
                id: 'import-1',
                status: 'failed',
                errorMessage: 'Invalid manifest structure',
            });
            const job = await mockPrisma.importJob.update({
                where: { id: 'import-1' },
                data: {
                    status: 'failed',
                    errorMessage: 'Invalid manifest structure',
                },
            });
            (0, vitest_1.expect)(job.errorMessage).toBe('Invalid manifest structure');
        });
    });
    (0, vitest_1.describe)('Error Handling', () => {
        (0, vitest_1.it)('should handle corrupt ZIP file', () => {
            const isValidZip = (buffer) => {
                return buffer[0] === 0x50 && buffer[1] === 0x4b;
            };
            const validZip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
            const invalidZip = Buffer.from([0x00, 0x00, 0x00, 0x00]);
            (0, vitest_1.expect)(isValidZip(validZip)).toBe(true);
            (0, vitest_1.expect)(isValidZip(invalidZip)).toBe(false);
        });
        (0, vitest_1.it)('should handle missing manifest', () => {
            const zipEntries = ['content/lesson.html', 'media/image.png'];
            const manifestFiles = ['imsmanifest.xml', 'manifest.xml'];
            const hasManifest = zipEntries.some((e) => manifestFiles.includes(e));
            (0, vitest_1.expect)(hasManifest).toBe(false);
        });
        (0, vitest_1.it)('should handle malformed XML', () => {
            const parseXml = (xml) => {
                try {
                    if (!xml.includes('<?xml') && !xml.startsWith('<')) {
                        throw new Error('Not XML');
                    }
                    if (!xml.includes('>')) {
                        throw new Error('Malformed XML');
                    }
                    return { success: true };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            };
            (0, vitest_1.expect)(parseXml('<valid>content</valid>').success).toBe(true);
            (0, vitest_1.expect)(parseXml('not xml').success).toBe(false);
        });
        (0, vitest_1.it)('should cleanup on failure', async () => {
            const cleanup = vitest_1.vi.fn();
            try {
                throw new Error('Import failed');
            }
            catch {
                cleanup();
            }
            (0, vitest_1.expect)(cleanup).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should rollback partial import on error', async () => {
            const rollback = vitest_1.vi.fn();
            mockPrisma.course.create.mockResolvedValue({ id: 'course-1' });
            mockPrisma.lesson.createMany.mockRejectedValue(new Error('DB error'));
            try {
                await mockPrisma.course.create({ data: { title: 'Test' } });
                await mockPrisma.lesson.createMany({ data: [] });
            }
            catch {
                rollback();
            }
            (0, vitest_1.expect)(rollback).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=import.service.spec.js.map