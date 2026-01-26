/**
 * Registration Module Exports
 */

// Module
export { RegistrationModule } from './registration.module.js';

// Services
export { RegistrationService } from './registration.service.js';
export { FamilyService } from './family.service.js';

// Controllers
export { RegistrationController } from './registration.controller.js';
export { AdminVerificationController } from './admin-verification.controller.js';
export { FamilyController } from './family.controller.js';

// Types
export * from './registration.types.js';

// Guards
export { RegistrationRateLimitGuard, FraudDetectionGuard } from './guards/registration-rate-limit.guard.js';
export { CaptchaGuard } from './guards/captcha.guard.js';
export { SchoolAdminGuard, SchoolAdminPermissionGuard, RequirePermission } from './guards/school-admin.guard.js';
export { CaregiverAuthGuard } from './guards/caregiver-auth.guard.js';
