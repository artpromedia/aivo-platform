/**
 * Tests for compliance-evidence-svc types and config validation.
 */
import { describe, it, expect } from 'vitest';
import type {
  TrustServiceCategory,
  EvidenceHealth,
  CollectionFrequency,
  EvidenceFormat,
  ControlDefinition,
  CollectorDefinition,
  EvidenceRecord,
  ControlStatus,
  CollectorResult,
  EvidenceArtifact,
} from '../src/types.js';

describe('Type validity checks', () => {
  it('TrustServiceCategory literal union matches expected values', () => {
    const valid: TrustServiceCategory[] = ['CC', 'A', 'PI', 'C', 'P'];
    expect(valid).toHaveLength(5);
  });

  it('EvidenceHealth has three states', () => {
    const states: EvidenceHealth[] = ['green', 'yellow', 'red'];
    expect(states).toHaveLength(3);
  });

  it('CollectionFrequency covers all periods', () => {
    const freqs: CollectionFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
    expect(freqs).toHaveLength(5);
  });

  it('EvidenceFormat covers output types', () => {
    const formats: EvidenceFormat[] = ['json', 'markdown', 'csv', 'pdf', 'sarif'];
    expect(formats).toHaveLength(5);
  });
});

describe('ControlDefinition interface', () => {
  it('can create a valid control definition', () => {
    const control: ControlDefinition = {
      id: 'CC1.1.1',
      category: 'CC',
      section: 'CC1.1',
      sectionTitle: 'Test Section',
      description: 'Test control',
      controlType: 'Preventive',
      frequency: 'Ongoing',
      owner: 'Security',
      evidenceDescription: 'Test evidence',
      collectors: ['access-review'],
    };
    expect(control.id).toBe('CC1.1.1');
    expect(control.collectors).toContain('access-review');
  });
});

describe('CollectorDefinition interface', () => {
  it('can create a valid collector definition', () => {
    const collector: CollectorDefinition = {
      id: 'test-collector',
      name: 'Test Collector',
      description: 'Collects test evidence',
      controlIds: ['CC1.1.1'],
      schedule: 'weekly',
      category: 'CC',
      enabled: true,
    };
    expect(collector.enabled).toBe(true);
    expect(collector.schedule).toBe('weekly');
  });
});

describe('EvidenceRecord interface', () => {
  it('can create an evidence record', () => {
    const record: EvidenceRecord = {
      id: 'ev-1',
      collectorId: 'access-review',
      controlId: 'CC1.1.1',
      category: 'CC',
      s3Key: 'evidence/2025/CC1.1.1/ev-1.json',
      s3Bucket: 'aivo-compliance-evidence',
      format: 'json',
      sizeBytes: 1024,
      sha256: 'abc123',
      collectedAt: '2025-01-01T00:00:00Z',
      periodStart: '2024-12-01',
      periodEnd: '2024-12-31',
      metadata: { version: 1 },
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(record.format).toBe('json');
    expect(record.sizeBytes).toBe(1024);
  });
});

describe('ControlStatus interface', () => {
  it('can create a control status', () => {
    const status: ControlStatus = {
      controlId: 'CC1.1.1',
      category: 'CC',
      section: 'CC1.1',
      description: 'Test control',
      health: 'green',
      lastEvidenceAt: '2025-01-01T00:00:00Z',
      nextDueAt: '2025-01-08T00:00:00Z',
      evidenceCount: 10,
      collectorIds: ['access-review'],
      owner: 'Security',
    };
    expect(status.health).toBe('green');
    expect(status.evidenceCount).toBe(10);
  });

  it('allows null lastEvidenceAt for new controls', () => {
    const status: ControlStatus = {
      controlId: 'CC1.1.1',
      category: 'CC',
      section: 'CC1.1',
      description: 'Test control',
      health: 'red',
      lastEvidenceAt: null,
      nextDueAt: '2025-01-01T00:00:00Z',
      evidenceCount: 0,
      collectorIds: [],
      owner: 'Security',
    };
    expect(status.lastEvidenceAt).toBeNull();
    expect(status.health).toBe('red');
  });
});

describe('CollectorResult and EvidenceArtifact', () => {
  it('creates valid collector result with artifacts', () => {
    const artifact: EvidenceArtifact = {
      filename: 'access-review-2025-01.json',
      format: 'json',
      content: JSON.stringify({ users: 42 }),
      controlId: 'CC1.1.1',
      metadata: { reviewer: 'admin' },
    };

    const result: CollectorResult = {
      collectorId: 'access-review',
      controlIds: ['CC1.1.1', 'CC1.1.2'],
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      artifacts: [artifact],
      summary: { totalUsers: 42, mfaPercentage: 95 },
    };

    expect(result.artifacts).toHaveLength(1);
    expect(result.summary).toHaveProperty('totalUsers', 42);
  });
});
