/**
 * SCORM Runtime Environment Service
 *
 * Manages SCORM sessions, data model state, and persistence.
 * Supports both SCORM 1.2 and SCORM 2004.
 */

import { nanoid } from 'nanoid';

import type { ScormVersion } from '../sequencing/manifest-types.js';

import {
  SCORM12_DATA_MODEL,
  SCORM12_ERRORS,
  SCORM2004_DATA_MODEL,
  SCORM2004_ERRORS,
  addIso8601Durations,
  addScorm12Times,
  isValidScorm12Time,
  isValidScorm2004Duration,
  type DataModelElement,
} from './data-model.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ScormSession {
  sessionId: string;
  packageId: string;
  learnerId: string;
  learnerName: string;
  attemptId: string;
  scoId: string;
  scormVersion: ScormVersion;
  isInitialized: boolean;
  isTerminated: boolean;
  startTime: Date;
  lastAccessTime: Date;
  dataModel: Map<string, string>;
  originalDataModel: Map<string, string>;
  lastError: string;
  lastErrorString: string;
  lastDiagnostic: string;
}

export interface SessionCreateParams {
  packageId: string;
  learnerId: string;
  learnerName: string;
  attemptId: string;
  scoId: string;
  scormVersion: ScormVersion;
  previousData?: Record<string, string>;
  launchData?: string;
  masteryScore?: number;
  maxTimeAllowed?: string;
  credit?: 'credit' | 'no-credit';
  mode?: 'browse' | 'normal' | 'review';
  entry?: 'ab-initio' | 'resume' | '';
}

export interface RuntimeResult {
  success: boolean;
  value?: string;
  errorCode: string;
  errorString?: string;
  diagnostic?: string;
}

// ============================================================================
// RUNTIME SERVICE
// ============================================================================

export class ScormRuntimeService {
  private sessions = new Map<string, ScormSession>();

  /**
   * Create a new SCORM session
   */
  createSession(params: SessionCreateParams): ScormSession {
    const sessionId = nanoid(16);
    const isScorm2004 = params.scormVersion.startsWith('SCORM_2004');

    // Initialize data model with defaults
    const dataModel = new Map<string, string>();
    const modelDef = isScorm2004 ? SCORM2004_DATA_MODEL : SCORM12_DATA_MODEL;

    // Set defaults from data model definition
    for (const [key, element] of Object.entries(modelDef)) {
      if (element.defaultValue !== undefined) {
        dataModel.set(key, element.defaultValue);
      }
    }

    // Set learner info
    if (isScorm2004) {
      dataModel.set('cmi.learner_id', params.learnerId);
      dataModel.set('cmi.learner_name', params.learnerName);
      dataModel.set('cmi.credit', params.credit || 'credit');
      dataModel.set('cmi.mode', params.mode || 'normal');
      dataModel.set('cmi.entry', params.entry || 'ab-initio');
      if (params.launchData) {
        dataModel.set('cmi.launch_data', params.launchData);
      }
      if (params.masteryScore !== undefined) {
        dataModel.set('cmi.scaled_passing_score', String(params.masteryScore / 100));
      }
      if (params.maxTimeAllowed) {
        dataModel.set('cmi.max_time_allowed', params.maxTimeAllowed);
      }
    } else {
      dataModel.set('cmi.core.student_id', params.learnerId);
      dataModel.set('cmi.core.student_name', params.learnerName);
      dataModel.set('cmi.core.credit', params.credit || 'credit');
      dataModel.set('cmi.core.lesson_mode', params.mode || 'normal');
      dataModel.set('cmi.core.entry', params.entry || 'ab-initio');
      if (params.launchData) {
        dataModel.set('cmi.launch_data', params.launchData);
      }
      if (params.masteryScore !== undefined) {
        dataModel.set('cmi.student_data.mastery_score', String(params.masteryScore));
      }
      if (params.maxTimeAllowed) {
        dataModel.set('cmi.student_data.max_time_allowed', params.maxTimeAllowed);
      }
    }

    // Restore previous data if resuming
    if (params.previousData) {
      for (const [key, value] of Object.entries(params.previousData)) {
        dataModel.set(key, value);
      }
      // Set entry to resume
      if (isScorm2004) {
        dataModel.set('cmi.entry', 'resume');
      } else {
        dataModel.set('cmi.core.entry', 'resume');
      }
    }

    const session: ScormSession = {
      sessionId,
      packageId: params.packageId,
      learnerId: params.learnerId,
      learnerName: params.learnerName,
      attemptId: params.attemptId,
      scoId: params.scoId,
      scormVersion: params.scormVersion,
      isInitialized: false,
      isTerminated: false,
      startTime: new Date(),
      lastAccessTime: new Date(),
      dataModel,
      originalDataModel: new Map(dataModel),
      lastError: '0',
      lastErrorString: '',
      lastDiagnostic: '',
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ScormSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Initialize a SCORM session (LMSInitialize / Initialize)
   */
  initialize(sessionId: string): RuntimeResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.error(sessionId, '101', 'Session not found');
    }

    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');

    if (session.isInitialized) {
      return isScorm2004
        ? this.error(sessionId, '103', 'Already Initialized')
        : { success: true, value: 'true', errorCode: '0' }; // SCORM 1.2 allows multiple Initialize calls
    }

    if (session.isTerminated) {
      return this.error(sessionId, '104', 'Content Instance Terminated');
    }

    session.isInitialized = true;
    session.startTime = new Date();
    session.lastAccessTime = new Date();
    session.lastError = '0';

    return { success: true, value: 'true', errorCode: '0' };
  }

  /**
   * Terminate a SCORM session (LMSFinish / Terminate)
   */
  terminate(sessionId: string): RuntimeResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.error(sessionId, '101', 'Session not found');
    }

    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');

    if (!session.isInitialized) {
      return this.error(sessionId, isScorm2004 ? '112' : '301', 'Not initialized');
    }

    if (session.isTerminated) {
      return this.error(sessionId, '113', 'Already terminated');
    }

    // Update total time
    this.updateTotalTime(session);

    // Handle exit value
    const exitValue = isScorm2004
      ? session.dataModel.get('cmi.exit')
      : session.dataModel.get('cmi.core.exit');

    // Set entry for next session based on exit
    if (exitValue === 'suspend') {
      // Data will be preserved for resume
    } else if (exitValue === 'logout' || exitValue === 'normal') {
      // Clear suspend data for non-suspend exits
      if (exitValue === 'logout') {
        if (isScorm2004) {
          session.dataModel.set('cmi.suspend_data', '');
          session.dataModel.set('cmi.location', '');
        } else {
          session.dataModel.set('cmi.suspend_data', '');
          session.dataModel.set('cmi.core.lesson_location', '');
        }
      }
    }

    session.isTerminated = true;
    session.lastError = '0';

    return { success: true, value: 'true', errorCode: '0' };
  }

  /**
   * Get a value from the data model (LMSGetValue / GetValue)
   */
  getValue(sessionId: string, element: string): RuntimeResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.error(sessionId, '101', 'Session not found');
    }

    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');

    if (!session.isInitialized) {
      return this.error(sessionId, isScorm2004 ? '122' : '301', 'Not initialized');
    }

    if (session.isTerminated) {
      return this.error(sessionId, '123', 'Already terminated');
    }

    // Handle _children requests
    if (element.endsWith('._children')) {
      return this.getChildrenValue(session, element);
    }

    // Handle _count requests
    if (element.endsWith('._count')) {
      return this.getCountValue(session, element);
    }

    // Handle adl.nav.request_valid.choice.{target}
    if (element.startsWith('adl.nav.request_valid.choice.')) {
      // Target activity ID extracted from element - would need integration with sequencing engine
      const _targetActivityId = element.substring('adl.nav.request_valid.choice.'.length);
      void _targetActivityId; // Reserved for future sequencing integration
      return { success: true, value: 'unknown', errorCode: '0' };
    }

    // Validate element
    const modelDef = isScorm2004 ? SCORM2004_DATA_MODEL : SCORM12_DATA_MODEL;
    const elementDef = this.findElementDef(element, modelDef);

    if (!elementDef) {
      // Check if it's a valid array element pattern
      if (!this.isValidArrayElement(element, isScorm2004)) {
        return this.error(sessionId, isScorm2004 ? '401' : '401', 'Undefined data model element');
      }
    }

    if (elementDef && !elementDef.readable) {
      return this.error(sessionId, isScorm2004 ? '405' : '404', 'Element is write only');
    }

    const value = session.dataModel.get(element);

    if (value === undefined) {
      // Return empty string for unset values (SCORM spec)
      session.lastError = '0';
      return { success: true, value: '', errorCode: '0' };
    }

    session.lastAccessTime = new Date();
    session.lastError = '0';

    return { success: true, value, errorCode: '0' };
  }

  /**
   * Set a value in the data model (LMSSetValue / SetValue)
   */
  setValue(sessionId: string, element: string, value: string): RuntimeResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.error(sessionId, '101', 'Session not found');
    }

    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');

    if (!session.isInitialized) {
      return this.error(sessionId, isScorm2004 ? '132' : '301', 'Not initialized');
    }

    if (session.isTerminated) {
      return this.error(sessionId, '133', 'Already terminated');
    }

    // Validate element
    const modelDef = isScorm2004 ? SCORM2004_DATA_MODEL : SCORM12_DATA_MODEL;
    const elementDef = this.findElementDef(element, modelDef);

    if (elementDef) {
      if (!elementDef.writable) {
        return this.error(sessionId, isScorm2004 ? '404' : '403', 'Element is read only');
      }
    } else {
      // Check if it's a valid array element pattern
      if (!this.isValidArrayElement(element, isScorm2004)) {
        return this.error(sessionId, isScorm2004 ? '401' : '401', 'Undefined data model element');
      }
    }

    // Validate value
    const validation = this.validateValue(element, value, elementDef, isScorm2004);
    if (!validation.valid) {
      return this.error(sessionId, validation.errorCode, validation.message);
    }

    // Handle special cases
    if (element === 'adl.nav.request' && isScorm2004) {
      // Navigation request - will be processed on terminate
      session.dataModel.set(element, value);
    } else {
      session.dataModel.set(element, value);
    }

    // Auto-update completion status for SCORM 2004 based on progress
    if (isScorm2004 && element === 'cmi.progress_measure') {
      const progressMeasure = parseFloat(value);
      const completionThreshold = parseFloat(
        session.dataModel.get('cmi.completion_threshold') || '1'
      );
      if (progressMeasure >= completionThreshold) {
        session.dataModel.set('cmi.completion_status', 'completed');
      } else {
        session.dataModel.set('cmi.completion_status', 'incomplete');
      }
    }

    // Auto-update success status for SCORM 2004 based on score
    if (isScorm2004 && element === 'cmi.score.scaled') {
      const scaledScore = parseFloat(value);
      const scaledPassingScore = parseFloat(
        session.dataModel.get('cmi.scaled_passing_score') || '0.8'
      );
      if (scaledScore >= scaledPassingScore) {
        session.dataModel.set('cmi.success_status', 'passed');
      } else {
        session.dataModel.set('cmi.success_status', 'failed');
      }
    }

    session.lastAccessTime = new Date();
    session.lastError = '0';

    return { success: true, value: 'true', errorCode: '0' };
  }

  /**
   * Commit data to persistence (LMSCommit / Commit)
   */
  commit(sessionId: string): RuntimeResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.error(sessionId, '101', 'Session not found');
    }

    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');

    if (!session.isInitialized) {
      return this.error(sessionId, isScorm2004 ? '142' : '301', 'Not initialized');
    }

    if (session.isTerminated) {
      return this.error(sessionId, '143', 'Already terminated');
    }

    session.lastAccessTime = new Date();
    session.lastError = '0';

    // In a real implementation, this would persist to database
    // For now, the data is already in memory

    return { success: true, value: 'true', errorCode: '0' };
  }

  /**
   * Get last error (LMSGetLastError / GetLastError)
   */
  getLastError(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    return session?.lastError || '0';
  }

  /**
   * Get error string (LMSGetErrorString / GetErrorString)
   */
  getErrorString(sessionId: string, errorCode: string): string {
    const session = this.sessions.get(sessionId);
    const isScorm2004 = session?.scormVersion.startsWith('SCORM_2004');
    const errors = isScorm2004 ? SCORM2004_ERRORS : SCORM12_ERRORS;
    return errors[errorCode]?.message || 'Unknown error';
  }

  /**
   * Get diagnostic (LMSGetDiagnostic / GetDiagnostic)
   */
  getDiagnostic(sessionId: string, _errorCode: string): string {
    const session = this.sessions.get(sessionId);
    return session?.lastDiagnostic || '';
  }

  /**
   * Get all modified data from session
   */
  getModifiedData(sessionId: string): Record<string, string> {
    const session = this.sessions.get(sessionId);
    if (!session) return {};

    const modified: Record<string, string> = {};

    for (const [key, value] of session.dataModel) {
      const original = session.originalDataModel.get(key);
      if (value !== original) {
        modified[key] = value;
      }
    }

    return modified;
  }

  /**
   * Get full data model from session
   */
  getDataModel(sessionId: string): Record<string, string> {
    const session = this.sessions.get(sessionId);
    if (!session) return {};

    return Object.fromEntries(session.dataModel);
  }

  /**
   * Clean up session
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private error(sessionId: string, errorCode: string, message: string): RuntimeResult {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastError = errorCode;
      session.lastErrorString = message;
      session.lastDiagnostic = message;
    }

    return {
      success: false,
      value: 'false',
      errorCode,
      errorString: message,
      diagnostic: message,
    };
  }

  private findElementDef(
    element: string,
    modelDef: Record<string, DataModelElement>
  ): DataModelElement | undefined {
    // Direct match
    if (modelDef[element]) {
      return modelDef[element];
    }

    // Pattern match for array elements (e.g., cmi.objectives.0.id)
    const patterns = [
      /^cmi\.objectives\.(\d+)\.(.+)$/,
      /^cmi\.interactions\.(\d+)\.(.+)$/,
      /^cmi\.comments_from_learner\.(\d+)\.(.+)$/,
      /^cmi\.comments_from_lms\.(\d+)\.(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = element.match(pattern);
      if (match) {
        // Return a generic writable element for array items
        return {
          key: element,
          type: 'string',
          readable: true,
          writable: !element.includes('_from_lms'),
        };
      }
    }

    return undefined;
  }

  private isValidArrayElement(element: string, isScorm2004: boolean): boolean {
    const patterns = isScorm2004
      ? [
          /^cmi\.objectives\.\d+\.(id|score\.(scaled|raw|min|max)|success_status|completion_status|description)$/,
          /^cmi\.interactions\.\d+\.(id|type|objectives\.\d+\.id|timestamp|correct_responses\.\d+\.pattern|weighting|learner_response|result|latency|description)$/,
          /^cmi\.comments_from_learner\.\d+\.(comment|location|timestamp)$/,
          /^cmi\.comments_from_lms\.\d+\.(comment|location|timestamp)$/,
        ]
      : [
          /^cmi\.objectives\.\d+\.(id|score\.(raw|min|max)|status)$/,
          /^cmi\.interactions\.\d+\.(id|objectives\.\d+\.id|time|type|correct_responses\.\d+\.pattern|weighting|student_response|result|latency)$/,
        ];

    return patterns.some((pattern) => pattern.test(element));
  }

  private getChildrenValue(session: ScormSession, element: string): RuntimeResult {
    const baseElement = element.replace('._children', '');
    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');
    const modelDef = isScorm2004 ? SCORM2004_DATA_MODEL : SCORM12_DATA_MODEL;

    const childrenKey = `${baseElement}._children`;
    if (modelDef[childrenKey]) {
      return { success: true, value: modelDef[childrenKey].defaultValue || '', errorCode: '0' };
    }

    return this.error(session.sessionId, '401', 'Undefined data model element');
  }

  private getCountValue(session: ScormSession, element: string): RuntimeResult {
    const baseElement = element.replace('._count', '');
    let count = 0;

    // Count items in the array
    const pattern = new RegExp(`^${baseElement.replace(/\./g, '\\.')}\\.(\\d+)\\.`);
    const indices = new Set<number>();

    for (const key of session.dataModel.keys()) {
      const match = key.match(pattern);
      if (match) {
        indices.add(parseInt(match[1], 10));
      }
    }

    count = indices.size;
    return { success: true, value: String(count), errorCode: '0' };
  }

  private validateValue(
    element: string,
    value: string,
    elementDef: DataModelElement | undefined,
    isScorm2004: boolean
  ): { valid: boolean; errorCode: string; message: string } {
    if (!elementDef) {
      // Assume valid for array elements
      return { valid: true, errorCode: '0', message: '' };
    }

    // Check valid values
    if (elementDef.validValues && !elementDef.validValues.includes(value)) {
      return {
        valid: false,
        errorCode: isScorm2004 ? '406' : '405',
        message: `Invalid value. Valid values: ${elementDef.validValues.join(', ')}`,
      };
    }

    // Check numeric range
    if (elementDef.type === 'real' || elementDef.type === 'integer') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return {
          valid: false,
          errorCode: isScorm2004 ? '406' : '405',
          message: 'Value must be a number',
        };
      }
      if (elementDef.minValue !== undefined && num < elementDef.minValue) {
        return {
          valid: false,
          errorCode: isScorm2004 ? '407' : '405',
          message: `Value must be >= ${elementDef.minValue}`,
        };
      }
      if (elementDef.maxValue !== undefined && num > elementDef.maxValue) {
        return {
          valid: false,
          errorCode: isScorm2004 ? '407' : '405',
          message: `Value must be <= ${elementDef.maxValue}`,
        };
      }
    }

    // Check max length
    if (elementDef.maxLength && value.length > elementDef.maxLength) {
      return {
        valid: false,
        errorCode: isScorm2004 ? '406' : '405',
        message: `Value exceeds max length of ${elementDef.maxLength}`,
      };
    }

    // Check time format
    if (elementDef.type === 'timeinterval') {
      if (isScorm2004) {
        if (!isValidScorm2004Duration(value) && value !== '') {
          return {
            valid: false,
            errorCode: '406',
            message: 'Invalid ISO 8601 duration format',
          };
        }
      } else {
        if (!isValidScorm12Time(value) && value !== '') {
          return {
            valid: false,
            errorCode: '405',
            message: 'Invalid time format (HHHH:MM:SS.SS)',
          };
        }
      }
    }

    return { valid: true, errorCode: '0', message: '' };
  }

  private updateTotalTime(session: ScormSession): void {
    const isScorm2004 = session.scormVersion.startsWith('SCORM_2004');
    // Session duration calculated from start time - used for debugging/logging
    const _sessionDuration = Date.now() - session.startTime.getTime();
    void _sessionDuration;

    if (isScorm2004) {
      const currentSessionTime = session.dataModel.get('cmi.session_time') || 'PT0S';
      const currentTotalTime = session.dataModel.get('cmi.total_time') || 'PT0S';
      const newTotalTime = addIso8601Durations(currentTotalTime, currentSessionTime);
      session.dataModel.set('cmi.total_time', newTotalTime);
    } else {
      const currentSessionTime = session.dataModel.get('cmi.core.session_time') || '0000:00:00.00';
      const currentTotalTime = session.dataModel.get('cmi.core.total_time') || '0000:00:00.00';
      const newTotalTime = addScorm12Times(currentTotalTime, currentSessionTime);
      session.dataModel.set('cmi.core.total_time', newTotalTime);
    }
  }
}

// Export singleton instance
export const scormRuntime = new ScormRuntimeService();
