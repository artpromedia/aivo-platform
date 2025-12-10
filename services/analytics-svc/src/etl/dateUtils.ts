/**
 * Date Key Utilities
 *
 * Convert dates to/from integer date keys (YYYYMMDD format).
 */

/**
 * Convert a Date to an integer date key (YYYYMMDD).
 */
export function toDateKey(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return year * 10000 + month * 100 + day;
}

/**
 * Convert an integer date key (YYYYMMDD) to a Date.
 */
export function fromDateKey(dateKey: number): Date {
  const year = Math.floor(dateKey / 10000);
  const month = Math.floor((dateKey % 10000) / 100) - 1;
  const day = dateKey % 100;
  return new Date(Date.UTC(year, month, day));
}

/**
 * Get yesterday's date at midnight UTC.
 */
export function getYesterday(): Date {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  return yesterday;
}

/**
 * Get today's date at midnight UTC.
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date.
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format a Date to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Get the start of a day (midnight UTC).
 */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Get the end of a day (23:59:59.999 UTC).
 */
export function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

/**
 * Generate a range of dates between start and end (inclusive).
 */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
