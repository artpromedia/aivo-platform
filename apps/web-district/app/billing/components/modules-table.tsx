'use client';

import { Badge, Button } from '@aivo/ui-web';

import type { ModuleEntitlement } from '../../../lib/billing-api';
import { getModuleDisplayName } from '../../../lib/billing-api';

interface ModulesTableProps {
  entitlements: ModuleEntitlement[];
}

export function ModulesTable({ entitlements }: ModulesTableProps) {
  const handleRequestModules = () => {
    const modulesList = entitlements
      .filter((e) => !e.isEnabled)
      .map((e) => getModuleDisplayName(e.featureCode))
      .join(', ');

    window.open(
      `mailto:sales@aivolearning.com?subject=Module%20Request&body=Hi%2C%0A%0AI%20would%20like%20to%20request%20additional%20modules%20for%20our%20district.%0A%0AModules%20of%20interest%3A%20${encodeURIComponent(modulesList)}%0A%0APlease%20contact%20me%20to%20discuss.`,
      '_blank'
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-text">Learning Modules</h3>
        <Button variant="ghost" onClick={handleRequestModules}>
          Request more modules
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Learning modules">
          <thead className="border-b border-border bg-surface-muted/50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Module
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entitlements.map((entitlement) => (
              <tr
                key={entitlement.id}
                className="transition-colors hover:bg-surface-muted/30 focus-within:bg-surface-muted/30"
                tabIndex={0}
                role="row"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ModuleIcon featureCode={entitlement.featureCode} isEnabled={entitlement.isEnabled} />
                    <span className="font-medium text-text">
                      {getModuleDisplayName(entitlement.featureCode)}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge tone={entitlement.isEnabled ? 'success' : 'neutral'}>
                    {entitlement.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">
                  {formatSource(entitlement.source)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleIcon({ featureCode, isEnabled }: { featureCode: string; isEnabled: boolean }) {
  const iconColor = isEnabled ? 'text-primary' : 'text-muted';
  
  // Simple icon based on module type
  const iconPath = getIconPath(featureCode);

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
        isEnabled ? 'bg-primary/10' : 'bg-surface-muted'
      }`}
    >
      <svg
        className={`h-4 w-4 ${iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
    </div>
  );
}

function getIconPath(featureCode: string): string {
  const icons: Record<string, string> = {
    MODULE_ELA: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', // book
    MODULE_MATH: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', // calculator
    MODULE_SEL: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', // heart
    MODULE_SPEECH: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', // microphone
    MODULE_SCIENCE: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', // beaker
    MODULE_CODING: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', // code
    MODULE_WRITING: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', // pencil
  };
  return icons[featureCode] || 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'; // default clipboard
}

function formatSource(source: string): string {
  const sources: Record<string, string> = {
    DISTRICT_PREMIUM: 'District Premium Plan',
    DISTRICT_BASE: 'District Base Plan',
    ADD_ON: 'Add-on Module',
    TRIAL: 'Trial',
  };
  return sources[source] || source.replace(/_/g, ' ');
}
