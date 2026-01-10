'use client';

import { Badge, Button } from '@aivo/ui-web';
import Link from 'next/link';

interface ContractInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amountDueCents: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';
}

interface ContractInvoicesSectionProps {
  invoices: ContractInvoice[];
  contractId: string;
}

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusTone(
  status: ContractInvoice['status']
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'SENT':
      return 'neutral';
    case 'OVERDUE':
      return 'error';
    case 'DRAFT':
    case 'VOID':
    default:
      return 'neutral';
  }
}

export function ContractInvoicesSection({ invoices, contractId }: ContractInvoicesSectionProps) {
  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.amountDueCents, 0);

  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Contract Invoices</h3>
            <p className="mt-1 text-sm text-muted">Invoices associated with your contract</p>
          </div>
          {totalOutstanding > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted">Outstanding Balance</div>
              <div
                className={`text-lg font-semibold ${overdueInvoices.length > 0 ? 'text-error' : 'text-text'}`}
              >
                {formatCurrency(totalOutstanding)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueInvoices.length > 0 && (
        <div className="border-b border-border bg-error/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error/20">
              <svg
                className="h-5 w-5 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-error">
                {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-muted">
                Please submit payment to avoid service interruption.
              </div>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="p-6 text-center text-muted">
          No invoices have been generated for this contract yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-subtle">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-surface-subtle">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text">
                    {formatCurrency(invoice.amountDueCents, invoice.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge tone={getStatusTone(invoice.status)}>{invoice.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link href={`/billing/invoices/${invoice.id}`}>
                      <Button variant="ghost">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer with payment info */}
      {invoices.length > 0 && (
        <div className="border-t border-border bg-surface-subtle px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              Questions about billing? Contact{' '}
              <a href="mailto:billing@aivolearning.com" className="text-primary hover:underline">
                billing@aivolearning.com
              </a>
            </span>
            <Link href={`/billing/contracts/${contractId}`}>
              <Button variant="ghost">View Full Contract →</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
