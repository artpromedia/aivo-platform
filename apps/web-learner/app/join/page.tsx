'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function JoinPage() {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!classCode.trim()) {
      setError('Please enter your class code');
      return;
    }

    if (classCode.length < 6) {
      setError('Class codes are at least 6 characters');
      return;
    }

    // TODO: Validate class code with API and redirect to learning session
    console.log('Joining with code:', classCode);
    // For now, simulate validation
    setError('This feature is coming soon! Ask your teacher or parent for help.');
  };

  return (
    <div className="min-h-screen bg-[var(--aivo-purple-50)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Image
              src="/icons/aivo-appicon-explorer.svg"
              alt="AIVO"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={80}
              height={26}
            />
          </Link>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--aivo-purple-400)] to-[var(--aivo-brand-primary)] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl">🎫</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-2">
            Join Your Class
          </h1>
          <p className="text-[var(--aivo-neutral-600)]">
            Enter the code from your teacher or parent
          </p>
        </div>

        {/* Join form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-[var(--aivo-purple-100)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="classCode" className="block text-sm font-medium text-[var(--aivo-neutral-700)] mb-2">
                Class Code
              </label>
              <input
                type="text"
                id="classCode"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-[var(--aivo-purple-200)] rounded-xl focus:border-[var(--aivo-brand-primary)] focus:ring-2 focus:ring-[var(--aivo-purple-100)] outline-none transition-all"
                maxLength={10}
                autoComplete="off"
                autoCapitalize="characters"
              />
              {error && (
                <p className="mt-2 text-sm text-[var(--aivo-color-error)]">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)] hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Start Learning! 🚀
            </button>
          </form>

          {/* Help section */}
          <div className="mt-6 pt-6 border-t border-[var(--aivo-purple-100)]">
            <p className="text-sm text-[var(--aivo-neutral-600)] text-center mb-3">
              Don&apos;t have a code?
            </p>
            <div className="flex gap-2">
              <a
                href="http://localhost:3004/register"
                className="flex-1 py-2 px-3 text-sm text-center border border-[var(--aivo-purple-200)] rounded-lg hover:bg-[var(--aivo-purple-50)] hover:border-[var(--aivo-brand-primary)] transition-colors"
              >
                👨‍👩‍👧 I&apos;m a Parent
              </a>
              <a
                href="http://localhost:3002/register"
                className="flex-1 py-2 px-3 text-sm text-center border border-[var(--aivo-purple-200)] rounded-lg hover:bg-[var(--aivo-purple-50)] hover:border-[var(--aivo-brand-primary)] transition-colors"
              >
                👩‍🏫 I&apos;m a Teacher
              </a>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-[var(--aivo-brand-primary)] hover:text-[var(--aivo-purple-700)] text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
