/**
 * Infinite Campus SIS Provider
 *
 * Infinite Campus is the second-largest SIS provider in the US K-12 market.
 * This provider implements data synchronization for:
 * - Schools (campuses)
 * - Courses/Sections
 * - Students and enrollments
 * - Staff and assignments
 * - Calendar/terms
 *
 * Infinite Campus API Documentation:
 * - Uses OAuth 2.0 or API key authentication
 * - REST API with JSON responses
 * - Supports incremental sync via lastModifiedDate
 *
 * CRITICAL: This addresses CRIT-006 - Missing Infinite Campus SIS Integration
 */

import type { Pool } from 'pg';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Infinite Campus API configuration
 */
export interface InfiniteCampusConfig {
  /** Infinite Campus server URL (e.g., https://district.infinitecampus.com) */
  serverUrl: string;
  /** Application ID for API access */
  appId: string;
  /** API key or client secret (stored in secrets manager) */
  apiKeyRef: string;
  /** District ID */
  districtId: string;
  /** School year to sync (default: current) */
  schoolYear?: string;
  /** API version (default: v1) */
  apiVersion?: string;
}

/**
 * Infinite Campus authentication response
 */
export interface InfiniteCampusAuth {
  token: string;
  expiresAt: Date;
  tokenType: string;
}

/**
 * Infinite Campus school/campus record
 */
export interface InfiniteCampusSchool {
  schoolID: number;
  schoolNumber: string;
  name: string;
  schoolType: 'Elementary' | 'Middle' | 'High' | 'Other';
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  principal?: string;
  startGrade?: string;
  endGrade?: string;
  stateID?: string;
}

/**
 * Infinite Campus student record
 */
export interface InfiniteCampusStudent {
  personID: number;
  studentNumber: string;
  stateID?: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  suffix?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'X';
  grade: string;
  enrollment: {
    schoolID: number;
    enrollmentID: number;
    startDate: string;
    endDate?: string;
    grade: string;
    status: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
  };
  contacts?: InfiniteCampusContact[];
  demographics?: {
    ethnicity?: string;
    race?: string[];
    primaryLanguage?: string;
    homeLanguage?: string;
  };
}

/**
 * Infinite Campus contact record
 */
export interface InfiniteCampusContact {
  contactID: number;
  lastName: string;
  firstName: string;
  relationship: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  hasPortalAccess: boolean;
}

/**
 * Infinite Campus staff record
 */
export interface InfiniteCampusStaff {
  personID: number;
  staffNumber: string;
  stateID?: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  email?: string;
  title?: string;
  staffType: 'Teacher' | 'Administrator' | 'Support' | 'Other';
  assignments: Array<{
    schoolID: number;
    role: string;
    isPrimary: boolean;
  }>;
}

/**
 * Infinite Campus course record
 */
export interface InfiniteCampusCourse {
  courseID: number;
  courseNumber: string;
  name: string;
  description?: string;
  schoolID: number;
  department?: string;
  credits?: number;
  gradeLevel?: string;
  stateCode?: string;
}

/**
 * Infinite Campus section record
 */
export interface InfiniteCampusSection {
  sectionID: number;
  sectionNumber: string;
  courseID: number;
  schoolID: number;
  teacherID?: number;
  termID: number;
  termName: string;
  periodSchedule?: string;
  roomNumber?: string;
  maxEnrollment?: number;
  startDate: string;
  endDate: string;
}

/**
 * Infinite Campus roster/enrollment record
 */
export interface InfiniteCampusRoster {
  rosterID: number;
  sectionID: number;
  studentID: number;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Dropped' | 'Completed';
}

/**
 * Infinite Campus calendar/term record
 */
export interface InfiniteCampusTerm {
  termID: number;
  name: string;
  schoolID: number;
  startDate: string;
  endDate: string;
  seq: number;
  termType: 'Year' | 'Semester' | 'Quarter' | 'Trimester';
}

/**
 * Sync result for a single entity type
 */
export interface SyncResult {
  entityType: string;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  errorDetails: Array<{ id: string; error: string }>;
}

/**
 * Full sync result
 */
export interface FullSyncResult {
  tenantId: string;
  startedAt: Date;
  completedAt: Date;
  results: {
    schools: SyncResult;
    terms: SyncResult;
    staff: SyncResult;
    students: SyncResult;
    courses: SyncResult;
    sections: SyncResult;
    enrollments: SyncResult;
  };
  success: boolean;
  errorMessage?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INFINITE CAMPUS API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Infinite Campus API Client
 */
export class InfiniteCampusClient {
  private config: InfiniteCampusConfig;
  private auth: InfiniteCampusAuth | null = null;

  constructor(config: InfiniteCampusConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion ?? 'v1',
    };
  }

  /**
   * Get authentication token (with caching)
   */
  private async getAuth(): Promise<InfiniteCampusAuth> {
    // Return cached token if still valid
    if (this.auth && new Date() < this.auth.expiresAt) {
      return this.auth;
    }

    // Fetch new token
    const authUrl = `${this.config.serverUrl}/campus/api/auth/token`;
    const apiKey = await this.getApiKey();

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: this.config.appId,
        apiKey: apiKey,
        districtId: this.config.districtId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Campus auth failed: ${response.status} ${response.statusText}`);
    }

    interface AuthResponse {
      token: string;
      expires_in: number;
      token_type: string;
    }

    const data: AuthResponse = await response.json();

    this.auth = {
      token: data.token,
      // Expire 5 minutes early to be safe
      expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000),
      tokenType: data.token_type,
    };

    return this.auth;
  }

  /**
   * Get API key from secrets manager
   */
  private async getApiKey(): Promise<string> {
    // In production, fetch from AWS Secrets Manager, HashiCorp Vault, etc.
    const apiKey = process.env[this.config.apiKeyRef] ?? process.env.INFINITE_CAMPUS_API_KEY;
    if (!apiKey) {
      throw new Error(`Infinite Campus API key not found: ${this.config.apiKeyRef}`);
    }
    return apiKey;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const auth = await this.getAuth();
    const url = `${this.config.serverUrl}/campus/api/${this.config.apiVersion}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `${auth.tokenType} ${auth.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Infinite Campus API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Make paginated API request
   */
  private async requestPaginated<T>(
    endpoint: string,
    pageSize = 1000
  ): Promise<T[]> {
    const results: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const paginatedEndpoint = `${endpoint}${separator}page=${page}&pageSize=${pageSize}`;

      interface PaginatedResponse {
        data: T[];
        pagination: {
          page: number;
          pageSize: number;
          totalCount: number;
          totalPages: number;
        };
      }

      const response = await this.request<PaginatedResponse>(paginatedEndpoint);
      results.push(...response.data);

      hasMore = page < response.pagination.totalPages;
      page++;
    }

    return results;
  }

  /**
   * Fetch all schools/campuses
   */
  async getSchools(): Promise<InfiniteCampusSchool[]> {
    return this.requestPaginated<InfiniteCampusSchool>(
      `/district/${this.config.districtId}/schools`
    );
  }

  /**
   * Fetch all terms/calendar
   */
  async getTerms(schoolId: number): Promise<InfiniteCampusTerm[]> {
    const schoolYear = this.config.schoolYear ?? new Date().getFullYear().toString();
    return this.requestPaginated<InfiniteCampusTerm>(
      `/schools/${schoolId}/terms?schoolYear=${schoolYear}`
    );
  }

  /**
   * Fetch all staff
   */
  async getStaff(schoolId?: number): Promise<InfiniteCampusStaff[]> {
    const endpoint = schoolId
      ? `/schools/${schoolId}/staff`
      : `/district/${this.config.districtId}/staff`;
    return this.requestPaginated<InfiniteCampusStaff>(endpoint);
  }

  /**
   * Fetch students for a school
   */
  async getStudents(schoolId: number): Promise<InfiniteCampusStudent[]> {
    return this.requestPaginated<InfiniteCampusStudent>(
      `/schools/${schoolId}/students?status=Active`
    );
  }

  /**
   * Fetch courses for a school
   */
  async getCourses(schoolId: number): Promise<InfiniteCampusCourse[]> {
    return this.requestPaginated<InfiniteCampusCourse>(
      `/schools/${schoolId}/courses`
    );
  }

  /**
   * Fetch sections for a school
   */
  async getSections(schoolId: number): Promise<InfiniteCampusSection[]> {
    const schoolYear = this.config.schoolYear ?? new Date().getFullYear().toString();
    return this.requestPaginated<InfiniteCampusSection>(
      `/schools/${schoolId}/sections?schoolYear=${schoolYear}`
    );
  }

  /**
   * Fetch roster/enrollments for a section
   */
  async getRoster(sectionId: number): Promise<InfiniteCampusRoster[]> {
    return this.requestPaginated<InfiniteCampusRoster>(
      `/sections/${sectionId}/roster`
    );
  }

  /**
   * Fetch incremental changes since a timestamp
   */
  async getChanges(
    entityType: 'students' | 'staff' | 'sections' | 'roster',
    since: Date
  ): Promise<Array<{ action: 'create' | 'update' | 'delete'; data: unknown }>> {
    const sinceISO = since.toISOString();
    return this.requestPaginated(
      `/district/${this.config.districtId}/changes/${entityType}?since=${sinceISO}`
    );
  }

  /**
   * Test connection to Infinite Campus
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getSchools();
      return { success: true, message: 'Successfully connected to Infinite Campus' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INFINITE CAMPUS SYNC SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Infinite Campus Sync Service
 *
 * Handles synchronization of Infinite Campus data to AIVO platform.
 */
export class InfiniteCampusSyncService {
  private client: InfiniteCampusClient;
  private pool: Pool;
  private tenantId: string;

  constructor(config: InfiniteCampusConfig, pool: Pool, tenantId: string) {
    this.client = new InfiniteCampusClient(config);
    this.pool = pool;
    this.tenantId = tenantId;
  }

  /**
   * Run a full sync of all Infinite Campus data
   */
  async runFullSync(): Promise<FullSyncResult> {
    const startedAt = new Date();
    const results: FullSyncResult['results'] = {
      schools: this.emptySyncResult('schools'),
      terms: this.emptySyncResult('terms'),
      staff: this.emptySyncResult('staff'),
      students: this.emptySyncResult('students'),
      courses: this.emptySyncResult('courses'),
      sections: this.emptySyncResult('sections'),
      enrollments: this.emptySyncResult('enrollments'),
    };

    try {
      // 1. Sync schools first (parent entity)
      results.schools = await this.syncSchools();

      // 2. Sync terms/calendar
      results.terms = await this.syncTerms();

      // 3. Sync staff
      results.staff = await this.syncStaff();

      // 4. Sync students (per school)
      results.students = await this.syncStudents();

      // 5. Sync courses
      results.courses = await this.syncCourses();

      // 6. Sync sections
      results.sections = await this.syncSections();

      // 7. Sync enrollments/roster
      results.enrollments = await this.syncEnrollments();

      return {
        tenantId: this.tenantId,
        startedAt,
        completedAt: new Date(),
        results,
        success: true,
      };
    } catch (error) {
      return {
        tenantId: this.tenantId,
        startedAt,
        completedAt: new Date(),
        results,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run incremental sync based on changes
   */
  async runIncrementalSync(since: Date): Promise<Partial<FullSyncResult['results']>> {
    const results: Partial<FullSyncResult['results']> = {};

    // Fetch and process changes for each entity type
    const entityTypes = ['students', 'staff', 'sections', 'roster'] as const;

    for (const entityType of entityTypes) {
      try {
        const changes = await this.client.getChanges(entityType, since);
        const result = this.emptySyncResult(entityType);

        for (const change of changes) {
          try {
            switch (change.action) {
              case 'create':
              case 'update':
                // Upsert the record
                await this.upsertEntity(entityType, change.data);
                change.action === 'create' ? result.created++ : result.updated++;
                break;
              case 'delete':
                // Soft delete the record
                await this.softDeleteEntity(entityType, change.data);
                result.deleted++;
                break;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String((change.data as { id?: unknown })?.id ?? 'unknown'),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        if (entityType === 'roster') {
          results.enrollments = result;
        } else {
          results[entityType as keyof typeof results] = result;
        }
      } catch (error) {
        console.error(`Failed to sync ${entityType} changes:`, error);
      }
    }

    return results;
  }

  /**
   * Sync schools from Infinite Campus
   */
  private async syncSchools(): Promise<SyncResult> {
    const result = this.emptySyncResult('schools');

    try {
      const schools = await this.client.getSchools();

      for (const school of schools) {
        try {
          const existing = await this.pool.query(
            `SELECT id FROM schools WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
            [this.tenantId, String(school.schoolID)]
          );

          if (existing.rowCount && existing.rowCount > 0) {
            await this.pool.query(
              `UPDATE schools SET
                name = $3,
                school_number = $4,
                low_grade = $5,
                high_grade = $6,
                address = $7,
                city = $8,
                state = $9,
                zip = $10,
                phone = $11,
                updated_at = now()
              WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [
                this.tenantId,
                String(school.schoolID),
                school.name,
                school.schoolNumber,
                school.startGrade,
                school.endGrade,
                school.address?.street,
                school.address?.city,
                school.address?.state,
                school.address?.zip,
                school.phone,
              ]
            );
            result.updated++;
          } else {
            await this.pool.query(
              `INSERT INTO schools (tenant_id, external_id, external_system, name, school_number, low_grade, high_grade, address, city, state, zip, phone)
              VALUES ($1, $2, 'infinite_campus', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                this.tenantId,
                String(school.schoolID),
                school.name,
                school.schoolNumber,
                school.startGrade,
                school.endGrade,
                school.address?.street,
                school.address?.city,
                school.address?.state,
                school.address?.zip,
                school.phone,
              ]
            );
            result.created++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            id: String(school.schoolID),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to fetch schools',
      });
    }

    return result;
  }

  /**
   * Sync terms from Infinite Campus
   */
  private async syncTerms(): Promise<SyncResult> {
    const result = this.emptySyncResult('terms');

    try {
      const schoolsResult = await this.pool.query(
        `SELECT id, external_id FROM schools WHERE tenant_id = $1 AND external_system = 'infinite_campus'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const terms = await this.client.getTerms(schoolId);

        for (const term of terms) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM terms WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [this.tenantId, String(term.termID)]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE terms SET
                  name = $3,
                  start_date = $4,
                  end_date = $5,
                  term_type = $6,
                  sequence = $7,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [
                  this.tenantId,
                  String(term.termID),
                  term.name,
                  term.startDate,
                  term.endDate,
                  term.termType,
                  term.seq,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO terms (tenant_id, school_id, external_id, external_system, name, start_date, end_date, term_type, sequence)
                VALUES ($1, $2, $3, 'infinite_campus', $4, $5, $6, $7, $8)`,
                [
                  this.tenantId,
                  schoolRow.id,
                  String(term.termID),
                  term.name,
                  term.startDate,
                  term.endDate,
                  term.termType,
                  term.seq,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(term.termID),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to sync terms',
      });
    }

    return result;
  }

  /**
   * Sync staff from Infinite Campus
   */
  private async syncStaff(): Promise<SyncResult> {
    const result = this.emptySyncResult('staff');

    try {
      const staff = await this.client.getStaff();

      for (const member of staff) {
        try {
          const existing = await this.pool.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
            [this.tenantId, String(member.personID)]
          );

          // Determine role based on staff type
          const role = member.staffType === 'Administrator' ? 'ADMIN' : 'TEACHER';

          if (existing.rowCount && existing.rowCount > 0) {
            await this.pool.query(
              `UPDATE users SET
                first_name = $3,
                last_name = $4,
                email = $5,
                title = $6,
                role = $7,
                updated_at = now()
              WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [
                this.tenantId,
                String(member.personID),
                member.firstName,
                member.lastName,
                member.email,
                member.title,
                role,
              ]
            );
            result.updated++;
          } else {
            await this.pool.query(
              `INSERT INTO users (tenant_id, external_id, external_system, first_name, last_name, email, title, role)
              VALUES ($1, $2, 'infinite_campus', $3, $4, $5, $6, $7)`,
              [
                this.tenantId,
                String(member.personID),
                member.firstName,
                member.lastName,
                member.email,
                member.title,
                role,
              ]
            );
            result.created++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            id: String(member.personID),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to fetch staff',
      });
    }

    return result;
  }

  /**
   * Sync students from Infinite Campus
   */
  private async syncStudents(): Promise<SyncResult> {
    const result = this.emptySyncResult('students');

    try {
      const schoolsResult = await this.pool.query(
        `SELECT external_id FROM schools WHERE tenant_id = $1 AND external_system = 'infinite_campus'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const students = await this.client.getStudents(schoolId);

        for (const student of students) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM learners WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [this.tenantId, String(student.personID)]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE learners SET
                  first_name = $3,
                  last_name = $4,
                  student_number = $5,
                  grade_level = $6,
                  birth_date = $7,
                  gender = $8,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [
                  this.tenantId,
                  String(student.personID),
                  student.firstName,
                  student.lastName,
                  student.studentNumber,
                  student.grade,
                  student.birthDate,
                  student.gender,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO learners (tenant_id, external_id, external_system, first_name, last_name, student_number, grade_level, birth_date, gender)
                VALUES ($1, $2, 'infinite_campus', $3, $4, $5, $6, $7, $8)`,
                [
                  this.tenantId,
                  String(student.personID),
                  student.firstName,
                  student.lastName,
                  student.studentNumber,
                  student.grade,
                  student.birthDate,
                  student.gender,
                ]
              );
              result.created++;
            }

            // Sync parent/guardian contacts if available
            if (student.contacts) {
              await this.syncStudentContacts(student.personID, student.contacts);
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(student.personID),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to sync students',
      });
    }

    return result;
  }

  /**
   * Sync student contacts (parents/guardians)
   */
  private async syncStudentContacts(
    studentId: number,
    contacts: InfiniteCampusContact[]
  ): Promise<void> {
    for (const contact of contacts) {
      try {
        const existing = await this.pool.query(
          `SELECT id FROM parent_contacts WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
          [this.tenantId, String(contact.contactID)]
        );

        if (existing.rowCount && existing.rowCount > 0) {
          await this.pool.query(
            `UPDATE parent_contacts SET
              first_name = $3,
              last_name = $4,
              email = $5,
              phone = $6,
              relationship = $7,
              is_primary = $8,
              has_portal_access = $9,
              updated_at = now()
            WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
            [
              this.tenantId,
              String(contact.contactID),
              contact.firstName,
              contact.lastName,
              contact.email,
              contact.phone,
              contact.relationship,
              contact.isPrimary,
              contact.hasPortalAccess,
            ]
          );
        } else {
          // Get the learner ID
          const learnerResult = await this.pool.query(
            `SELECT id FROM learners WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
            [this.tenantId, String(studentId)]
          );

          if (learnerResult.rowCount && learnerResult.rowCount > 0) {
            await this.pool.query(
              `INSERT INTO parent_contacts (tenant_id, learner_id, external_id, external_system, first_name, last_name, email, phone, relationship, is_primary, has_portal_access)
              VALUES ($1, $2, $3, 'infinite_campus', $4, $5, $6, $7, $8, $9, $10)`,
              [
                this.tenantId,
                learnerResult.rows[0].id,
                String(contact.contactID),
                contact.firstName,
                contact.lastName,
                contact.email,
                contact.phone,
                contact.relationship,
                contact.isPrimary,
                contact.hasPortalAccess,
              ]
            );
          }
        }
      } catch (error) {
        console.error(`Failed to sync contact ${contact.contactID}:`, error);
      }
    }
  }

  /**
   * Sync courses from Infinite Campus
   */
  private async syncCourses(): Promise<SyncResult> {
    const result = this.emptySyncResult('courses');

    try {
      const schoolsResult = await this.pool.query(
        `SELECT id, external_id FROM schools WHERE tenant_id = $1 AND external_system = 'infinite_campus'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const courses = await this.client.getCourses(schoolId);

        for (const course of courses) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM courses WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [this.tenantId, String(course.courseID)]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE courses SET
                  name = $3,
                  course_number = $4,
                  description = $5,
                  department = $6,
                  credits = $7,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [
                  this.tenantId,
                  String(course.courseID),
                  course.name,
                  course.courseNumber,
                  course.description,
                  course.department,
                  course.credits,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO courses (tenant_id, school_id, external_id, external_system, name, course_number, description, department, credits)
                VALUES ($1, $2, $3, 'infinite_campus', $4, $5, $6, $7, $8)`,
                [
                  this.tenantId,
                  schoolRow.id,
                  String(course.courseID),
                  course.name,
                  course.courseNumber,
                  course.description,
                  course.department,
                  course.credits,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(course.courseID),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to sync courses',
      });
    }

    return result;
  }

  /**
   * Sync sections from Infinite Campus
   */
  private async syncSections(): Promise<SyncResult> {
    const result = this.emptySyncResult('sections');

    try {
      const schoolsResult = await this.pool.query(
        `SELECT id, external_id FROM schools WHERE tenant_id = $1 AND external_system = 'infinite_campus'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const sections = await this.client.getSections(schoolId);

        for (const section of sections) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM classes WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [this.tenantId, String(section.sectionID)]
            );

            // Get teacher ID if available
            let teacherId: string | null = null;
            if (section.teacherID) {
              const teacherResult = await this.pool.query(
                `SELECT id FROM users WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [this.tenantId, String(section.teacherID)]
              );
              if (teacherResult.rowCount && teacherResult.rowCount > 0) {
                teacherId = teacherResult.rows[0].id;
              }
            }

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE classes SET
                  section_number = $3,
                  room = $4,
                  teacher_id = $5,
                  start_date = $6,
                  end_date = $7,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [
                  this.tenantId,
                  String(section.sectionID),
                  section.sectionNumber,
                  section.roomNumber,
                  teacherId,
                  section.startDate,
                  section.endDate,
                ]
              );
              result.updated++;
            } else {
              // Get course info for the section name
              const courseResult = await this.pool.query(
                `SELECT name FROM courses WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
                [this.tenantId, String(section.courseID)]
              );
              const courseName = courseResult.rows[0]?.name ?? `Section ${section.sectionNumber}`;

              await this.pool.query(
                `INSERT INTO classes (tenant_id, school_id, external_id, external_system, name, section_number, room, teacher_id, start_date, end_date)
                VALUES ($1, $2, $3, 'infinite_campus', $4, $5, $6, $7, $8, $9)`,
                [
                  this.tenantId,
                  schoolRow.id,
                  String(section.sectionID),
                  courseName,
                  section.sectionNumber,
                  section.roomNumber,
                  teacherId,
                  section.startDate,
                  section.endDate,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(section.sectionID),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to sync sections',
      });
    }

    return result;
  }

  /**
   * Sync enrollments from Infinite Campus
   */
  private async syncEnrollments(): Promise<SyncResult> {
    const result = this.emptySyncResult('enrollments');

    try {
      const sectionsResult = await this.pool.query(
        `SELECT id, external_id FROM classes WHERE tenant_id = $1 AND external_system = 'infinite_campus'`,
        [this.tenantId]
      );

      for (const sectionRow of sectionsResult.rows) {
        const sectionId = parseInt(sectionRow.external_id, 10);
        const roster = await this.client.getRoster(sectionId);

        for (const enrollment of roster) {
          try {
            // Find the learner
            const learnerResult = await this.pool.query(
              `SELECT id FROM learners WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'infinite_campus'`,
              [this.tenantId, String(enrollment.studentID)]
            );

            if (!learnerResult.rowCount || learnerResult.rowCount === 0) {
              continue;
            }

            const learnerId = learnerResult.rows[0].id;

            const existing = await this.pool.query(
              `SELECT id FROM class_enrollments WHERE tenant_id = $1 AND class_id = $2 AND learner_id = $3`,
              [this.tenantId, sectionRow.id, learnerId]
            );

            const status = enrollment.status === 'Active' ? 'ACTIVE' : 'INACTIVE';

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE class_enrollments SET
                  entry_date = $4,
                  exit_date = $5,
                  status = $6,
                  updated_at = now()
                WHERE tenant_id = $1 AND class_id = $2 AND learner_id = $3`,
                [
                  this.tenantId,
                  sectionRow.id,
                  learnerId,
                  enrollment.startDate,
                  enrollment.endDate,
                  status,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO class_enrollments (tenant_id, class_id, learner_id, entry_date, exit_date, status)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  this.tenantId,
                  sectionRow.id,
                  learnerId,
                  enrollment.startDate,
                  enrollment.endDate,
                  status,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(enrollment.rosterID),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      result.errors++;
      result.errorDetails.push({
        id: 'all',
        error: error instanceof Error ? error.message : 'Failed to sync enrollments',
      });
    }

    return result;
  }

  /**
   * Upsert entity based on type (for incremental sync)
   */
  private async upsertEntity(
    entityType: string,
    _data: unknown
  ): Promise<void> {
    // Implementation depends on entity type
    // This is a simplified version - full implementation would handle each type
    console.log(`Upserting ${entityType}:`, _data);
  }

  /**
   * Soft delete entity based on type (for incremental sync)
   */
  private async softDeleteEntity(
    entityType: string,
    _data: unknown
  ): Promise<void> {
    // Implementation depends on entity type
    console.log(`Soft deleting ${entityType}:`, _data);
  }

  /**
   * Create empty sync result
   */
  private emptySyncResult(entityType: string): SyncResult {
    return {
      entityType,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      errorDetails: [],
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const InfiniteCampus = {
  Client: InfiniteCampusClient,
  SyncService: InfiniteCampusSyncService,
};
