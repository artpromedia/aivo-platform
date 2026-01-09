'use client';

/**
 * Install Modal Component
 *
 * Modal for installing marketplace items at district or school level.
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  type MarketplaceItemDetail,
  createInstallation,
  createSchoolInstallations,
  getGradeBandLabel,
} from '../../../../lib/marketplace-api';

interface Props {
  item: MarketplaceItemDetail;
  tenantId: string;
  onClose: () => void;
}

interface School {
  id: string;
  name: string;
  gradeBand?: string;
}

export function InstallModal({ item, tenantId, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'scope' | 'config' | 'confirm' | 'success'>('scope');
  const [scope, setScope] = useState<'district' | 'schools'>('district');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [enabledGradeBands, setEnabledGradeBands] = useState<string[]>(item.gradeBands);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schools if needed
  useEffect(() => {
    if (scope === 'schools' && schools.length === 0) {
      loadSchools();
    }
  }, [scope]);

  async function loadSchools() {
    setLoadingSchools(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/tenants/${tenantId}/schools`);
      // const data = await response.json();
      // setSchools(data);

      // Mock data for now
      setSchools([
        { id: '1', name: 'Lincoln Elementary', gradeBand: 'K_2' },
        { id: '2', name: 'Washington Middle School', gradeBand: 'G6_8' },
        { id: '3', name: 'Jefferson High School', gradeBand: 'G9_12' },
        { id: '4', name: 'Adams Elementary', gradeBand: 'G3_5' },
      ]);
    } catch (err) {
      console.error('Failed to load schools:', err);
    } finally {
      setLoadingSchools(false);
    }
  }

  async function handleInstall() {
    setInstalling(true);
    setError(null);

    try {
      const config = {
        enabledGradeBands,
      };

      if (scope === 'district') {
        await createInstallation(tenantId, {
          marketplaceItemId: item.id,
          marketplaceItemVersionId: item.latestVersion?.id,
          configJson: config,
          installReason: 'District-wide installation',
        });
      } else {
        await createSchoolInstallations(tenantId, {
          marketplaceItemId: item.id,
          marketplaceItemVersionId: item.latestVersion?.id,
          schoolIds: selectedSchools,
          configJson: config,
          installReason: `School-specific installation (${selectedSchools.length} schools)`,
        });
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setInstalling(false);
    }
  }

  function toggleSchool(schoolId: string) {
    setSelectedSchools((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  }

  function toggleAllSchools() {
    if (selectedSchools.length === schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map((s) => s.id));
    }
  }

  function toggleGradeBand(gradeBand: string) {
    setEnabledGradeBands((prev) =>
      prev.includes(gradeBand) ? prev.filter((g) => g !== gradeBand) : [...prev, gradeBand]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {item.iconUrl ? (
              <img src={item.iconUrl} alt={`${item.title} icon`} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-lg">
                📦
              </div>
            )}
            <div>
              <h2 className="font-semibold">Install {item.title}</h2>
              <p className="text-xs text-muted">by {item.vendor.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'scope' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Choose where to install this{' '}
                {item.itemType === 'CONTENT_PACK' ? 'content pack' : 'tool'}:
              </p>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'district'}
                    onChange={() => {
                      setScope('district');
                    }}
                    className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">Entire District</div>
                    <p className="mt-0.5 text-sm text-muted">
                      All schools and teachers will have access
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'schools'}
                    onChange={() => {
                      setScope('schools');
                    }}
                    className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">Specific Schools</div>
                    <p className="mt-0.5 text-sm text-muted">Choose which schools have access</p>
                  </div>
                </label>
              </div>

              {scope === 'schools' && (
                <div className="mt-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <span className="text-sm font-medium">Select Schools</span>
                    <button
                      onClick={toggleAllSchools}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedSchools.length === schools.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2">
                    {loadingSchools ? (
                      <div className="py-4 text-center text-sm text-muted">Loading schools...</div>
                    ) : (
                      schools.map((school) => (
                        <label
                          key={school.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-muted"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSchools.includes(school.id)}
                            onChange={() => {
                              toggleSchool(school.id);
                            }}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="flex-1">{school.name}</span>
                          {school.gradeBand && (
                            <span className="text-xs text-muted">
                              {getGradeBandLabel(school.gradeBand)}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Configure installation options:</p>

              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium">Enabled Grade Bands</h3>
                <p className="mt-1 text-xs text-muted">
                  Teachers will only see this item for selected grade bands
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.gradeBands.map((gradeBand) => (
                    <label
                      key={gradeBand}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        enabledGradeBands.includes(gradeBand)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabledGradeBands.includes(gradeBand)}
                        onChange={() => {
                          toggleGradeBand(gradeBand);
                        }}
                        className="sr-only"
                      />
                      {getGradeBandLabel(gradeBand)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-muted p-4">
                <h3 className="font-medium">Installation Summary</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Item</dt>
                    <dd className="font-medium">{item.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Version</dt>
                    <dd>{item.latestVersion?.version || 'Latest'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Scope</dt>
                    <dd>
                      {scope === 'district'
                        ? 'Entire District'
                        : `${selectedSchools.length} school${selectedSchools.length !== 1 ? 's' : ''}`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Grade Bands</dt>
                    <dd>{enabledGradeBands.map(getGradeBandLabel).join(', ')}</dd>
                  </div>
                </dl>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex gap-2">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-blue-700">
                    After installation, teachers in the selected scope will see this item in their
                    library and can add it to their classes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Installation Complete!</h3>
              <p className="mt-2 text-sm text-muted">
                {item.title} has been installed for your{' '}
                {scope === 'district' ? 'district' : 'selected schools'}.
              </p>
              <div className="mt-6 rounded-lg bg-surface-muted p-4 text-left text-sm">
                <h4 className="font-medium">What&apos;s next?</h4>
                <ul className="mt-2 space-y-2 text-muted">
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    Teachers will now see this item in their library
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    They can add it to their classes from the library
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    You can manage this installation from the Installations page
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {step === 'success' ? (
            <>
              <button
                onClick={() => {
                  router.push('/marketplace/installations');
                }}
                className="text-sm text-primary hover:underline"
              >
                View Installations
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={
                  step === 'scope'
                    ? onClose
                    : () => {
                        setStep(step === 'confirm' ? 'config' : 'scope');
                      }
                }
                className="text-sm text-muted hover:text-text"
              >
                {step === 'scope' ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (step === 'scope') {
                    if (scope === 'schools' && selectedSchools.length === 0) {
                      return; // Don't proceed without selected schools
                    }
                    setStep('config');
                  } else if (step === 'config') {
                    if (enabledGradeBands.length === 0) {
                      return; // Need at least one grade band
                    }
                    setStep('confirm');
                  } else {
                    void handleInstall();
                  }
                }}
                disabled={
                  (step === 'scope' && scope === 'schools' && selectedSchools.length === 0) ||
                  (step === 'config' && enabledGradeBands.length === 0) ||
                  installing
                }
                className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {installing
                  ? 'Installing...'
                  : step === 'confirm'
                    ? 'Confirm Installation'
                    : 'Continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
