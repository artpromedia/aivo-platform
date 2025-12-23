/**
 * SCORM Module
 *
 * SCORM (Sharable Content Object Reference Model) parsing and runtime support.
 * Supports SCORM 1.2 and SCORM 2004 (2nd, 3rd, and 4th editions).
 */

// Parser exports
export {
  ScormParser,
  scormParser,
  parseScormPackage,
  type ScormVersion,
  type ScormMetadata,
  type ScormResource,
  type ScormItem,
  type ScormOrganization,
  type ScormSequencing,
  type ScormManifest,
  type ParsedScormPackage,
  type ScormParseOptions,
} from './parser';
