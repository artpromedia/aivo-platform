'use client';

import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

interface ListPref {
  slug: string;
  name: string;
  subscribed: boolean;
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; prefs: ListPref[] }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

const LIST_DESCRIPTIONS: Record<string, string> = {
  'weekly-digest': 'A weekly roundup of new content, tips, and community highlights.',
  'course-announcements': 'Get notified when new courses and features launch.',
};

function PreferencesInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [localPrefs, setLocalPrefs] = useState<ListPref[]>([]);

  // ── Load current preferences ──────────────────────────────────────────
  const load = useCallback(async () => {
    if (!email) {
      setState({ kind: 'error', message: 'Missing email. Use the link from your newsletter.' });
      return;
    }
    setState({ kind: 'loading' });

    try {
      const res = await fetch(
        `/api/newsletter/preferences?email=${encodeURIComponent(email)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setState({ kind: 'error', message: data.error || 'Could not load preferences.' });
        return;
      }

      setLocalPrefs(data.preferences);
      setState({ kind: 'ready', prefs: data.preferences });
    } catch {
      setState({ kind: 'error', message: 'Something went wrong. Please try again.' });
    }
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Toggle a list locally ─────────────────────────────────────────────
  const toggle = (slug: string) => {
    setLocalPrefs((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, subscribed: !p.subscribed } : p)),
    );
  };

  // ── Save changes ──────────────────────────────────────────────────────
  const save = async () => {
    setState({ kind: 'saving' });

    const listsMap: Record<string, boolean> = {};
    for (const p of localPrefs) {
      listsMap[p.slug] = p.subscribed;
    }

    try {
      const res = await fetch('/api/newsletter/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lists: listsMap }),
      });
      const data = await res.json();

      if (res.ok) {
        setState({ kind: 'saved' });
      } else {
        setState({ kind: 'error', message: data.error || 'Failed to save preferences.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Something went wrong. Please try again.' });
    }
  };

  const maskedEmail = email
    ? `${email[0]}${'*'.repeat(Math.max(email.indexOf('@') - 1, 0))}${email.slice(email.indexOf('@'))}`
    : '';

  // ── Dirty check ───────────────────────────────────────────────────────
  const isDirty =
    state.kind === 'ready' &&
    localPrefs.some(
      (lp) => lp.subscribed !== state.prefs.find((p) => p.slug === lp.slug)?.subscribed,
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-lg">
        {/* ── Loading ──────────────────────────────────────────────── */}
        {state.kind === 'loading' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200 text-center">
            <Loader2 className="w-12 h-12 text-theme-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your preferences&hellip;</p>
          </div>
        )}

        {/* ── Saving ───────────────────────────────────────────────── */}
        {state.kind === 'saving' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200 text-center">
            <Loader2 className="w-12 h-12 text-theme-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Saving your preferences&hellip;</p>
          </div>
        )}

        {/* ── Ready — list toggles ─────────────────────────────────── */}
        {state.kind === 'ready' && (
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-soft border border-gray-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-theme-primary-50 mb-4">
                <Mail className="w-7 h-7 text-theme-primary-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
                Newsletter Preferences
              </h1>
              <p className="text-gray-500 text-sm">{maskedEmail}</p>
            </div>

            <div className="space-y-4 mb-8">
              {localPrefs.map((lp) => (
                <label
                  key={lp.slug}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-theme-primary-200 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={lp.subscribed}
                    onChange={() => toggle(lp.slug)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-theme-primary-600 focus:ring-theme-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{lp.name}</span>
                    {LIST_DESCRIPTIONS[lp.slug] && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        {LIST_DESCRIPTIONS[lp.slug]}
                      </p>
                    )}
                  </div>
                </label>
              ))}

              {localPrefs.length === 0 && (
                <p className="text-gray-500 text-center py-6">
                  No newsletter lists available.
                </p>
              )}
            </div>

            <button
              onClick={save}
              disabled={!isDirty}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save preferences
            </button>
          </div>
        )}

        {/* ── Saved ────────────────────────────────────────────────── */}
        {state.kind === 'saved' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Preferences saved
            </h1>
            <p className="text-gray-600 mb-8">
              Your newsletter subscriptions have been updated.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={load}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Edit again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 transition-colors"
              >
                Back to AIVO Learning
              </Link>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {state.kind === 'error' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">{state.message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={load}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back to AIVO Learning
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PreferencesClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 text-theme-primary-500 animate-spin" />
        </div>
      }
    >
      <PreferencesInner />
    </Suspense>
  );
}
