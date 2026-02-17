/**
 * PRD Alignment Tests — RBAC Roles & Permissions
 *
 * Validates Sprint 5 hardening requirements:
 * - SCHOOL_ADMIN role exists
 * - PARENT has IEP/messaging/report permissions
 * - TEACHER has IEP CRUD + messaging
 * - DISTRICT_ADMIN has UserManage, compliance, audit
 */

import { describe, it, expect } from 'vitest';
import { Role } from '../roles.js';
import { Permission, rolePermissions } from '../permissions.js';

describe('PRD: Roles', () => {
  it('should include SCHOOL_ADMIN role', () => {
    expect(Role.SCHOOL_ADMIN).toBe('SCHOOL_ADMIN');
  });

  it('should include all required roles', () => {
    const requiredRoles = [
      'PARENT', 'LEARNER', 'TEACHER', 'THERAPIST',
      'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
    ];
    for (const role of requiredRoles) {
      expect(Object.values(Role)).toContain(role);
    }
  });
});

describe('PRD: PARENT Permissions', () => {
  const parentPerms = rolePermissions[Role.PARENT];

  it('should allow PARENT to read IEPs', () => {
    expect(parentPerms).toContain(Permission.IepRead);
  });

  it('should allow PARENT to read goals', () => {
    expect(parentPerms).toContain(Permission.GoalRead);
  });

  it('should allow PARENT to read progress', () => {
    expect(parentPerms).toContain(Permission.ProgressRead);
  });

  it('should allow PARENT to send messages', () => {
    expect(parentPerms).toContain(Permission.MessageSend);
  });

  it('should allow PARENT to read messages', () => {
    expect(parentPerms).toContain(Permission.MessageRead);
  });

  it('should allow PARENT to read reports', () => {
    expect(parentPerms).toContain(Permission.ReportRead);
  });

  it('should allow PARENT to export reports', () => {
    expect(parentPerms).toContain(Permission.ReportExport);
  });

  it('should NOT allow PARENT to create IEPs', () => {
    expect(parentPerms).not.toContain(Permission.IepCreate);
  });
});

describe('PRD: TEACHER Permissions', () => {
  const teacherPerms = rolePermissions[Role.TEACHER];

  it('should allow TEACHER to create IEPs', () => {
    expect(teacherPerms).toContain(Permission.IepCreate);
  });

  it('should allow TEACHER to update IEPs', () => {
    expect(teacherPerms).toContain(Permission.IepUpdate);
  });

  it('should allow TEACHER to create goals', () => {
    expect(teacherPerms).toContain(Permission.GoalCreate);
  });

  it('should allow TEACHER to record progress', () => {
    expect(teacherPerms).toContain(Permission.ProgressRecord);
  });

  it('should allow TEACHER to send messages', () => {
    expect(teacherPerms).toContain(Permission.MessageSend);
  });

  it('should allow TEACHER to read reports', () => {
    expect(teacherPerms).toContain(Permission.ReportRead);
  });

  it('should allow TEACHER classroom management', () => {
    expect(teacherPerms).toContain(Permission.ClassroomManage);
  });
});

describe('PRD: DISTRICT_ADMIN Permissions', () => {
  const adminPerms = rolePermissions[Role.DISTRICT_ADMIN];

  it('should allow DISTRICT_ADMIN to manage users', () => {
    expect(adminPerms).toContain(Permission.UserManage);
  });

  it('should allow DISTRICT_ADMIN to read IEPs', () => {
    expect(adminPerms).toContain(Permission.IepRead);
  });

  it('should allow DISTRICT_ADMIN to approve IEPs', () => {
    expect(adminPerms).toContain(Permission.IepApprove);
  });

  it('should allow DISTRICT_ADMIN to export reports', () => {
    expect(adminPerms).toContain(Permission.ReportExport);
  });

  it('should allow DISTRICT_ADMIN to manage compliance', () => {
    expect(adminPerms).toContain(Permission.ComplianceManage);
  });

  it('should allow DISTRICT_ADMIN to export audits', () => {
    expect(adminPerms).toContain(Permission.AuditExport);
  });
});

describe('PRD: SCHOOL_ADMIN Permissions', () => {
  const schoolAdminPerms = rolePermissions[Role.SCHOOL_ADMIN];

  it('should allow SCHOOL_ADMIN to manage schools', () => {
    expect(schoolAdminPerms).toContain(Permission.SchoolManage);
  });

  it('should allow SCHOOL_ADMIN to manage users', () => {
    expect(schoolAdminPerms).toContain(Permission.UserManage);
  });

  it('should allow SCHOOL_ADMIN to read IEPs', () => {
    expect(schoolAdminPerms).toContain(Permission.IepRead);
  });

  it('should allow SCHOOL_ADMIN to approve IEPs', () => {
    expect(schoolAdminPerms).toContain(Permission.IepApprove);
  });

  it('should allow SCHOOL_ADMIN to read compliance', () => {
    expect(schoolAdminPerms).toContain(Permission.ComplianceRead);
  });

  it('should allow SCHOOL_ADMIN to read reports', () => {
    expect(schoolAdminPerms).toContain(Permission.ReportRead);
  });
});

describe('PRD: PLATFORM_ADMIN has full permissions', () => {
  const platformPerms = rolePermissions[Role.PLATFORM_ADMIN];

  it('should have all defined permissions', () => {
    const allPermissions = Object.values(Permission);
    for (const perm of allPermissions) {
      expect(platformPerms).toContain(perm);
    }
  });
});
