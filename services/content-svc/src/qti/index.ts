/**
 * QTI Module
 *
 * Question and Test Interoperability (QTI) parsing and processing.
 * Supports QTI 2.1, 2.2, and 3.0 specifications.
 */

// Parser exports
export {
  QtiParser,
  qtiParser,
  parseQtiItem,
  parseQtiTest,
  parseQtiPackage,
  type QtiVersion,
  type QtiInteractionType,
  type QtiBaseType,
  type QtiCardinality,
  type QtiChoice,
  type QtiResponseDeclaration,
  type QtiMapping,
  type QtiMapEntry,
  type QtiAreaMapping,
  type QtiAreaMapEntry,
  type QtiOutcomeDeclaration,
  type QtiInteraction,
  type QtiMediaObject,
  type QtiRubricBlock,
  type QtiResponseProcessingRule,
  type QtiModalFeedback,
  type QtiAssessmentItem,
  type QtiTestPart,
  type QtiSection,
  type QtiItemRef,
  type QtiSelection,
  type QtiItemSessionControl,
  type QtiTimeLimits,
  type QtiAssessmentTest,
  type QtiMetadata,
  type ParsedQtiItem,
  type ParsedQtiTest,
  type ParsedQtiPackage,
  type QtiManifest,
  type QtiPackageResource,
} from './parser';

// Processor exports
export {
  QtiResponseProcessor,
  qtiResponseProcessor,
  processQtiResponses,
  type ResponseValue,
  type ResponsePrimitive,
  type ProcessedResponse,
  type ProcessingResult,
  type ProcessingContext,
  type ResponseProcessingTemplate,
} from './processor';
