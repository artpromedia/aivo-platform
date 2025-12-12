'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createItem,
  type CreateItemInput,
  SUBJECTS,
  GRADE_BANDS,
  MODALITIES,
} from '../../../lib/api';

// Demo vendor ID - in real app would come from auth context
const VENDOR_ID = 'vendor-123';

type ItemType = 'CONTENT_PACK' | 'EMBEDDED_TOOL';

export function NewItemForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [formData, setFormData] = useState<Partial<CreateItemInput>>({
    subjects: [],
    gradeBands: [],
    modalities: [],
    searchKeywords: [],
  });

  const updateField = <K extends keyof CreateItemInput>(field: K, value: CreateItemInput[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'subjects' | 'gradeBands' | 'modalities', value: string) => {
    setFormData((prev) => {
      const current = (prev[field] ?? []) as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleSubmit = async () => {
    if (!itemType) return;

    try {
      setLoading(true);
      setError(null);

      const input: CreateItemInput = {
        slug: formData.slug ?? '',
        title: formData.title ?? '',
        shortDescription: formData.shortDescription ?? '',
        longDescription: formData.longDescription ?? '',
        itemType,
        subjects: formData.subjects ?? [],
        gradeBands: formData.gradeBands ?? [],
        modalities: formData.modalities,
        iconUrl: formData.iconUrl,
        pricingModel: formData.pricingModel,
        searchKeywords: formData.searchKeywords,
      };

      const response = await createItem(VENDOR_ID, input);
      router.push(`/items/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Choose type
  if (step === 1) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-medium">What type of item are you creating?</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => {
              setItemType('CONTENT_PACK');
              setStep(2);
            }}
            className={`rounded-lg border-2 p-6 text-left transition-colors ${
              itemType === 'CONTENT_PACK'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-3xl">📦</div>
            <h3 className="mt-3 font-semibold">Content Pack</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A curated collection of Learning Objects bundled together for specific subjects,
              grades, or themes.
            </p>
          </button>

          <button
            onClick={() => {
              setItemType('EMBEDDED_TOOL');
              setStep(2);
            }}
            className={`rounded-lg border-2 p-6 text-left transition-colors ${
              itemType === 'EMBEDDED_TOOL'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-3xl">🔧</div>
            <h3 className="mt-3 font-semibold">Embedded Tool</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              An external application or service that integrates into the Aivo learning experience.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Basic info
  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Basic Information</h2>
          <span className="text-sm text-muted-foreground">Step 2 of 4</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title ?? ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter a descriptive title"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.slug ?? ''}
              onChange={(e) =>
                updateField(
                  'slug',
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                )
              }
              placeholder="my-awesome-pack"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Short Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shortDescription ?? ''}
              onChange={(e) => updateField('shortDescription', e.target.value)}
              placeholder="A brief summary (shown in cards)"
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.shortDescription?.length ?? 0}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Full Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.longDescription ?? ''}
              onChange={(e) => updateField('longDescription', e.target.value)}
              placeholder="Detailed description of your item (supports markdown)"
              rows={6}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Icon URL</label>
            <input
              type="url"
              value={formData.iconUrl ?? ''}
              onChange={(e) => updateField('iconUrl', e.target.value)}
              placeholder="https://example.com/icon.png"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={() => setStep(1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={!formData.title || !formData.slug || !formData.shortDescription}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Classification
  if (step === 3) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Classification</h2>
          <span className="text-sm text-muted-foreground">Step 3 of 4</span>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Subjects <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => toggleArrayItem('subjects', subject.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    formData.subjects?.includes(subject.value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {subject.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Grade Bands <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GRADE_BANDS.map((grade) => (
                <button
                  key={grade.value}
                  onClick={() => toggleArrayItem('gradeBands', grade.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    formData.gradeBands?.includes(grade.value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Modalities</label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((modality) => (
                <button
                  key={modality.value}
                  onClick={() => toggleArrayItem('modalities', modality.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    formData.modalities?.includes(modality.value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {modality.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={() => setStep(2)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back
          </button>
          <button
            onClick={() => setStep(4)}
            disabled={!formData.subjects?.length || !formData.gradeBands?.length}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Review & Create
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Review & Create</h2>
        <span className="text-sm text-muted-foreground">Step 4 of 4</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div className="flex items-start gap-4">
          {formData.iconUrl ? (
            <img
              src={formData.iconUrl}
              alt=""
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-2xl">
              {itemType === 'CONTENT_PACK' ? '📦' : '🔧'}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{formData.title}</h3>
            <p className="text-sm text-muted-foreground">
              {itemType === 'CONTENT_PACK' ? 'Content Pack' : 'Embedded Tool'} · /{formData.slug}
            </p>
          </div>
        </div>

        <p className="text-sm">{formData.shortDescription}</p>

        <div className="flex flex-wrap gap-2">
          {formData.subjects?.map((s) => (
            <span key={s} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
              {SUBJECTS.find((x) => x.value === s)?.label ?? s}
            </span>
          ))}
          {formData.gradeBands?.map((g) => (
            <span key={g} className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
              {GRADE_BANDS.find((x) => x.value === g)?.label ?? g}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        <strong>What happens next:</strong>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Your item will be created with version 1.0.0 in DRAFT status</li>
          {itemType === 'CONTENT_PACK' && <li>You can then add Learning Objects to your pack</li>}
          {itemType === 'EMBEDDED_TOOL' && (
            <li>You can then configure the tool launch settings and scopes</li>
          )}
          <li>Submit for review when ready</li>
        </ul>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep(3)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Item'}
        </button>
      </div>
    </div>
  );
}
