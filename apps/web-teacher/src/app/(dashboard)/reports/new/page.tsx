/**
 * New Report (Generate) Page
 *
 * Multi-step wizard: select type → select class/student → date range → generate.
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useClasses, useStudents } from '@/hooks';
import { reportsApi } from '@/lib/api';
import type { ReportType, ReportParams } from '@/lib/types/report';

/* ─── constants ───────────────────────────────────────────────────────── */

const REPORT_TYPES: { value: ReportType; label: string; description: string; needsStudent: boolean; needsClass: boolean }[] = [
  { value: 'progress', label: 'Progress Report', description: 'Individual student progress across all classes', needsStudent: true, needsClass: false },
  { value: 'class_summary', label: 'Class Summary', description: 'Overview of class performance and metrics', needsStudent: false, needsClass: true },
  { value: 'gradebook', label: 'Gradebook Export', description: 'Full gradebook data for a class', needsStudent: false, needsClass: true },
  { value: 'iep_progress', label: 'IEP Progress', description: 'IEP goal progress report for a student', needsStudent: true, needsClass: false },
  { value: 'standards_mastery', label: 'Standards Mastery', description: 'Standards alignment and mastery levels', needsStudent: false, needsClass: true },
  { value: 'attendance', label: 'Attendance Report', description: 'Attendance records and patterns', needsStudent: false, needsClass: true },
];

/* ─── component ───────────────────────────────────────────────────────── */

export default function NewReportPage() {
  const router = useRouter();
  const { classes } = useClasses();
  const { students } = useStudents();

  const [step, setStep] = React.useState(1);
  const [reportType, setReportType] = React.useState<ReportType | ''>('');
  const [classId, setClassId] = React.useState('');
  const [studentId, setStudentId] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [format, setFormat] = React.useState<'pdf' | 'html'>('pdf');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selected = REPORT_TYPES.find((r) => r.value === reportType);

  const canProceedStep1 = !!reportType;
  const canProceedStep2 =
    selected &&
    (!selected.needsClass || classId) &&
    (!selected.needsStudent || studentId);

  const handleGenerate = async () => {
    if (!reportType) return;
    setLoading(true);
    setError(null);

    const params: ReportParams = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
    };

    try {
      if (selected?.needsStudent && studentId) {
        if (reportType === 'iep_progress') {
          await reportsApi.generateIepReport(studentId, [], params);
        } else {
          await reportsApi.generateProgressReport(studentId, params);
        }
      } else if (classId) {
        if (reportType === 'gradebook') {
          await reportsApi.generateGradebookReport(classId, params);
        } else {
          await reportsApi.generateClassReport(classId, params);
        }
      }
      router.push('/reports');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Generate Report" description="Create a new report" />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ── Step indicator ────────────────────────────────────────────── */}
      <div className="mt-6 flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === s
                ? 'bg-blue-600 text-white'
                : step > s
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            {s}
          </div>
        ))}
        <div className="ml-2 flex items-center text-sm text-gray-500">
          {step === 1 && 'Select report type'}
          {step === 2 && 'Choose scope'}
          {step === 3 && 'Date range & generate'}
        </div>
      </div>

      {/* ── Step 1: Report type ───────────────────────────────────────── */}
      {step === 1 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                reportType === rt.value
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'bg-white'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{rt.label}</h3>
              <p className="mt-1 text-sm text-gray-500">{rt.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Scope ─────────────────────────────────────────────── */}
      {step === 2 && selected && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h3 className="font-semibold text-gray-900">{selected.label}</h3>
          <p className="mt-1 text-sm text-gray-500">{selected.description}</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {selected.needsClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a class…</option>
                  {(classes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selected.needsStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a student…</option>
                  {(students ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Date range & generate ─────────────────────────────── */}
      {step === 3 && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h3 className="font-semibold text-gray-900">Date Range & Format</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'pdf' | 'html')}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ────────────────────────────────────────── */}
      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        )}

        {step < 3 && (
          <button
            type="button"
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            onClick={() => setStep(step + 1)}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        )}

        {step === 3 && (
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
