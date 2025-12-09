/**
 * Content Authoring Service - API Tests
 *
 * Basic unit tests for the authoring service routes.
 * Integration tests with real database would be in a separate e2e test suite.
 */

import { describe, it, expect } from 'vitest';
import { generateSlug } from '../src/utils.js';
import {
  hasAnyRole,
  canAccessTenant,
  canEditVersion,
  AUTHOR_ROLES,
  REVIEWER_ROLES,
  PUBLISHER_ROLES,
} from '../src/rbac.js';

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('generateSlug', () => {
  it('should generate a slug from title, subject, and gradeBand', () => {
    const slug = generateSlug('Reading Comprehension: Main Idea', 'ELA', 'G3_5');
    expect(slug).toBe('ela-g35-reading-comprehension-main-idea');
  });

  it('should lowercase and replace spaces with hyphens', () => {
    const slug = generateSlug('The Quick Brown Fox', 'MATH', 'K_2');
    expect(slug).toContain('math-k2-the-quick-brown-fox');
  });

  it('should remove special characters', () => {
    const slug = generateSlug('Test! @Title #123', 'SCIENCE', 'G6_8');
    expect(slug).toContain('science-g68-test-title-123');
    expect(slug).not.toContain('!');
    expect(slug).not.toContain('@');
    expect(slug).not.toContain('#');
  });
});

describe('RBAC - hasAnyRole', () => {
  it('should return true if user has any of the allowed roles', () => {
    expect(hasAnyRole(['CURRICULUM_AUTHOR'], AUTHOR_ROLES)).toBe(true);
    expect(hasAnyRole(['PLATFORM_ADMIN'], AUTHOR_ROLES)).toBe(true);
    expect(hasAnyRole(['DISTRICT_CONTENT_ADMIN'], AUTHOR_ROLES)).toBe(true);
  });

  it('should return false if user has none of the allowed roles', () => {
    expect(hasAnyRole(['LEARNER'], AUTHOR_ROLES)).toBe(false);
    expect(hasAnyRole(['TEACHER'], AUTHOR_ROLES)).toBe(false);
    expect(hasAnyRole([], AUTHOR_ROLES)).toBe(false);
  });

  it('should check reviewer roles correctly', () => {
    expect(hasAnyRole(['CURRICULUM_REVIEWER'], REVIEWER_ROLES)).toBe(true);
    expect(hasAnyRole(['CURRICULUM_AUTHOR'], REVIEWER_ROLES)).toBe(false);
  });

  it('should check publisher roles correctly', () => {
    expect(hasAnyRole(['DISTRICT_CONTENT_ADMIN'], PUBLISHER_ROLES)).toBe(true);
    expect(hasAnyRole(['CURRICULUM_AUTHOR'], PUBLISHER_ROLES)).toBe(false);
    expect(hasAnyRole(['CURRICULUM_REVIEWER'], PUBLISHER_ROLES)).toBe(false);
  });
});

describe('RBAC - canAccessTenant', () => {
  it('should allow platform admins to access any tenant', () => {
    expect(canAccessTenant('tenant-a', 'tenant-b', ['PLATFORM_ADMIN'])).toBe(true);
    expect(canAccessTenant(undefined, 'tenant-b', ['PLATFORM_ADMIN'])).toBe(true);
  });

  it('should allow access to global content (null tenant)', () => {
    expect(canAccessTenant('tenant-a', null, ['CURRICULUM_AUTHOR'])).toBe(true);
    expect(canAccessTenant(undefined, null, ['CURRICULUM_AUTHOR'])).toBe(true);
  });

  it('should allow access to own tenant', () => {
    expect(canAccessTenant('tenant-a', 'tenant-a', ['CURRICULUM_AUTHOR'])).toBe(true);
  });

  it('should deny access to other tenants for non-admins', () => {
    expect(canAccessTenant('tenant-a', 'tenant-b', ['CURRICULUM_AUTHOR'])).toBe(false);
    expect(canAccessTenant('tenant-a', 'tenant-b', ['CURRICULUM_REVIEWER'])).toBe(false);
  });
});

describe('RBAC - canEditVersion', () => {
  it('should allow platform admins to edit any version', () => {
    expect(canEditVersion('user-a', 'user-b', 'DRAFT', ['PLATFORM_ADMIN'])).toBe(true);
    expect(canEditVersion('user-a', 'user-b', 'IN_REVIEW', ['PLATFORM_ADMIN'])).toBe(true);
  });

  it('should only allow editing DRAFT versions for non-admins', () => {
    expect(canEditVersion('user-a', 'user-a', 'DRAFT', ['CURRICULUM_AUTHOR'])).toBe(true);
    expect(canEditVersion('user-a', 'user-a', 'IN_REVIEW', ['CURRICULUM_AUTHOR'])).toBe(false);
    expect(canEditVersion('user-a', 'user-a', 'PUBLISHED', ['CURRICULUM_AUTHOR'])).toBe(false);
  });

  it('should allow district content admins to edit any DRAFT in their tenant', () => {
    expect(canEditVersion('user-a', 'user-b', 'DRAFT', ['DISTRICT_CONTENT_ADMIN'])).toBe(true);
  });

  it('should only allow authors to edit their own versions', () => {
    expect(canEditVersion('user-a', 'user-a', 'DRAFT', ['CURRICULUM_AUTHOR'])).toBe(true);
    expect(canEditVersion('user-a', 'user-b', 'DRAFT', ['CURRICULUM_AUTHOR'])).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW STATE MACHINE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Workflow State Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['IN_REVIEW'],
    IN_REVIEW: ['APPROVED', 'DRAFT'], // Can be rejected back to DRAFT
    APPROVED: ['PUBLISHED'],
    PUBLISHED: ['RETIRED'],
    RETIRED: [],
  };

  it('should define valid state transitions', () => {
    expect(validTransitions['DRAFT']).toContain('IN_REVIEW');
    expect(validTransitions['IN_REVIEW']).toContain('APPROVED');
    expect(validTransitions['IN_REVIEW']).toContain('DRAFT');
    expect(validTransitions['APPROVED']).toContain('PUBLISHED');
    expect(validTransitions['PUBLISHED']).toContain('RETIRED');
  });

  it('should not allow invalid transitions', () => {
    expect(validTransitions['DRAFT']).not.toContain('PUBLISHED');
    expect(validTransitions['DRAFT']).not.toContain('APPROVED');
    expect(validTransitions['IN_REVIEW']).not.toContain('PUBLISHED');
    expect(validTransitions['RETIRED']).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Role Definitions', () => {
  it('should define author roles', () => {
    expect(AUTHOR_ROLES).toContain('CURRICULUM_AUTHOR');
    expect(AUTHOR_ROLES).toContain('DISTRICT_CONTENT_ADMIN');
    expect(AUTHOR_ROLES).toContain('PLATFORM_ADMIN');
    expect(AUTHOR_ROLES).not.toContain('CURRICULUM_REVIEWER');
  });

  it('should define reviewer roles', () => {
    expect(REVIEWER_ROLES).toContain('CURRICULUM_REVIEWER');
    expect(REVIEWER_ROLES).toContain('DISTRICT_CONTENT_ADMIN');
    expect(REVIEWER_ROLES).toContain('PLATFORM_ADMIN');
    expect(REVIEWER_ROLES).not.toContain('CURRICULUM_AUTHOR');
  });

  it('should define publisher roles', () => {
    expect(PUBLISHER_ROLES).toContain('DISTRICT_CONTENT_ADMIN');
    expect(PUBLISHER_ROLES).toContain('PLATFORM_ADMIN');
    expect(PUBLISHER_ROLES).not.toContain('CURRICULUM_AUTHOR');
    expect(PUBLISHER_ROLES).not.toContain('CURRICULUM_REVIEWER');
  });
});
