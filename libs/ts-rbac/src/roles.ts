export enum Role {
  PARENT = 'PARENT',
  LEARNER = 'LEARNER',
  TEACHER = 'TEACHER',
  THERAPIST = 'THERAPIST',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPPORT = 'SUPPORT',
  // Content authoring roles
  CURRICULUM_AUTHOR = 'CURRICULUM_AUTHOR',
  CURRICULUM_REVIEWER = 'CURRICULUM_REVIEWER',
  DISTRICT_CONTENT_ADMIN = 'DISTRICT_CONTENT_ADMIN',
}

export const allRoles = Object.values(Role) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (allRoles as string[]).includes(value);
}
