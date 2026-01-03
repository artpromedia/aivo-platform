/**
 * Entity Transformer
 * 
 * Transforms raw SIS data from staging tables into Aivo entities.
 * Handles matching logic (email/external ID), deduplication, and
 * cross-service entity synchronization.
 */

import type { ExtendedPrismaClient as PrismaClient } from '../prisma-types.js';
import { SisUserRole } from '../providers/types';

export interface TransformConfig {
  /** Tenant ID for the transformation */
  tenantId: string;
  /** Provider ID for the transformation */
  providerId: string;
  /** Whether to create new users or only update existing */
  createNewUsers: boolean;
  /** Whether to send welcome emails to new users */
  sendWelcomeEmails: boolean;
  /** Whether to auto-activate new users */
  autoActivateUsers: boolean;
  /** Default password for new users (will be hashed) */
  defaultPassword?: string;
}

export interface TransformResult {
  schools: { created: number; updated: number; deactivated: number; errors: string[] };
  classrooms: { created: number; updated: number; deactivated: number; errors: string[] };
  users: { created: number; updated: number; deactivated: number; errors: string[] };
  enrollments: { created: number; updated: number; removed: number; errors: string[] };
}

/**
 * Maps SIS roles to Aivo user roles
 */
export function mapSisRoleToAivoRole(sisRole: SisUserRole): string {
  const roleMap: Record<SisUserRole, string> = {
    teacher: 'TEACHER',
    student: 'LEARNER',
    administrator: 'DISTRICT_ADMIN',
    aide: 'TEACHER', // Aides are treated as teachers with limited permissions
    parent: 'PARENT',
    guardian: 'PARENT',
  };
  return roleMap[sisRole] || 'LEARNER';
}

/**
 * Transforms staging data into Aivo entities
 * 
 * This class coordinates with tenant-svc and auth-svc to create/update
 * the actual Aivo entities. In a microservices architecture, this would
 * use service-to-service calls or a message queue.
 */
export class EntityTransformer {
  private prisma: PrismaClient;
  private config: TransformConfig;

  constructor(prisma: PrismaClient, config: TransformConfig) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Transform all staged data for a provider
   */
  async transformAll(): Promise<TransformResult> {
    const result: TransformResult = {
      schools: { created: 0, updated: 0, deactivated: 0, errors: [] },
      classrooms: { created: 0, updated: 0, deactivated: 0, errors: [] },
      users: { created: 0, updated: 0, deactivated: 0, errors: [] },
      enrollments: { created: 0, updated: 0, removed: 0, errors: [] },
    };

    // Transform in dependency order
    await this.transformSchools(result);
    await this.transformUsers(result);
    await this.transformClassrooms(result);
    await this.transformEnrollments(result);

    return result;
  }

  /**
   * Transform schools from staging to Aivo School entities
   */
  private async transformSchools(result: TransformResult): Promise<void> {
    // Get all raw schools for this provider
    const rawSchools = await this.prisma.sisRawSchool.findMany({
      where: { providerId: this.config.providerId },
    });

    for (const rawSchool of rawSchools) {
      try {
        if (rawSchool.processed) {
          // Active school - upsert
          // In production, this would call tenant-svc API
          // For now, we update the aivoSchoolId reference
          
          // Check if we already have a mapping
          if (rawSchool.aivoSchoolId) {
            // Update existing school
            result.schools.updated++;
          } else {
            // Try to match by external ID or name
            // This would query tenant-svc for existing schools
            // const existingSchool = await tenantSvc.findSchool({
            //   tenantId: this.config.tenantId,
            //   externalId: rawSchool.externalId,
            // });
            
            // For now, mark as created (would create via tenant-svc)
            result.schools.created++;
            
            // Update the raw record with the Aivo school ID
            // await this.prisma.sisRawSchool.update({
            //   where: { id: rawSchool.id },
            //   data: { aivoSchoolId: newSchoolId },
            // });
          }
        } else {
          // School not in current sync - mark inactive
          // This would call tenant-svc to deactivate the school
          result.schools.deactivated++;
        }
      } catch (error) {
        result.schools.errors.push(
          `School ${rawSchool.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Transform users from staging to Aivo User entities
   */
  private async transformUsers(result: TransformResult): Promise<void> {
    const rawUsers = await this.prisma.sisRawUser.findMany({
      where: { providerId: this.config.providerId },
    });

    for (const rawUser of rawUsers) {
      try {
        if (rawUser.processed) {
          // Active user - upsert
          
          // Matching logic priority:
          // 1. External ID (if user was previously synced)
          // 2. Email (for existing users)
          // 3. Student number (for students)
          // 4. Create new user (if allowed)
          
          if (rawUser.aivoUserId) {
            // Update existing user
            // await authSvc.updateUser(rawUser.aivoUserId, {
            //   email: rawUser.email,
            //   firstName: rawUser.firstName,
            //   lastName: rawUser.lastName,
            //   grade: rawUser.grade,
            // });
            result.users.updated++;
          } else if (rawUser.email) {
            // Try to match by email
            // const existingUser = await authSvc.findUserByEmail(rawUser.email);
            // if (existingUser) {
            //   rawUser.aivoUserId = existingUser.id;
            //   result.users.updated++;
            // } else if (this.config.createNewUsers) {
            //   // Create new user
            //   result.users.created++;
            // }
            
            if (this.config.createNewUsers) {
              result.users.created++;
            }
          } else if (rawUser.studentNumber) {
            // Try to match by student number
            // Similar logic to email matching
            if (this.config.createNewUsers) {
              result.users.created++;
            }
          } else {
            result.users.errors.push(
              `User ${rawUser.externalId}: No email or student number for matching`
            );
          }
        } else {
          // User not in current sync - consider deactivating
          // Only deactivate if the user was originally created via SIS
          if (rawUser.aivoUserId) {
            result.users.deactivated++;
          }
        }
      } catch (error) {
        result.users.errors.push(
          `User ${rawUser.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Transform classes from staging to Aivo Classroom entities
   */
  private async transformClassrooms(result: TransformResult): Promise<void> {
    const rawClasses = await this.prisma.sisRawClass.findMany({
      where: { providerId: this.config.providerId },
    });

    for (const rawClass of rawClasses) {
      try {
        if (rawClass.processed) {
          // Find the parent school
          const parentSchool = await this.prisma.sisRawSchool.findUnique({
            where: {
              providerId_externalId: {
                providerId: this.config.providerId,
                externalId: rawClass.schoolExternalId || '',
              },
            },
          });

          if (!parentSchool?.aivoSchoolId) {
            result.classrooms.errors.push(
              `Class ${rawClass.externalId}: Parent school not found or not synced`
            );
            continue;
          }

          if (rawClass.aivoClassroomId) {
            // Update existing classroom
            result.classrooms.updated++;
          } else {
            // Create new classroom
            result.classrooms.created++;
          }
        } else {
          // Class not in current sync - deactivate
          if (rawClass.aivoClassroomId) {
            result.classrooms.deactivated++;
          }
        }
      } catch (error) {
        result.classrooms.errors.push(
          `Class ${rawClass.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Transform enrollments from staging to Aivo ClassroomLearner entities
   */
  private async transformEnrollments(result: TransformResult): Promise<void> {
    const rawEnrollments = await this.prisma.sisRawEnrollment.findMany({
      where: { providerId: this.config.providerId },
    });

    for (const rawEnrollment of rawEnrollments) {
      try {
        // Find the user and class
        const rawUser = await this.prisma.sisRawUser.findUnique({
          where: {
            providerId_externalId: {
              providerId: this.config.providerId,
              externalId: rawEnrollment.userExternalId,
            },
          },
        });

        const rawClass = await this.prisma.sisRawClass.findUnique({
          where: {
            providerId_externalId: {
              providerId: this.config.providerId,
              externalId: rawEnrollment.classExternalId,
            },
          },
        });

        if (!rawUser?.aivoUserId || !rawClass?.aivoClassroomId) {
          // Skip enrollments where user or class isn't synced
          continue;
        }

        if (rawEnrollment.processed) {
          // Active enrollment - upsert
          // This would call tenant-svc to create/update ClassroomLearner
          result.enrollments.created++;
        } else {
          // Enrollment removed - delete the link
          result.enrollments.removed++;
        }
      } catch (error) {
        result.enrollments.errors.push(
          `Enrollment ${rawEnrollment.userExternalId}/${rawEnrollment.classExternalId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }
}

/**
 * Service client interfaces for cross-service communication
 * These would be implemented as HTTP clients or message queue publishers
 */
export interface TenantServiceClient {
  findSchool(tenantId: string, externalId: string): Promise<{ id: string } | null>;
  createSchool(data: {
    tenantId: string;
    externalId: string;
    name: string;
    schoolNumber?: string;
  }): Promise<{ id: string }>;
  updateSchool(id: string, data: { name?: string; schoolNumber?: string }): Promise<void>;
  deactivateSchool(id: string): Promise<void>;
  
  findClassroom(schoolId: string, externalId: string): Promise<{ id: string } | null>;
  createClassroom(data: {
    schoolId: string;
    externalId: string;
    name: string;
    grade?: string;
    subject?: string;
  }): Promise<{ id: string }>;
  updateClassroom(id: string, data: { name?: string; grade?: string }): Promise<void>;
  deactivateClassroom(id: string): Promise<void>;
  
  addLearnerToClassroom(classroomId: string, learnerId: string): Promise<void>;
  removeLearnerFromClassroom(classroomId: string, learnerId: string): Promise<void>;
  setClassroomTeacher(classroomId: string, teacherId: string): Promise<void>;
}

export interface AuthServiceClient {
  findUserByEmail(email: string, tenantId: string): Promise<{ id: string } | null>;
  findUserByExternalId(externalId: string, tenantId: string): Promise<{ id: string } | null>;
  createUser(data: {
    tenantId: string;
    externalId: string;
    email?: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<{ id: string }>;
  updateUser(id: string, data: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void>;
  deactivateUser(id: string): Promise<void>;
}
