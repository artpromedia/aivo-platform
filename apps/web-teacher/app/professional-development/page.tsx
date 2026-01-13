/**
 * Professional Development Dashboard
 *
 * Main PD hub showing progress, compliance, and course recommendations
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import {
  PDComplianceDashboard,
  PDCourseList,
  PDCertificateList,
} from '@/components/professional-development';
import {
  usePDPrograms,
  usePDEnrollments,
  usePDProgress,
  usePDCompliance,
  usePDCertificates,
} from '@/hooks/use-professional-development';

export default function ProfessionalDevelopmentPage() {
  const { programs, loading: programsLoading } = usePDPrograms();
  const { enrollments, loading: enrollmentsLoading, enroll } = usePDEnrollments();
  const { progress, loading: progressLoading } = usePDProgress();
  const { compliance, loading: complianceLoading } = usePDCompliance();
  const { certificates, loading: certificatesLoading, downloadCertificate } = usePDCertificates();

  const isLoading =
    programsLoading ||
    enrollmentsLoading ||
    progressLoading ||
    complianceLoading ||
    certificatesLoading;

  // Get in-progress courses
  const inProgressEnrollments = enrollments.filter((e) => e.status === 'IN_PROGRESS');
  const inProgressPrograms = programs.filter((p) =>
    inProgressEnrollments.some((e) => e.programId === p.id)
  );

  // Get recommended courses (not yet enrolled)
  const enrolledProgramIds = new Set(enrollments.map((e) => e.programId));
  const recommendedPrograms = programs
    .filter((p) => !enrolledProgramIds.has(p.id) && p.status === 'PUBLISHED')
    .slice(0, 3);

  // Recent certificates
  const recentCertificates = certificates.slice(0, 2);

  const handleEnroll = async (programId: string) => {
    try {
      await enroll(programId);
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500">Loading your PD dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Professional Development</h1>
          <p className="mt-2 text-gray-600">
            Track your progress, complete requirements, and grow professionally
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/professional-development/courses"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CoursesIcon />
            Browse Courses
          </Link>
          <Link
            href="/professional-development/certifications"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CertIcon />
            My Certificates
          </Link>
          <Link
            href="/professional-development/requirements"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RequirementsIcon />
            Requirements
          </Link>
        </div>

        {/* Compliance Dashboard */}
        {compliance && (
          <div className="mb-8">
            <PDComplianceDashboard compliance={compliance} progress={progress} />
          </div>
        )}

        {/* Continue Learning */}
        {inProgressPrograms.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Continue Learning</h2>
              <Link
                href="/professional-development/courses?filter=in-progress"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
              </Link>
            </div>
            <PDCourseList
              programs={inProgressPrograms}
              enrollments={inProgressEnrollments}
            />
          </section>
        )}

        {/* Recommended Courses */}
        {recommendedPrograms.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recommended for You</h2>
              <Link
                href="/professional-development/courses"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Browse all
              </Link>
            </div>
            <PDCourseList
              programs={recommendedPrograms}
              onEnroll={handleEnroll}
            />
          </section>
        )}

        {/* Recent Certificates */}
        {recentCertificates.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Certificates</h2>
              <Link
                href="/professional-development/certifications"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
              </Link>
            </div>
            <PDCertificateList
              certificates={recentCertificates}
              onDownload={downloadCertificate}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function CoursesIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function CertIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  );
}

function RequirementsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}
