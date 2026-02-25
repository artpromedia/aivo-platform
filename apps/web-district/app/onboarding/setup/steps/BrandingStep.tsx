'use client';

import { useState, useRef } from 'react';

import type { SetupStepProps } from '../PostSignUpSetup';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

export function BrandingStep({ tenantId, accessToken, onComplete, onSkip, isCompleted }: SetupStepProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2 MB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      setError('Logo must be PNG, JPG, or SVG');
      return;
    }

    setLogoFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Save branding settings
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      await fetch(`${API_BASE}/tenants/${tenantId}/branding`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          primaryColor,
          ...(logoPreview ? { logoDataUrl: logoPreview } : {}),
        }),
      });

      onComplete();
    } catch {
      setError('Failed to save branding. You can try again later from Settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Branding & Logo</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Branding has been configured.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onComplete} className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Branding & Logo</h2>
      <p className="mb-6 text-sm text-gray-600">
        Upload your district logo and set brand colors. This will appear throughout the platform.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">District Logo</label>
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl text-gray-400">📷</span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Choose File
              </button>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, or SVG. Max 2 MB.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-gray-700">
            Primary Brand Color
          </label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              maxLength={7}
            />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
