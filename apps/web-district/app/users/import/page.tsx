/**
 * Bulk User Import Page
 *
 * Comprehensive user import tool for district administrators:
 * - CSV file upload with drag and drop
 * - Automatic column mapping detection
 * - Preview and validation before import
 * - Import progress tracking and results
 *
 * Sprint 19 Task 19.1: Bulk User Import
 */

'use client';

import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Users,
  Building2,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useRef, type DragEvent } from 'react';

interface ParsedRow {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string;
  schoolName: string;
  gradeLevel: string;
  classId: string;
  isValid: boolean;
  errors: string[];
  originalRow: Record<string, string>;
}

type ColumnMapping = Record<string, string>;

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { row: number; message: string; email?: string }[];
  createdUsers: { email: string; role: string; schoolName: string }[];
}

const SYSTEM_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'role', label: 'Role', required: true },
  { value: 'school_id', label: 'School ID' },
  { value: 'grade_level', label: 'Grade Level' },
  { value: 'class_id', label: 'Class ID' },
];

const VALID_ROLES = ['STUDENT', 'LEARNER', 'TEACHER', 'PARENT', 'ADMIN', 'THERAPIST'];

// Mock schools for the demo
const MOCK_SCHOOLS = [
  { id: 'school-1', name: 'Lincoln Elementary' },
  { id: 'school-2', name: 'Washington Middle School' },
  { id: 'school-3', name: 'Jefferson High School' },
  { id: 'school-4', name: 'Roosevelt Elementary' },
  { id: 'school-5', name: 'Adams Academy' },
];

export default function BulkUserImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'results'>(
    'upload'
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV content
  const parseCSV = (content: string): { headers: string[]; data: string[][] } => {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const firstLine = lines[0];
    if (!firstLine) {
      return { headers: [], data: [] };
    }
    const headers = parseCSVLine(firstLine);
    const data = lines.slice(1).map(parseCSVLine);

    return { headers, data };
  };

  // Auto-detect column mapping
  const detectMapping = (headers: string[]): ColumnMapping => {
    const autoMapping: ColumnMapping = {};
    const fieldPatterns: Record<string, string[]> = {
      first_name: ['first name', 'firstname', 'first', 'given name', 'given_name'],
      last_name: ['last name', 'lastname', 'last', 'surname', 'family name', 'family_name'],
      email: ['email', 'e-mail', 'email address', 'mail'],
      role: ['role', 'user type', 'usertype', 'type', 'account type'],
      school_id: ['school', 'school id', 'school_id', 'schoolid', 'campus'],
      grade_level: ['grade', 'grade level', 'grade_level', 'year', 'class year'],
      class_id: ['class', 'class id', 'class_id', 'section', 'homeroom'],
    };

    headers.forEach((header) => {
      const normalized = header.toLowerCase().trim();
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some((pattern) => normalized.includes(pattern) || normalized === pattern)) {
          autoMapping[header] = field;
          break;
        }
      }
    });

    return autoMapping;
  };

  // Validate a single row
  const validateRow = (row: string[], headers: string[], mapping: ColumnMapping): ParsedRow => {
    const getValue = (field: string): string => {
      const columnIndex = headers.findIndex((h) => mapping[h] === field);
      return columnIndex >= 0 ? (row[columnIndex] || '').trim() : '';
    };

    const email = getValue('email');
    const firstName = getValue('first_name');
    const lastName = getValue('last_name');
    const role = getValue('role').toUpperCase();
    const schoolId = getValue('school_id');
    const gradeLevel = getValue('grade_level');
    const classId = getValue('class_id');

    const errors: string[] = [];

    // Validate required fields
    if (!email) errors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');

    if (!role) errors.push('Role is required');
    else if (!VALID_ROLES.includes(role)) errors.push(`Invalid role: ${role}`);

    // Find school name if school ID is provided
    let schoolName = '';
    if (schoolId) {
      const school = MOCK_SCHOOLS.find(
        (s) => s.id === schoolId || s.name.toLowerCase().includes(schoolId.toLowerCase())
      );
      schoolName = school?.name || schoolId;
    }

    return {
      email,
      firstName,
      lastName,
      role: VALID_ROLES.includes(role) ? role : 'TEACHER',
      schoolId,
      schoolName,
      gradeLevel,
      classId,
      isValid: errors.length === 0,
      errors,
      originalRow: Object.fromEntries(headers.map((h, i) => [h, row[i] || ''])),
    };
  };

  // Handle file selection
  const handleFileUpload = useCallback((uploadedFile: File) => {
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { headers, data } = parseCSV(content);

      setCsvHeaders(headers);
      setCsvData(data);

      const autoMapping = detectMapping(headers);
      setMapping(autoMapping);

      setStep('map');
    };
    reader.readAsText(uploadedFile);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.name.endsWith('.csv') || droppedFile?.type === 'text/csv') {
        handleFileUpload(droppedFile);
      }
    },
    [handleFileUpload]
  );

  // Generate preview with validation
  const generatePreview = useCallback(() => {
    const parsedRows = csvData.map((row) => validateRow(row, csvHeaders, mapping));
    setPreview(parsedRows);
    setStep('preview');
  }, [csvData, csvHeaders, mapping]);

  // Perform the import
  const performImport = useCallback(async () => {
    setImporting(true);
    setStep('importing');
    setImportProgress(0);

    const validRows = preview.filter((row) => row.isValid);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      skipped: preview.filter((r) => !r.isValid).length,
      errors: preview
        .map((row, idx) =>
          row.isValid ? null : { row: idx + 2, message: row.errors.join('; '), email: row.email }
        )
        .filter((e): e is NonNullable<typeof e> => e !== null),
      createdUsers: [],
    };

    // Simulate batch import with progress
    for (let i = 0; i < validRows.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate API call

      const row = validRows[i];
      if (!row) continue;

      // Simulate occasional failures
      if (Math.random() > 0.95) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          message: 'Failed to create user: duplicate email',
          email: row.email,
        });
      } else {
        result.success++;
        result.createdUsers.push({
          email: row.email,
          role: row.role,
          schoolName: row.schoolName || 'District',
        });
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResults(result);
    setStep('results');
    setImporting(false);
  }, [preview]);

  // Download template
  const downloadTemplate = () => {
    const template =
      'email,first_name,last_name,role,school_id,grade_level,class_id\njohn.doe@school.edu,John,Doe,TEACHER,school-1,,\njane.smith@school.edu,Jane,Smith,STUDENT,school-1,5,class-5a\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
  };

  // Download error report
  const downloadErrorReport = () => {
    if (!results) return;

    const report = ['Row,Email,Error'];
    results.errors.forEach((err) => {
      report.push(`${err.row},${err.email || ''},${err.message}`);
    });

    const blob = new Blob([report.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
  };

  // Reset and start over
  const resetImport = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setPreview([]);
    setMapping({});
    setResults(null);
    setStep('upload');
    setImportProgress(0);
  };

  const validCount = preview.filter((r) => r.isValid).length;
  const invalidCount = preview.filter((r) => !r.isValid).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk User Import</h1>
            <p className="text-sm text-gray-500">
              Import users from a CSV file with automatic mapping
            </p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, idx) => {
          const stepNames = ['upload', 'map', 'preview', 'importing'];
          const currentIdx = stepNames.indexOf(step === 'results' ? 'importing' : step);
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={label} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isCurrent
                    ? 'bg-indigo-100 text-indigo-700'
                    : isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isActive && !isCurrent ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center">{idx + 1}</span>
                )}
                {label}
              </div>
              {idx < 3 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold mb-6">Step 1: Upload CSV File</h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => {
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`border-4 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              className="hidden"
            />
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Drop CSV file here or click to browse
            </p>
            <p className="text-gray-500 mb-4">Supported format: CSV with headers</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Select File
            </button>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-4">Expected Columns</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SYSTEM_FIELDS.filter((f) => f.value).map((field) => (
                <div key={field.value} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${field.required ? 'bg-red-500' : 'bg-gray-300'}`}
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                  {field.required && <span className="text-xs text-red-500">*</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">* Required fields</p>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Step 2: Map Columns</h2>
              <p className="text-sm text-gray-500 mt-1">
                Uploaded: <strong>{file?.name}</strong> ({csvData.length} rows)
              </p>
            </div>
            <button
              onClick={resetImport}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Start Over
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {csvHeaders.map((header) => (
              <div key={header} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-1/3">
                  <p className="font-semibold text-gray-900">{header}</p>
                  <p className="text-xs text-gray-500 truncate">
                    Sample: {csvData[0]?.[csvHeaders.indexOf(header)] || 'N/A'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <select
                  value={mapping[header] || ''}
                  onChange={(e) => {
                    setMapping({ ...mapping, [header]: e.target.value });
                  }}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    mapping[header] ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                >
                  {SYSTEM_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setStep('upload');
              }}
              className="px-6 py-3 bg-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={generatePreview}
              disabled={
                !mapping.first_name || !mapping.last_name || !mapping.email || !mapping.role
              }
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Step 3: Review Import</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                {validCount} valid
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  {invalidCount} with errors
                </div>
              )}
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">School</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.map((row, idx) => (
                  <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{row.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.role === 'TEACHER'
                            ? 'bg-blue-100 text-blue-700'
                            : row.role === 'STUDENT' || row.role === 'LEARNER'
                              ? 'bg-green-100 text-green-700'
                              : row.role === 'PARENT'
                                ? 'bg-purple-100 text-purple-700'
                                : row.role === 'ADMIN'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.schoolName || '-'}</td>
                    <td className="px-4 py-3">
                      {row.errors.length > 0 && (
                        <span className="text-xs text-red-600">{row.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidCount > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">
                    {invalidCount} row{invalidCount !== 1 ? 's' : ''} will be skipped
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Rows with errors will not be imported. You can fix the CSV and re-upload, or
                    proceed with valid rows only.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                setStep('map');
              }}
              className="px-6 py-3 bg-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={performImport}
              disabled={validCount === 0}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Import {validCount} User{validCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <RefreshCw className="w-16 h-16 text-indigo-500 mx-auto mb-6 animate-spin" />
          <h2 className="text-xl font-bold mb-2">Importing Users...</h2>
          <p className="text-gray-500 mb-6">Please wait while we create the user accounts</p>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{importProgress}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 'results' && results && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h2>
            <p className="text-gray-500">User import has been processed</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-600">{results.success}</div>
              <div className="text-gray-600">Successfully Created</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-600">{results.failed}</div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-amber-600">{results.skipped}</div>
              <div className="text-gray-600">Skipped (Invalid)</div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Errors</h3>
                <button
                  onClick={downloadErrorReport}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Error Report
                </button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                {results.errors.slice(0, 10).map((error, i) => (
                  <div key={i} className="text-sm text-red-700 mb-1">
                    Row {error.row}: {error.message}
                  </div>
                ))}
                {results.errors.length > 10 && (
                  <div className="text-sm text-red-500 mt-2">
                    ... and {results.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {results.createdUsers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Created Users (showing first 10)</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                {results.createdUsers.slice(0, 10).map((user, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{user.schoolName}</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={resetImport}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Import Another File
            </button>
            <Link
              href="/users"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
            >
              View All Users
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
