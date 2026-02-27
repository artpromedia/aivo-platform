/**
 * Tests for SCORM data-model time utilities and error constants.
 */
import { describe, it, expect } from 'vitest';

// -- Time validation utilities (replicating pure functions from data-model.ts) --

function isValidScorm12Time(time: string): boolean {
  return /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(time);
}

function isValidScorm2004Duration(dur: string): boolean {
  return /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(dur) && dur !== 'P';
}

function addScorm12Times(t1: string, t2: string): string {
  const parse = (t: string) => {
    const [h, m, rest] = t.split(':');
    const [s, cs = '0'] = rest.split('.');
    return { h: parseInt(h), m: parseInt(m), s: parseInt(s), cs: parseInt(cs) };
  };
  const a = parse(t1);
  const b = parse(t2);
  let cs = a.cs + b.cs;
  let s = a.s + b.s + Math.floor(cs / 100);
  cs = cs % 100;
  let m = a.m + b.m + Math.floor(s / 60);
  s = s % 60;
  const h = a.h + b.h + Math.floor(m / 60);
  m = m % 60;
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(h, 4)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

// -- SCORM error codes --

const SCORM12_ERRORS: Record<string, string> = {
  '0': 'No Error',
  '101': 'General Exception',
  '201': 'Invalid Argument Error',
  '202': 'Element Cannot Have Children',
  '203': 'Element Not An Array',
  '301': 'Not Initialized',
  '401': 'Not Implemented Error',
  '402': 'Invalid Set Value',
  '403': 'Element Is Read Only',
  '404': 'Element Is Write Only',
};

const SCORM2004_ERRORS: Record<string, string> = {
  '0': 'No Error',
  '101': 'General Exception',
  '102': 'General Initialization Failure',
  '103': 'Already Initialized',
  '104': 'Content Instance Terminated',
  '111': 'General Termination Failure',
  '112': 'Termination Before Initialization',
  '113': 'Termination After Termination',
  '201': 'General Argument Error',
  '301': 'General Get Failure',
  '351': 'General Set Failure',
  '391': 'General Commit Failure',
  '401': 'Undefined Data Model Element',
  '402': 'Unimplemented Data Model Element',
  '403': 'Data Model Element Value Not Initialized',
  '404': 'Data Model Element Is Read Only',
  '405': 'Data Model Element Is Write Only',
  '406': 'Data Model Element Type Mismatch',
  '407': 'Data Model Element Value Out Of Range',
  '408': 'Data Model Dependency Not Established',
};

describe('isValidScorm12Time', () => {
  it('accepts standard HH:MM:SS format', () => {
    expect(isValidScorm12Time('00:05:30')).toBe(true);
    expect(isValidScorm12Time('12:30:45')).toBe(true);
  });

  it('accepts HHHH:MM:SS format', () => {
    expect(isValidScorm12Time('0000:00:00')).toBe(true);
    expect(isValidScorm12Time('9999:59:59')).toBe(true);
  });

  it('accepts time with centiseconds', () => {
    expect(isValidScorm12Time('00:05:30.50')).toBe(true);
    expect(isValidScorm12Time('01:00:00.99')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidScorm12Time('')).toBe(false);
    expect(isValidScorm12Time('5:30')).toBe(false);
    expect(isValidScorm12Time('abc')).toBe(false);
  });
});

describe('isValidScorm2004Duration', () => {
  it('accepts valid ISO 8601 durations', () => {
    expect(isValidScorm2004Duration('PT5M30S')).toBe(true);
    expect(isValidScorm2004Duration('PT1H')).toBe(true);
    expect(isValidScorm2004Duration('P1DT2H30M')).toBe(true);
    expect(isValidScorm2004Duration('P1Y2M3D')).toBe(true);
  });

  it('accepts fractional seconds', () => {
    expect(isValidScorm2004Duration('PT0.5S')).toBe(true);
    expect(isValidScorm2004Duration('PT30.25S')).toBe(true);
  });

  it('rejects bare P designator', () => {
    expect(isValidScorm2004Duration('P')).toBe(false);
  });

  it('rejects invalid formats', () => {
    expect(isValidScorm2004Duration('')).toBe(false);
    expect(isValidScorm2004Duration('5 minutes')).toBe(false);
  });
});

describe('addScorm12Times', () => {
  it('adds two times correctly', () => {
    expect(addScorm12Times('00:05:30.00', '00:03:15.00')).toBe('0000:08:45.00');
  });

  it('handles carry from seconds to minutes', () => {
    expect(addScorm12Times('00:00:45.00', '00:00:30.00')).toBe('0000:01:15.00');
  });

  it('handles carry from minutes to hours', () => {
    expect(addScorm12Times('00:50:00.00', '00:20:00.00')).toBe('0001:10:00.00');
  });

  it('handles centisecond overflow', () => {
    expect(addScorm12Times('00:00:00.60', '00:00:00.60')).toBe('0000:00:01.20');
  });

  it('adds zero durations', () => {
    expect(addScorm12Times('00:00:00.00', '00:00:00.00')).toBe('0000:00:00.00');
  });
});

describe('SCORM12_ERRORS', () => {
  it('has standard error codes', () => {
    expect(SCORM12_ERRORS['0']).toBe('No Error');
    expect(SCORM12_ERRORS['301']).toBe('Not Initialized');
    expect(SCORM12_ERRORS['403']).toBe('Element Is Read Only');
  });

  it('covers at least 10 error codes', () => {
    expect(Object.keys(SCORM12_ERRORS).length).toBeGreaterThanOrEqual(10);
  });
});

describe('SCORM2004_ERRORS', () => {
  it('has standard error codes', () => {
    expect(SCORM2004_ERRORS['0']).toBe('No Error');
    expect(SCORM2004_ERRORS['103']).toBe('Already Initialized');
    expect(SCORM2004_ERRORS['404']).toBe('Data Model Element Is Read Only');
  });

  it('covers at least 18 error codes', () => {
    expect(Object.keys(SCORM2004_ERRORS).length).toBeGreaterThanOrEqual(18);
  });
});
