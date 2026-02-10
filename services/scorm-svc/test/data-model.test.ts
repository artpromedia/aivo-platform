import { describe, it, expect } from 'vitest';
import {
  SCORM2004_DATA_MODEL,
  SCORM12_DATA_MODEL,
  SCORM2004_ERRORS,
  SCORM12_ERRORS,
  isValidScorm2004Duration,
  isValidScorm12Time,
  parseIso8601Duration,
  formatIso8601Duration,
  addIso8601Durations,
  parseScorm12Time,
  formatScorm12Time,
  addScorm12Times,
} from '../src/runtime/data-model.js';

// ============================================================================
// SCORM 2004 Data Model
// ============================================================================

describe('SCORM2004_DATA_MODEL', () => {
  it('defines core elements', () => {
    expect(SCORM2004_DATA_MODEL['cmi.completion_status']).toBeDefined();
    expect(SCORM2004_DATA_MODEL['cmi.completion_status'].readable).toBe(true);
    expect(SCORM2004_DATA_MODEL['cmi.completion_status'].writable).toBe(true);
    expect(SCORM2004_DATA_MODEL['cmi.completion_status'].defaultValue).toBe('unknown');
    expect(SCORM2004_DATA_MODEL['cmi.completion_status'].validValues).toContain('completed');
  });

  it('marks read-only elements as not writable', () => {
    expect(SCORM2004_DATA_MODEL['cmi.completion_threshold'].writable).toBe(false);
    expect(SCORM2004_DATA_MODEL['cmi.credit'].writable).toBe(false);
  });

  it('marks write-only elements as not readable', () => {
    expect(SCORM2004_DATA_MODEL['cmi.session_time'].readable).toBe(false);
    expect(SCORM2004_DATA_MODEL['cmi.session_time'].writable).toBe(true);
  });

  it('defines score elements with correct ranges', () => {
    expect(SCORM2004_DATA_MODEL['cmi.score.scaled'].minValue).toBe(-1);
    expect(SCORM2004_DATA_MODEL['cmi.score.scaled'].maxValue).toBe(1);
  });

  it('defines success_status with valid values', () => {
    expect(SCORM2004_DATA_MODEL['cmi.success_status'].validValues).toEqual([
      'passed',
      'failed',
      'unknown',
    ]);
  });

  it('defines ADL navigation request', () => {
    const nav = SCORM2004_DATA_MODEL['adl.nav.request'];
    expect(nav).toBeDefined();
    expect(nav.validValues).toContain('continue');
    expect(nav.validValues).toContain('previous');
    expect(nav.validValues).toContain('_none_');
  });
});

// ============================================================================
// SCORM 1.2 Data Model
// ============================================================================

describe('SCORM12_DATA_MODEL', () => {
  it('defines core lesson_status with all valid values', () => {
    const status = SCORM12_DATA_MODEL['cmi.core.lesson_status'];
    expect(status.validValues).toEqual([
      'passed',
      'completed',
      'failed',
      'incomplete',
      'browsed',
      'not attempted',
    ]);
    expect(status.defaultValue).toBe('not attempted');
  });

  it('defines core score with correct range', () => {
    expect(SCORM12_DATA_MODEL['cmi.core.score.raw'].minValue).toBe(0);
    expect(SCORM12_DATA_MODEL['cmi.core.score.raw'].maxValue).toBe(100);
  });

  it('defines core exit values', () => {
    expect(SCORM12_DATA_MODEL['cmi.core.exit'].validValues).toEqual([
      'time-out',
      'suspend',
      'logout',
      '',
    ]);
  });

  it('defines interactions', () => {
    expect(SCORM12_DATA_MODEL['cmi.interactions._count']).toBeDefined();
    expect(SCORM12_DATA_MODEL['cmi.interactions.n.type'].validValues).toContain('true-false');
    expect(SCORM12_DATA_MODEL['cmi.interactions.n.type'].validValues).toContain('choice');
  });
});

// ============================================================================
// Error Code Tables
// ============================================================================

describe('SCORM2004_ERRORS', () => {
  it('defines no-error code', () => {
    expect(SCORM2004_ERRORS['0'].message).toBe('No Error');
  });

  it('defines common error codes', () => {
    expect(SCORM2004_ERRORS['401'].message).toBe('Undefined Data Model Element');
    expect(SCORM2004_ERRORS['404'].message).toBe('Data Model Element Is Read Only');
    expect(SCORM2004_ERRORS['405'].message).toBe('Data Model Element Is Write Only');
  });
});

describe('SCORM12_ERRORS', () => {
  it('defines no-error code', () => {
    expect(SCORM12_ERRORS['0'].message).toBe('No error');
  });

  it('defines common error codes', () => {
    expect(SCORM12_ERRORS['301'].message).toBe('Not initialized');
    expect(SCORM12_ERRORS['403'].message).toBe('Element is read only');
  });
});

// ============================================================================
// ISO 8601 Duration (SCORM 2004)
// ============================================================================

describe('isValidScorm2004Duration', () => {
  it('accepts valid durations', () => {
    expect(isValidScorm2004Duration('PT0S')).toBe(true);
    expect(isValidScorm2004Duration('PT1H30M')).toBe(true);
    expect(isValidScorm2004Duration('PT45S')).toBe(true);
    expect(isValidScorm2004Duration('PT2H15M30S')).toBe(true);
    expect(isValidScorm2004Duration('P1Y2M3DT4H5M6S')).toBe(true);
    expect(isValidScorm2004Duration('PT1.5S')).toBe(true);
  });

  it('rejects invalid durations', () => {
    expect(isValidScorm2004Duration('')).toBe(false);
    expect(isValidScorm2004Duration('invalid')).toBe(false);
    expect(isValidScorm2004Duration('T1H')).toBe(false);
    expect(isValidScorm2004Duration('0030:00:00')).toBe(false);
  });
});

describe('parseIso8601Duration', () => {
  it('parses seconds only', () => {
    expect(parseIso8601Duration('PT45S')).toBe(45);
  });

  it('parses hours, minutes, seconds', () => {
    expect(parseIso8601Duration('PT1H30M15S')).toBe(3600 + 1800 + 15);
  });

  it('parses days', () => {
    expect(parseIso8601Duration('P1DT0S')).toBe(86400);
  });

  it('parses fractional seconds', () => {
    expect(parseIso8601Duration('PT1.5S')).toBe(1.5);
  });

  it('returns 0 for invalid input', () => {
    expect(parseIso8601Duration('invalid')).toBe(0);
  });

  it('parses PT0S as 0', () => {
    expect(parseIso8601Duration('PT0S')).toBe(0);
  });
});

describe('formatIso8601Duration', () => {
  it('formats zero seconds', () => {
    expect(formatIso8601Duration(0)).toBe('PT0S');
  });

  it('formats seconds only', () => {
    expect(formatIso8601Duration(45)).toBe('PT45S');
  });

  it('formats hours and minutes', () => {
    expect(formatIso8601Duration(5400)).toBe('PT1H30M');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatIso8601Duration(3661)).toBe('PT1H1M1S');
  });
});

describe('addIso8601Durations', () => {
  it('adds two durations', () => {
    const result = addIso8601Durations('PT1H', 'PT30M');
    expect(result).toBe('PT1H30M');
  });

  it('adds with carry-over', () => {
    const result = addIso8601Durations('PT45M', 'PT30M');
    expect(result).toBe('PT1H15M');
  });

  it('adds zero durations', () => {
    const result = addIso8601Durations('PT0S', 'PT0S');
    expect(result).toBe('PT0S');
  });
});

// ============================================================================
// SCORM 1.2 Time
// ============================================================================

describe('isValidScorm12Time', () => {
  it('accepts valid times', () => {
    expect(isValidScorm12Time('0000:00:00.00')).toBe(true);
    expect(isValidScorm12Time('0001:30:45.50')).toBe(true);
    expect(isValidScorm12Time('9999:59:59.99')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isValidScorm12Time('')).toBe(false);
    expect(isValidScorm12Time('invalid')).toBe(false);
    expect(isValidScorm12Time('00:00:00')).toBe(false); // too few digits for hours
    expect(isValidScorm12Time('0000:60:00.00')).toBe(false); // minutes >= 60
    expect(isValidScorm12Time('0000:00:60.00')).toBe(false); // seconds >= 60
  });
});

describe('parseScorm12Time', () => {
  it('parses zero time', () => {
    expect(parseScorm12Time('0000:00:00.00')).toBe(0);
  });

  it('parses hours, minutes, seconds', () => {
    expect(parseScorm12Time('0001:30:45.00')).toBe(3600 + 1800 + 45);
  });

  it('parses fractional seconds', () => {
    expect(parseScorm12Time('0000:00:01.50')).toBeCloseTo(1.5);
  });

  it('returns 0 for invalid format', () => {
    expect(parseScorm12Time('invalid')).toBe(0);
  });
});

describe('formatScorm12Time', () => {
  it('formats zero', () => {
    expect(formatScorm12Time(0)).toBe('0000:00:00.00');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatScorm12Time(3661)).toBe('0001:01:01.00');
  });

  it('formats large hours', () => {
    expect(formatScorm12Time(36000)).toBe('0010:00:00.00');
  });
});

describe('addScorm12Times', () => {
  it('adds two times', () => {
    const result = addScorm12Times('0001:00:00.00', '0000:30:00.00');
    expect(result).toBe('0001:30:00.00');
  });

  it('adds zero times', () => {
    const result = addScorm12Times('0000:00:00.00', '0000:00:00.00');
    expect(result).toBe('0000:00:00.00');
  });
});
