'use client';

import { useState, useEffect, useCallback } from 'react';

import type { WizardStepProps } from '../OnboardingWizard';

const TENANT_API = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

interface SchoolEntry {
  id?: string;
  name: string;
  nces_id: string;
  grades: string[];
  adminEmail: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const ALL_GRADES = [
  'PK',
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

const EMPTY_SCHOOL: SchoolEntry = {
  name: '',
  nces_id: '',
  grades: [],
  adminEmail: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

export function SchoolConfigStep({ tenantId, onComplete, onBack, status }: WizardStepProps) {
  const isCompleted = status?.steps[3]?.completed ?? false;
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<SchoolEntry>(EMPTY_SCHOOL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing schools from SIS sync or tenant
  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${TENANT_API}/tenants/${tenantId}/schools`);
      if (res.ok) {
        const data = (await res.json()) as { schools: SchoolEntry[] };
        setSchools(data.schools ?? []);
      }
    } catch {
      // Schools not yet configured
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchSchools();
  }, [fetchSchools]);

  const handleAddSchool = () => {
    setDraft({ ...EMPTY_SCHOOL });
    setEditingIdx(schools.length);
  };

  const handleEditSchool = (idx: number) => {
    const school = schools[idx] as SchoolEntry | undefined;
    if (school) {
      setDraft({
        name: school.name,
        nces_id: school.nces_id,
        grades: [...school.grades],
        adminEmail: school.adminEmail,
        address: school.address,
        city: school.city,
        state: school.state,
        zip: school.zip,
        ...(school.id != null ? { id: school.id } : {}),
      });
    }
    setEditingIdx(idx);
  };

  const handleDeleteSchool = (idx: number) => {
    setSchools((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveDraft = () => {
    if (!draft.name.trim()) return;
    setSchools((prev) => {
      const next = [...prev];
      if (editingIdx !== null) {
        next[editingIdx] = { ...draft };
      }
      return next;
    });
    setEditingIdx(null);
    setDraft(EMPTY_SCHOOL);
  };

  const handleCancelDraft = () => {
    setEditingIdx(null);
    setDraft(EMPTY_SCHOOL);
  };

  const toggleGrade = (grade: string) => {
    setDraft((prev) => ({
      ...prev,
      grades: prev.grades.includes(grade) ? prev.grades.filter((g) => g !== grade) : [...prev.grades, grade],
    }));
  };

  const handleSubmit = async () => {
    if (schools.length === 0) {
      setError('Please add at least one school.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${TENANT_API}/onboarding/tenants/${tenantId}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schools }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? 'Failed to save school configuration');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schools');
    } finally {
      setSaving(false);
    }
  };

  if (isCompleted) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">School Configuration</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Schools have been configured.
          </p>
          <p className="mt-1 text-sm text-green-700">
            {schools.length > 0
              ? `${schools.length} school(s) configured.`
              : 'School configuration is complete.'}
          </p>
        </div>
        <div className="mt-6 flex justify-between">
          {onBack && (
            <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          <button
            onClick={onComplete}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">School Configuration</h2>
      <p className="mb-6 text-sm text-gray-600">
        Review the schools imported from your SIS or add them manually. Assign a school administrator
        and configure grade levels for each school.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading schools...</div>
      ) : (
        <>
          {/* School list */}
          {schools.length > 0 && editingIdx === null && (
            <div className="mb-4 space-y-3">
              {schools.map((school, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{school.name}</p>
                    <p className="text-xs text-gray-500">
                      {school.grades.length > 0
                        ? `Grades: ${school.grades.join(', ')}`
                        : 'No grades selected'}
                      {school.nces_id && ` • NCES: ${school.nces_id}`}
                    </p>
                    {school.adminEmail && (
                      <p className="text-xs text-gray-500">Admin: {school.adminEmail}</p>
                    )}
                    {(school.address || school.city) && (
                      <p className="text-xs text-gray-400">
                        {[school.address, school.city, school.state, school.zip]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSchool(idx)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSchool(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit form */}
          {editingIdx !== null && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-blue-900">
                {editingIdx < schools.length ? 'Edit School' : 'Add New School'}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                    School Name *
                  </label>
                  <input
                    id="schoolName"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Lincoln Elementary"
                  />
                </div>
                <div>
                  <label htmlFor="ncesId" className="block text-sm font-medium text-gray-700">
                    NCES ID
                  </label>
                  <input
                    id="ncesId"
                    value={draft.nces_id}
                    onChange={(e) => setDraft((prev) => ({ ...prev, nces_id: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 060016001234"
                  />
                </div>
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                    School Admin Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={draft.adminEmail}
                    onChange={(e) => setDraft((prev) => ({ ...prev, adminEmail: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="admin@school.edu"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    id="address"
                    value={draft.address}
                    onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    id="city"
                    value={draft.city}
                    onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      id="state"
                      value={draft.state}
                      onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700">ZIP</label>
                    <input
                      id="zip"
                      value={draft.zip}
                      onChange={(e) => setDraft((prev) => ({ ...prev, zip: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Grade selector */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Grade Levels</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        draft.grades.includes(grade)
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={!draft.name.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingIdx < schools.length ? 'Update School' : 'Add School'}
                </button>
                <button
                  onClick={handleCancelDraft}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add school button */}
          {editingIdx === null && (
            <button
              onClick={handleAddSchool}
              className="mb-6 w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600"
            >
              + Add School
            </button>
          )}

          {/* Actions */}
          <div className="flex justify-between border-t border-gray-200 pt-4">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={schools.length === 0 || saving}
              className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
