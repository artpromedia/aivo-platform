/**
 * Bulk Enrollment Form
 *
 * Form for district admins to enroll learners in bulk and send parent invitations.
 */

'use client';

import * as React from 'react';

interface LearnerRow {
  id: string;
  learnerId: string;
  learnerName: string;
  grade: string;
  parentEmail: string;
  parentName: string;
  selected: boolean;
}

// Mock data for demonstration
const mockLearners: LearnerRow[] = [
  {
    id: '1',
    learnerId: 'L001',
    learnerName: 'Emma Wilson',
    grade: '4th',
    parentEmail: '',
    parentName: '',
    selected: false,
  },
  {
    id: '2',
    learnerId: 'L002',
    learnerName: 'Michael Chen',
    grade: '4th',
    parentEmail: 'chen.family@email.com',
    parentName: 'Wei Chen',
    selected: false,
  },
  {
    id: '3',
    learnerId: 'L003',
    learnerName: 'Olivia Brown',
    grade: '3rd',
    parentEmail: '',
    parentName: '',
    selected: false,
  },
  {
    id: '4',
    learnerId: 'L004',
    learnerName: 'Alex Smith',
    grade: '5th',
    parentEmail: 'smith@email.com',
    parentName: 'John Smith',
    selected: false,
  },
  {
    id: '5',
    learnerId: 'L005',
    learnerName: 'Sarah Johnson',
    grade: '3rd',
    parentEmail: '',
    parentName: '',
    selected: false,
  },
];

export function BulkEnrollmentForm() {
  const [learners, setLearners] = React.useState(mockLearners);
  const [filterSchool, setFilterSchool] = React.useState('all');
  const [filterGrade, setFilterGrade] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'needs_parent' | 'has_parent'>(
    'all'
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showCsvUpload, setShowCsvUpload] = React.useState(false);

  const selectedCount = learners.filter((l) => l.selected).length;
  const needsParentCount = learners.filter((l) => !l.parentEmail).length;

  const toggleAll = (checked: boolean) => {
    setLearners(learners.map((l) => ({ ...l, selected: checked })));
  };

  const toggleLearner = (id: string) => {
    setLearners(learners.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  };

  const updateParentInfo = (id: string, field: 'parentEmail' | 'parentName', value: string) => {
    setLearners(learners.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async () => {
    const selected = learners.filter((l) => l.selected);
    if (selected.length === 0) return;

    setIsSubmitting(true);
    // API call would go here
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);

    // Reset selection
    setLearners(learners.map((l) => ({ ...l, selected: false })));
  };

  const filteredLearners = learners.filter((l) => {
    if (filterStatus === 'needs_parent' && l.parentEmail) return false;
    if (filterStatus === 'has_parent' && !l.parentEmail) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center gap-4">
          <select
            value={filterSchool}
            onChange={(e) => {
              setFilterSchool(e.target.value);
            }}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Schools</option>
            <option value="lincoln">Lincoln Elementary</option>
            <option value="washington">Washington Middle</option>
          </select>

          <select
            value={filterGrade}
            onChange={(e) => {
              setFilterGrade(e.target.value);
            }}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Grades</option>
            <option value="k">Kindergarten</option>
            <option value="1">1st Grade</option>
            <option value="2">2nd Grade</option>
            <option value="3">3rd Grade</option>
            <option value="4">4th Grade</option>
            <option value="5">5th Grade</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as typeof filterStatus);
            }}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Learners</option>
            <option value="needs_parent">Needs Parent Email</option>
            <option value="has_parent">Has Parent Email</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCsvUpload(true);
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import CSV
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedCount === 0 || isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Enrolling...'
              : `Enroll ${selectedCount} Learner${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <CsvUploadModal
          onClose={() => {
            setShowCsvUpload(false);
          }}
        />
      )}

      {/* Info Banner */}
      {needsParentCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">!</span>
            <div>
              <p className="font-medium text-amber-800">
                {needsParentCount} learner{needsParentCount !== 1 ? 's' : ''} missing parent email
              </p>
              <p className="text-sm text-amber-700">
                Add parent emails to send dashboard invitations. Learners can still be enrolled
                without parent emails.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Learner Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredLearners.every((l) => l.selected)}
                  onChange={(e) => {
                    toggleAll(e.target.checked);
                  }}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Learner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Grade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Parent Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Parent Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredLearners.map((learner) => (
              <tr key={learner.id} className={learner.selected ? 'bg-blue-50' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={learner.selected}
                    onChange={() => {
                      toggleLearner(learner.id);
                    }}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                      {learner.learnerName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{learner.learnerName}</div>
                      <div className="text-xs text-gray-500">ID: {learner.learnerId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{learner.grade}</td>
                <td className="px-4 py-3">
                  <input
                    type="email"
                    value={learner.parentEmail}
                    onChange={(e) => {
                      updateParentInfo(learner.id, 'parentEmail', e.target.value);
                    }}
                    placeholder="parent@email.com"
                    className="w-full rounded-md border-gray-300 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={learner.parentName}
                    onChange={(e) => {
                      updateParentInfo(learner.id, 'parentName', e.target.value);
                    }}
                    placeholder="Parent name"
                    className="w-full rounded-md border-gray-300 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  {learner.parentEmail ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      No parent
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="font-medium text-gray-900">How enrollment works:</h4>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li>1. Select learners to enroll in the Aivo platform</li>
          <li>2. Add parent email addresses to send dashboard invitations</li>
          <li>3. Click Enroll to assign licenses and send invitations</li>
          <li>
            4. Parents will receive an email to create their account and access the parent dashboard
          </li>
        </ul>
      </div>
    </div>
  );
}

function CsvUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Import Parent Emails from CSV</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            X
          </button>
        </div>

        <div className="mt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => {
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            {file ? (
              <div className="text-center">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={() => {
                    setFile(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-600">Drag and drop your CSV file here</p>
                <p className="text-sm text-gray-500">or</p>
                <label className="mt-2 cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Browse Files
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                    }}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-700">CSV Format:</p>
            <code className="mt-1 block text-xs text-gray-600">
              learner_id,parent_email,parent_name
            </code>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!file}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
