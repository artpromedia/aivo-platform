export { useTimer } from './useTimer';
export { useLocalStorage } from './useLocalStorage';
export { useMediaQuery } from './useMediaQuery';

// Error Handling (Sprint 4.2)
export {
  useApiError,
  createQueryErrorHandler,
  type UseApiErrorOptions,
  type UseApiErrorReturn,
  type QueryErrorHandlerOptions,
} from './use-api-error';

// Error Reporting (Sprint 4.2)
export {
  useErrorReporting,
  getErrorReportingConfigFromEnv,
  type ErrorReportingConfig,
  type UserContext,
  type UseErrorReportingOptions,
} from './use-error-reporting';
