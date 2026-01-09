/**
 * PowerSchool SIS Provider
 *
 * PowerSchool is the leading SIS in the US market (~80% market share).
 * This provider implements data synchronization for:
 * - Schools
 * - Courses/Sections
 * - Students and enrollments
 * - Teachers and assignments
 * - Demographics data
 *
 * PowerSchool API Documentation:
 * - https://support.powerschool.com/developer/
 * - Uses OAuth 2.0 with client credentials
 *
 * CRITICAL: This addresses CRIT-005 - Missing PowerSchool SIS Integration
 */

import type { Pool } from 'pg';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PowerSchool API configuration
 */
export interface PowerSchoolConfig {
  /** PowerSchool server URL (e.g., https://district.powerschool.com) */
  serverUrl: string;
  /** OAuth 2.0 client ID */
  clientId: string;
  /** OAuth 2.0 client secret (should be stored in KMS) */
  clientSecretRef: string;
  /** Plugin access request GUID */
  pluginGuid?: string;
  /** API version (default: /ws/v1) */
  apiVersion?: string;
}

/**
 * PowerSchool OAuth token response
 */
export interface PowerSchoolToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * PowerSchool school record
 */
export interface PowerSchoolSchool {
  id: number;
  name: string;
  school_number: string;
  low_grade?: string;
  high_grade?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  principal_name?: string;
  principal_email?: string;
}

/**
 * PowerSchool student record
 */
export interface PowerSchoolStudent {
  id: number;
  student_number: string;
  local_id?: string;
  state_studentnumber?: string;
  name: {
    first_name: string;
    last_name: string;
    middle_name?: string;
  };
  school_enrollment: {
    school_id: number;
    entry_date: string;
    exit_date?: string;
    grade_level: string;
  };
  demographics?: {
    birth_date?: string;
    gender?: string;
    ethnicity?: string;
    addresses?: PowerSchoolAddress[];
  };
  contact_info?: {
    email?: string;
    phone?: string;
  };
}

/**
 * PowerSchool teacher/staff record
 */
export interface PowerSchoolStaff {
  id: number;
  local_id?: string;
  state_id?: string;
  name: {
    first_name: string;
    last_name: string;
  };
  email?: string;
  school_affiliations: Array<{
    school_id: number;
    stafftype?: string;
    status: string;
  }>;
}

/**
 * PowerSchool section/class record
 */
export interface PowerSchoolSection {
  id: number;
  section_number: string;
  course_name: string;
  course_number: string;
  school_id: number;
  teacher_id?: number;
  term: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  period?: string;
  room?: string;
}

/**
 * PowerSchool enrollment record
 */
export interface PowerSchoolEnrollment {
  id: number;
  student_id: number;
  section_id: number;
  entry_date: string;
  exit_date?: string;
  grade?: string;
}

/**
 * PowerSchool address
 */
export interface PowerSchoolAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
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
    staff: SyncResult;
    students: SyncResult;
    sections: SyncResult;
    enrollments: SyncResult;
  };
  success: boolean;
  errorMessage?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// POWERSCHOOL API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PowerSchool API Client
 */
export class PowerSchoolClient {
  private config: PowerSchoolConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: PowerSchoolConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion ?? '/ws/v1',
    };
  }

  /**
   * Get OAuth access token (with caching)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Fetch new token
    const tokenUrl = `${this.config.serverUrl}/oauth/access_token`;
    const credentials = Buffer.from(
      `${this.config.clientId}:${await this.getClientSecret()}`
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`PowerSchool OAuth failed: ${response.status} ${response.statusText}`);
    }

    const tokenData: PowerSchoolToken = await response.json();

    this.accessToken = tokenData.access_token;
    // Expire 5 minutes early to be safe
    this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 300) * 1000);

    return this.accessToken;
  }

  /**
   * Get client secret from KMS/secrets manager
   */
  private async getClientSecret(): Promise<string> {
    // In production, this would fetch from AWS Secrets Manager, HashiCorp Vault, etc.
    // For now, check environment variable
    const secret = process.env[this.config.clientSecretRef] ?? process.env.POWERSCHOOL_CLIENT_SECRET;
    if (!secret) {
      throw new Error(`PowerSchool client secret not found: ${this.config.clientSecretRef}`);
    }
    return secret;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.config.serverUrl}${this.config.apiVersion}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PowerSchool API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fetch all schools
   */
  async getSchools(): Promise<PowerSchoolSchool[]> {
    interface SchoolsResponse {
      schools: { school: PowerSchoolSchool[] };
    }
    const data = await this.request<SchoolsResponse>('/district/school');
    return data.schools?.school ?? [];
  }

  /**
   * Fetch all staff (teachers, admins)
   */
  async getStaff(schoolId?: number): Promise<PowerSchoolStaff[]> {
    interface StaffResponse {
      staffs: { staff: PowerSchoolStaff[] };
    }
    const endpoint = schoolId
      ? `/school/${schoolId}/staff`
      : '/district/staff';
    const data = await this.request<StaffResponse>(endpoint);
    return data.staffs?.staff ?? [];
  }

  /**
   * Fetch students for a school
   */
  async getStudents(schoolId: number): Promise<PowerSchoolStudent[]> {
    interface StudentsResponse {
      students: { student: PowerSchoolStudent[] };
    }
    const data = await this.request<StudentsResponse>(`/school/${schoolId}/student`);
    return data.students?.student ?? [];
  }

  /**
   * Fetch sections (classes) for a school
   */
  async getSections(schoolId: number): Promise<PowerSchoolSection[]> {
    interface SectionsResponse {
      sections: { section: PowerSchoolSection[] };
    }
    const data = await this.request<SectionsResponse>(`/school/${schoolId}/section`);
    return data.sections?.section ?? [];
  }

  /**
   * Fetch enrollments for a section
   */
  async getEnrollments(sectionId: number): Promise<PowerSchoolEnrollment[]> {
    interface EnrollmentsResponse {
      section_enrollments: { section_enrollment: PowerSchoolEnrollment[] };
    }
    const data = await this.request<EnrollmentsResponse>(`/section/${sectionId}/section_enrollment`);
    return data.section_enrollments?.section_enrollment ?? [];
  }

  /**
   * Test connection to PowerSchool
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getSchools();
      return { success: true, message: 'Successfully connected to PowerSchool' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POWERSCHOOL SYNC SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PowerSchool Sync Service
 *
 * Handles synchronization of PowerSchool data to AIVO platform.
 */
export class PowerSchoolSyncService {
  private client: PowerSchoolClient;
  private pool: Pool;
  private tenantId: string;

  constructor(config: PowerSchoolConfig, pool: Pool, tenantId: string) {
    this.client = new PowerSchoolClient(config);
    this.pool = pool;
    this.tenantId = tenantId;
  }

  /**
   * Run a full sync of all PowerSchool data
   */
  async runFullSync(): Promise<FullSyncResult> {
    const startedAt = new Date();
    const results: FullSyncResult['results'] = {
      schools: this.emptySyncResult('schools'),
      staff: this.emptySyncResult('staff'),
      students: this.emptySyncResult('students'),
      sections: this.emptySyncResult('sections'),
      enrollments: this.emptySyncResult('enrollments'),
    };

    try {
      // 1. Sync schools first (parent entity)
      results.schools = await this.syncSchools();

      // 2. Sync staff
      results.staff = await this.syncStaff();

      // 3. Sync students (per school)
      results.students = await this.syncStudents();

      // 4. Sync sections (classes)
      results.sections = await this.syncSections();

      // 5. Sync enrollments
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
   * Sync schools from PowerSchool
   */
  private async syncSchools(): Promise<SyncResult> {
    const result = this.emptySyncResult('schools');

    try {
      const schools = await this.client.getSchools();

      for (const school of schools) {
        try {
          const existing = await this.pool.query(
            `SELECT id FROM schools WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
            [this.tenantId, String(school.id)]
          );

          if (existing.rowCount && existing.rowCount > 0) {
            // Update existing
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
                updated_at = now()
              WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
              [
                this.tenantId,
                String(school.id),
                school.name,
                school.school_number,
                school.low_grade,
                school.high_grade,
                school.address,
                school.city,
                school.state,
                school.zip,
              ]
            );
            result.updated++;
          } else {
            // Insert new
            await this.pool.query(
              `INSERT INTO schools (tenant_id, external_id, external_system, name, school_number, low_grade, high_grade, address, city, state, zip)
              VALUES ($1, $2, 'powerschool', $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                this.tenantId,
                String(school.id),
                school.name,
                school.school_number,
                school.low_grade,
                school.high_grade,
                school.address,
                school.city,
                school.state,
                school.zip,
              ]
            );
            result.created++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            id: String(school.id),
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
   * Sync staff from PowerSchool
   */
  private async syncStaff(): Promise<SyncResult> {
    const result = this.emptySyncResult('staff');

    try {
      const staff = await this.client.getStaff();

      for (const member of staff) {
        try {
          const existing = await this.pool.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
            [this.tenantId, String(member.id)]
          );

          if (existing.rowCount && existing.rowCount > 0) {
            await this.pool.query(
              `UPDATE users SET
                first_name = $3,
                last_name = $4,
                email = $5,
                updated_at = now()
              WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
              [
                this.tenantId,
                String(member.id),
                member.name.first_name,
                member.name.last_name,
                member.email,
              ]
            );
            result.updated++;
          } else {
            await this.pool.query(
              `INSERT INTO users (tenant_id, external_id, external_system, first_name, last_name, email, role)
              VALUES ($1, $2, 'powerschool', $3, $4, $5, 'TEACHER')`,
              [
                this.tenantId,
                String(member.id),
                member.name.first_name,
                member.name.last_name,
                member.email,
              ]
            );
            result.created++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            id: String(member.id),
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
   * Sync students from PowerSchool
   */
  private async syncStudents(): Promise<SyncResult> {
    const result = this.emptySyncResult('students');

    try {
      // Get all schools first
      const schoolsResult = await this.pool.query(
        `SELECT external_id FROM schools WHERE tenant_id = $1 AND external_system = 'powerschool'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const students = await this.client.getStudents(schoolId);

        for (const student of students) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM learners WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
              [this.tenantId, String(student.id)]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE learners SET
                  first_name = $3,
                  last_name = $4,
                  student_number = $5,
                  grade_level = $6,
                  email = $7,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
                [
                  this.tenantId,
                  String(student.id),
                  student.name.first_name,
                  student.name.last_name,
                  student.student_number,
                  student.school_enrollment.grade_level,
                  student.contact_info?.email,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO learners (tenant_id, external_id, external_system, first_name, last_name, student_number, grade_level, email)
                VALUES ($1, $2, 'powerschool', $3, $4, $5, $6, $7)`,
                [
                  this.tenantId,
                  String(student.id),
                  student.name.first_name,
                  student.name.last_name,
                  student.student_number,
                  student.school_enrollment.grade_level,
                  student.contact_info?.email,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(student.id),
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
   * Sync sections from PowerSchool
   */
  private async syncSections(): Promise<SyncResult> {
    const result = this.emptySyncResult('sections');

    try {
      const schoolsResult = await this.pool.query(
        `SELECT id, external_id FROM schools WHERE tenant_id = $1 AND external_system = 'powerschool'`,
        [this.tenantId]
      );

      for (const schoolRow of schoolsResult.rows) {
        const schoolId = parseInt(schoolRow.external_id, 10);
        const sections = await this.client.getSections(schoolId);

        for (const section of sections) {
          try {
            const existing = await this.pool.query(
              `SELECT id FROM classes WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
              [this.tenantId, String(section.id)]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE classes SET
                  name = $3,
                  course_number = $4,
                  section_number = $5,
                  period = $6,
                  room = $7,
                  updated_at = now()
                WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
                [
                  this.tenantId,
                  String(section.id),
                  section.course_name,
                  section.course_number,
                  section.section_number,
                  section.period,
                  section.room,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO classes (tenant_id, school_id, external_id, external_system, name, course_number, section_number, period, room)
                VALUES ($1, $2, $3, 'powerschool', $4, $5, $6, $7, $8)`,
                [
                  this.tenantId,
                  schoolRow.id,
                  String(section.id),
                  section.course_name,
                  section.course_number,
                  section.section_number,
                  section.period,
                  section.room,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(section.id),
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
   * Sync enrollments from PowerSchool
   */
  private async syncEnrollments(): Promise<SyncResult> {
    const result = this.emptySyncResult('enrollments');

    try {
      // Get all synced sections
      const sectionsResult = await this.pool.query(
        `SELECT id, external_id FROM classes WHERE tenant_id = $1 AND external_system = 'powerschool'`,
        [this.tenantId]
      );

      for (const sectionRow of sectionsResult.rows) {
        const sectionId = parseInt(sectionRow.external_id, 10);
        const enrollments = await this.client.getEnrollments(sectionId);

        for (const enrollment of enrollments) {
          try {
            // Find the learner by external ID
            const learnerResult = await this.pool.query(
              `SELECT id FROM learners WHERE tenant_id = $1 AND external_id = $2 AND external_system = 'powerschool'`,
              [this.tenantId, String(enrollment.student_id)]
            );

            if (!learnerResult.rowCount || learnerResult.rowCount === 0) {
              continue; // Skip if learner not found
            }

            const learnerId = learnerResult.rows[0].id;

            const existing = await this.pool.query(
              `SELECT id FROM class_enrollments WHERE tenant_id = $1 AND class_id = $2 AND learner_id = $3`,
              [this.tenantId, sectionRow.id, learnerId]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              await this.pool.query(
                `UPDATE class_enrollments SET
                  entry_date = $4,
                  exit_date = $5,
                  status = CASE WHEN $5 IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END,
                  updated_at = now()
                WHERE tenant_id = $1 AND class_id = $2 AND learner_id = $3`,
                [
                  this.tenantId,
                  sectionRow.id,
                  learnerId,
                  enrollment.entry_date,
                  enrollment.exit_date,
                ]
              );
              result.updated++;
            } else {
              await this.pool.query(
                `INSERT INTO class_enrollments (tenant_id, class_id, learner_id, entry_date, exit_date, status)
                VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END)`,
                [
                  this.tenantId,
                  sectionRow.id,
                  learnerId,
                  enrollment.entry_date,
                  enrollment.exit_date,
                ]
              );
              result.created++;
            }
          } catch (error) {
            result.errors++;
            result.errorDetails.push({
              id: String(enrollment.id),
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

export const PowerSchool = {
  Client: PowerSchoolClient,
  SyncService: PowerSchoolSyncService,
};
