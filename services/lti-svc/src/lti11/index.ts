/**
 * LTI 1.1 Module Index
 *
 * Re-exports all LTI 1.1 components for clean imports.
 */

// Types
export * from './types.js';

// Services
export { Lti11LaunchHandler, Lti11Error } from './launch-handler.js';
export { Lti11OutcomesService, Lti11OutcomeError } from './outcomes-service.js';
export { Lti11ContentItemService, generateAutoSubmitHtml } from './content-item-service.js';

// Routes
export { registerLti11Routes } from './routes.js';
export type { Lti11RoutesConfig } from './routes.js';
