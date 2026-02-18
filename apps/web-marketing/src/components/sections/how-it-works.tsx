'use client';

import { motion } from 'framer-motion';
import { UserPlus, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: '1',
    title: 'Create Account',
    description: 'Sign up in under 2 minutes. Tell us about your learning goals and preferences.',
    icon: UserPlus,
    color: 'bg-theme-primary-600',
  },
  {
    number: '2',
    title: 'Choose Your Course',
    description: 'Browse hundreds of expert-led courses across every subject and skill level.',
    icon: BookOpen,
    color: 'bg-accent-500',
  },
  {
    number: '3',
    title: 'Start Learning',
    description: 'Engage with personalized AI tutoring that adapts to your unique learning style.',
    icon: Sparkles,
    color: 'bg-mint-500',
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function HowItWorks() {
  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  return (
    <Section id="how-it-works" background="gray" padding="lg">
      <SectionHeader
        badge="How It Works"
        title={
          <>
            Getting Started is <span className="text-gradient-primary">Simple</span>
          </>
        }
        description="Three easy steps to unlock personalized learning for your child."
      />

      {/* Horizontal 3-Step Stepper */}
      <div className="relative max-w-4xl mx-auto">
        {/* Connecting Line (Desktop) */}
        <div className="hidden lg:block absolute top-[60px] left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-theme-primary-600 via-accent-500 to-mint-500 opacity-20" />

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step Circle */}
                <div className="relative inline-flex flex-col items-center">
                  <div
                    className={cn(
                      'w-[120px] h-[120px] rounded-full flex items-center justify-center text-white mb-6 shadow-lg',
                      step.color
                    )}
                  >
                    <Icon className="w-10 h-10" />
                  </div>

                  {/* Step Number Badge */}
                  <div className="absolute -top-1 -right-1 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                    <span className="font-display text-lg font-bold text-gray-900">
                      {step.number}
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>

                {/* Arrow between steps (mobile) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-6 md:hidden">
                    <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 text-center"
      >
        <Button size="lg" className="bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-full px-8" asChild>
          <Link href={`${parentAppUrl}/register`}>
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-gray-500">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </motion.div>
    </Section>
  );
}
