export declare enum Role {
    PARENT = "PARENT",
    LEARNER = "LEARNER",
    TEACHER = "TEACHER",
    THERAPIST = "THERAPIST",
    DISTRICT_ADMIN = "DISTRICT_ADMIN",
    PLATFORM_ADMIN = "PLATFORM_ADMIN",
    SUPPORT = "SUPPORT",
    CURRICULUM_AUTHOR = "CURRICULUM_AUTHOR",
    CURRICULUM_REVIEWER = "CURRICULUM_REVIEWER",
    DISTRICT_CONTENT_ADMIN = "DISTRICT_CONTENT_ADMIN"
}
export declare const allRoles: Role[];
export declare function isRole(value: unknown): value is Role;
//# sourceMappingURL=roles.d.ts.map