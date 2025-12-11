/**
 * Clever SIS Provider
 * 
 * Implements the ISisProvider interface for Clever (https://clever.com)
 * Uses Clever's Data API v3.0
 * 
 * @see https://dev.clever.com/reference/overview
 */

import {
  ISisProvider,
  CleverConfig,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
  SisUserRole,
  EnrollmentRole,
} from './types';

const CLEVER_API_BASE = 'https://api.clever.com/v3.0';
const PAGE_SIZE = 100;

interface CleverResponse<T> {
  data: T[];
  links?: Array<{ rel: string; uri: string }>;
}

interface CleverSchool {
  id: string;
  name: string;
  school_number?: string;
  state_id?: string;
  nces_id?: string;
  low_grade?: string;
  high_grade?: string;
  phone?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface CleverSection {
  id: string;
  name: string;
  school: string;
  course_name?: string;
  course_number?: string;
  subject?: string;
  grade?: string;
  section_number?: string;
  term?: {
    name?: string;
    start_date?: string;
    end_date?: string;
  };
}

interface CleverUser {
  id: string;
  email?: string;
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  roles: {
    student?: {
      school: string;
      grade?: string;
      student_number?: string;
    };
    teacher?: {
      school: string;
      teacher_number?: string;
    };
    district_admin?: Record<string, unknown>;
    school_admin?: {
      school: string;
    };
  };
}

interface CleverEnrollment {
  id: string;
  section: string;
  user: string;
  role: 'student' | 'teacher';
  primary?: boolean;
  start_date?: string;
  end_date?: string;
}

export class CleverProvider implements ISisProvider {
  readonly providerType = 'CLEVER' as const;
  private config: CleverConfig | null = null;
  private accessToken: string | null = null;

  async initialize(config: CleverConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken || null;

    // If no access token, we need to do OAuth
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    // Clever uses OAuth 2.0 with district tokens
    // In production, this would use the OAuth flow
    // For now, we expect the access token to be provided in config
    if (!this.config.accessToken) {
      throw new Error(
        'Clever access token not provided. Please complete OAuth authorization first.'
      );
    }
    this.accessToken = this.config.accessToken;
  }

  private async fetchFromClever<T>(endpoint: string): Promise<CleverResponse<T>> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Clever');
    }

    const response = await fetch(`${CLEVER_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.fetchFromClever(endpoint);
      }
      throw new Error(`Clever API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.fetchFromClever<CleverSchool>('/schools?limit=1');
      return { success: true, message: 'Successfully connected to Clever' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Clever: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async fetchSchools(cursor?: string): Promise<SyncEntityResult<SisSchool>> {
    const endpoint = cursor || `/schools?limit=${PAGE_SIZE}`;
    const response = await this.fetchFromClever<{ data: CleverSchool }>(endpoint);

    const schools: SisSchool[] = response.data.map((item) => {
      const school = item.data;
      return {
        externalId: school.id,
        name: school.name,
        schoolNumber: school.school_number || school.state_id,
        address: school.location
          ? {
              street: school.location.address,
              city: school.location.city,
              state: school.location.state,
              zip: school.location.zip,
            }
          : undefined,
        gradeLevels: this.parseGradeLevels(school.low_grade, school.high_grade),
        phone: school.phone,
        isActive: true,
        rawData: school as unknown as Record<string, unknown>,
      };
    });

    const nextLink = response.links?.find((l) => l.rel === 'next');

    return {
      entities: schools,
      count: schools.length,
      hasMore: !!nextLink,
      nextCursor: nextLink?.uri,
      warnings: [],
    };
  }

  async fetchClasses(cursor?: string): Promise<SyncEntityResult<SisClass>> {
    const endpoint = cursor || `/sections?limit=${PAGE_SIZE}`;
    const response = await this.fetchFromClever<{ data: CleverSection }>(endpoint);

    const classes: SisClass[] = response.data.map((item) => {
      const section = item.data;
      return {
        externalId: section.id,
        schoolExternalId: section.school,
        name: section.name || section.course_name || 'Unnamed Section',
        courseCode: section.course_number,
        subject: section.subject,
        grade: section.grade,
        sectionNumber: section.section_number,
        term: section.term
          ? {
              name: section.term.name,
              startDate: section.term.start_date ? new Date(section.term.start_date) : undefined,
              endDate: section.term.end_date ? new Date(section.term.end_date) : undefined,
            }
          : undefined,
        isActive: true,
        rawData: section as unknown as Record<string, unknown>,
      };
    });

    const nextLink = response.links?.find((l) => l.rel === 'next');

    return {
      entities: classes,
      count: classes.length,
      hasMore: !!nextLink,
      nextCursor: nextLink?.uri,
      warnings: [],
    };
  }

  async fetchUsers(cursor?: string): Promise<SyncEntityResult<SisUser>> {
    // Clever has separate endpoints for students and teachers
    // We'll fetch both and combine them
    const users: SisUser[] = [];
    const warnings: string[] = [];

    if (!cursor || cursor.includes('/students')) {
      const studentEndpoint = cursor || `/students?limit=${PAGE_SIZE}`;
      const studentResponse = await this.fetchFromClever<{ data: CleverUser }>(studentEndpoint);

      for (const item of studentResponse.data) {
        const user = item.data;
        const studentRole = user.roles.student;
        users.push({
          externalId: user.id,
          role: 'student',
          email: user.email,
          firstName: user.name.first,
          lastName: user.name.last,
          middleName: user.name.middle,
          studentNumber: studentRole?.student_number,
          grade: studentRole?.grade,
          schoolExternalIds: studentRole?.school ? [studentRole.school] : [],
          isActive: true,
          rawData: user as unknown as Record<string, unknown>,
        });
      }

      const nextLink = studentResponse.links?.find((l) => l.rel === 'next');
      if (nextLink) {
        return {
          entities: users,
          count: users.length,
          hasMore: true,
          nextCursor: nextLink.uri,
          warnings,
        };
      }
    }

    // After students, fetch teachers
    if (!cursor || cursor.includes('/teachers')) {
      const teacherEndpoint =
        cursor && cursor.includes('/teachers') ? cursor : `/teachers?limit=${PAGE_SIZE}`;
      const teacherResponse = await this.fetchFromClever<{ data: CleverUser }>(teacherEndpoint);

      for (const item of teacherResponse.data) {
        const user = item.data;
        const teacherRole = user.roles.teacher;
        users.push({
          externalId: user.id,
          role: 'teacher',
          email: user.email,
          firstName: user.name.first,
          lastName: user.name.last,
          middleName: user.name.middle,
          staffId: teacherRole?.teacher_number,
          schoolExternalIds: teacherRole?.school ? [teacherRole.school] : [],
          isActive: true,
          rawData: user as unknown as Record<string, unknown>,
        });
      }

      const nextLink = teacherResponse.links?.find((l) => l.rel === 'next');
      if (nextLink) {
        return {
          entities: users,
          count: users.length,
          hasMore: true,
          nextCursor: nextLink.uri,
          warnings,
        };
      }
    }

    return {
      entities: users,
      count: users.length,
      hasMore: false,
      warnings,
    };
  }

  async fetchEnrollments(cursor?: string): Promise<SyncEntityResult<SisEnrollment>> {
    // Clever doesn't have a direct enrollments endpoint
    // We need to iterate through sections and get their enrollments
    // For efficiency, we'll use the section/:id/enrollments endpoint

    const endpoint = cursor || `/sections?limit=${PAGE_SIZE}`;
    const sectionsResponse = await this.fetchFromClever<{ data: CleverSection }>(endpoint);

    const enrollments: SisEnrollment[] = [];
    const warnings: string[] = [];

    for (const item of sectionsResponse.data) {
      const section = item.data;
      try {
        // Fetch student enrollments for this section
        const studentsResponse = await this.fetchFromClever<{ data: { id: string } }>(
          `/sections/${section.id}/students`
        );
        for (const studentItem of studentsResponse.data) {
          enrollments.push({
            externalId: `${section.id}_${studentItem.data.id}`,
            userExternalId: studentItem.data.id,
            classExternalId: section.id,
            role: 'student',
            isPrimary: true,
            isActive: true,
            rawData: { section_id: section.id, user_id: studentItem.data.id, role: 'student' },
          });
        }

        // Fetch teacher assignments for this section
        const teachersResponse = await this.fetchFromClever<{ data: { id: string } }>(
          `/sections/${section.id}/teachers`
        );
        for (const teacherItem of teachersResponse.data) {
          enrollments.push({
            externalId: `${section.id}_${teacherItem.data.id}`,
            userExternalId: teacherItem.data.id,
            classExternalId: section.id,
            role: 'teacher',
            isPrimary: true,
            isActive: true,
            rawData: { section_id: section.id, user_id: teacherItem.data.id, role: 'teacher' },
          });
        }
      } catch (error) {
        warnings.push(`Failed to fetch enrollments for section ${section.id}: ${error}`);
      }
    }

    const nextLink = sectionsResponse.links?.find((l) => l.rel === 'next');

    return {
      entities: enrollments,
      count: enrollments.length,
      hasMore: !!nextLink,
      nextCursor: nextLink?.uri,
      warnings,
    };
  }

  async cleanup(): Promise<void> {
    this.config = null;
    this.accessToken = null;
  }

  private parseGradeLevels(low?: string, high?: string): string[] | undefined {
    if (!low && !high) return undefined;

    const gradeOrder = [
      'PreKindergarten',
      'TransitionalKindergarten',
      'Kindergarten',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      'PostGraduate',
      'Ungraded',
    ];

    const normalizeGrade = (grade: string): string => {
      const normalized = grade.replace(/^0+/, ''); // Remove leading zeros
      if (normalized === 'K') return 'Kindergarten';
      if (normalized === 'PK' || normalized === 'Pre-K') return 'PreKindergarten';
      return normalized;
    };

    const lowNorm = low ? normalizeGrade(low) : gradeOrder[0];
    const highNorm = high ? normalizeGrade(high) : gradeOrder[gradeOrder.length - 1];

    const lowIdx = gradeOrder.indexOf(lowNorm);
    const highIdx = gradeOrder.indexOf(highNorm);

    if (lowIdx === -1 || highIdx === -1) {
      return low && high ? [low, high] : [low || high!];
    }

    return gradeOrder.slice(lowIdx, highIdx + 1);
  }
}
