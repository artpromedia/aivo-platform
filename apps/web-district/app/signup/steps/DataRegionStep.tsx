'use client';

import { useState, useEffect } from 'react';

interface RegionInfo {
  id: string;
  label: string;
  location: string;
  compliance: string[];
}

const REGIONS: RegionInfo[] = [
  { id: 'us-east-1', label: 'US East (Virginia)', location: 'Virginia, USA', compliance: ['FERPA', 'COPPA', 'SOC 2'] },
  { id: 'us-west-2', label: 'US West (Oregon)', location: 'Oregon, USA', compliance: ['FERPA', 'COPPA', 'SOC 2'] },
  { id: 'eu-west-1', label: 'EU West (Ireland)', location: 'Ireland, EU', compliance: ['GDPR', 'SOC 2'] },
  { id: 'eu-central-1', label: 'EU Central (Frankfurt)', location: 'Frankfurt, Germany', compliance: ['GDPR', 'SOC 2'] },
  { id: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', location: 'Singapore', compliance: ['PDPA'] },
];

const COUNTRY_REGION_MAP: Record<string, string> = {
  US: 'us-east-1', CA: 'us-east-1',
  GB: 'eu-west-1', IE: 'eu-west-1', FR: 'eu-west-1', ES: 'eu-west-1', PT: 'eu-west-1', IT: 'eu-west-1', NL: 'eu-west-1',
  DE: 'eu-central-1', AT: 'eu-central-1', CH: 'eu-central-1', PL: 'eu-central-1', CZ: 'eu-central-1',
  SG: 'ap-southeast-1', MY: 'ap-southeast-1', TH: 'ap-southeast-1', AU: 'ap-southeast-1', NZ: 'ap-southeast-1',
  JP: 'ap-southeast-1', KR: 'ap-southeast-1', IN: 'ap-southeast-1',
};

const COMPLIANCE_BADGES: Record<string, { color: string; description: string }> = {
  FERPA: { color: 'bg-blue-100 text-blue-800', description: 'Family Educational Rights and Privacy Act' },
  COPPA: { color: 'bg-green-100 text-green-800', description: 'Children\'s Online Privacy Protection Act' },
  GDPR: { color: 'bg-purple-100 text-purple-800', description: 'EU General Data Protection Regulation' },
  PDPA: { color: 'bg-orange-100 text-orange-800', description: 'Personal Data Protection Act (Singapore)' },
  'SOC 2': { color: 'bg-gray-100 text-gray-800', description: 'SOC 2 Type II Certified' },
};

interface DataRegionStepProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DataRegionStep({ selectedRegion, onRegionChange, onNext, onBack }: DataRegionStepProps) {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    async function detectCountry() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.startsWith('Europe/')) {
          const country = tz.includes('Berlin') || tz.includes('Vienna') || tz.includes('Zurich')
            ? 'DE'
            : tz.includes('London') ? 'GB' : 'IE';
          setDetectedCountry(country);
          if (!selectedRegion) onRegionChange(COUNTRY_REGION_MAP[country] ?? 'us-east-1');
        } else if (tz.startsWith('Asia/')) {
          setDetectedCountry('SG');
          if (!selectedRegion) onRegionChange('ap-southeast-1');
        } else {
          setDetectedCountry('US');
          if (!selectedRegion) onRegionChange('us-east-1');
        }
      } catch {
        if (!selectedRegion) onRegionChange('us-east-1');
      }
    }
    detectCountry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Data Residency Region</h2>
        <p className="mt-1 text-sm text-gray-600">
          Choose where your organization&apos;s data will be stored. This affects latency, compliance,
          and data sovereignty. <strong>This cannot be changed after provisioning</strong> without a
          full data migration.
        </p>
      </div>

      {detectedCountry && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          Based on your location, we recommend{' '}
          <strong>{REGIONS.find((r) => r.id === (COUNTRY_REGION_MAP[detectedCountry] ?? 'us-east-1'))?.label}</strong>.
        </div>
      )}

      <div className="grid gap-3">
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onRegionChange(region.id)}
              className={`flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{region.label}</span>
                  <span className="ml-2 text-sm text-gray-500">{region.location}</span>
                </div>
                {isSelected && (
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {region.compliance.map((badge) => (
                  <span
                    key={badge}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COMPLIANCE_BADGES[badge]?.color ?? 'bg-gray-100 text-gray-800'}`}
                    title={COMPLIANCE_BADGES[badge]?.description}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        <strong>Important:</strong> Once your organization is provisioned, the data region cannot be
        changed. All student records, assessments, and PII will be stored exclusively in the selected
        region. A full data migration is required to change regions after provisioning.
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedRegion}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
