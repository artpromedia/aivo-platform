/**
 * SCORM Data Model Definitions
 *
 * Complete SCORM 1.2 and 2004 data model element definitions
 * including validation rules, default values, and time utilities.
 */

// ============================================================================
// DATA MODEL ELEMENT DEFINITION
// ============================================================================

export interface DataModelElement {
  readable: boolean;
  writable: boolean;
  dataType: 'string' | 'integer' | 'real' | 'time' | 'duration' | 'state' | 'enum';
  defaultValue?: string;
  validValues?: string[];
  children?: string[];
  format?: RegExp;
  minValue?: number;
  maxValue?: number;
}

// ============================================================================
// SCORM 2004 DATA MODEL
// ============================================================================

export const SCORM2004_DATA_MODEL: Record<string, DataModelElement> = {
  // Comments From Learner
  'cmi.comments_from_learner._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'comment,location,timestamp',
  },
  'cmi.comments_from_learner._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.comments_from_learner.n.comment': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.comments_from_learner.n.location': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.comments_from_learner.n.timestamp': {
    readable: true,
    writable: true,
    dataType: 'time',
  },

  // Comments From LMS
  'cmi.comments_from_lms._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'comment,location,timestamp',
  },
  'cmi.comments_from_lms._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.comments_from_lms.n.comment': {
    readable: true,
    writable: false,
    dataType: 'string',
  },
  'cmi.comments_from_lms.n.location': {
    readable: true,
    writable: false,
    dataType: 'string',
  },
  'cmi.comments_from_lms.n.timestamp': {
    readable: true,
    writable: false,
    dataType: 'time',
  },

  // Completion
  'cmi.completion_status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: 'unknown',
    validValues: ['completed', 'incomplete', 'not attempted', 'unknown'],
  },
  'cmi.completion_threshold': {
    readable: true,
    writable: false,
    dataType: 'real',
  },

  // Credit
  'cmi.credit': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'credit',
    validValues: ['credit', 'no-credit'],
  },

  // Entry
  'cmi.entry': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'ab-initio',
    validValues: ['ab-initio', 'resume', ''],
  },

  // Exit
  'cmi.exit': {
    readable: false,
    writable: true,
    dataType: 'enum',
    validValues: ['time-out', 'suspend', 'logout', 'normal', ''],
  },

  // Interactions
  'cmi.interactions._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue:
      'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description',
  },
  'cmi.interactions._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.id': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.type': {
    readable: true,
    writable: true,
    dataType: 'enum',
    validValues: [
      'true-false',
      'choice',
      'fill-in',
      'long-fill-in',
      'matching',
      'performance',
      'sequencing',
      'likert',
      'numeric',
      'other',
    ],
  },
  'cmi.interactions.n.objectives._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.objectives.n.id': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.timestamp': {
    readable: true,
    writable: true,
    dataType: 'time',
  },
  'cmi.interactions.n.correct_responses._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.correct_responses.n.pattern': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.weighting': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.interactions.n.learner_response': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.result': {
    readable: true,
    writable: true,
    dataType: 'string',
    validValues: ['correct', 'incorrect', 'unanticipated', 'neutral'],
  },
  'cmi.interactions.n.latency': {
    readable: true,
    writable: true,
    dataType: 'duration',
  },
  'cmi.interactions.n.description': {
    readable: true,
    writable: true,
    dataType: 'string',
  },

  // Launch Data
  'cmi.launch_data': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: '',
  },

  // Learner ID & Name
  'cmi.learner_id': {
    readable: true,
    writable: false,
    dataType: 'string',
  },
  'cmi.learner_name': {
    readable: true,
    writable: false,
    dataType: 'string',
  },

  // Learner Preference
  'cmi.learner_preference._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'audio_level,language,delivery_speed,audio_captioning',
  },
  'cmi.learner_preference.audio_level': {
    readable: true,
    writable: true,
    dataType: 'real',
    defaultValue: '1',
    minValue: 0,
  },
  'cmi.learner_preference.language': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },
  'cmi.learner_preference.delivery_speed': {
    readable: true,
    writable: true,
    dataType: 'real',
    defaultValue: '1',
    minValue: 0,
  },
  'cmi.learner_preference.audio_captioning': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: '0',
    validValues: ['-1', '0', '1'],
  },

  // Location
  'cmi.location': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },

  // Max Time Allowed
  'cmi.max_time_allowed': {
    readable: true,
    writable: false,
    dataType: 'duration',
  },

  // Mode
  'cmi.mode': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'normal',
    validValues: ['browse', 'normal', 'review'],
  },

  // Objectives
  'cmi.objectives._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'id,score,success_status,completion_status,description',
  },
  'cmi.objectives._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.objectives.n.id': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.objectives.n.score._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'scaled,raw,min,max',
  },
  'cmi.objectives.n.score.scaled': {
    readable: true,
    writable: true,
    dataType: 'real',
    minValue: -1,
    maxValue: 1,
  },
  'cmi.objectives.n.score.raw': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.score.min': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.score.max': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.success_status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: 'unknown',
    validValues: ['passed', 'failed', 'unknown'],
  },
  'cmi.objectives.n.completion_status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: 'unknown',
    validValues: ['completed', 'incomplete', 'not attempted', 'unknown'],
  },
  'cmi.objectives.n.description': {
    readable: true,
    writable: true,
    dataType: 'string',
  },

  // Progress Measure
  'cmi.progress_measure': {
    readable: true,
    writable: true,
    dataType: 'real',
    minValue: 0,
    maxValue: 1,
  },

  // Scaled Passing Score
  'cmi.scaled_passing_score': {
    readable: true,
    writable: false,
    dataType: 'real',
    minValue: -1,
    maxValue: 1,
  },

  // Score
  'cmi.score._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'scaled,raw,min,max',
  },
  'cmi.score.scaled': {
    readable: true,
    writable: true,
    dataType: 'real',
    minValue: -1,
    maxValue: 1,
  },
  'cmi.score.raw': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.score.min': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.score.max': {
    readable: true,
    writable: true,
    dataType: 'real',
  },

  // Session Time
  'cmi.session_time': {
    readable: false,
    writable: true,
    dataType: 'duration',
  },

  // Success Status
  'cmi.success_status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: 'unknown',
    validValues: ['passed', 'failed', 'unknown'],
  },

  // Suspend Data
  'cmi.suspend_data': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },

  // Time Limit Action
  'cmi.time_limit_action': {
    readable: true,
    writable: false,
    dataType: 'enum',
    validValues: ['exit,message', 'continue,message', 'exit,no message', 'continue,no message'],
  },

  // Total Time
  'cmi.total_time': {
    readable: true,
    writable: false,
    dataType: 'duration',
    defaultValue: 'PT0S',
  },

  // ADL Navigation
  'adl.nav.request': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: '_none_',
    validValues: [
      'continue',
      'previous',
      'choice',
      'jump',
      'exit',
      'exitAll',
      'abandon',
      'abandonAll',
      'suspendAll',
      '_none_',
    ],
  },
  'adl.nav.request_valid.continue': {
    readable: true,
    writable: false,
    dataType: 'enum',
    validValues: ['true', 'false', 'unknown'],
  },
  'adl.nav.request_valid.previous': {
    readable: true,
    writable: false,
    dataType: 'enum',
    validValues: ['true', 'false', 'unknown'],
  },
};

// ============================================================================
// SCORM 1.2 DATA MODEL
// ============================================================================

export const SCORM12_DATA_MODEL: Record<string, DataModelElement> = {
  // Core
  'cmi.core._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue:
      'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
  },
  'cmi.core.student_id': {
    readable: true,
    writable: false,
    dataType: 'string',
  },
  'cmi.core.student_name': {
    readable: true,
    writable: false,
    dataType: 'string',
  },
  'cmi.core.lesson_location': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },
  'cmi.core.credit': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'credit',
    validValues: ['credit', 'no-credit'],
  },
  'cmi.core.lesson_status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    defaultValue: 'not attempted',
    validValues: ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'],
  },
  'cmi.core.entry': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'ab-initio',
    validValues: ['ab-initio', 'resume', ''],
  },
  'cmi.core.score._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'raw,min,max',
  },
  'cmi.core.score.raw': {
    readable: true,
    writable: true,
    dataType: 'real',
    minValue: 0,
    maxValue: 100,
  },
  'cmi.core.score.min': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.core.score.max': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.core.total_time': {
    readable: true,
    writable: false,
    dataType: 'time',
    defaultValue: '0000:00:00.00',
  },
  'cmi.core.lesson_mode': {
    readable: true,
    writable: false,
    dataType: 'enum',
    defaultValue: 'normal',
    validValues: ['browse', 'normal', 'review'],
  },
  'cmi.core.exit': {
    readable: false,
    writable: true,
    dataType: 'enum',
    validValues: ['time-out', 'suspend', 'logout', ''],
  },
  'cmi.core.session_time': {
    readable: false,
    writable: true,
    dataType: 'time',
  },

  // Suspend Data
  'cmi.suspend_data': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },

  // Launch Data
  'cmi.launch_data': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: '',
  },

  // Comments
  'cmi.comments': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },
  'cmi.comments_from_lms': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: '',
  },

  // Objectives
  'cmi.objectives._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'id,score,status',
  },
  'cmi.objectives._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.objectives.n.id': {
    readable: true,
    writable: true,
    dataType: 'string',
  },
  'cmi.objectives.n.score._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'raw,min,max',
  },
  'cmi.objectives.n.score.raw': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.score.min': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.score.max': {
    readable: true,
    writable: true,
    dataType: 'real',
  },
  'cmi.objectives.n.status': {
    readable: true,
    writable: true,
    dataType: 'enum',
    validValues: ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'],
  },

  // Interactions
  'cmi.interactions._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue:
      'id,objectives,time,type,correct_responses,weighting,student_response,result,latency',
  },
  'cmi.interactions._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.id': {
    readable: false,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.objectives._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.objectives.n.id': {
    readable: false,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.time': {
    readable: false,
    writable: true,
    dataType: 'time',
  },
  'cmi.interactions.n.type': {
    readable: false,
    writable: true,
    dataType: 'enum',
    validValues: [
      'true-false',
      'choice',
      'fill-in',
      'matching',
      'performance',
      'sequencing',
      'likert',
      'numeric',
    ],
  },
  'cmi.interactions.n.correct_responses._count': {
    readable: true,
    writable: false,
    dataType: 'integer',
    defaultValue: '0',
  },
  'cmi.interactions.n.correct_responses.n.pattern': {
    readable: false,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.weighting': {
    readable: false,
    writable: true,
    dataType: 'real',
  },
  'cmi.interactions.n.student_response': {
    readable: false,
    writable: true,
    dataType: 'string',
  },
  'cmi.interactions.n.result': {
    readable: false,
    writable: true,
    dataType: 'string',
    validValues: ['correct', 'wrong', 'unanticipated', 'neutral'],
  },
  'cmi.interactions.n.latency': {
    readable: false,
    writable: true,
    dataType: 'time',
  },

  // Student Data
  'cmi.student_data._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'mastery_score,max_time_allowed,time_limit_action',
  },
  'cmi.student_data.mastery_score': {
    readable: true,
    writable: false,
    dataType: 'real',
  },
  'cmi.student_data.max_time_allowed': {
    readable: true,
    writable: false,
    dataType: 'time',
  },
  'cmi.student_data.time_limit_action': {
    readable: true,
    writable: false,
    dataType: 'enum',
    validValues: ['exit,message', 'continue,message', 'exit,no message', 'continue,no message'],
  },

  // Student Preference
  'cmi.student_preference._children': {
    readable: true,
    writable: false,
    dataType: 'string',
    defaultValue: 'audio,language,speed,text',
  },
  'cmi.student_preference.audio': {
    readable: true,
    writable: true,
    dataType: 'integer',
    defaultValue: '0',
    minValue: -1,
    maxValue: 100,
  },
  'cmi.student_preference.language': {
    readable: true,
    writable: true,
    dataType: 'string',
    defaultValue: '',
  },
  'cmi.student_preference.speed': {
    readable: true,
    writable: true,
    dataType: 'integer',
    defaultValue: '0',
    minValue: -100,
    maxValue: 100,
  },
  'cmi.student_preference.text': {
    readable: true,
    writable: true,
    dataType: 'integer',
    defaultValue: '0',
    minValue: -1,
    maxValue: 1,
  },
};

// ============================================================================
// ERROR CODES
// ============================================================================

export const SCORM2004_ERRORS: Record<string, { message: string; diagnostic: string }> = {
  '0': { message: 'No Error', diagnostic: '' },
  '101': { message: 'General Exception', diagnostic: 'An unspecified error occurred' },
  '102': { message: 'General Initialization Failure', diagnostic: 'Call to Initialize failed' },
  '103': {
    message: 'Already Initialized',
    diagnostic: 'Call to Initialize after prior successful Initialize',
  },
  '104': { message: 'Content Instance Terminated', diagnostic: 'Call after successful Terminate' },
  '111': { message: 'General Termination Failure', diagnostic: 'Call to Terminate failed' },
  '112': {
    message: 'Termination Before Initialization',
    diagnostic: 'Call to Terminate before Initialize',
  },
  '113': {
    message: 'Termination After Termination',
    diagnostic: 'Call to Terminate after previous Terminate',
  },
  '122': {
    message: 'Retrieve Data Before Initialization',
    diagnostic: 'GetValue before Initialize',
  },
  '123': { message: 'Retrieve Data After Termination', diagnostic: 'GetValue after Terminate' },
  '132': { message: 'Store Data Before Initialization', diagnostic: 'SetValue before Initialize' },
  '133': { message: 'Store Data After Termination', diagnostic: 'SetValue after Terminate' },
  '142': { message: 'Commit Before Initialization', diagnostic: 'Commit before Initialize' },
  '143': { message: 'Commit After Termination', diagnostic: 'Commit after Terminate' },
  '201': { message: 'General Argument Error', diagnostic: 'Invalid argument' },
  '301': { message: 'General Get Failure', diagnostic: 'GetValue failed' },
  '351': { message: 'General Set Failure', diagnostic: 'SetValue failed' },
  '391': { message: 'General Commit Failure', diagnostic: 'Commit failed' },
  '401': {
    message: 'Undefined Data Model Element',
    diagnostic: 'Element not defined in data model',
  },
  '402': { message: 'Unimplemented Data Model Element', diagnostic: 'Element not implemented' },
  '403': {
    message: 'Data Model Element Value Not Initialized',
    diagnostic: 'Element has no value',
  },
  '404': { message: 'Data Model Element Is Read Only', diagnostic: 'Cannot set read-only element' },
  '405': {
    message: 'Data Model Element Is Write Only',
    diagnostic: 'Cannot get write-only element',
  },
  '406': {
    message: 'Data Model Element Type Mismatch',
    diagnostic: 'Value type does not match element type',
  },
  '407': { message: 'Data Model Element Value Out Of Range', diagnostic: 'Value is out of range' },
  '408': {
    message: 'Data Model Dependency Not Established',
    diagnostic: 'Required element not set',
  },
};

export const SCORM12_ERRORS: Record<string, { message: string; diagnostic: string }> = {
  '0': { message: 'No error', diagnostic: '' },
  '101': { message: 'General Exception', diagnostic: 'General exception' },
  '201': { message: 'Invalid argument error', diagnostic: 'Argument is not valid' },
  '202': { message: 'Element cannot have children', diagnostic: 'Element has no children' },
  '203': { message: 'Element not an array', diagnostic: 'Element is not an array' },
  '301': { message: 'Not initialized', diagnostic: 'API not initialized' },
  '401': { message: 'Not implemented error', diagnostic: 'Element not implemented' },
  '402': { message: 'Invalid set value, element is a keyword', diagnostic: 'Cannot set keyword' },
  '403': { message: 'Element is read only', diagnostic: 'Cannot set read-only element' },
  '404': { message: 'Element is write only', diagnostic: 'Cannot get write-only element' },
  '405': { message: 'Incorrect Data Type', diagnostic: 'Value has wrong data type' },
};

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Validate ISO 8601 duration format (SCORM 2004)
 * Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
 */
export function isValidScorm2004Duration(duration: string): boolean {
  const pattern =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
  return pattern.test(duration);
}

/**
 * Validate SCORM 1.2 time format
 * Format: HHHH:MM:SS.SS
 */
export function isValidScorm12Time(time: string): boolean {
  const pattern = /^\d{4}:\d{2}:\d{2}(\.\d{1,2})?$/;
  if (!pattern.test(time)) return false;

  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  return hours >= 0 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60;
}

/**
 * Parse ISO 8601 duration to total seconds
 */
export function parseIso8601Duration(duration: string): number {
  const pattern =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
  const match = pattern.exec(duration);

  if (!match) return 0;

  const years = parseInt(match[1] || '0', 10);
  const months = parseInt(match[2] || '0', 10);
  const days = parseInt(match[3] || '0', 10);
  const hours = parseInt(match[4] || '0', 10);
  const minutes = parseInt(match[5] || '0', 10);
  const seconds = parseFloat(match[6] || '0');

  // Approximate: 1 year = 365 days, 1 month = 30 days
  return (
    years * 365 * 24 * 3600 +
    months * 30 * 24 * 3600 +
    days * 24 * 3600 +
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

/**
 * Format seconds to ISO 8601 duration
 */
export function formatIso8601Duration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  if (seconds > 0 || result === 'PT') {
    result += `${seconds.toFixed(2).replace(/\.?0+$/, '')}S`;
  }

  return result;
}

/**
 * Add two ISO 8601 durations
 */
export function addIso8601Durations(duration1: string, duration2: string): string {
  const seconds1 = parseIso8601Duration(duration1);
  const seconds2 = parseIso8601Duration(duration2);
  return formatIso8601Duration(seconds1 + seconds2);
}

/**
 * Parse SCORM 1.2 time to total seconds
 */
export function parseScorm12Time(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to SCORM 1.2 time
 */
export function formatScorm12Time(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursStr = hours.toString().padStart(4, '0');
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toFixed(2).padStart(5, '0');

  return `${hoursStr}:${minutesStr}:${secondsStr}`;
}

/**
 * Add two SCORM 1.2 times
 */
export function addScorm12Times(time1: string, time2: string): string {
  const seconds1 = parseScorm12Time(time1);
  const seconds2 = parseScorm12Time(time2);
  return formatScorm12Time(seconds1 + seconds2);
}
