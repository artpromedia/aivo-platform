'use client';

import { ArrowLeft, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const GRADE_OPTIONS = [
  'Pre-K', 'K', '1', '2', '3', '4', '5',
  '6', '7', '8', '9', '10', '11', '12',
];

const WEAK_PINS = [
  '000000', '111111', '222222', '333333', '444444',
  '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '123123', '112233',
];

interface RegisterLearnerResponse {
  learner?: { id: string; pin?: string };
  learnerId?: string;
  assessmentId?: string;
  message?: string;
  curriculumInfo?: { standards?: string };
}

export default function AddChildPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Result state
  const [newLearnerId, setNewLearnerId] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setError(null);
    setPinError(null);

    if (!firstName.trim() || !gradeLevel) {
      setError('First name and grade level are required.');
      return false;
    }

    if (pin.length !== 6) {
      setPinError('Please enter a 6-digit PIN for your child.');
      return false;
    }
    if (!/^\d{6}$/.test(pin)) {
      setPinError('PIN must contain only digits.');
      return false;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match. Please re-enter.');
      return false;
    }
    if (WEAK_PINS.includes(pin)) {
      setPinError('This PIN is too easy to guess. Choose something more unique.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    setPinError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/onboarding/register-learner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gradeLevel,
          pin,
        }),
      });

      const data = (await response.json()) as RegisterLearnerResponse;

      if (!response.ok) {
        const msg = data.message || 'Failed to add child';
        if (msg.toLowerCase().includes('pin')) {
          setPinError(msg);
        } else {
          throw new Error(msg);
        }
        return;
      }

      const learnerId = data.learner?.id || data.learnerId || null;
      setNewLearnerId(learnerId);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <main id="main-content" className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {firstName} has been added!
            </h1>
            <p className="text-gray-600 mb-6">
              You can now set up their personalized learning path by completing
              the parent assessment.
            </p>
            <div className="flex flex-col gap-3">
              {newLearnerId && (
                <button
                  onClick={() => { router.push(`/assessment/parent/${newLearnerId}`); }}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Take Parent Assessment &rarr;
                </button>
              )}
              <button
                onClick={() => { router.push('/dashboard'); }}
                className="w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <main id="main-content" className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => { router.push('/dashboard'); }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Add Your Child</h1>
              <p className="text-sm text-gray-500">
                Add another learner to your family account
              </p>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="add-child-first" className="block text-sm font-medium text-gray-700 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-child-first"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Emma"
                />
              </div>
              <div>
                <label htmlFor="add-child-last" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="add-child-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Smith"
                />
              </div>
            </div>

            {/* Date of birth */}
            <div>
              <label htmlFor="add-child-dob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="add-child-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => { setDateOfBirth(e.target.value); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Grade level */}
            <div>
              <label htmlFor="add-child-grade" className="block text-sm font-medium text-gray-700 mb-1">
                Grade level <span className="text-red-500">*</span>
              </label>
              <select
                id="add-child-grade"
                required
                value={gradeLevel}
                onChange={(e) => { setGradeLevel(e.target.value); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select grade…</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g === 'K' ? 'Kindergarten' : g === 'Pre-K' ? 'Pre-Kindergarten' : `Grade ${g}`}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN */}
            <div>
              <label htmlFor="add-child-pin" className="block text-sm font-medium text-gray-700 mb-1">
                Child&apos;s 6-digit PIN <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Your child will use this PIN to log in to the learner app.
              </p>
              <input
                id="add-child-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••"
              />
            </div>

            {/* Confirm PIN */}
            <div>
              <label htmlFor="add-child-confirm-pin" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm PIN <span className="text-red-500">*</span>
              </label>
              <input
                id="add-child-confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '')); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••"
              />
              {pinError && (
                <p className="mt-1 text-sm text-red-600">{pinError}</p>
              )}
            </div>

            {/* Billing Impact */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Billing Impact</p>
              <p className="text-sm text-blue-700 mt-1">
                Adding {firstName || 'a child'} will add per-learner pricing for any
                active add-on modules. Base plan covers unlimited children.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {firstName ? `Add ${firstName} to my family` : 'Add child to my family'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
