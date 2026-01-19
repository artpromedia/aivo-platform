'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LearnerForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gradeLevel: string;
  zipCode: string;
}

/**
 * Parent Onboarding Page
 *
 * After registration, guides parent through adding their first child learner.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'learner' | 'complete'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnerPin, setLearnerPin] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [learnerForm, setLearnerForm] = useState<LearnerForm>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gradeLevel: '',
    zipCode: '',
  });

  const handleLearnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLearnerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!learnerForm.firstName || !learnerForm.gradeLevel) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/onboarding/register-learner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: learnerForm.firstName,
          lastName: learnerForm.lastName,
          dateOfBirth: learnerForm.dateOfBirth,
          gradeLevel: learnerForm.gradeLevel,
          location: {
            zipCode: learnerForm.zipCode,
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add learner');
      }

      // Store the learner's PIN for display
      if (data.learner?.pin) {
        setLearnerPin(data.learner.pin);
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  // Intro Step
  if (step === 'intro') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
            <svg className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to AIVO!</h1>
          <p className="mt-2 text-gray-600">
            Let&apos;s set up your child&apos;s personalized learning journey.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add your child</h3>
                <p className="text-sm text-gray-600">
                  Tell us about your learner so we can personalize their experience.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Baseline assessment</h3>
                <p className="text-sm text-gray-600">
                  Your child will take a fun assessment to understand their learning level.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Start learning</h3>
                <p className="text-sm text-gray-600">
                  Get a personalized learning plan and track progress in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setStep('learner')}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800"
          >
            Get Started
          </button>
          <button
            onClick={handleSkip}
            className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Learner Form Step
  if (step === 'learner') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Add Your Child</h1>
          <p className="mt-2 text-gray-600">
            Tell us about your learner to personalize their experience.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleAddLearner} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={learnerForm.firstName}
                onChange={handleLearnerChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Alex"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={learnerForm.lastName}
                onChange={handleLearnerChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={learnerForm.dateOfBirth}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
              Grade level <span className="text-red-500">*</span>
            </label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              required
              value={learnerForm.gradeLevel}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Select grade</option>
              <option value="PRE_K">Pre-K</option>
              <option value="K">Kindergarten</option>
              <option value="1">1st Grade</option>
              <option value="2">2nd Grade</option>
              <option value="3">3rd Grade</option>
              <option value="4">4th Grade</option>
              <option value="5">5th Grade</option>
              <option value="6">6th Grade</option>
              <option value="7">7th Grade</option>
              <option value="8">8th Grade</option>
              <option value="9">9th Grade</option>
              <option value="10">10th Grade</option>
              <option value="11">11th Grade</option>
              <option value="12">12th Grade</option>
            </select>
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              ZIP code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              value={learnerForm.zipCode}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="12345"
              maxLength={5}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used to align curriculum with your school district standards.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Learner'}
            </button>
            <button
              type="button"
              onClick={() => setStep('intro')}
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  const handleCopyPin = async () => {
    if (learnerPin) {
      await navigator.clipboard.writeText(learnerPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  const webLearnerUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:3000/join`
    : 'http://localhost:3000/join';

  // Complete Step
  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re All Set!</h1>
        <p className="mt-2 text-gray-600">
          {learnerForm.firstName} is ready to start learning!
        </p>
      </div>

      {/* PIN Code Display */}
      {learnerPin && (
        <div className="mb-6 rounded-lg border-2 border-violet-200 bg-violet-50 p-6">
          <h3 className="mb-2 text-center font-semibold text-gray-900">
            {learnerForm.firstName}&apos;s Login Code
          </h3>
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-white px-6 py-3 font-mono text-3xl font-bold tracking-widest text-violet-700 shadow-sm">
              {learnerPin}
            </div>
            <button
              onClick={handleCopyPin}
              className="rounded-lg bg-violet-600 p-3 text-white transition hover:bg-violet-700"
              title="Copy code"
            >
              {pinCopied ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-gray-500">
            Use this code to log in on any device
          </p>
        </div>
      )}

      {/* Web Learner Link */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-900">
          🖥️ Using a computer?
        </h3>
        <p className="mb-3 text-sm text-gray-600">
          {learnerForm.firstName} can start learning right now on the web!
        </p>
        <a
          href={webLearnerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open AIVO Learner Web App
        </a>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-violet-50 p-4">
          <h3 className="font-semibold text-gray-900">📱 Mobile app:</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Check your email for the app download link
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Download AIVO Learner on {learnerForm.firstName}&apos;s device
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Enter the login code above to get started
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm text-emerald-700">
              You&apos;ll receive a notification when {learnerForm.firstName} finishes their baseline assessment.
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleFinish}
          className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
