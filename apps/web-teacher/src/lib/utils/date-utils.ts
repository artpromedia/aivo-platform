/**
 * Date Utilities for Teacher Portal
 *
 * Formatting, parsing, and date manipulation utilities
 */

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options);
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options);
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', options);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMinutes) < 1) {
    return 'just now';
  }

  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0
      ? `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
      : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ago`;
  }

  if (Math.abs(diffHours) < 24) {
    return diffHours > 0
      ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
      : `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
  }

  if (Math.abs(diffDays) < 7) {
    return diffDays > 0
      ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
      : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  }

  return formatDate(d);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
}

/**
 * Get difference in days between two dates
 */
export function diffInDays(date1: Date | string, date2: Date | string = new Date()): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / 86400000);
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of week (Sunday)
 */
export function startOfWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of week (Saturday)
 */
export function endOfWeek(date: Date | string = new Date()): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date | string, hours: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

/**
 * Format due date with urgency indicator
 */
export function formatDueDate(dueDate: Date | string): {
  text: string;
  urgency: 'overdue' | 'due-today' | 'due-soon' | 'upcoming' | 'far';
} {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffDays = diffInDays(d, now);

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`,
      urgency: 'overdue',
    };
  }

  if (diffDays === 0) {
    return {
      text: `Due today at ${formatTime(d)}`,
      urgency: 'due-today',
    };
  }

  if (diffDays === 1) {
    return {
      text: `Due tomorrow at ${formatTime(d)}`,
      urgency: 'due-soon',
    };
  }

  if (diffDays <= 3) {
    return {
      text: `Due in ${diffDays} days`,
      urgency: 'due-soon',
    };
  }

  if (diffDays <= 7) {
    return {
      text: `Due ${formatDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}`,
      urgency: 'upcoming',
    };
  }

  return {
    text: `Due ${formatDate(d)}`,
    urgency: 'far',
  };
}

/**
 * Get academic year string (e.g., "2024-2025")
 */
export function getAcademicYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Academic year typically starts in August/September
  if (month >= 7) {
    // August onwards
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Get grading period name (e.g., "Q1", "Semester 1")
 */
export function getGradingPeriod(
  date: Date = new Date(),
  type: 'quarter' | 'semester' | 'trimester' = 'quarter'
): string {
  const month = date.getMonth();

  switch (type) {
    case 'semester':
      return month >= 7 || month <= 0 ? 'Semester 1' : 'Semester 2';
    case 'trimester':
      if (month >= 7 && month <= 10) return 'Trimester 1';
      if (month >= 11 || month <= 2) return 'Trimester 2';
      return 'Trimester 3';
    case 'quarter':
    default:
      if (month >= 7 && month <= 9) return 'Q1';
      if (month >= 10 && month <= 11) return 'Q2';
      if (month >= 0 && month <= 2) return 'Q3';
      return 'Q4';
  }
}

/**
 * Parse date from various formats
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date for API (ISO format)
 */
export function toAPIDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function toInputDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format datetime for input fields (YYYY-MM-DDTHH:mm)
 */
export function toInputDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 16);
}
