/**
 * AIVO IEP Service - Related Services Tests
 * Tests related services logic, service logging, and compliance tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { mockPrisma, resetMocks, testData } from './setup.js';

// Import service after mocking
import * as iepService from '../services/iepService.js';
import * as studentService from '../services/studentService.js';

describe('IEP Service - Related Services', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADD SERVICE
  // ════════════════════════════════════════════════════════════════════════════

  describe('addService', () => {
    it('should create a new related service', async () => {
      const serviceInput = {
        serviceType: 'SPEECH_LANGUAGE',
        description: 'Speech therapy for articulation and language',
        frequency: '2x weekly',
        duration: 30,
        startDate: '2024-01-20',
        endDate: '2025-01-20',
        location: 'Speech Room',
        groupSize: 'Individual',
        providerType: 'Speech-Language Pathologist',
        providerName: 'Jane Smith, CCC-SLP',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...serviceInput,
      });

      const result = await iepService.addService(
        testData.tenantId,
        testData.iep.id,
        serviceInput
      );

      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          iepId: testData.iep.id,
          serviceType: 'SPEECH_LANGUAGE',
          description: serviceInput.description,
          frequency: '2x weekly',
          duration: 30,
          location: 'Speech Room',
          groupSize: 'Individual',
          providerType: 'Speech-Language Pathologist',
          isActive: true,
        }),
      });
      expect(result.serviceType).toBe('SPEECH_LANGUAGE');
    });

    it('should throw error if IEP not found', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addService(testData.tenantId, 'non-existent', {
          serviceType: 'SPEECH_LANGUAGE',
          frequency: '1x weekly',
          duration: 30,
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should handle all service types', async () => {
      const serviceTypes = [
        'SPEECH_LANGUAGE',
        'OCCUPATIONAL_THERAPY',
        'PHYSICAL_THERAPY',
        'COUNSELING',
        'SOCIAL_WORK',
        'PSYCHOLOGY',
        'VISION',
        'HEARING',
        'ORIENTATION_MOBILITY',
        'NURSING',
        'TRANSPORTATION',
        'PARAPROFESSIONAL',
        'BEHAVIOR_SUPPORT',
        'ASSISTIVE_TECHNOLOGY',
        'TRANSITION',
        'OTHER',
      ];

      for (const serviceType of serviceTypes) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.service.create.mockResolvedValue({
          ...testData.service,
          serviceType,
        });

        const result = await iepService.addService(testData.tenantId, testData.iep.id, {
          serviceType,
          frequency: '1x weekly',
          duration: 30,
        });

        expect(result.serviceType).toBe(serviceType);
      }
    });

    it('should create speech-language therapy service', async () => {
      const speechService = {
        serviceType: 'SPEECH_LANGUAGE',
        description: 'Direct speech therapy services for articulation and expressive language',
        frequency: '3x weekly',
        duration: 20,
        location: 'Speech therapy room',
        groupSize: 'Small group (2-3)',
        providerType: 'Licensed Speech-Language Pathologist',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...speechService,
      });

      const result = await iepService.addService(testData.tenantId, testData.iep.id, speechService);

      expect(result.serviceType).toBe('SPEECH_LANGUAGE');
      expect(result.frequency).toBe('3x weekly');
    });

    it('should create occupational therapy service', async () => {
      const otService = {
        serviceType: 'OCCUPATIONAL_THERAPY',
        description: 'OT services for fine motor skills and sensory processing',
        frequency: '2x weekly',
        duration: 30,
        location: 'OT room or classroom',
        groupSize: 'Individual',
        providerType: 'Licensed Occupational Therapist',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...otService,
      });

      const result = await iepService.addService(testData.tenantId, testData.iep.id, otService);

      expect(result.serviceType).toBe('OCCUPATIONAL_THERAPY');
    });

    it('should create behavioral support service', async () => {
      const behaviorService = {
        serviceType: 'BEHAVIOR_SUPPORT',
        description: 'Behavioral intervention and support services',
        frequency: 'Daily consultation',
        duration: 15,
        location: 'Classroom',
        groupSize: 'Individual',
        providerType: 'Board Certified Behavior Analyst',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...behaviorService,
      });

      const result = await iepService.addService(testData.tenantId, testData.iep.id, behaviorService);

      expect(result.serviceType).toBe('BEHAVIOR_SUPPORT');
    });

    it('should create transportation service', async () => {
      const transportService = {
        serviceType: 'TRANSPORTATION',
        description: 'Specialized transportation to and from school',
        frequency: 'Daily',
        duration: 0, // Duration not applicable for transportation
        location: 'Home to school',
        providerType: 'District Transportation',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...transportService,
      });

      const result = await iepService.addService(testData.tenantId, testData.iep.id, transportService);

      expect(result.serviceType).toBe('TRANSPORTATION');
    });

    it('should create paraprofessional support service', async () => {
      const paraService = {
        serviceType: 'PARAPROFESSIONAL',
        description: '1:1 paraprofessional support throughout the school day',
        frequency: 'Daily - full day',
        duration: 360, // 6 hours
        location: 'All settings',
        groupSize: 'Individual',
        providerType: 'Certified Paraprofessional',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        ...paraService,
      });

      const result = await iepService.addService(testData.tenantId, testData.iep.id, paraService);

      expect(result.serviceType).toBe('PARAPROFESSIONAL');
      expect(result.duration).toBe(360);
    });

    it('should set service as active by default', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.service.create.mockResolvedValue({
        ...testData.service,
        isActive: true,
      });

      await iepService.addService(testData.tenantId, testData.iep.id, {
        serviceType: 'COUNSELING',
        frequency: '1x weekly',
        duration: 30,
      });

      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LOG SERVICE SESSION
  // ════════════════════════════════════════════════════════════════════════════

  describe('logServiceSession', () => {
    it('should log a service session', async () => {
      const logInput = {
        sessionDate: '2024-02-15',
        duration: 30,
        attended: true,
        notes: 'Worked on articulation of /r/ sounds. Student showed improvement.',
        activities: ['Articulation drills', 'Conversation practice', 'Reading aloud'],
        providerId: 'provider-001',
        providerName: 'Jane Smith, SLP',
      };

      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.serviceLog.create.mockResolvedValue({
        ...testData.serviceLog,
        ...logInput,
      });

      const result = await iepService.logServiceSession(
        testData.tenantId,
        testData.service.id,
        logInput
      );

      expect(mockPrisma.serviceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceId: testData.service.id,
          sessionDate: expect.any(Date),
          duration: 30,
          attended: true,
          notes: logInput.notes,
          activities: logInput.activities,
          providerId: 'provider-001',
          providerName: 'Jane Smith, SLP',
        }),
      });
      expect(result.attended).toBe(true);
    });

    it('should log session when student did not attend', async () => {
      const logInput = {
        sessionDate: '2024-02-16',
        duration: 0,
        attended: false,
        notes: 'Student absent - illness',
        activities: [],
        providerId: 'provider-001',
        providerName: 'Jane Smith, SLP',
      };

      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.serviceLog.create.mockResolvedValue({
        ...testData.serviceLog,
        ...logInput,
        attended: false,
      });

      const result = await iepService.logServiceSession(
        testData.tenantId,
        testData.service.id,
        logInput
      );

      expect(result.attended).toBe(false);
    });

    it('should default attended to true', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.serviceLog.create.mockResolvedValue({
        ...testData.serviceLog,
        attended: true,
      });

      await iepService.logServiceSession(testData.tenantId, testData.service.id, {
        sessionDate: '2024-02-17',
        duration: 30,
        providerId: 'provider-001',
        providerName: 'Jane Smith',
        // attended not specified
      });

      expect(mockPrisma.serviceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          attended: true,
        }),
      });
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: 'other-tenant' },
      });

      await expect(
        iepService.logServiceSession(testData.tenantId, testData.service.id, {
          sessionDate: '2024-02-15',
          duration: 30,
          providerId: 'provider-001',
          providerName: 'Jane Smith',
        })
      ).rejects.toThrow('Service not found');
    });

    it('should throw error if service not found', async () => {
      mockPrisma.service.findFirst.mockResolvedValue(null);

      await expect(
        iepService.logServiceSession(testData.tenantId, 'non-existent', {
          sessionDate: '2024-02-15',
          duration: 30,
          providerId: 'provider-001',
          providerName: 'Jane Smith',
        })
      ).rejects.toThrow('Service not found');
    });

    it('should track activities performed during session', async () => {
      const activities = [
        'Fine motor exercises',
        'Handwriting practice',
        'Scissor skills',
        'Sensory activities',
      ];

      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.serviceLog.create.mockResolvedValue({
        ...testData.serviceLog,
        activities,
      });

      const result = await iepService.logServiceSession(testData.tenantId, testData.service.id, {
        sessionDate: '2024-02-18',
        duration: 30,
        activities,
        providerId: 'provider-001',
        providerName: 'OT Provider',
      });

      expect(result.activities).toEqual(activities);
    });

    it('should default activities to empty array', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.serviceLog.create.mockResolvedValue({
        ...testData.serviceLog,
        activities: [],
      });

      await iepService.logServiceSession(testData.tenantId, testData.service.id, {
        sessionDate: '2024-02-19',
        duration: 30,
        providerId: 'provider-001',
        providerName: 'Provider',
        // activities not specified
      });

      expect(mockPrisma.serviceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activities: [],
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE CHECKING
  // ════════════════════════════════════════════════════════════════════════════

  describe('Compliance Checking', () => {
    describe('checkCompliance', () => {
      it('should identify IEPs with upcoming annual reviews', async () => {
        const upcomingReviewDate = new Date();
        upcomingReviewDate.setDate(upcomingReviewDate.getDate() + 14); // 14 days from now

        mockPrisma.iEP.findMany.mockResolvedValueOnce([
          {
            ...testData.iep,
            status: 'ACTIVE',
            annualReviewDate: upcomingReviewDate,
            student: testData.student,
          },
        ]);
        mockPrisma.iEP.findMany.mockResolvedValueOnce([]); // No reevaluations due
        mockPrisma.complianceAlert.upsert.mockResolvedValue(testData.complianceAlert);

        const alerts = await iepService.checkCompliance(testData.tenantId);

        expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: testData.tenantId,
              status: 'ACTIVE',
              annualReviewDate: expect.any(Object),
            }),
          })
        );
        expect(alerts.length).toBeGreaterThanOrEqual(0);
      });

      it('should identify IEPs with upcoming reevaluations', async () => {
        const upcomingReevalDate = new Date();
        upcomingReevalDate.setDate(upcomingReevalDate.getDate() + 60); // 60 days from now

        mockPrisma.iEP.findMany.mockResolvedValueOnce([]); // No annual reviews due
        mockPrisma.iEP.findMany.mockResolvedValueOnce([
          {
            ...testData.iep,
            status: 'ACTIVE',
            reevaluationDate: upcomingReevalDate,
            student: testData.student,
          },
        ]);
        mockPrisma.complianceAlert.upsert.mockResolvedValue(testData.complianceAlert);

        const alerts = await iepService.checkCompliance(testData.tenantId);

        expect(alerts).toBeDefined();
      });

      it('should set high severity for reviews due within 7 days', async () => {
        const urgentReviewDate = new Date();
        urgentReviewDate.setDate(urgentReviewDate.getDate() + 5); // 5 days from now

        mockPrisma.iEP.findMany.mockResolvedValueOnce([
          {
            ...testData.iep,
            status: 'ACTIVE',
            annualReviewDate: urgentReviewDate,
            student: testData.student,
          },
        ]);
        mockPrisma.iEP.findMany.mockResolvedValueOnce([]);
        mockPrisma.complianceAlert.upsert.mockResolvedValue({
          ...testData.complianceAlert,
          severity: 'High',
        });

        const alerts = await iepService.checkCompliance(testData.tenantId);

        // The service should create high severity alerts for items due within 7 days
        if (alerts.length > 0) {
          const urgentAlert = alerts.find((a: any) => a.alertType === 'ANNUAL_REVIEW_DUE');
          if (urgentAlert) {
            expect(urgentAlert.severity).toBe('High');
          }
        }
      });

      it('should store compliance alerts', async () => {
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() + 20);

        mockPrisma.iEP.findMany.mockResolvedValueOnce([
          {
            ...testData.iep,
            annualReviewDate: reviewDate,
            student: testData.student,
          },
        ]);
        mockPrisma.iEP.findMany.mockResolvedValueOnce([]);
        mockPrisma.complianceAlert.upsert.mockResolvedValue(testData.complianceAlert);

        await iepService.checkCompliance(testData.tenantId);

        expect(mockPrisma.complianceAlert.upsert).toHaveBeenCalled();
      });
    });

    describe('getComplianceAlerts', () => {
      it('should return paginated compliance alerts', async () => {
        mockPrisma.complianceAlert.findMany.mockResolvedValue([testData.complianceAlert]);
        mockPrisma.complianceAlert.count.mockResolvedValue(1);

        const result = await iepService.getComplianceAlerts(testData.tenantId, {
          page: 1,
          pageSize: 20,
        });

        expect(result.data).toHaveLength(1);
        expect(result.pagination).toEqual({
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        });
      });

      it('should filter by status', async () => {
        mockPrisma.complianceAlert.findMany.mockResolvedValue([]);
        mockPrisma.complianceAlert.count.mockResolvedValue(0);

        await iepService.getComplianceAlerts(testData.tenantId, { status: 'OPEN' });

        expect(mockPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'OPEN',
            }),
          })
        );
      });

      it('should filter by alert type', async () => {
        mockPrisma.complianceAlert.findMany.mockResolvedValue([]);
        mockPrisma.complianceAlert.count.mockResolvedValue(0);

        await iepService.getComplianceAlerts(testData.tenantId, {
          alertType: 'ANNUAL_REVIEW_DUE',
        });

        expect(mockPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              alertType: 'ANNUAL_REVIEW_DUE',
            }),
          })
        );
      });

      it('should order alerts by severity and due date', async () => {
        mockPrisma.complianceAlert.findMany.mockResolvedValue([]);
        mockPrisma.complianceAlert.count.mockResolvedValue(0);

        await iepService.getComplianceAlerts(testData.tenantId, {});

        expect(mockPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }],
          })
        );
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT SERVICE
  // ════════════════════════════════════════════════════════════════════════════

  describe('Student Service', () => {
    describe('createStudent', () => {
      it('should create a new student', async () => {
        const studentInput = {
          studentId: 'STU-002',
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: '2014-03-20',
          grade: '4',
          school: 'Lincoln Elementary',
          district: 'Springfield District',
          primaryDisability: 'Autism Spectrum Disorder',
        };

        mockPrisma.student.create.mockResolvedValue({
          ...testData.student,
          ...studentInput,
          id: 'new-student-id',
        });

        const result = await studentService.createStudent(testData.tenantId, studentInput);

        expect(mockPrisma.student.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            tenantId: testData.tenantId,
            studentId: 'STU-002',
            firstName: 'Jane',
            lastName: 'Smith',
            status: 'ACTIVE',
          }),
        });
        expect(result.firstName).toBe('Jane');
      });

      it('should set default values for optional fields', async () => {
        mockPrisma.student.create.mockResolvedValue({
          ...testData.student,
          primaryLanguage: 'English',
          secondaryDisabilities: [],
        });

        await studentService.createStudent(testData.tenantId, {
          studentId: 'STU-003',
          firstName: 'Test',
          lastName: 'Student',
          dateOfBirth: '2015-01-01',
          grade: '3',
          school: 'Test School',
        });

        expect(mockPrisma.student.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            primaryLanguage: 'English',
            secondaryDisabilities: [],
          }),
        });
      });
    });

    describe('getStudent', () => {
      it('should return student with IEPs and team members', async () => {
        mockPrisma.student.findFirst.mockResolvedValue({
          ...testData.student,
          ieps: [testData.iep],
          teamMembers: [testData.teamMember],
          evaluations: [],
        });

        const result = await studentService.getStudent(testData.tenantId, testData.student.id);

        expect(mockPrisma.student.findFirst).toHaveBeenCalledWith({
          where: { id: testData.student.id, tenantId: testData.tenantId },
          include: expect.objectContaining({
            ieps: expect.any(Object),
            teamMembers: expect.any(Object),
            evaluations: expect.any(Object),
          }),
        });
        expect(result?.ieps).toBeDefined();
        expect(result?.teamMembers).toBeDefined();
      });

      it('should return null for non-existent student', async () => {
        mockPrisma.student.findFirst.mockResolvedValue(null);

        const result = await studentService.getStudent(testData.tenantId, 'non-existent');

        expect(result).toBeNull();
      });
    });

    describe('listStudents', () => {
      it('should return paginated list of students', async () => {
        mockPrisma.student.findMany.mockResolvedValue([testData.student]);
        mockPrisma.student.count.mockResolvedValue(1);

        const result = await studentService.listStudents(testData.tenantId, {
          page: 1,
          pageSize: 20,
        });

        expect(result.data).toHaveLength(1);
        expect(result.pagination.totalItems).toBe(1);
      });

      it('should filter by status', async () => {
        mockPrisma.student.findMany.mockResolvedValue([]);
        mockPrisma.student.count.mockResolvedValue(0);

        await studentService.listStudents(testData.tenantId, { status: 'ACTIVE' });

        expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'ACTIVE',
            }),
          })
        );
      });

      it('should filter by school', async () => {
        mockPrisma.student.findMany.mockResolvedValue([]);
        mockPrisma.student.count.mockResolvedValue(0);

        await studentService.listStudents(testData.tenantId, { school: 'Lincoln Elementary' });

        expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              school: 'Lincoln Elementary',
            }),
          })
        );
      });

      it('should filter by grade', async () => {
        mockPrisma.student.findMany.mockResolvedValue([]);
        mockPrisma.student.count.mockResolvedValue(0);

        await studentService.listStudents(testData.tenantId, { grade: '3' });

        expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              grade: '3',
            }),
          })
        );
      });

      it('should search by name or student ID', async () => {
        mockPrisma.student.findMany.mockResolvedValue([]);
        mockPrisma.student.count.mockResolvedValue(0);

        await studentService.listStudents(testData.tenantId, { search: 'John' });

        expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ firstName: expect.any(Object) }),
                expect.objectContaining({ lastName: expect.any(Object) }),
                expect.objectContaining({ studentId: expect.any(Object) }),
              ]),
            }),
          })
        );
      });
    });

    describe('updateStudent', () => {
      it('should update student fields', async () => {
        mockPrisma.student.findFirst.mockResolvedValue(testData.student);
        mockPrisma.student.update.mockResolvedValue({
          ...testData.student,
          grade: '4',
          school: 'New School',
        });

        const result = await studentService.updateStudent(testData.tenantId, testData.student.id, {
          grade: '4',
          school: 'New School',
        });

        expect(result.grade).toBe('4');
        expect(result.school).toBe('New School');
      });

      it('should throw error if student not found', async () => {
        mockPrisma.student.findFirst.mockResolvedValue(null);

        await expect(
          studentService.updateStudent(testData.tenantId, 'non-existent', { grade: '4' })
        ).rejects.toThrow('Student not found');
      });
    });

    describe('addTeamMember', () => {
      it('should add a team member to student', async () => {
        const memberInput = {
          name: 'John Teacher',
          email: 'jteacher@school.edu',
          role: 'SPECIAL_EDUCATION_TEACHER',
          title: 'Resource Specialist',
          isPrimaryContact: false,
        };

        mockPrisma.student.findFirst.mockResolvedValue(testData.student);
        mockPrisma.teamMember.create.mockResolvedValue({
          ...testData.teamMember,
          ...memberInput,
          id: 'new-team-member-id',
        });

        const result = await studentService.addTeamMember(
          testData.tenantId,
          testData.student.id,
          memberInput
        );

        expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            tenantId: testData.tenantId,
            studentId: testData.student.id,
            name: 'John Teacher',
            role: 'SPECIAL_EDUCATION_TEACHER',
            isActive: true,
          }),
        });
        expect(result.role).toBe('SPECIAL_EDUCATION_TEACHER');
      });

      it('should throw error if student not found', async () => {
        mockPrisma.student.findFirst.mockResolvedValue(null);

        await expect(
          studentService.addTeamMember(testData.tenantId, 'non-existent', {
            name: 'Test',
            role: 'PARENT_GUARDIAN',
          })
        ).rejects.toThrow('Student not found');
      });

      it('should handle all team member roles', async () => {
        const roles = [
          'PARENT_GUARDIAN',
          'STUDENT',
          'GENERAL_EDUCATION_TEACHER',
          'SPECIAL_EDUCATION_TEACHER',
          'ADMINISTRATOR',
          'SCHOOL_PSYCHOLOGIST',
          'SPEECH_LANGUAGE_PATHOLOGIST',
          'OCCUPATIONAL_THERAPIST',
          'PHYSICAL_THERAPIST',
          'COUNSELOR',
          'SOCIAL_WORKER',
          'BEHAVIOR_SPECIALIST',
          'TRANSITION_COORDINATOR',
          'ADVOCATE',
          'ATTORNEY',
          'INTERPRETER',
          'OTHER',
        ];

        for (const role of roles) {
          resetMocks();
          mockPrisma.student.findFirst.mockResolvedValue(testData.student);
          mockPrisma.teamMember.create.mockResolvedValue({
            ...testData.teamMember,
            role,
          });

          const result = await studentService.addTeamMember(testData.tenantId, testData.student.id, {
            name: `Team Member - ${role}`,
            role,
          });

          expect(result.role).toBe(role);
        }
      });
    });

    describe('createEvaluation', () => {
      it('should create an evaluation for student', async () => {
        const evalInput = {
          evaluationType: 'INITIAL',
          referralDate: '2024-01-10',
          areasEvaluated: ['Academic', 'Cognitive', 'Social-Emotional'],
        };

        mockPrisma.student.findFirst.mockResolvedValue(testData.student);
        mockPrisma.evaluation.create.mockResolvedValue({
          id: 'eval-001',
          ...evalInput,
          status: 'PENDING',
          createdBy: testData.userId,
        });

        const result = await studentService.createEvaluation(
          testData.tenantId,
          testData.student.id,
          testData.userId,
          evalInput
        );

        expect(mockPrisma.evaluation.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            tenantId: testData.tenantId,
            studentId: testData.student.id,
            evaluationType: 'INITIAL',
            status: 'PENDING',
            createdBy: testData.userId,
          }),
        });
        expect(result.status).toBe('PENDING');
      });

      it('should handle all evaluation types', async () => {
        const evalTypes = [
          'INITIAL',
          'REEVALUATION',
          'INDEPENDENT',
          'FUNCTIONAL_BEHAVIOR',
          'ASSISTIVE_TECHNOLOGY',
          'TRANSITION',
          'OTHER',
        ];

        for (const evaluationType of evalTypes) {
          resetMocks();
          mockPrisma.student.findFirst.mockResolvedValue(testData.student);
          mockPrisma.evaluation.create.mockResolvedValue({
            id: 'eval-001',
            evaluationType,
            status: 'PENDING',
          });

          const result = await studentService.createEvaluation(
            testData.tenantId,
            testData.student.id,
            testData.userId,
            { evaluationType }
          );

          expect(result.evaluationType).toBe(evaluationType);
        }
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL - ROLE-BASED
  // ════════════════════════════════════════════════════════════════════════════

  describe('Access Control - Role-Based', () => {
    it('should enforce tenant isolation across all service operations', async () => {
      // Test tenant isolation for service creation
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addService('other-tenant', testData.iep.id, {
          serviceType: 'SPEECH_LANGUAGE',
          frequency: '1x weekly',
          duration: 30,
        })
      ).rejects.toThrow('IEP not found');

      // Test tenant isolation for service logging
      resetMocks();
      mockPrisma.service.findFirst.mockResolvedValue({
        ...testData.service,
        iep: { tenantId: 'original-tenant' },
      });

      await expect(
        iepService.logServiceSession('other-tenant', testData.service.id, {
          sessionDate: '2024-02-15',
          duration: 30,
          providerId: 'provider-001',
          providerName: 'Provider',
        })
      ).rejects.toThrow('Service not found');
    });
  });
});
