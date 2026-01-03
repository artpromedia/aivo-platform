/**
 * OneRoster CSV Provider
 * 
 * Implements the ISisProvider interface for OneRoster 1.1 CSV format
 * Supports SFTP-based file transfer for bulk data import
 * 
 * @see https://www.imsglobal.org/oneroster-v11-final-csv-tables
 */

import { parse } from 'csv-parse/sync';
import Client from 'ssh2-sftp-client';
import { readFileSync } from 'fs';
import {
  ISisProvider,
  OneRosterCsvConfig,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
  SisUserRole,
  EnrollmentRole,
} from './types';

// OneRoster 1.1 CSV Column Names
interface OrgsRow {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  name: string;
  type: string;
  identifier?: string;
  parentSourcedId?: string;
}

interface ClassesRow {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  title: string;
  grades?: string;
  courseSourcedId?: string;
  classCode?: string;
  classType?: string;
  location?: string;
  schoolSourcedId: string;
  termSourcedIds?: string;
  subjects?: string;
  subjectCodes?: string;
  periods?: string;
}

interface UsersRow {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  enabledUser: string;
  orgSourcedIds: string;
  role: string;
  username?: string;
  userIds?: string;
  givenName: string;
  familyName: string;
  middleName?: string;
  identifier?: string;
  email?: string;
  sms?: string;
  phone?: string;
  agentSourcedIds?: string;
  grades?: string;
  password?: string;
}

interface EnrollmentsRow {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  classSourcedId: string;
  schoolSourcedId: string;
  userSourcedId: string;
  role: string;
  primary?: string;
  beginDate?: string;
  endDate?: string;
}

export class OneRosterCsvProvider implements ISisProvider {
  readonly providerType = 'ONEROSTER_CSV' as const;
  private config: OneRosterCsvConfig | null = null;
  private sftp: Client | null = null;
  
  // Cached CSV data
  private orgsData: OrgsRow[] = [];
  private classesData: ClassesRow[] = [];
  private usersData: UsersRow[] = [];
  private enrollmentsData: EnrollmentsRow[] = [];
  private dataLoaded = false;

  async initialize(config: unknown): Promise<void> {
    this.config = config as OneRosterCsvConfig;
    this.sftp = new Client();
  }

  private async connectSftp(): Promise<void> {
    if (!this.config || !this.sftp) {
      throw new Error('Provider not initialized');
    }

    const { sftp: sftpConfig } = this.config;
    
    let privateKey: Buffer | undefined;
    if (sftpConfig.privateKeyPath) {
      privateKey = readFileSync(sftpConfig.privateKeyPath);
    } else if (sftpConfig.privateKey) {
      privateKey = Buffer.from(sftpConfig.privateKey);
    }

    await this.sftp.connect({
      host: sftpConfig.host,
      port: sftpConfig.port || 22,
      username: sftpConfig.username,
      privateKey,
      password: sftpConfig.password,
    });
  }

  private async loadCsvData(): Promise<void> {
    if (this.dataLoaded) return;

    if (!this.config || !this.sftp) {
      throw new Error('Provider not initialized');
    }

    await this.connectSftp();

    const fileNames = this.config.fileNames || {};
    const remotePath = this.config.remotePath;

    try {
      // Load orgs.csv
      const orgsFile = fileNames.orgs || 'orgs.csv';
      const orgsContent = await this.sftp.get(`${remotePath}/${orgsFile}`);
      this.orgsData = this.parseCsv<OrgsRow>(orgsContent.toString());

      // Load classes.csv
      const classesFile = fileNames.classes || 'classes.csv';
      const classesContent = await this.sftp.get(`${remotePath}/${classesFile}`);
      this.classesData = this.parseCsv<ClassesRow>(classesContent.toString());

      // Load users.csv
      const usersFile = fileNames.users || 'users.csv';
      const usersContent = await this.sftp.get(`${remotePath}/${usersFile}`);
      this.usersData = this.parseCsv<UsersRow>(usersContent.toString());

      // Load enrollments.csv
      const enrollmentsFile = fileNames.enrollments || 'enrollments.csv';
      const enrollmentsContent = await this.sftp.get(`${remotePath}/${enrollmentsFile}`);
      this.enrollmentsData = this.parseCsv<EnrollmentsRow>(enrollmentsContent.toString());

      this.dataLoaded = true;
    } finally {
      await this.sftp.end();
    }
  }

  private parseCsv<T>(content: string): T[] {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config || !this.sftp) {
        throw new Error('Provider not initialized');
      }

      await this.connectSftp();
      
      // Check if remote path exists
      const exists = await this.sftp.exists(this.config.remotePath);
      await this.sftp.end();
      
      if (exists) {
        return { success: true, message: 'Successfully connected to SFTP and found remote path' };
      } else {
        return { success: false, message: `Remote path ${this.config.remotePath} not found` };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to SFTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async fetchSchools(_cursor?: string): Promise<SyncEntityResult<SisSchool>> {
    await this.loadCsvData();

    const schools: SisSchool[] = this.orgsData
      .filter((org) => org.type === 'school')
      .map((org) => ({
        externalId: org.sourcedId,
        name: org.name,
        schoolNumber: org.identifier,
        isActive: org.status !== 'tobedeleted',
        rawData: org as unknown as Record<string, unknown>,
      }));

    return {
      entities: schools,
      count: schools.length,
      hasMore: false, // CSV loads all data at once
      warnings: [],
    };
  }

  async fetchClasses(_cursor?: string): Promise<SyncEntityResult<SisClass>> {
    await this.loadCsvData();

    const classes: SisClass[] = this.classesData.map((cls) => ({
      externalId: cls.sourcedId,
      schoolExternalId: cls.schoolSourcedId,
      name: cls.title,
      courseCode: cls.classCode,
      subject: cls.subjects?.split(',')[0],
      grade: cls.grades?.split(',')[0],
      sectionNumber: cls.periods?.split(',')[0],
      isActive: cls.status !== 'tobedeleted',
      rawData: cls as unknown as Record<string, unknown>,
    }));

    return {
      entities: classes,
      count: classes.length,
      hasMore: false,
      warnings: [],
    };
  }

  async fetchUsers(_cursor?: string): Promise<SyncEntityResult<SisUser>> {
    await this.loadCsvData();

    const users: SisUser[] = this.usersData.map((user) => ({
      externalId: user.sourcedId,
      role: this.mapRole(user.role),
      email: user.email,
      firstName: user.givenName,
      lastName: user.familyName,
      middleName: user.middleName,
      username: user.username,
      studentNumber: user.identifier,
      grade: user.grades?.split(',')[0],
      schoolExternalIds: user.orgSourcedIds?.split(',').map((s) => s.trim()) || [],
      isActive: user.status !== 'tobedeleted' && user.enabledUser === 'true',
      rawData: user as unknown as Record<string, unknown>,
    }));

    return {
      entities: users,
      count: users.length,
      hasMore: false,
      warnings: [],
    };
  }

  async fetchEnrollments(_cursor?: string): Promise<SyncEntityResult<SisEnrollment>> {
    await this.loadCsvData();

    const enrollments: SisEnrollment[] = this.enrollmentsData.map((enrollment) => ({
      externalId: enrollment.sourcedId,
      userExternalId: enrollment.userSourcedId,
      classExternalId: enrollment.classSourcedId,
      role: this.mapEnrollmentRole(enrollment.role),
      isPrimary: enrollment.primary === 'true',
      startDate: enrollment.beginDate ? new Date(enrollment.beginDate) : undefined,
      endDate: enrollment.endDate ? new Date(enrollment.endDate) : undefined,
      isActive: enrollment.status !== 'tobedeleted',
      rawData: enrollment as unknown as Record<string, unknown>,
    }));

    return {
      entities: enrollments,
      count: enrollments.length,
      hasMore: false,
      warnings: [],
    };
  }

  async cleanup(): Promise<void> {
    if (this.sftp) {
      try {
        await this.sftp.end();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.config = null;
    this.sftp = null;
    this.orgsData = [];
    this.classesData = [];
    this.usersData = [];
    this.enrollmentsData = [];
    this.dataLoaded = false;
  }

  private mapRole(role: string): SisUserRole {
    const normalizedRole = role.toLowerCase();
    const roleMap: Record<string, SisUserRole> = {
      student: 'student',
      teacher: 'teacher',
      administrator: 'administrator',
      aide: 'aide',
      parent: 'parent',
      guardian: 'guardian',
    };
    return roleMap[normalizedRole] || 'student';
  }

  private mapEnrollmentRole(role: string): EnrollmentRole {
    const normalizedRole = role.toLowerCase();
    const roleMap: Record<string, EnrollmentRole> = {
      student: 'student',
      teacher: 'teacher',
      aide: 'aide',
    };
    return roleMap[normalizedRole] || 'student';
  }
}
