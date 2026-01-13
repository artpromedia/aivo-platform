/**
 * CSV Import Modal Component
 *
 * Modal for importing users from a CSV file with preview
 */

'use client';

import * as React from 'react';
import type { User } from '../page';

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (users: Partial<User>[]) => void;
}

interface ParsedRow {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId?: string;
  isValid: boolean;
  errors: string[];
}

export function CsvImportModal({ onClose, onImport }: CsvImportModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [parsedData, setParsedData] = React.useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState<'upload' | 'preview'>('upload');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCsv(text);
      setParsedData(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing CSV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseCsv = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const firstNameIdx = headers.findIndex((h) => h.includes('first') || h === 'firstname');
    const lastNameIdx = headers.findIndex((h) => h.includes('last') || h === 'lastname');
    const roleIdx = headers.findIndex((h) => h === 'role');
    const schoolIdx = headers.findIndex((h) => h.includes('school'));

    return lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const email = emailIdx >= 0 ? values[emailIdx]?.trim() || '' : '';
      const firstName = firstNameIdx >= 0 ? values[firstNameIdx]?.trim() || '' : '';
      const lastName = lastNameIdx >= 0 ? values[lastNameIdx]?.trim() || '' : '';
      const role = roleIdx >= 0 ? values[roleIdx]?.trim().toUpperCase() || 'TEACHER' : 'TEACHER';
      const schoolId = schoolIdx >= 0 ? values[schoolIdx]?.trim() || '' : '';

      const errors: string[] = [];
      if (!email) errors.push('Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');
      if (!firstName) errors.push('First name is required');
      if (!lastName) errors.push('Last name is required');
      if (role && !['TEACHER', 'ADMIN', 'PARENT'].includes(role)) {
        errors.push('Invalid role');
      }

      return {
        email,
        firstName,
        lastName,
        role: ['TEACHER', 'ADMIN', 'PARENT'].includes(role) ? role : 'TEACHER',
        schoolId,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;

  const handleImport = () => {
    const validUsers = parsedData
      .filter((r) => r.isValid)
      .map((r) => ({
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role as User['role'],
        schoolId: r.schoolId,
      }));
    onImport(validUsers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'upload' ? 'Import Users from CSV' : 'Review Import'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' ? (
            <>
              {/* Upload Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                {isLoading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                ) : (
                  <>
                    <UploadIcon className="h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-lg font-medium text-gray-700">
                      Drag and drop your CSV file here
                    </p>
                    <p className="text-sm text-gray-500">or</p>
                    <label className="mt-2 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      Browse Files
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(f);
                        }}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Format Guide */}
              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">CSV Format Guide</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your CSV should have the following columns:
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          email *
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          first_name *
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          last_name *
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          role
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          school_id
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 text-gray-600">john@school.edu</td>
                        <td className="px-3 py-2 text-gray-600">John</td>
                        <td className="px-3 py-2 text-gray-600">Doe</td>
                        <td className="px-3 py-2 text-gray-600">TEACHER</td>
                        <td className="px-3 py-2 text-gray-600">school-1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">* Required fields</p>
              </div>
            </>
          ) : (
            <>
              {/* Preview Stats */}
              <div className="mb-4 flex items-center gap-6">
                <div className="rounded-lg bg-blue-50 px-4 py-2">
                  <p className="text-sm text-blue-600">
                    <span className="font-bold">{parsedData.length}</span> rows found
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 px-4 py-2">
                  <p className="text-sm text-green-600">
                    <span className="font-bold">{validCount}</span> valid
                  </p>
                </div>
                {invalidCount > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2">
                    <p className="text-sm text-red-600">
                      <span className="font-bold">{invalidCount}</span> with errors
                    </p>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="max-h-96 overflow-auto rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Role
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                              <CheckIcon />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                              <XIcon />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-900">{row.email || '-'}</td>
                        <td className="px-4 py-2 text-gray-900">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{row.role}</td>
                        <td className="px-4 py-2">
                          {row.errors.length > 0 && (
                            <span className="text-xs text-red-600">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Back button */}
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedData([]);
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                Upload a different file
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {step === 'preview' && validCount > 0 && (
            <button
              onClick={handleImport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import {validCount} User{validCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
