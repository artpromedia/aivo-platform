/**
 * PD Certificate Card Component
 *
 * Display a professional development certificate
 */

'use client';

import * as React from 'react';

import type { PDCertificate } from '@/lib/api/professional-development';
import { formatCreditHours } from '@/lib/api/professional-development';
import { cn } from '@/lib/utils';

interface PDCertificateCardProps {
  certificate: PDCertificate;
  onDownload?: () => void;
  className?: string;
}

export function PDCertificateCard({
  certificate,
  onDownload,
  className,
}: PDCertificateCardProps) {
  const isExpired = certificate.expiresAt
    ? new Date(certificate.expiresAt) < new Date()
    : false;
  const isExpiringSoon = certificate.expiresAt
    ? new Date(certificate.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 hover:shadow-md transition-shadow',
        isExpired && 'border-red-200 bg-red-50',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
            <CertificateIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{certificate.programTitle}</h3>
            <p className="text-sm text-gray-500">#{certificate.certificateNumber}</p>
          </div>
        </div>
        {isExpired && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            Expired
          </span>
        )}
        {!isExpired && isExpiringSoon && (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            Expiring Soon
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Issued</p>
          <p className="font-medium text-gray-900">
            {new Date(certificate.issuedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Credit Hours</p>
          <p className="font-medium text-gray-900">
            {formatCreditHours(certificate.creditHours)}
          </p>
        </div>
        {certificate.expiresAt && (
          <div>
            <p className="text-gray-500">Expires</p>
            <p
              className={cn(
                'font-medium',
                isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'
              )}
            >
              {new Date(certificate.expiresAt).toLocaleDateString()}
            </p>
          </div>
        )}
        <div>
          <p className="text-gray-500">Recipient</p>
          <p className="font-medium text-gray-900">{certificate.teacherName}</p>
        </div>
      </div>

      {onDownload && (
        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <DownloadIcon className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={() => {
              const text = `Certificate: ${certificate.programTitle}\nNumber: ${certificate.certificateNumber}\nIssued: ${new Date(certificate.issuedAt).toLocaleDateString()}`;
              void navigator.clipboard.writeText(text);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        </div>
      )}
    </div>
  );
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

/**
 * PD Certificate List Component
 */
interface PDCertificateListProps {
  certificates: PDCertificate[];
  emptyMessage?: string;
  onDownload?: (id: string) => void;
  className?: string;
}

export function PDCertificateList({
  certificates,
  emptyMessage = 'No certificates earned yet',
  onDownload,
  className,
}: PDCertificateListProps) {
  if (certificates.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <span className="text-4xl">🏆</span>
        <p className="mt-2">{emptyMessage}</p>
        <p className="text-sm">Complete courses to earn certificates</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {certificates.map((certificate) => (
        <PDCertificateCard
          key={certificate.id}
          certificate={certificate}
          onDownload={onDownload ? () => onDownload(certificate.id) : undefined}
        />
      ))}
    </div>
  );
}
