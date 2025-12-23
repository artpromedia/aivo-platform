/**
 * Export Utilities
 *
 * Functions for exporting data to various formats (CSV, PDF, etc.)
 */

/**
 * Convert data array to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return '';

  const cols = columns || Object.keys(data[0]).map((key) => ({ key: key as keyof T, header: key }));

  // Header row
  const header = cols.map((col) => escapeCSV(col.header)).join(',');

  // Data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        return escapeCSV(formatCSVValue(value));
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/**
 * Format a value for CSV
 */
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value as string | number | boolean);
}

/**
 * Download data as a file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType = 'text/plain'
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Download as CSV
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  const csv = toCSV(data, columns);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or when clipboard API fails
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const success = document.execCommand('copy');
      textarea.remove();
      return success;
    } catch {
      return false;
    }
  }
}

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
  const ext = getFileExtension(filename);
  return allowedTypes.some((type) => {
    // Handle mime types like "image/*"
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      const mimeCategory = getMimeCategory(ext);
      return mimeCategory === category;
    }
    // Handle extensions like ".pdf"
    if (type.startsWith('.')) {
      return type.slice(1).toLowerCase() === ext;
    }
    // Handle mime types like "application/pdf"
    return type.split('/')[1] === ext;
  });
}

/**
 * Get mime category from extension
 */
function getMimeCategory(ext: string): string {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'application';
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const baseName = originalName.replace(`.${ext}`, '');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return ext ? `${baseName}_${timestamp}_${random}.${ext}` : `${baseName}_${timestamp}_${random}`;
}

/**
 * Print content
 */
export function printContent(content: string, title?: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Print'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}

/**
 * Export gradebook to CSV format
 */
export interface GradebookExportRow {
  studentName: string;
  studentId: string;
  email: string;
  overallGrade: number | null;
  letterGrade: string;
  [assignmentTitle: string]: string | number | null;
}

export function exportGradebookToCSV(
  students: {
    id: string;
    name: string;
    email: string;
    overallGrade?: number;
    letterGrade?: string;
  }[],
  assignments: {
    id: string;
    title: string;
  }[],
  grades: Map<string, number | null> // key: "studentId-assignmentId"
): string {
  const columns = [
    { key: 'studentName' as const, header: 'Student Name' },
    { key: 'email' as const, header: 'Email' },
    { key: 'overallGrade' as const, header: 'Overall Grade' },
    { key: 'letterGrade' as const, header: 'Letter Grade' },
    ...assignments.map((a) => ({ key: a.id as keyof GradebookExportRow, header: a.title })),
  ];

  const data: GradebookExportRow[] = students.map((student) => {
    const row: GradebookExportRow = {
      studentName: student.name,
      studentId: student.id,
      email: student.email,
      overallGrade: student.overallGrade ?? null,
      letterGrade: student.letterGrade ?? '-',
    };

    for (const assignment of assignments) {
      const key = `${student.id}-${assignment.id}`;
      row[assignment.id] = grades.get(key) ?? null;
    }

    return row;
  });

  return toCSV(data, columns);
}
