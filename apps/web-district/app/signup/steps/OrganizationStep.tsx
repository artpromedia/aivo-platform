'use client';

import { useState } from 'react';

import type { SignUpStepProps } from '../SignUpWizard';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

const ORG_TYPES = [
  { value: 'K12_DISTRICT', label: 'K-12 School District' },
  { value: 'CHARTER_NETWORK', label: 'Charter School Network' },
  { value: 'PRIVATE_SCHOOL', label: 'Private School / Academy' },
  { value: 'HIGHER_ED', label: 'Higher Education' },
  { value: 'OTHER', label: 'Other Organization' },
] as const;

const DISTRICT_SIZES = [
  { value: 'SMALL', label: 'Small (< 1,000 students)' },
  { value: 'MEDIUM', label: 'Medium (1,000 - 10,000 students)' },
  { value: 'LARGE', label: 'Large (10,000 - 50,000 students)' },
  { value: 'ENTERPRISE', label: 'Enterprise (50,000+ students)' },
] as const;

export function OrganizationStep({ formData, onUpdate, onNext }: SignUpStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    if (!formData.stateCode) {
      newErrors.stateCode = 'State is required';
    }
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Enter a valid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Organization Information</h2>
      <p className="mb-6 text-sm text-gray-600">
        Tell us about your organization so we can tailor the experience.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Organization Name */}
        <div>
          <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-gray-700">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            id="organizationName"
            type="text"
            value={formData.organizationName}
            onChange={(e) => onUpdate({ organizationName: e.target.value })}
            placeholder="Springfield School District"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.organizationName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.organizationName && (
            <p className="mt-1 text-xs text-red-600">{errors.organizationName}</p>
          )}
        </div>

        {/* Organization Type */}
        <div>
          <label htmlFor="organizationType" className="mb-1 block text-sm font-medium text-gray-700">
            Organization Type
          </label>
          <select
            id="organizationType"
            value={formData.organizationType}
            onChange={(e) => onUpdate({ organizationType: e.target.value as SignUpStepProps['formData']['organizationType'] })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* District Size */}
        <div>
          <label htmlFor="districtSize" className="mb-1 block text-sm font-medium text-gray-700">
            Approximate Size
          </label>
          <select
            id="districtSize"
            value={formData.districtSize}
            onChange={(e) => onUpdate({ districtSize: e.target.value as SignUpStepProps['formData']['districtSize'] })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DISTRICT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* State + ZIP row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stateCode" className="mb-1 block text-sm font-medium text-gray-700">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="stateCode"
              value={formData.stateCode}
              onChange={(e) => onUpdate({ stateCode: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.stateCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.stateCode && (
              <p className="mt-1 text-xs text-red-600">{errors.stateCode}</p>
            )}
          </div>

          <div>
            <label htmlFor="zipCode" className="mb-1 block text-sm font-medium text-gray-700">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              id="zipCode"
              type="text"
              value={formData.zipCode}
              onChange={(e) => onUpdate({ zipCode: e.target.value })}
              placeholder="62701"
              maxLength={10}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.zipCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.zipCode && (
              <p className="mt-1 text-xs text-red-600">{errors.zipCode}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}
