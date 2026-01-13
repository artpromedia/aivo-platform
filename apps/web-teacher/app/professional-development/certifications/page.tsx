/**
 * PD Certifications Page
 *
 * View and manage earned certificates
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PDCertificateList } from '@/components/professional-development';
import { usePDCertificates } from '@/hooks/use-professional-development';
import { formatCreditHours } from '@/lib/api/professional-development';

export default function CertificationsPage() {
  const { certificates, loading, downloadCertificate } = usePDCertificates();
  const [verifyNumber, setVerifyNumber] = React.useState('');
  const [verifyResult, setVerifyResult] = React.useState<'valid' | 'invalid' | null>(null);

  // Calculate summary stats
  const totalCredits = certificates.reduce((sum, c) => sum + c.creditHours, 0);
  const activeCount = certificates.filter(
    (c) => !c.expiresAt || new Date(c.expiresAt) > new Date()
  ).length;
  const expiredCount = certificates.filter(
    (c) => c.expiresAt && new Date(c.expiresAt) <= new Date()
  ).length;

  const handleVerify = async () => {
    if (!verifyNumber) return;
    // In production, this would call the API
    const found = certificates.some((c) => c.certificateNumber === verifyNumber);
    setVerifyResult(found ? 'valid' : 'invalid');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/professional-development" className="hover:text-primary-600">
            Professional Development
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Certifications</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Certifications</h1>
          <p className="mt-1 text-gray-600">
            View, download, and share your earned certificates
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Certificates" value={certificates.length} icon={<CertIcon />} />
          <StatCard label="Active" value={activeCount} icon={<ActiveIcon />} color="green" />
          <StatCard label="Expired" value={expiredCount} icon={<ExpiredIcon />} color="red" />
          <StatCard
            label="Total Credits"
            value={totalCredits}
            suffix="hrs"
            icon={<CreditsIcon />}
            color="blue"
          />
        </div>

        {/* Verify Certificate */}
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Verify Certificate</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter certificate number..."
              value={verifyNumber}
              onChange={(e) => {
                setVerifyNumber(e.target.value);
                setVerifyResult(null);
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={handleVerify}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700"
            >
              Verify
            </button>
          </div>
          {verifyResult && (
            <div
              className={`mt-4 rounded-lg p-3 ${
                verifyResult === 'valid'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {verifyResult === 'valid'
                ? 'This certificate is valid and verified.'
                : 'Certificate not found. Please check the number and try again.'}
            </div>
          )}
        </div>

        {/* Certificates List */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">All Certificates</h2>
          <PDCertificateList
            certificates={certificates}
            onDownload={downloadCertificate}
            emptyMessage="Complete courses to earn certificates"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color?: 'green' | 'red' | 'blue';
}

function StatCard({ label, value, suffix, icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            color ? colorClasses[color] : 'bg-primary-100 text-primary-600'
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix && <span className="text-sm font-normal text-gray-500"> {suffix}</span>}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExpiredIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
