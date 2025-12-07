export enum Role {
  PARENT = 'PARENT',
  LEARNER = 'LEARNER',
  TEACHER = 'TEACHER',
  THERAPIST = 'THERAPIST',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPPORT = 'SUPPORT',
}

export const allRoles = Object.values(Role) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (allRoles as string[]).includes(value);
}
