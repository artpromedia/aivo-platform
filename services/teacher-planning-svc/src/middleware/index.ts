export { authMiddleware } from './auth.js';
export { errorHandler, AppError, NotFoundError, ForbiddenError, BadRequestError } from './errorHandler.js';
export {
  isEducator,
  isAdmin,
  isSuperUser,
  teacherHasAccessToLearner,
  ensureCanReadLearner,
  ensureCanWriteLearner,
  getTenantIdForQuery,
} from './rbac.js';
