'use client';

import { Button } from '@aivo/ui-web';

export function BillingHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing & Licensing</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your district&apos;s seat licenses, enabled modules, and view invoices.
        </p>
      </div>
      <Button
        variant="secondary"
        leftIcon={
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        onClick={() => {
          window.open(
            'mailto:support@aivo.com?subject=Billing%20Support%20Request&body=District%20Tenant%20ID%3A%20%5BYour%20Tenant%20ID%5D%0A%0APlease%20describe%20your%20billing%20question%3A',
            '_blank'
          );
        }}
      >
        Contact Support
      </Button>
    </header>
  );
}
