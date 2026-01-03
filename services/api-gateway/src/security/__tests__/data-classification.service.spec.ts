/**
 * Data Classification Service Unit Tests
 */

import { DataClassificationService } from '../services/data-classification.service';
import { PIIDetectionService } from '../services/pii-detection.service';

describe('DataClassificationService', () => {
  let service: DataClassificationService;
  let piiDetection: PIIDetectionService;

  beforeEach(() => {
    piiDetection = new PIIDetectionService();
    service = new DataClassificationService(piiDetection);
  });

  describe('classifyData', () => {
    describe('FERPA Educational Records', () => {
      it('should classify grade data as restricted', () => {
        const data = { grades: [95, 87, 92] };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
        expect(result.educationalRecord).toBe(true);
        expect(result.regulations).toContain('FERPA');
        expect(result.requiresEncryption).toBe(true);
      });

      it('should classify GPA as restricted', () => {
        const data = { gpa: 3.8, semester: 'Fall 2024' };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
        expect(result.educationalRecord).toBe(true);
      });

      it('should classify transcript data as restricted', () => {
        const data = { transcriptId: '123', courses: [] };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
        expect(result.educationalRecord).toBe(true);
      });

      it('should classify IEP data as restricted', () => {
        const data = { iepId: '123', accommodations: [] };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
        expect(result.regulations).toContain('FERPA');
      });

      it('should classify disciplinary records as restricted', () => {
        const data = { disciplinaryRecord: { incident: 'test' } };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
        expect(result.educationalRecord).toBe(true);
      });
    });

    describe('PII Detection', () => {
      it('should classify SSN data as confidential', () => {
        const data = { ssn: '123-45-6789' };
        const result = service.classifyData(data);

        expect(result.classification).toBe('confidential');
        expect(result.piiDetected).toBe(true);
        expect(result.piiTypes).toContain('ssn');
        expect(result.requiresEncryption).toBe(true);
      });

      it('should detect PII in string values', () => {
        const data = { notes: 'Contact at john@test.com' };
        const result = service.classifyData(data);

        expect(result.piiDetected).toBe(true);
        expect(result.piiTypes).toContain('email');
        expect(result.regulations).toContain('GDPR');
      });
    });

    describe('COPPA Compliance', () => {
      it('should identify child data by age', () => {
        const data = { name: 'Young Student', age: 10 };
        const result = service.classifyData(data);

        expect(result.regulations).toContain('COPPA');
      });

      it('should identify child data by isMinor flag', () => {
        const data = { name: 'Student', isMinor: true };
        const result = service.classifyData(data);

        expect(result.regulations).toContain('COPPA');
      });

      it('should identify child data by grade level', () => {
        const data = { studentName: 'Test', gradeLevel: 4 };
        const result = service.classifyData(data);

        expect(result.regulations).toContain('COPPA');
      });

      it('should identify child data by date of birth', () => {
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        
        const data = { name: 'Student', dateOfBirth: tenYearsAgo.toISOString() };
        const result = service.classifyData(data);

        expect(result.regulations).toContain('COPPA');
      });
    });

    describe('Classification Levels', () => {
      it('should classify public data correctly', () => {
        const data = { schoolName: 'Test School', district: 'Test District' };
        const result = service.classifyData(data);

        expect(result.classification).toBe('public');
        expect(result.requiresEncryption).toBe(false);
      });

      it('should classify internal data correctly', () => {
        const data = { userId: '123', tenantId: 'abc', createdAt: new Date() };
        const result = service.classifyData(data);

        expect(result.classification).toBe('internal');
      });

      it('should take highest classification level', () => {
        const data = {
          schoolName: 'Test School',  // public
          userId: '123',               // internal
          email: 'test@test.com',      // confidential
          grades: [95],                // restricted
        };
        const result = service.classifyData(data);

        expect(result.classification).toBe('restricted');
      });
    });

    describe('Retention Period', () => {
      it('should set correct retention for restricted data', () => {
        const data = { grades: [95] };
        const result = service.classifyData(data);

        expect(result.retentionPeriod).toBe(2555); // 7 years for FERPA
      });

      it('should set correct retention for public data', () => {
        const data = { name: 'Test' };
        const result = service.classifyData(data);

        expect(result.retentionPeriod).toBe(365);
      });
    });
  });

  describe('classifyField', () => {
    it('should classify known restricted fields', () => {
      const result = service.classifyField('grades', [95, 87]);
      expect(result.classification).toBe('restricted');
    });

    it('should classify known confidential fields', () => {
      const result = service.classifyField('dateOfBirth', '2000-01-01');
      expect(result.classification).toBe('confidential');
    });

    it('should classify known internal fields', () => {
      const result = service.classifyField('userId', '123');
      expect(result.classification).toBe('internal');
    });

    it('should detect PII in field values', () => {
      const result = service.classifyField('notes', 'Contact at 555-123-4567');
      expect(result.classification).toBe('confidential');
      expect(result.reasons.some(r => r.includes('PII'))).toBe(true);
    });

    it('should classify unknown fields as public', () => {
      const result = service.classifyField('randomField', 'random value');
      expect(result.classification).toBe('public');
    });
  });

  describe('isHigherClassification', () => {
    it('should correctly compare classification levels', () => {
      expect(service.isHigherClassification('restricted', 'confidential')).toBe(true);
      expect(service.isHigherClassification('confidential', 'internal')).toBe(true);
      expect(service.isHigherClassification('internal', 'public')).toBe(true);
      expect(service.isHigherClassification('public', 'internal')).toBe(false);
      expect(service.isHigherClassification('confidential', 'restricted')).toBe(false);
    });
  });

  describe('getRetentionPeriod', () => {
    it('should return correct retention periods', () => {
      expect(service.getRetentionPeriod('public')).toBe(365);
      expect(service.getRetentionPeriod('internal')).toBe(730);
      expect(service.getRetentionPeriod('confidential')).toBe(1825);
      expect(service.getRetentionPeriod('restricted')).toBe(2555);
    });
  });
});
