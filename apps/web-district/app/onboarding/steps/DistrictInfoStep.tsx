'use client';

import { useState } from 'react';

import type { WizardStepProps } from '../OnboardingWizard';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

interface DistrictFormData {
  name: string;
  stateCode: string;
  address: string;
  city: string;
  zipCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedSchools: number;
  estimatedStudents: number;
}

export function DistrictInfoStep({ tenantId, onComplete, status }: WizardStepProps) {
  const isExisting = status?.steps[0]?.completed ?? false;
  const [form, setForm] = useState<DistrictFormData>({
    name: '',
    stateCode: '',
    address: '',
    city: '',
    zipCode: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    estimatedSchools: 1,
    estimatedStudents: 100,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/onboarding/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? 'Failed to create district');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (isExisting) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">District Information</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> District information has been submitted.
          </p>
          <p className="mt-1 text-sm text-green-700">
            District: {status?.tenantName ?? 'Unknown'}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">District Information</h2>
      <p className="mb-6 text-sm text-gray-600">
        Enter your district&apos;s basic information to get started.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* District Details */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-700">District Details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                District Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Springfield Public Schools"
              />
            </div>
            <div>
              <label htmlFor="stateCode" className="block text-sm font-medium text-gray-700">
                State *
              </label>
              <select
                id="stateCode"
                name="stateCode"
                required
                value={form.stateCode}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select state...</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Street Address *
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              value={form.address}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="100 Main Street"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                value={form.city}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                ZIP Code *
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                required
                value={form.zipCode}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="62704"
              />
            </div>
          </div>
        </fieldset>

        {/* Size Estimates */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-700">District Size</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="estimatedSchools" className="block text-sm font-medium text-gray-700">
                Number of Schools *
              </label>
              <input
                id="estimatedSchools"
                name="estimatedSchools"
                type="number"
                required
                min={1}
                value={form.estimatedSchools}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="estimatedStudents" className="block text-sm font-medium text-gray-700">
                Estimated Students *
              </label>
              <input
                id="estimatedStudents"
                name="estimatedStudents"
                type="number"
                required
                min={1}
                value={form.estimatedStudents}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Primary Contact */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-700">Primary Contact</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                value={form.contactName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
              Phone (optional)
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={handleChange}
              className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </fieldset>

        <div className="flex justify-end border-t border-gray-200 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating District...' : 'Save & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
