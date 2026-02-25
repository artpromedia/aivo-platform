'use client';

import * as React from 'react';

import { BulkEnrollmentForm } from './bulk-enrollment-form';
import { EnrollmentBatchList } from './enrollment-batch-list';
import { EnrollmentStats } from './enrollment-stats';

interface EnrollmentContentProps {
  tenantId: string;
  accessToken?: string;
}

export function EnrollmentContent({ tenantId, accessToken }: EnrollmentContentProps) {
  const [activeTab, setActiveTab] = React.useState<'enroll' | 'batches'>('enroll');
  const [batchRefreshKey, setBatchRefreshKey] = React.useState(0);

  const handleBatchSubmitted = React.useCallback(() => {
    // Switch to batches tab and trigger refresh
    setActiveTab('batches');
    setBatchRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <EnrollmentStats tenantId={tenantId} accessToken={accessToken} />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('enroll');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enroll'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text hover:border-border'
            }`}
          >
            New Enrollment
          </button>
          <button
            onClick={() => {
              setActiveTab('batches');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'batches'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text hover:border-border'
            }`}
          >
            Enrollment History
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'enroll' ? (
        <BulkEnrollmentForm
          tenantId={tenantId}
          accessToken={accessToken}
          onBatchSubmitted={handleBatchSubmitted}
        />
      ) : (
        <EnrollmentBatchList
          key={batchRefreshKey}
          tenantId={tenantId}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
