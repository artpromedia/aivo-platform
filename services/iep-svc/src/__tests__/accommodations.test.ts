/**
 * AIVO IEP Service - Accommodations Tests
 * Tests accommodation and modification management
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { mockPrisma, resetMocks, testData } from './setup.js';

// Import service after mocking
import * as iepService from '../services/iepService.js';

describe('IEP Service - Accommodations & Modifications', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADD ACCOMMODATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('addAccommodation', () => {
    it('should create a new accommodation', async () => {
      const accommodationInput = {
        category: 'PRESENTATION',
        name: 'Extended Time',
        description: 'Student receives 1.5x extended time on all tests and assignments',
        settings: ['Classroom', 'Testing'],
        subjects: ['All'],
        frequency: 'As needed for timed activities',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        ...accommodationInput,
      });

      const result = await iepService.addAccommodation(
        testData.tenantId,
        testData.iep.id,
        accommodationInput
      );

      expect(mockPrisma.accommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          iepId: testData.iep.id,
          category: 'PRESENTATION',
          name: 'Extended Time',
          description: accommodationInput.description,
          settings: ['Classroom', 'Testing'],
          subjects: ['All'],
          frequency: 'As needed for timed activities',
          isActive: true,
        }),
      });
      expect(result.name).toBe('Extended Time');
      expect(result.isActive).toBe(true);
    });

    it('should throw error if IEP not found', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addAccommodation(testData.tenantId, 'non-existent', {
          category: 'PRESENTATION',
          name: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should handle all accommodation categories', async () => {
      const categories = [
        'PRESENTATION',
        'RESPONSE',
        'SETTING',
        'TIMING',
        'SCHEDULING',
        'ASSISTIVE_TECHNOLOGY',
        'OTHER',
      ];

      for (const category of categories) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.accommodation.create.mockResolvedValue({
          ...testData.accommodation,
          category,
        });

        const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
          category,
          name: `${category} accommodation`,
          description: `Description for ${category}`,
        });

        expect(result.category).toBe(category);
      }
    });

    it('should default empty arrays for settings and subjects', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        settings: [],
        subjects: [],
      });

      await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'TIMING',
        name: 'Flexible Scheduling',
        description: 'Student may take breaks as needed',
        // No settings or subjects provided
      });

      expect(mockPrisma.accommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          settings: [],
          subjects: [],
        }),
      });
    });

    it('should create presentation accommodations', async () => {
      const presentationAccommodations = [
        {
          name: 'Large Print',
          description: 'All materials provided in 18pt font or larger',
        },
        {
          name: 'Audio Support',
          description: 'Text-to-speech for all reading materials',
        },
        {
          name: 'Visual Aids',
          description: 'Graphic organizers and visual supports for instruction',
        },
      ];

      for (const acc of presentationAccommodations) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.accommodation.create.mockResolvedValue({
          ...testData.accommodation,
          category: 'PRESENTATION',
          ...acc,
        });

        const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
          category: 'PRESENTATION',
          ...acc,
        });

        expect(result.category).toBe('PRESENTATION');
        expect(result.name).toBe(acc.name);
      }
    });

    it('should create response accommodations', async () => {
      const responseAccommodations = [
        {
          name: 'Verbal Responses',
          description: 'Student may respond verbally instead of in writing',
        },
        {
          name: 'Scribe',
          description: 'Student may dictate responses to a scribe',
        },
        {
          name: 'Word Processor',
          description: 'Student may use computer for written responses',
        },
      ];

      for (const acc of responseAccommodations) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.accommodation.create.mockResolvedValue({
          ...testData.accommodation,
          category: 'RESPONSE',
          ...acc,
        });

        const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
          category: 'RESPONSE',
          ...acc,
        });

        expect(result.category).toBe('RESPONSE');
      }
    });

    it('should create setting accommodations', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        category: 'SETTING',
        name: 'Separate Testing Location',
        description: 'Student tests in a separate, quiet location',
        settings: ['Testing'],
      });

      const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'SETTING',
        name: 'Separate Testing Location',
        description: 'Student tests in a separate, quiet location',
        settings: ['Testing'],
      });

      expect(result.category).toBe('SETTING');
      expect(result.settings).toContain('Testing');
    });

    it('should create assistive technology accommodations', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        category: 'ASSISTIVE_TECHNOLOGY',
        name: 'Calculator',
        description: 'Student may use calculator for all math computations',
        subjects: ['Mathematics'],
      });

      const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'ASSISTIVE_TECHNOLOGY',
        name: 'Calculator',
        description: 'Student may use calculator for all math computations',
        subjects: ['Mathematics'],
      });

      expect(result.category).toBe('ASSISTIVE_TECHNOLOGY');
      expect(result.subjects).toContain('Mathematics');
    });

    it('should set accommodation as active by default', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        isActive: true,
      });

      await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'TIMING',
        name: 'Breaks',
        description: 'Scheduled breaks during testing',
      });

      expect(mockPrisma.accommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADD MODIFICATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('addModification', () => {
    it('should create a new modification', async () => {
      const modificationInput = {
        subject: 'Mathematics',
        description: 'Modified curriculum at 2nd grade level',
        rationale: 'Student is working at instructional level 2 grades below peers',
        gradeLevel: '2',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        ...modificationInput,
      });

      const result = await iepService.addModification(
        testData.tenantId,
        testData.iep.id,
        modificationInput
      );

      expect(mockPrisma.modification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          iepId: testData.iep.id,
          subject: 'Mathematics',
          description: 'Modified curriculum at 2nd grade level',
          rationale: modificationInput.rationale,
          gradeLevel: '2',
          isActive: true,
        }),
      });
      expect(result.subject).toBe('Mathematics');
    });

    it('should throw error if IEP not found', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addModification(testData.tenantId, 'non-existent', {
          subject: 'Math',
          description: 'Test',
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should create modifications for different subjects', async () => {
      const subjects = ['Mathematics', 'Reading', 'Writing', 'Science', 'Social Studies'];

      for (const subject of subjects) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.modification.create.mockResolvedValue({
          ...testData.modification,
          subject,
        });

        const result = await iepService.addModification(testData.tenantId, testData.iep.id, {
          subject,
          description: `Modified ${subject} curriculum`,
        });

        expect(result.subject).toBe(subject);
      }
    });

    it('should handle modification without grade level specified', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        gradeLevel: null,
      });

      await iepService.addModification(testData.tenantId, testData.iep.id, {
        subject: 'Reading',
        description: 'Simplified vocabulary in reading materials',
        // No gradeLevel provided
      });

      expect(mockPrisma.modification.create).toHaveBeenCalled();
    });

    it('should set modification as active by default', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        isActive: true,
      });

      await iepService.addModification(testData.tenantId, testData.iep.id, {
        subject: 'Writing',
        description: 'Reduced writing requirements',
      });

      expect(mockPrisma.modification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });

    it('should include rationale for modifications', async () => {
      const rationale =
        'Based on evaluation results, student requires instruction at lower grade level to access curriculum';

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        rationale,
      });

      const result = await iepService.addModification(testData.tenantId, testData.iep.id, {
        subject: 'Science',
        description: 'Modified science assessments',
        rationale,
      });

      expect(result.rationale).toBe(rationale);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCOMMODATION VS MODIFICATION DISTINCTION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Accommodation vs Modification Distinction', () => {
    it('should properly distinguish accommodations from modifications', async () => {
      // Accommodation: Changes HOW student learns, not WHAT they learn
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        category: 'TIMING',
        name: 'Extended Time',
        description: 'Student completes same assignments with additional time',
      });

      const accommodation = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'TIMING',
        name: 'Extended Time',
        description: 'Student completes same assignments with additional time',
      });

      expect(accommodation.category).toBeDefined();

      // Modification: Changes WHAT student learns
      resetMocks();
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        subject: 'Mathematics',
        description: 'Student completes fewer problems with reduced complexity',
        gradeLevel: '2',
      });

      const modification = await iepService.addModification(testData.tenantId, testData.iep.id, {
        subject: 'Mathematics',
        description: 'Student completes fewer problems with reduced complexity',
        gradeLevel: '2',
      });

      expect(modification.gradeLevel).toBe('2');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TESTING ACCOMMODATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('Testing Accommodations', () => {
    it('should support state testing accommodations', async () => {
      const stateTestingAccommodations = [
        {
          category: 'TIMING',
          name: 'Extended Time - State Testing',
          description: 'Time and a half for state assessments',
          settings: ['State Testing'],
        },
        {
          category: 'SETTING',
          name: 'Small Group Testing',
          description: 'Test in small group setting for state assessments',
          settings: ['State Testing'],
        },
        {
          category: 'PRESENTATION',
          name: 'Read Aloud - Math',
          description: 'Math test items read aloud (not reading tests)',
          settings: ['State Testing'],
          subjects: ['Mathematics'],
        },
      ];

      for (const acc of stateTestingAccommodations) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.accommodation.create.mockResolvedValue({
          ...testData.accommodation,
          ...acc,
        });

        const result = await iepService.addAccommodation(
          testData.tenantId,
          testData.iep.id,
          acc
        );

        expect(result.settings).toContain('State Testing');
      }
    });

    it('should support classroom accommodations', async () => {
      const classroomAccommodations = [
        {
          category: 'SETTING',
          name: 'Preferential Seating',
          description: 'Student seated near teacher and away from distractions',
          settings: ['Classroom'],
          frequency: 'Daily',
        },
        {
          category: 'PRESENTATION',
          name: 'Chunked Assignments',
          description: 'Assignments broken into smaller parts with check-ins',
          settings: ['Classroom'],
          frequency: 'As needed',
        },
      ];

      for (const acc of classroomAccommodations) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.accommodation.create.mockResolvedValue({
          ...testData.accommodation,
          ...acc,
        });

        const result = await iepService.addAccommodation(
          testData.tenantId,
          testData.iep.id,
          acc
        );

        expect(result.settings).toContain('Classroom');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUBJECT-SPECIFIC ACCOMMODATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('Subject-Specific Accommodations', () => {
    it('should support accommodations for specific subjects', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        category: 'ASSISTIVE_TECHNOLOGY',
        name: 'Spell Check',
        description: 'Student may use spell check for writing assignments',
        subjects: ['Writing', 'Language Arts'],
      });

      const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'ASSISTIVE_TECHNOLOGY',
        name: 'Spell Check',
        description: 'Student may use spell check for writing assignments',
        subjects: ['Writing', 'Language Arts'],
      });

      expect(result.subjects).toContain('Writing');
      expect(result.subjects).toContain('Language Arts');
    });

    it('should support accommodations across all subjects', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        category: 'TIMING',
        name: 'Frequent Breaks',
        description: 'Student may take 5-minute break every 20 minutes',
        subjects: ['All'],
      });

      const result = await iepService.addAccommodation(testData.tenantId, testData.iep.id, {
        category: 'TIMING',
        name: 'Frequent Breaks',
        description: 'Student may take 5-minute break every 20 minutes',
        subjects: ['All'],
      });

      expect(result.subjects).toContain('All');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL
  // ════════════════════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should enforce tenant isolation for accommodations', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addAccommodation('other-tenant', testData.iep.id, {
          category: 'TIMING',
          name: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should enforce tenant isolation for modifications', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addModification('other-tenant', testData.iep.id, {
          subject: 'Math',
          description: 'Test',
        })
      ).rejects.toThrow('IEP not found');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE - REASONABLE ACCOMMODATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('Compliance - Accommodation Documentation', () => {
    it('should capture all required accommodation fields', async () => {
      const compliantAccommodation = {
        category: 'PRESENTATION',
        name: 'Audio Books',
        description: 'Student will receive audio versions of all required reading materials',
        settings: ['Classroom', 'Homework', 'Testing'],
        subjects: ['Reading', 'Social Studies', 'Science'],
        frequency: 'Daily',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.accommodation.create.mockResolvedValue({
        ...testData.accommodation,
        ...compliantAccommodation,
      });

      const result = await iepService.addAccommodation(
        testData.tenantId,
        testData.iep.id,
        compliantAccommodation
      );

      // Verify all compliance-required fields are present
      expect(result.category).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.settings).toBeDefined();
      expect(result.subjects).toBeDefined();
      expect(result.frequency).toBeDefined();
    });

    it('should capture rationale for modifications', async () => {
      const compliantModification = {
        subject: 'Mathematics',
        description: 'Student receives modified math curriculum at 2nd grade level',
        rationale:
          'Based on comprehensive evaluation, student demonstrates math skills at early 2nd grade level. Modified curriculum necessary to provide instruction at instructional level.',
        gradeLevel: '2',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.modification.create.mockResolvedValue({
        ...testData.modification,
        ...compliantModification,
      });

      const result = await iepService.addModification(
        testData.tenantId,
        testData.iep.id,
        compliantModification
      );

      // Verify compliance-required fields
      expect(result.subject).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(result.gradeLevel).toBeDefined();
    });
  });
});
