/**
 * App Module
 *
 * Root module for the parent service.
 * Re-exports ParentModule as the main application module.
 */

import { ParentModule } from './parent.module.js';

// Re-export ParentModule as AppModule for consistency with index.ts
export { ParentModule as AppModule };
