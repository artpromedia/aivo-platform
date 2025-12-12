import { Suspense } from 'react';

import { requireAuth } from '../../lib/auth';
import {
  fetchActiveContract,
  fetchBillingAccount,
  fetchContractInvoices,
  fetchInvoices,
  fetchModuleEntitlements,
  fetchSeatCommitments,
  fetchSeatUsage,
  calculateDaysUntilEnd,
} from '../../lib/billing-api';

import { BillingHeader } from './components/billing-header';
import { ContractInvoicesSection } from './components/contract-invoices-section';
import { ContractOverview } from './components/contract-overview';
import { InvoicesSection } from './components/invoices-section';
import { ModulesTable } from './components/modules-table';
import { SeatCommitmentsCard } from './components/seat-commitments-card';
import { SeatUsageCard } from './components/seat-usage-card';
import { SeatWarningBanner } from './components/seat-warning-banner';

export const metadata = {
  title: 'Billing & Licensing | Aivo District Admin',
  description: 'Manage district licenses, modules, and invoices',
};

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface p-6">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="mt-4 h-8 w-1/2 rounded bg-surface-muted" />
    </div>
  );
}

async function BillingContent() {
  const auth = await requireAuth();
  const tenantId = auth.tenantId;

  // Fetch all billing data in parallel
  const [seatUsage, entitlements, billingAccount, contract] = await Promise.all([
    fetchSeatUsage(tenantId, auth.accessToken),
    fetchModuleEntitlements(tenantId, auth.accessToken),
    fetchBillingAccount(tenantId, auth.accessToken),
    fetchActiveContract(tenantId, auth.accessToken),
  ]);

  // Fetch invoices and contract data if we have them
  const [invoices, seatCommitments, contractInvoices] = await Promise.all([
    billingAccount ? fetchInvoices(billingAccount.id, auth.accessToken) : [],
    contract ? fetchSeatCommitments(contract.id, auth.accessToken) : [],
    contract ? fetchContractInvoices(contract.id, auth.accessToken) : [],
  ]);

  const daysUntilEnd = contract ? calculateDaysUntilEnd(contract.endDate) : 0;
  // TODO: Determine renewal status from renewal tasks
  const renewalStatus = daysUntilEnd <= 90 ? 'IN_PROGRESS' : null;

  return (
    <>
      {/* Seat Warning Banner */}
      <SeatWarningBanner seatUsage={seatUsage} />

      {/* Contract Overview Section */}
      {contract && (
        <section aria-labelledby="contract-heading" className="space-y-4">
          <h2 id="contract-heading" className="text-lg font-semibold text-text">
            Your Contract
          </h2>
          <ContractOverview
            contract={contract}
            daysUntilEnd={daysUntilEnd}
            renewalStatus={renewalStatus}
          />
        </section>
      )}

      {/* Seat Commitments */}
      {seatCommitments.length > 0 && (
        <section aria-labelledby="commitments-heading" className="space-y-4">
          <h2 id="commitments-heading" className="text-lg font-semibold text-text">
            Seat Usage
          </h2>
          <SeatCommitmentsCard commitments={seatCommitments} />
        </section>
      )}

      {/* Licenses & Modules Section */}
      <section aria-labelledby="licenses-heading" className="space-y-4">
        <h2 id="licenses-heading" className="text-lg font-semibold text-text">
          Licenses & Modules
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Seat Usage Card */}
          <SeatUsageCard seatUsage={seatUsage} />

          {/* Quick Stats Card */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <div className="text-sm font-medium text-muted">Enabled Modules</div>
            <div className="mt-1 text-2xl font-bold text-text">
              {entitlements.filter((e) => e.isEnabled).length} of {entitlements.length}
            </div>
            <p className="mt-2 text-sm text-muted">
              Contact your account manager to add more modules.
            </p>
          </div>
        </div>

        {/* Modules Table */}
        <ModulesTable entitlements={entitlements} />
      </section>

      {/* Contract Invoices Section */}
      {contract && contractInvoices.length > 0 && (
        <section aria-labelledby="contract-invoices-heading" className="space-y-4">
          <h2 id="contract-invoices-heading" className="text-lg font-semibold text-text">
            Contract Invoices
          </h2>
          <ContractInvoicesSection invoices={contractInvoices} contractId={contract.id} />
        </section>
      )}

      {/* Subscription Invoices & Payments Section */}
      <section aria-labelledby="invoices-heading" className="space-y-4">
        <h2 id="invoices-heading" className="text-lg font-semibold text-text">
          Subscription Invoices
        </h2>

        {billingAccount ? (
          <InvoicesSection invoices={invoices} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-muted">
              No billing account found. Contact support if you believe this is an error.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <BillingHeader />

      <Suspense
        fallback={
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Your Contract</h2>
              <LoadingCard />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Licenses & Modules</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <LoadingCard />
                <LoadingCard />
              </div>
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Invoices & Payments</h2>
              <LoadingCard />
            </section>
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
