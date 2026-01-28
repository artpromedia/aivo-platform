'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BaselineCompletePage() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Set window size for confetti
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const learningPath = [
    {
      id: 'personalized',
      emoji: '🎯',
      title: 'Personalized Lessons',
      description: 'Just for you!',
    },
    { id: 'games', emoji: '🎮', title: 'Fun Games', description: 'Learn while playing' },
    { id: 'progress', emoji: '📊', title: 'Track Progress', description: 'See how far you go' },
    { id: 'rewards', emoji: '🏆', title: 'Earn Rewards', description: 'XP and achievements' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--aivo-teal-50)] to-[var(--aivo-purple-50)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti celebration - simplified without library */}
      {showConfetti && windowSize.width > 0 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {/* Animated confetti pieces */}
          <div
            className="absolute top-0 left-1/4 text-4xl animate-bounce"
            style={{ animationDelay: '0s' }}
          >
            🎉
          </div>
          <div
            className="absolute top-0 left-1/2 text-4xl animate-bounce"
            style={{ animationDelay: '0.2s' }}
          >
            🎊
          </div>
          <div
            className="absolute top-0 left-3/4 text-4xl animate-bounce"
            style={{ animationDelay: '0.4s' }}
          >
            🎉
          </div>
          <div
            className="absolute top-10 left-1/3 text-3xl animate-bounce"
            style={{ animationDelay: '0.1s' }}
          >
            ⭐
          </div>
          <div
            className="absolute top-10 left-2/3 text-3xl animate-bounce"
            style={{ animationDelay: '0.3s' }}
          >
            ✨
          </div>
        </div>
      )}

      <div className="max-w-xl w-full relative z-10">
        {/* Success header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={140}
              height={48}
            />
          </Link>
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce">
            <span className="text-7xl">🎉</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--aivo-brand-navy)] mb-3">Awesome Job!</h1>
          <p className="text-xl text-[var(--aivo-neutral-600)]">
            You&apos;re all set up and ready to learn! 🚀
          </p>
        </div>

        {/* What's next card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-[var(--aivo-teal-100)] mb-6">
          <h2 className="text-2xl font-bold text-[var(--aivo-brand-navy)] text-center mb-6">
            What&apos;s Next? 🌟
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {learningPath.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 bg-[var(--aivo-purple-50)] rounded-xl"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow flex-shrink-0">
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <div>
                  <h3 className="font-bold text-[var(--aivo-brand-navy)]">{item.title}</h3>
                  <p className="text-sm text-[var(--aivo-neutral-600)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Start learning button */}
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="block w-full py-5 px-8 bg-gradient-to-r from-[var(--aivo-teal-500)] to-[var(--aivo-brand-primary)] 
                hover:opacity-90 text-white text-2xl font-bold rounded-2xl 
                transition-all shadow-lg text-center transform hover:scale-[1.02]"
            >
              Start Learning! 🎓
            </Link>
          </div>
        </div>

        {/* Parent/Teacher connection reminder */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-[var(--aivo-neutral-200)]">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-[var(--aivo-purple-100)] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h3 className="font-bold text-[var(--aivo-brand-navy)] mb-1">
                Your Learning Journey
              </h3>
              <p className="text-sm text-[var(--aivo-neutral-600)]">
                AIVO will now create personalized lessons based on how you like to learn. The more
                you practice, the smarter AIVO gets at helping you!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
