/**
 * Bulk Enrollment Page
 *
 * Allows district admins to:
 * - Assign licenses to learners in bulk
 * - Send parent invitations in bulk
 * - Track enrollment status
 */

'use client';

import * as React from 'react';

import { BulkEnrollmentForm } from './components/bulk-enrollment-form';
import { EnrollmentBatchList } from './components/enrollment-batch-list';
import { EnrollmentStats } from './components/enrollment-stats';

export default function BulkEnrollmentPage() {
  const [activeTab, setActiveTab] = React.useState<'enroll' | 'batches'>('enroll');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Enrollment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign licenses to learners and send parent invitations
          </p>
        </div>
      </div>

      {/* Stats */}
      <EnrollmentStats />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('enroll');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enroll'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Enrollment History
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'enroll' ? <BulkEnrollmentForm /> : <EnrollmentBatchList />}
    </div>
  );
}
