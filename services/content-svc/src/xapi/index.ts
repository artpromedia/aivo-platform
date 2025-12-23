/**
 * xAPI Module
 *
 * Experience API (xAPI / Tin Can API) implementation for learning activity tracking.
 * Compliant with xAPI 1.0.3 specification.
 */

export {
  // Types
  type XapiAgent,
  type XapiGroup,
  type XapiActor,
  type XapiVerb,
  type XapiActivity,
  type XapiActivityDefinition,
  type XapiInteractionType,
  type XapiInteractionComponent,
  type XapiStatementRef,
  type XapiSubStatement,
  type XapiObject,
  type XapiResult,
  type XapiScore,
  type XapiContext,
  type XapiContextActivities,
  type XapiAttachment,
  type XapiStatement,
  type ValidationError,
  type ValidationResult,
  type LrsConfig,
  type StoreOptions,
  type QueryParams,
  type StatementsResult,

  // Constants
  XapiVerbs,
  XapiActivityTypes,

  // Validation
  validateStatement,

  // Service
  XapiStatementService,
  xapiService,

  // Builders
  createAgent,
  createActivity,
  createResult,
} from './statement-service';
