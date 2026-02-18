'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BaselineIntroPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    // Navigate to the actual baseline assessment
    router.push('/baseline/assessment');
  };

  const features = [
    {
      id: 'not-a-test',
      emoji: '🎯',
      title: "It's Not a Test!",
      description: 'There are no wrong answers. We just want to learn how you think best!',
    },
    {
      id: 'fun-activities',
      emoji: '🎮',
      title: 'Fun Activities',
      description: 'Play some games and answer questions about what you like.',
    },
    {
      id: 'take-time',
      emoji: '⏱️',
      title: 'Take Your Time',
      description: 'About 15-20 minutes. You can take breaks if you need them!',
    },
    {
      id: 'personalized',
      emoji: '🌟',
      title: 'Personalized Learning',
      description: 'AIVO will create lessons just for you based on your answers!',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={140}
              height={48}
            />
          </Link>
          <div className="w-28 h-28 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <span className="text-6xl">🧠</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to AIVO!
          </h1>
          <p className="text-xl text-gray-600">
            Let&apos;s discover how you learn best! 🚀
          </p>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Before we begin your adventure...
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="flex gap-4 p-4 bg-indigo-50 rounded-xl"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow flex-shrink-0">
                  <span className="text-2xl">{feature.emoji}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Start button */}
          <div className="mt-8">
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="w-full py-5 px-8 bg-gradient-to-r from-indigo-500 to-indigo-600 
                hover:opacity-90 disabled:opacity-60 text-white text-2xl font-bold rounded-2xl 
                transition-all shadow-lg transform hover:scale-[1.02] disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
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
                  Getting Ready...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">Let&apos;s Go! 🎉</span>
              )}
            </button>
          </div>
        </div>

        {/* Encouragement */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            💡 Tip: Find a quiet spot and make sure you&apos;re comfortable!
          </p>
        </div>
      </div>
    </div>
  );
}
