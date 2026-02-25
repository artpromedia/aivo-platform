'use client';

import { useState } from 'react';

import type { SignUpStepProps } from '../SignUpWizard';

export function AdminAccountStep({ formData, onUpdate, onNext, onBack }: SignUpStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Full name is required';
    }
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Enter a valid email address';
    }
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.adminPassword)) {
      newErrors.adminPassword = 'Password must include upper, lower, and a number';
    }
    if (formData.adminPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Admin Account</h2>
      <p className="mb-6 text-sm text-gray-600">
        Create your administrator account. You&apos;ll use this to manage your district.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="adminName" className="mb-1 block text-sm font-medium text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="adminName"
            type="text"
            value={formData.adminName}
            onChange={(e) => onUpdate({ adminName: e.target.value })}
            placeholder="Jane Doe"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.adminName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.adminName && (
            <p className="mt-1 text-xs text-red-600">{errors.adminName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="adminEmail" className="mb-1 block text-sm font-medium text-gray-700">
            Work Email <span className="text-red-500">*</span>
          </label>
          <input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => onUpdate({ adminEmail: e.target.value })}
            placeholder="jane.doe@springfield.edu"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.adminEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.adminEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.adminEmail}</p>
          )}
        </div>

        {/* Phone (optional) */}
        <div>
          <label htmlFor="adminPhone" className="mb-1 block text-sm font-medium text-gray-700">
            Phone Number <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="adminPhone"
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => onUpdate({ adminPhone: e.target.value })}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="adminPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="adminPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.adminPassword}
              onChange={(e) => onUpdate({ adminPassword: e.target.value })}
              placeholder="At least 8 characters"
              className={`w-full rounded-lg border px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.adminPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.adminPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.adminPassword}</p>
          )}
          <div className="mt-2 space-y-1">
            <PasswordRule met={formData.adminPassword.length >= 8} label="At least 8 characters" />
            <PasswordRule met={/[A-Z]/.test(formData.adminPassword)} label="One uppercase letter" />
            <PasswordRule met={/[a-z]/.test(formData.adminPassword)} label="One lowercase letter" />
            <PasswordRule met={/\d/.test(formData.adminPassword)} label="One number" />
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="flex justify-between pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <span>{met ? '✓' : '○'}</span>
      {label}
    </p>
  );
}
