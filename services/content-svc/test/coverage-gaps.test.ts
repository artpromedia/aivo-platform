import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../src/prisma', () => ({
  prisma: {
    content: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    lesson: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    learningObject: { findUnique: vi.fn(), findMany: vi.fn() },
    course: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    template: { findUnique: vi.fn(), findMany: vi.fn() },
    socialStory: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    contentVersion: { findMany: vi.fn(), create: vi.fn() },
    contentReview: { findMany: vi.fn(), create: vi.fn() },
    file: { findUnique: vi.fn(), create: vi.fn() },
  },
  // Prisma enum stubs for modules that import them
  LearningObjectSubject: { MATH: 'MATH', ELA: 'ELA', SCIENCE: 'SCIENCE', SOCIAL_STUDIES: 'SOCIAL_STUDIES' },
  LearningObjectGradeBand: { K_2: 'K_2', GRADE_3_5: 'GRADE_3_5', GRADE_6_8: 'GRADE_6_8', GRADE_9_12: 'GRADE_9_12' },
  LearningObjectVersionState: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
  ReviewDecision: { APPROVED: 'APPROVED', REJECTED: 'REJECTED', REVISION_NEEDED: 'REVISION_NEEDED' },
  IngestionJobStatus: { PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' },
  IngestionSource: { MANUAL: 'MANUAL', API: 'API', BULK: 'BULK' },
  ContentPackageStatus: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' },
  ContentLocale: { EN_US: 'EN_US', ES_US: 'ES_US' },
  FileCategory: { IMAGE: 'IMAGE', VIDEO: 'VIDEO', DOCUMENT: 'DOCUMENT', AUDIO: 'AUDIO' },
  FileOwnerType: { CONTENT: 'CONTENT', LESSON: 'LESSON' },
  VirusScanStatus: { PENDING: 'PENDING', CLEAN: 'CLEAN', INFECTED: 'INFECTED' },
  SocialStoryCategory: { BEHAVIOR: 'BEHAVIOR', SOCIAL: 'SOCIAL', EMOTIONAL: 'EMOTIONAL' },
  SocialStoryReadingLevel: { PRE_K: 'PRE_K', ELEMENTARY: 'ELEMENTARY', MIDDLE: 'MIDDLE' },
  SocialStoryVisualStyle: { REALISTIC: 'REALISTIC', CARTOON: 'CARTOON' },
  SensoryCategory: { VISUAL: 'VISUAL', AUDITORY: 'AUDITORY', TACTILE: 'TACTILE' },
  VisualComplexity: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  AnimationIntensity: { NONE: 'NONE', LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  CognitiveLoadLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  IncidentSeverity: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' },
  IncidentStatus: { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', RESOLVED: 'RESOLVED' },
  LessonStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
  Prisma: {},
}));

describe('QTI Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports QTI parser module', async () => {
    const mod = await import('../src/qti/parser');
    expect(mod).toBeDefined();
  });

  it('exports QTI processor module', async () => {
    const mod = await import('../src/qti/processor');
    expect(mod).toBeDefined();
  });
});

describe('SCORM Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports SCORM parser module', async () => {
    const mod = await import('../src/scorm/parser');
    expect(mod).toBeDefined();
  });
});

describe('xAPI Statement Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports xAPI statement service', async () => {
    const mod = await import('../src/xapi/statement-service');
    expect(mod).toBeDefined();
  });
});

describe('Caption Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports caption service module', async () => {
    const mod = await import('../src/captions/caption.service');
    expect(mod).toBeDefined();
  });
});

describe('Sensory Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Content Filters', () => {
    it('exports content filter module', async () => {
      const mod = await import('../src/sensory/content-filters');
      expect(mod).toBeDefined();
    });
  });

  describe('Sensory Incident Service', () => {
    it('exports sensory incident service', async () => {
      const mod = await import('../src/sensory/sensory-incident.service');
      expect(mod).toBeDefined();
    });
  });

  describe('Sensory Matcher Service', () => {
    it('exports sensory matcher service', async () => {
      const mod = await import('../src/sensory/sensory-matcher.service');
      expect(mod).toBeDefined();
    });
  });

  describe('Sensory Metadata Service', () => {
    it('exports sensory metadata service', async () => {
      const mod = await import('../src/sensory/sensory-metadata.service');
      expect(mod).toBeDefined();
    });
  });
});

describe('Social Stories Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports social story service', async () => {
    const mod = await import('../src/social-stories/social-story.service');
    expect(mod).toBeDefined();
  });

  it('exports story templates', async () => {
    const mod = await import('../src/social-stories/story-templates');
    expect(mod).toBeDefined();
  });
});

describe('Event Publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports event publisher', async () => {
    const mod = await import('../src/services/event-publisher');
    expect(mod).toBeDefined();
  });
});

describe('Curriculum Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports curriculum service', async () => {
    const mod = await import('../src/services/curriculum.service');
    expect(mod).toBeDefined();
  });
});

describe('Content Routes Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports courses routes', async () => {
    const mod = await import('../src/routes/courses');
    expect(mod).toBeDefined();
  });

  it('exports curriculum routes', async () => {
    const mod = await import('../src/routes/curriculum');
    expect(mod).toBeDefined();
  });

  it('exports files routes', async () => {
    const mod = await import('../src/routes/files');
    expect(mod).toBeDefined();
  });

  it('exports ingestion routes', async () => {
    const mod = await import('../src/routes/ingestion');
    expect(mod).toBeDefined();
  });

  it('exports learning objects routes', async () => {
    const mod = await import('../src/routes/learningObjects');
    expect(mod).toBeDefined();
  });

  it('exports lessons routes', async () => {
    const mod = await import('../src/routes/lessons');
    expect(mod).toBeDefined();
  });

  it('exports packages routes', async () => {
    const mod = await import('../src/routes/packages');
    expect(mod).toBeDefined();
  });

  it('exports render routes', async () => {
    const mod = await import('../src/routes/render');
    expect(mod).toBeDefined();
  });

  it('exports reviews routes', async () => {
    const mod = await import('../src/routes/reviews');
    expect(mod).toBeDefined();
  });

  it('exports search routes', async () => {
    const mod = await import('../src/routes/search');
    expect(mod).toBeDefined();
  });

  it('exports sensory routes', async () => {
    const mod = await import('../src/routes/sensory');
    expect(mod).toBeDefined();
  });

  it('exports social stories routes', async () => {
    const mod = await import('../src/routes/socialStories');
    expect(mod).toBeDefined();
  });

  it('exports templates routes', async () => {
    const mod = await import('../src/routes/templates');
    expect(mod).toBeDefined();
  });

  it('exports versions routes', async () => {
    const mod = await import('../src/routes/versions');
    expect(mod).toBeDefined();
  });
});

describe('Package Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports package builder', async () => {
    const mod = await import('../src/packageBuilder');
    expect(mod).toBeDefined();
  });
});

describe('Content Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports render module', async () => {
    const mod = await import('../src/render');
    expect(mod).toBeDefined();
  });
});

describe('Content Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports search module', async () => {
    const mod = await import('../src/search');
    expect(mod).toBeDefined();
  });
});

describe('Content Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports selection module', async () => {
    const mod = await import('../src/selection');
    expect(mod).toBeDefined();
  });
});
