export var Role;
(function (Role) {
    Role["PARENT"] = "PARENT";
    Role["LEARNER"] = "LEARNER";
    Role["TEACHER"] = "TEACHER";
    Role["THERAPIST"] = "THERAPIST";
    Role["DISTRICT_ADMIN"] = "DISTRICT_ADMIN";
    Role["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
    Role["SUPPORT"] = "SUPPORT";
    // Content authoring roles
    Role["CURRICULUM_AUTHOR"] = "CURRICULUM_AUTHOR";
    Role["CURRICULUM_REVIEWER"] = "CURRICULUM_REVIEWER";
    Role["DISTRICT_CONTENT_ADMIN"] = "DISTRICT_CONTENT_ADMIN";
})(Role || (Role = {}));
export const allRoles = Object.values(Role);
export function isRole(value) {
    return typeof value === 'string' && allRoles.includes(value);
}
//# sourceMappingURL=roles.js.map