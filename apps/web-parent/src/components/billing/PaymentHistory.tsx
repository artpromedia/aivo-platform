'use client';

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Invoice } from '@/lib/billing-types';

interface PaymentHistoryProps {
  payments: Invoice[];
  isLoading?: boolean;
  onDownloadInvoice?: (invoiceId: string, description: string) => void;
  initialShowCount?: number;
}

function getStatusBadge(status: Invoice['status']): { color: string; label: string; icon: React.ReactNode } {
  switch (status) {
    case 'paid':
      return {
        color: 'bg-green-100 text-green-800',
        label: 'Paid',
        icon: <CheckCircle className="w-3 h-3" />,
      };
    case 'open':
      return {
        color: 'bg-blue-100 text-blue-800',
        label: 'Due',
        icon: <Clock className="w-3 h-3" />,
      };
    case 'draft':
      return {
        color: 'bg-gray-100 text-gray-600',
        label: 'Draft',
        icon: <FileText className="w-3 h-3" />,
      };
    case 'void':
      return {
        color: 'bg-gray-100 text-gray-500',
        label: 'Void',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    case 'uncollectible':
      return {
        color: 'bg-red-100 text-red-800',
        label: 'Failed',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800',
        label: status,
        icon: <FileText className="w-3 h-3" />,
      };
  }
}

export function PaymentHistory({
  payments,
  isLoading = false,
  onDownloadInvoice,
  initialShowCount = 5,
}: PaymentHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const displayedPayments = showAll ? payments : payments.slice(0, initialShowCount);
  const hasMore = payments.length > initialShowCount;

  const handleDownload = async (invoice: Invoice) => {
    if (!onDownloadInvoice) return;
    setDownloadingId(invoice.id);
    try {
      await onDownloadInvoice(invoice.id, invoice.description);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-3">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        {payments.length > 0 && (
          <span className="text-sm text-gray-500">
            {payments.length} invoice{payments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No billing history yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Invoices will appear here after your first payment
          </p>
        </div>
      ) : (
        <>
          {/* Desktop view - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Date</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Description</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Amount</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Status</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedPayments.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 text-sm text-gray-600">{invoice.description}</td>
                      <td className="py-3 text-sm font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.hostedInvoiceUrl && (
                            <a
                              href={invoice.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="View invoice"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {onDownloadInvoice && (
                            <button
                              onClick={() => handleDownload(invoice)}
                              disabled={downloadingId === invoice.id}
                              className="p-1 text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                              title="Download PDF"
                            >
                              <Download
                                className={`w-4 h-4 ${downloadingId === invoice.id ? 'animate-pulse' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-3">
            {displayedPayments.map((invoice) => {
              const statusBadge = getStatusBadge(invoice.status);
              return (
                <div
                  key={invoice.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                    >
                      {statusBadge.icon}
                      {statusBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{invoice.description}</p>
                  <div className="flex items-center gap-3">
                    {invoice.hostedInvoiceUrl && (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    )}
                    {onDownloadInvoice && (
                      <button
                        onClick={() => handleDownload(invoice)}
                        disabled={downloadingId === invoice.id}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more/less button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showAll ? (
                  <>
                    Show less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show all ({payments.length}) <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
