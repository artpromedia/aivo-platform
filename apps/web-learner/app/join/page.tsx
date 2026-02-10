'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter your code');
      return;
    }

    if (trimmedCode.length < 6) {
      setError('Codes are at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Determine if it's a PIN (all digits) or class code (alphanumeric)
      const isPinCode = /^\d{6}$/.test(trimmedCode);

      const response = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmedCode,
          type: isPinCode ? 'pin' : 'class',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Check if learner needs baseline assessment
      if (data.needsBaseline) {
        router.push('/baseline');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--aivo-purple-50)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={140}
              height={48}
            />
          </Link>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--aivo-purple-400)] to-[var(--aivo-brand-primary)] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl">🎫</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-2">Enter Your Code</h1>
          <p className="text-[var(--aivo-neutral-600)]">
            Use the code from your teacher or the PIN from your parent
          </p>
        </div>

        {/* Join form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-[var(--aivo-purple-100)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-[var(--aivo-neutral-700)] mb-2"
              >
                Class Code or PIN
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ENTER CODE"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-[var(--aivo-purple-200)] rounded-xl focus:border-[var(--aivo-brand-primary)] focus:ring-2 focus:ring-[var(--aivo-purple-100)] outline-none transition-all"
                maxLength={10}
                autoComplete="off"
                autoCapitalize="characters"
                disabled={isLoading}
              />
              {error && <p className="mt-2 text-sm text-[var(--aivo-color-error)]">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)] hover:opacity-90 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Checking...
                </span>
              ) : (
                'Start Learning! 🚀'
              )}
            </button>
          </form>

          {/* Help section */}
          <div className="mt-6 pt-6 border-t border-[var(--aivo-purple-100)]">
            <p className="text-sm text-[var(--aivo-neutral-600)] text-center mb-3">
              Don&apos;t have a code?
            </p>
            <div className="flex gap-2">
              <a
                href={process.env.NEXT_PUBLIC_PARENT_APP_URL ? `${process.env.NEXT_PUBLIC_PARENT_APP_URL}/register` : '/access'}
                className="flex-1 py-2 px-3 text-sm text-center border border-[var(--aivo-purple-200)] rounded-lg hover:bg-[var(--aivo-purple-50)] hover:border-[var(--aivo-brand-primary)] transition-colors"
              >
                👨‍👩‍👧 I&apos;m a Parent
              </a>
              <a
                href={process.env.NEXT_PUBLIC_TEACHER_APP_URL ? `${process.env.NEXT_PUBLIC_TEACHER_APP_URL}/register` : '/access'}
                className="flex-1 py-2 px-3 text-sm text-center border border-[var(--aivo-purple-200)] rounded-lg hover:bg-[var(--aivo-purple-50)] hover:border-[var(--aivo-brand-primary)] transition-colors"
              >
                👩‍🏫 I&apos;m a Teacher
              </a>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[var(--aivo-brand-primary)] hover:text-[var(--aivo-purple-700)] text-sm font-medium"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
