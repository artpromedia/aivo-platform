/**
 * Video Caption Service
 *
 * Provides comprehensive caption support for video content including:
 * - WebVTT and SRT parsing and generation
 * - Caption synchronization and timing
 * - Multi-language caption management
 * - Accessibility compliance checking
 *
 * CRITICAL: Addresses HIGH-004 - Missing video caption support
 *
 * Usage:
 * ```typescript
 * import { CaptionService, parseCaptions, generateWebVTT } from './caption.service';
 *
 * // Parse captions from file
 * const captions = parseCaptions(webvttContent, 'vtt');
 *
 * // Generate WebVTT output
 * const vttString = generateWebVTT(captions);
 *
 * // Service-based usage
 * const service = new CaptionService(db);
 * await service.uploadCaptions(videoId, file, 'en');
 * const englishCaptions = await service.getCaptions(videoId, 'en');
 * ```
 */

import type { Pool } from 'pg';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Supported caption formats
 */
export type CaptionFormat = 'vtt' | 'srt' | 'ttml' | 'sbv';

/**
 * Single caption cue (subtitle entry)
 */
export interface CaptionCue {
  /** Unique identifier for the cue */
  id: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Caption text (may include basic formatting) */
  text: string;
  /** Optional positioning (WebVTT) */
  position?: CaptionPosition;
  /** Speaker identification */
  speaker?: string;
}

/**
 * Caption positioning for WebVTT
 */
export interface CaptionPosition {
  /** Vertical position (percentage from top) */
  vertical?: number;
  /** Horizontal position (percentage from left) */
  horizontal?: number;
  /** Text alignment */
  align?: 'start' | 'center' | 'end';
  /** Line position */
  line?: number | 'auto';
}

/**
 * Complete caption track
 */
export interface CaptionTrack {
  /** Unique identifier */
  id: string;
  /** Associated video/learning object ID */
  videoId: string;
  /** ISO 639-1 language code */
  language: string;
  /** Human-readable language name */
  languageName: string;
  /** Caption kind */
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters';
  /** Label shown to users */
  label: string;
  /** Whether this is the default track */
  isDefault: boolean;
  /** Caption cues */
  cues: CaptionCue[];
  /** Original format */
  format: CaptionFormat;
  /** Upload/creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Caption validation result
 */
export interface CaptionValidationResult {
  valid: boolean;
  errors: CaptionError[];
  warnings: CaptionWarning[];
  stats: CaptionStats;
}

/**
 * Caption parsing error
 */
export interface CaptionError {
  line?: number;
  cueId?: string;
  code: string;
  message: string;
}

/**
 * Caption warning (non-fatal issue)
 */
export interface CaptionWarning {
  cueId?: string;
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Caption statistics
 */
export interface CaptionStats {
  totalCues: number;
  totalDuration: number;
  averageCueDuration: number;
  averageWordsPerCue: number;
  maxWordsPerCue: number;
  longestCue: { id: string; duration: number } | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARSING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Parse captions from string content
 */
export function parseCaptions(content: string, format: CaptionFormat): CaptionCue[] {
  switch (format) {
    case 'vtt':
      return parseWebVTT(content);
    case 'srt':
      return parseSRT(content);
    case 'sbv':
      return parseSBV(content);
    case 'ttml':
      return parseTTML(content);
    default:
      throw new Error(`Unsupported caption format: ${format}`);
  }
}

/**
 * Parse WebVTT format
 */
export function parseWebVTT(content: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const lines = content.split(/\r?\n/);

  // Skip WEBVTT header and metadata
  let i = 0;
  while (i < lines.length && !lines[i]?.includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i]?.trim() ?? '';

    // Check for cue identifier or timing
    if (line.includes('-->')) {
      const cue = parseVTTCue(lines, i);
      if (cue) {
        cues.push(cue.cue);
        i = cue.nextIndex;
      } else {
        i++;
      }
    } else if (line && !line.includes('-->')) {
      // This might be a cue identifier, check next line for timing
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (nextLine.includes('-->')) {
        const cue = parseVTTCue(lines, i + 1, line);
        if (cue) {
          cues.push(cue.cue);
          i = cue.nextIndex;
        } else {
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return cues;
}

function parseVTTCue(
  lines: string[],
  timingIndex: number,
  id?: string
): { cue: CaptionCue; nextIndex: number } | null {
  const timingLine = lines[timingIndex]?.trim() ?? '';
  const timingMatch = timingLine.match(
    /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
  );

  if (!timingMatch) return null;

  const startTime = parseVTTTimestamp(timingMatch[1]!);
  const endTime = parseVTTTimestamp(timingMatch[2]!);

  // Parse positioning settings
  const position = parseVTTSettings(timingLine);

  // Collect text lines until blank line or end
  const textLines: string[] = [];
  let i = timingIndex + 1;
  while (i < lines.length && lines[i]?.trim() !== '') {
    textLines.push(lines[i]!);
    i++;
  }

  const cue: CaptionCue = {
    id: id ?? `cue-${timingIndex}`,
    startTime,
    endTime,
    text: textLines.join('\n'),
  };

  if (position) {
    cue.position = position;
  }

  // Extract speaker if present
  const speakerMatch = cue.text.match(/^<v\s+([^>]+)>/);
  if (speakerMatch) {
    cue.speaker = speakerMatch[1];
    cue.text = cue.text.replace(/^<v\s+[^>]+>/, '').trim();
  }

  return { cue, nextIndex: i + 1 };
}

function parseVTTTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  let hours = 0;
  let minutes: number;
  let seconds: number;

  if (parts.length === 3) {
    hours = parseInt(parts[0]!, 10);
    minutes = parseInt(parts[1]!, 10);
    seconds = parseFloat(parts[2]!);
  } else {
    minutes = parseInt(parts[0]!, 10);
    seconds = parseFloat(parts[1]!);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function parseVTTSettings(line: string): CaptionPosition | undefined {
  const settings: CaptionPosition = {};
  let hasSettings = false;

  const lineMatch = line.match(/line:(\d+%?|auto)/);
  if (lineMatch) {
    settings.line = lineMatch[1] === 'auto' ? 'auto' : parseInt(lineMatch[1]!, 10);
    hasSettings = true;
  }

  const positionMatch = line.match(/position:(\d+)%/);
  if (positionMatch) {
    settings.horizontal = parseInt(positionMatch[1]!, 10);
    hasSettings = true;
  }

  const alignMatch = line.match(/align:(start|center|end)/);
  if (alignMatch) {
    settings.align = alignMatch[1] as 'start' | 'center' | 'end';
    hasSettings = true;
  }

  return hasSettings ? settings : undefined;
}

/**
 * Parse SRT format
 */
export function parseSRT(content: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const blocks = content.trim().split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) continue;

    const id = lines[0]?.trim() ?? '';
    const timingLine = lines[1]?.trim() ?? '';
    const textLines = lines.slice(2);

    const timingMatch = timingLine.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );

    if (!timingMatch) continue;

    const startTime = parseSRTTimestamp(timingMatch[1]!);
    const endTime = parseSRTTimestamp(timingMatch[2]!);

    cues.push({
      id: id || `cue-${cues.length + 1}`,
      startTime,
      endTime,
      text: textLines.join('\n'),
    });
  }

  return cues;
}

function parseSRTTimestamp(timestamp: string): number {
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time!.split(':').map(Number);
  return hours! * 3600 + minutes! * 60 + seconds! + parseInt(ms!, 10) / 1000;
}

/**
 * Parse SBV (YouTube) format
 */
export function parseSBV(content: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const blocks = content.trim().split(/\r?\n\r?\n/);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const lines = block.split(/\r?\n/);
    if (lines.length < 2) continue;

    const timingLine = lines[0]?.trim() ?? '';
    const timingMatch = timingLine.match(
      /(\d+:\d{2}:\d{2}\.\d{3}),(\d+:\d{2}:\d{2}\.\d{3})/
    );

    if (!timingMatch) continue;

    const startTime = parseSBVTimestamp(timingMatch[1]!);
    const endTime = parseSBVTimestamp(timingMatch[2]!);

    cues.push({
      id: `cue-${i + 1}`,
      startTime,
      endTime,
      text: lines.slice(1).join('\n'),
    });
  }

  return cues;
}

function parseSBVTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]!, 10);
  const minutes = parseInt(parts[1]!, 10);
  const [seconds, ms] = parts[2]!.split('.');
  return hours * 3600 + minutes * 60 + parseInt(seconds!, 10) + parseInt(ms!, 10) / 1000;
}

/**
 * Parse TTML/DFXP format (basic support)
 */
export function parseTTML(content: string): CaptionCue[] {
  const cues: CaptionCue[] = [];

  // Simple regex-based parsing for <p> elements
  const pRegex = /<p[^>]*begin="([^"]+)"[^>]*end="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  let cueIndex = 1;

  while ((match = pRegex.exec(content)) !== null) {
    const startTime = parseTTMLTimestamp(match[1]!);
    const endTime = parseTTMLTimestamp(match[2]!);
    const text = match[3]!
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    cues.push({
      id: `cue-${cueIndex++}`,
      startTime,
      endTime,
      text,
    });
  }

  return cues;
}

function parseTTMLTimestamp(timestamp: string): number {
  // Handle various TTML timestamp formats
  if (timestamp.endsWith('s')) {
    return parseFloat(timestamp.slice(0, -1));
  }

  const parts = timestamp.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    const seconds = parseFloat(parts[2]!);
    return hours * 3600 + minutes * 60 + seconds;
  }

  return parseFloat(timestamp);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate WebVTT content from cues
 */
export function generateWebVTT(cues: CaptionCue[]): string {
  const lines: string[] = ['WEBVTT', ''];

  for (const cue of cues) {
    // Add cue identifier
    lines.push(cue.id);

    // Format timing line
    const start = formatVTTTimestamp(cue.startTime);
    const end = formatVTTTimestamp(cue.endTime);
    let timingLine = `${start} --> ${end}`;

    // Add positioning if present
    if (cue.position) {
      const settings: string[] = [];
      if (cue.position.line !== undefined) {
        settings.push(`line:${cue.position.line}`);
      }
      if (cue.position.horizontal !== undefined) {
        settings.push(`position:${cue.position.horizontal}%`);
      }
      if (cue.position.align) {
        settings.push(`align:${cue.position.align}`);
      }
      if (settings.length > 0) {
        timingLine += ' ' + settings.join(' ');
      }
    }
    lines.push(timingLine);

    // Add speaker tag if present
    let text = cue.text;
    if (cue.speaker) {
      text = `<v ${cue.speaker}>${text}`;
    }
    lines.push(text);

    // Blank line between cues
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate SRT content from cues
 */
export function generateSRT(cues: CaptionCue[]): string {
  const lines: string[] = [];

  cues.forEach((cue, index) => {
    // Cue number
    lines.push(String(index + 1));

    // Timing line
    const start = formatSRTTimestamp(cue.startTime);
    const end = formatSRTTimestamp(cue.endTime);
    lines.push(`${start} --> ${end}`);

    // Text
    lines.push(cue.text);

    // Blank line
    lines.push('');
  });

  return lines.join('\n');
}

function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toFixed(3).padStart(6, '0');

  return `${h}:${m}:${s}`;
}

function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');

  return `${h}:${m}:${s},${msStr}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate captions for accessibility compliance
 */
export function validateCaptions(
  cues: CaptionCue[],
  videoDuration?: number
): CaptionValidationResult {
  const errors: CaptionError[] = [];
  const warnings: CaptionWarning[] = [];

  // Check for basic issues
  if (cues.length === 0) {
    errors.push({
      code: 'EMPTY_CAPTIONS',
      message: 'Caption file contains no cues',
    });
  }

  let totalDuration = 0;
  let totalWords = 0;
  let maxWords = 0;
  let longestCue: { id: string; duration: number } | null = null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i]!;
    const duration = cue.endTime - cue.startTime;
    const words = cue.text.split(/\s+/).filter(Boolean).length;

    totalDuration += duration;
    totalWords += words;
    maxWords = Math.max(maxWords, words);

    if (!longestCue || duration > longestCue.duration) {
      longestCue = { id: cue.id, duration };
    }

    // Validate timing
    if (cue.startTime < 0) {
      errors.push({
        cueId: cue.id,
        code: 'NEGATIVE_START_TIME',
        message: `Cue ${cue.id} has negative start time`,
      });
    }

    if (cue.endTime <= cue.startTime) {
      errors.push({
        cueId: cue.id,
        code: 'INVALID_TIMING',
        message: `Cue ${cue.id} end time must be greater than start time`,
      });
    }

    // Check for overlapping with next cue
    const nextCue = cues[i + 1];
    if (nextCue && cue.endTime > nextCue.startTime) {
      warnings.push({
        cueId: cue.id,
        code: 'OVERLAPPING_CUES',
        message: `Cue ${cue.id} overlaps with next cue`,
        suggestion: 'Adjust timing to prevent overlap',
      });
    }

    // Check duration limits (accessibility guidelines)
    if (duration < 0.5) {
      warnings.push({
        cueId: cue.id,
        code: 'CUE_TOO_SHORT',
        message: `Cue ${cue.id} is very short (${duration.toFixed(2)}s)`,
        suggestion: 'Minimum recommended duration is 0.5 seconds',
      });
    }

    if (duration > 7) {
      warnings.push({
        cueId: cue.id,
        code: 'CUE_TOO_LONG',
        message: `Cue ${cue.id} is very long (${duration.toFixed(2)}s)`,
        suggestion: 'Consider splitting into multiple cues for better readability',
      });
    }

    // Check reading speed (characters per second)
    const charsPerSecond = cue.text.length / duration;
    if (charsPerSecond > 25) {
      warnings.push({
        cueId: cue.id,
        code: 'READING_TOO_FAST',
        message: `Cue ${cue.id} has fast reading speed (${charsPerSecond.toFixed(1)} chars/sec)`,
        suggestion: 'Recommended maximum is 25 characters per second',
      });
    }

    // Check line count
    const lineCount = cue.text.split('\n').length;
    if (lineCount > 2) {
      warnings.push({
        cueId: cue.id,
        code: 'TOO_MANY_LINES',
        message: `Cue ${cue.id} has ${lineCount} lines`,
        suggestion: 'Captions should have maximum 2 lines',
      });
    }

    // Check characters per line
    const longestLine = Math.max(...cue.text.split('\n').map((l) => l.length));
    if (longestLine > 42) {
      warnings.push({
        cueId: cue.id,
        code: 'LINE_TOO_LONG',
        message: `Cue ${cue.id} has a line with ${longestLine} characters`,
        suggestion: 'Lines should have maximum 42 characters for readability',
      });
    }

    // Check for empty text
    if (!cue.text.trim()) {
      errors.push({
        cueId: cue.id,
        code: 'EMPTY_TEXT',
        message: `Cue ${cue.id} has empty text`,
      });
    }
  }

  // Check video coverage
  if (videoDuration && cues.length > 0) {
    const lastCue = cues[cues.length - 1]!;
    const coverage = lastCue.endTime / videoDuration;

    if (coverage < 0.8) {
      warnings.push({
        code: 'LOW_COVERAGE',
        message: `Captions cover only ${(coverage * 100).toFixed(1)}% of video duration`,
        suggestion: 'Consider adding captions for the remaining content',
      });
    }
  }

  const stats: CaptionStats = {
    totalCues: cues.length,
    totalDuration,
    averageCueDuration: cues.length > 0 ? totalDuration / cues.length : 0,
    averageWordsPerCue: cues.length > 0 ? totalWords / cues.length : 0,
    maxWordsPerCue: maxWords,
    longestCue,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Detect caption format from content
 */
export function detectFormat(content: string): CaptionFormat {
  const trimmed = content.trim();

  if (trimmed.startsWith('WEBVTT')) {
    return 'vtt';
  }

  if (trimmed.includes('<?xml') && trimmed.includes('tt xmlns')) {
    return 'ttml';
  }

  // SRT format: starts with a number followed by timing
  if (/^1\r?\n\d{2}:\d{2}:\d{2},\d{3}/.test(trimmed)) {
    return 'srt';
  }

  // SBV format: starts with timing in specific format
  if (/^\d+:\d{2}:\d{2}\.\d{3},/.test(trimmed)) {
    return 'sbv';
  }

  // Default to SRT as most common
  return 'srt';
}

/**
 * Convert captions between formats
 */
export function convertCaptions(
  content: string,
  fromFormat: CaptionFormat,
  toFormat: CaptionFormat
): string {
  const cues = parseCaptions(content, fromFormat);

  switch (toFormat) {
    case 'vtt':
      return generateWebVTT(cues);
    case 'srt':
      return generateSRT(cues);
    default:
      throw new Error(`Conversion to ${toFormat} not supported`);
  }
}

/**
 * Shift all caption times by an offset
 */
export function shiftCaptions(cues: CaptionCue[], offsetSeconds: number): CaptionCue[] {
  return cues.map((cue) => ({
    ...cue,
    startTime: Math.max(0, cue.startTime + offsetSeconds),
    endTime: Math.max(0, cue.endTime + offsetSeconds),
  }));
}

/**
 * Merge overlapping cues
 */
export function mergeOverlappingCues(cues: CaptionCue[]): CaptionCue[] {
  if (cues.length === 0) return [];

  const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
  const merged: CaptionCue[] = [];

  for (const cue of sorted) {
    const last = merged[merged.length - 1];

    if (last && cue.startTime <= last.endTime) {
      // Merge with previous cue
      last.endTime = Math.max(last.endTime, cue.endTime);
      last.text = `${last.text}\n${cue.text}`;
    } else {
      merged.push({ ...cue });
    }
  }

  return merged;
}

/**
 * Search within captions
 */
export function searchCaptions(
  cues: CaptionCue[],
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): Array<{ cue: CaptionCue; matches: number[] }> {
  const results: Array<{ cue: CaptionCue; matches: number[] }> = [];
  const searchText = options.caseSensitive ? query : query.toLowerCase();

  for (const cue of cues) {
    const text = options.caseSensitive ? cue.text : cue.text.toLowerCase();
    const matches: number[] = [];

    let index = 0;
    while (true) {
      const found = text.indexOf(searchText, index);
      if (found === -1) break;

      // Check whole word if required
      if (options.wholeWord) {
        const before = found === 0 || /\W/.test(text[found - 1]!);
        const after = found + searchText.length === text.length || /\W/.test(text[found + searchText.length]!);
        if (before && after) {
          matches.push(found);
        }
      } else {
        matches.push(found);
      }

      index = found + 1;
    }

    if (matches.length > 0) {
      results.push({ cue, matches });
    }
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Caption Service for database operations
 */
export class CaptionService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Upload captions for a video
   */
  async uploadCaptions(
    videoId: string,
    content: string,
    language: string,
    options: {
      format?: CaptionFormat;
      kind?: CaptionTrack['kind'];
      label?: string;
      isDefault?: boolean;
      tenantId?: string;
    } = {}
  ): Promise<CaptionTrack> {
    const format = options.format ?? detectFormat(content);
    const cues = parseCaptions(content, format);

    // Validate captions
    const validation = validateCaptions(cues);
    if (!validation.valid) {
      throw new Error(`Invalid captions: ${validation.errors.map((e) => e.message).join(', ')}`);
    }

    // Get language name
    const languageName = getLanguageName(language);

    const result = await this.pool.query(
      `INSERT INTO video_captions (
        video_id, language, language_name, kind, label, is_default, cues, format, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (video_id, language) DO UPDATE SET
        cues = EXCLUDED.cues,
        format = EXCLUDED.format,
        updated_at = now()
      RETURNING *`,
      [
        videoId,
        language,
        languageName,
        options.kind ?? 'subtitles',
        options.label ?? languageName,
        options.isDefault ?? false,
        JSON.stringify(cues),
        format,
        options.tenantId,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      videoId: row.video_id,
      language: row.language,
      languageName: row.language_name,
      kind: row.kind,
      label: row.label,
      isDefault: row.is_default,
      cues: JSON.parse(row.cues),
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get captions for a video
   */
  async getCaptions(videoId: string, language?: string): Promise<CaptionTrack[]> {
    let query = `SELECT * FROM video_captions WHERE video_id = $1`;
    const params: unknown[] = [videoId];

    if (language) {
      query += ` AND language = $2`;
      params.push(language);
    }

    query += ` ORDER BY is_default DESC, language ASC`;

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      videoId: row.video_id,
      language: row.language,
      languageName: row.language_name,
      kind: row.kind,
      label: row.label,
      isDefault: row.is_default,
      cues: JSON.parse(row.cues),
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Delete captions
   */
  async deleteCaptions(videoId: string, language: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM video_captions WHERE video_id = $1 AND language = $2`,
      [videoId, language]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Export captions in specified format
   */
  async exportCaptions(videoId: string, language: string, format: CaptionFormat): Promise<string> {
    const tracks = await this.getCaptions(videoId, language);
    if (tracks.length === 0) {
      throw new Error(`No captions found for video ${videoId} in language ${language}`);
    }

    const track = tracks[0]!;

    switch (format) {
      case 'vtt':
        return generateWebVTT(track.cues);
      case 'srt':
        return generateSRT(track.cues);
      default:
        throw new Error(`Export to ${format} not supported`);
    }
  }

  /**
   * Set default caption track
   */
  async setDefaultTrack(videoId: string, language: string): Promise<void> {
    // Clear existing default
    await this.pool.query(
      `UPDATE video_captions SET is_default = false WHERE video_id = $1`,
      [videoId]
    );

    // Set new default
    await this.pool.query(
      `UPDATE video_captions SET is_default = true WHERE video_id = $1 AND language = $2`,
      [videoId, language]
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LANGUAGE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  vi: 'Vietnamese',
  tl: 'Tagalog',
  pl: 'Polish',
  uk: 'Ukrainian',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  th: 'Thai',
  tr: 'Turkish',
  id: 'Indonesian',
  ms: 'Malay',
  ro: 'Romanian',
  hu: 'Hungarian',
  cs: 'Czech',
  sk: 'Slovak',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const Captions = {
  parse: parseCaptions,
  parseVTT: parseWebVTT,
  parseSRT,
  parseSBV,
  parseTTML,
  generateVTT: generateWebVTT,
  generateSRT,
  validate: validateCaptions,
  detect: detectFormat,
  convert: convertCaptions,
  shift: shiftCaptions,
  merge: mergeOverlappingCues,
  search: searchCaptions,
  Service: CaptionService,
};
