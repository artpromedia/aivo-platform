'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { KeyRound, ArrowLeft, Users, BookOpen, Loader2 } from 'lucide-react';

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

      const data = (await response.json()) as { error?: string; needsBaseline?: boolean };

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={120}
              height={40}
              priority
            />
          </Link>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <KeyRound className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Code</h1>
          <p className="text-gray-500">
            Use the code from your teacher or the PIN from your parent
          </p>
        </div>

        {/* Join form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                maxLength={10}
                autoComplete="off"
                autoCapitalize="characters"
                disabled={isLoading}
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </span>
              ) : (
                'Start Learning'
              )}
            </button>
          </form>

          {/* Help section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center mb-3">
              Don&apos;t have a code?
            </p>
            <div className="flex gap-2">
              <a
                href={`${process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com'}/register`}
                className="flex-1 py-2 px-3 text-sm text-center inline-flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-gray-700"
              >
                <Users className="w-4 h-4" /> I&apos;m a Parent
              </a>
              <a
                href={`${process.env.NEXT_PUBLIC_TEACHER_APP_URL || 'https://teacher.aivolearning.com'}/register`}
                className="flex-1 py-2 px-3 text-sm text-center inline-flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-gray-700"
              >
                <BookOpen className="w-4 h-4" /> I&apos;m a Teacher
              </a>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <a
            href={process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com'}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
