/**
 * Utility functions
 */

/**
 * Generate a URL-safe slug from title and metadata.
 */
export function generateSlug(title: string, subject: string, gradeBand: string): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  // Add subject and grade for uniqueness
  const subjectLower = subject.toLowerCase();
  const gradeLower = gradeBand.toLowerCase().replace('_', '');

  return `${subjectLower}-${gradeLower}-${titleSlug}`;
}

/**
 * Truncate string to max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
