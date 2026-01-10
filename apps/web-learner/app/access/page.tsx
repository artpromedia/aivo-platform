'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AccessPage() {
  return (
    <div className="min-h-screen bg-[var(--aivo-purple-50)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
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

        {/* Fun mascot/icon area */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[var(--aivo-purple-400)] to-[var(--aivo-brand-primary)] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-5xl">🎒</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--aivo-brand-navy)] mb-2">
            Welcome, Explorer!
          </h1>
          <p className="text-[var(--aivo-neutral-600)] text-lg">
            Ready to start your learning adventure?
          </p>
        </div>

        {/* Access options */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-[var(--aivo-purple-100)]">
          <h2 className="text-xl font-semibold text-[var(--aivo-brand-navy)] mb-4">
            How do you want to get started?
          </h2>
          
          <div className="space-y-4">
            {/* Parent access */}
            <a
              href="http://localhost:3004/register"
              className="block w-full p-4 border-2 border-[var(--aivo-purple-200)] rounded-xl hover:border-[var(--aivo-brand-primary)] hover:bg-[var(--aivo-purple-50)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--aivo-purple-100)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">👨‍👩‍👧</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--aivo-brand-navy)]">I&apos;m a Parent</div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">Create an account and add your children</div>
                </div>
              </div>
            </a>

            {/* Teacher access */}
            <a
              href="http://localhost:3002/register"
              className="block w-full p-4 border-2 border-[var(--aivo-purple-200)] rounded-xl hover:border-[var(--aivo-brand-primary)] hover:bg-[var(--aivo-purple-50)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--aivo-teal-100)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">👩‍🏫</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--aivo-brand-navy)]">I&apos;m a Teacher</div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">Set up your classroom and invite students</div>
                </div>
              </div>
            </a>

            {/* Student with code */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--aivo-purple-200)]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-[var(--aivo-neutral-500)]">or</span>
              </div>
            </div>

            <Link
              href="/join"
              className="block w-full p-4 border-2 border-[var(--aivo-brand-primary)] bg-[var(--aivo-purple-50)] rounded-xl hover:bg-[var(--aivo-purple-100)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--aivo-purple-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎫</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--aivo-brand-primary)]">I have a Class Code</div>
                  <div className="text-sm text-[var(--aivo-purple-600)]">Join with your teacher&apos;s code</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Already have access */}
        <div className="text-[var(--aivo-neutral-600)]">
          <p className="mb-2">Already have access?</p>
          <Link 
            href="/join" 
            className="text-[var(--aivo-brand-primary)] hover:text-[var(--aivo-purple-700)] font-medium"
          >
            Enter your class code to start learning →
          </Link>
        </div>
      </div>
    </div>
  );
}
