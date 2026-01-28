'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';

import {
  WelcomeStep,
  ProfileSetupStep,
  AccessibilityStep,
  SensoryProfileStep,
  InterestsStep,
  BaselineAssessmentIntro,
  CompletionStep,
} from './components/OnboardingFlow';
import type { OnboardingData, OnboardingStep } from './types';

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome to Aivo!' },
  { id: 'profile', title: 'Tell us about yourself' },
  { id: 'accessibility', title: 'Your learning preferences' },
  { id: 'sensory', title: 'Sensory profile' },
  { id: 'interests', title: 'What do you like?' },
  { id: 'assessment-intro', title: "Let's see what you know" },
  { id: 'complete', title: 'All set!' },
];

const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  welcome: WelcomeStep,
  profile: ProfileSetupStep,
  accessibility: AccessibilityStep,
  sensory: SensoryProfileStep,
  interests: InterestsStep,
  'assessment-intro': BaselineAssessmentIntro,
  complete: CompletionStep,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check if user is already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        // Check local storage for learner ID
        const storedLearnerId = localStorage.getItem('learner_id');
        if (storedLearnerId) {
          setLearnerId(storedLearnerId);
        }

        // Check if onboarding was completed
        const onboardingCompleted = localStorage.getItem('onboarding_completed');
        if (onboardingCompleted === 'true') {
          router.push('/dashboard');
          return;
        }

        // Load any saved progress
        const savedProgress = localStorage.getItem('onboarding_progress');
        if (savedProgress) {
          const { step, data } = JSON.parse(savedProgress);
          setCurrentStep(step);
          setOnboardingData(data);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [router]);

  // Save progress to local storage whenever it changes
  const saveProgress = useCallback((step: number, data: OnboardingData) => {
    try {
      localStorage.setItem(
        'onboarding_progress',
        JSON.stringify({ step, data, updatedAt: new Date().toISOString() })
      );
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  }, []);

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    // Save progress
    saveProgress(currentStep, updatedData);

    // Try to save to API if we have a learner ID
    if (learnerId) {
      try {
        await fetch('/api/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            learnerId,
            currentStep: ONBOARDING_STEPS[currentStep].id,
            data: updatedData,
          }),
        });
      } catch (error) {
        console.error('Error saving progress to server:', error);
      }
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding(updatedData);
    }
  };

  const completeOnboarding = async (data: OnboardingData) => {
    try {
      // Mark onboarding as complete locally
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_data', JSON.stringify(data));
      localStorage.removeItem('onboarding_progress');

      // Save to server and initialize AI brain
      if (learnerId) {
        await Promise.all([
          fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              learnerId,
              onboardingData: data,
            }),
          }),
          fetch('/api/ai/initialize-brain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              learnerId,
              onboardingData: data,
            }),
          }),
        ]);
      }

      // Redirect to baseline assessment
      router.push('/baseline/assessment');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still redirect even if API fails
      router.push('/baseline/assessment');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isCheckingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--aivo-purple-50)] to-[var(--aivo-teal-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={60}
              height={20}
            />
          </div>
          <p className="text-[var(--aivo-neutral-600)]">Loading...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEP_COMPONENTS[ONBOARDING_STEPS[currentStep].id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--aivo-purple-50)] to-[var(--aivo-teal-50)]">
      {/* Header with progress */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={100}
              height={32}
            />
            <div className="flex-1">
              <div className="flex justify-between text-sm text-[var(--aivo-neutral-500)] mb-1">
                <span>
                  Step {currentStep + 1} of {ONBOARDING_STEPS.length}:{' '}
                  {ONBOARDING_STEPS[currentStep].title}
                </span>
                <span>{Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-[var(--aivo-neutral-100)] rounded-full overflow-hidden">
                <div className="flex h-full">
                  {ONBOARDING_STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex-1 transition-colors duration-300 ${
                        index < currentStep
                          ? 'bg-[var(--aivo-teal-400)]'
                          : index === currentStep
                            ? 'bg-gradient-to-r from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)]'
                            : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              data={onboardingData}
              onComplete={handleStepComplete}
              onBack={currentStep > 0 ? handleBack : undefined}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          {ONBOARDING_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                if (index < currentStep) setCurrentStep(index);
              }}
              disabled={index > currentStep}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-[var(--aivo-brand-primary)] w-8'
                  : index < currentStep
                    ? 'bg-[var(--aivo-teal-400)] hover:bg-[var(--aivo-teal-500)] cursor-pointer'
                    : 'bg-[var(--aivo-neutral-200)]'
              }`}
              title={step.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
