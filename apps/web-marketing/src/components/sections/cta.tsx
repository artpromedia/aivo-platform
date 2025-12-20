'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  Star,
  Users,
  Shield,
  CreditCard,
  Calendar,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';

const proofPoints = [
  { icon: Users, value: '150+', label: 'Happy Students' },
  { icon: Star, value: '4.9/5', label: 'Parent Rating' },
  { icon: TrendingUp, value: '94%', label: 'See Improvement' },
];

const trustPoints = [
  { icon: CreditCard, text: 'No credit card required' },
  { icon: Calendar, text: '14-day free trial' },
  { icon: XCircle, text: 'Cancel anytime' },
];

export function CTA() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-coral-500 via-salmon-500 to-theme-primary-600" />

      {/* Animated Shapes */}
      <motion.div
        className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 40, 0],
          scale: [1.2, 1, 1.2],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
          >
            Ready to Transform Your Child&apos;s{' '}
            <span className="underline decoration-white/30 decoration-4 underline-offset-4">
              Learning Journey?
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/90 mb-10 max-w-2xl mx-auto"
          >
            Join the families who&apos;ve discovered a better way to learn. Personalized AI tutoring
            designed for the way your child thinks.
          </motion.p>

          {/* Proof Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-8 mb-10"
          >
            {proofPoints.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-sm text-white/70">{label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Button
              size="xl"
              className="bg-white text-coral-600 hover:bg-white/90 hover:shadow-2xl"
              asChild
            >
              <Link href={`${appUrl}/register`}>
                Join Early Access
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              asChild
            >
              <Link href="#pilot-results">
                <TrendingUp className="w-5 h-5" />
                See Pilot Results
              </Link>
            </Button>
          </motion.div>

          {/* Trust Points */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {trustPoints.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80 text-sm">
                <Icon className="w-4 h-4" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-10 inline-flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
          >
            <Shield className="w-5 h-5 text-white" />
            <span className="text-white text-sm">
              <span className="font-semibold">FERPA &amp; COPPA Compliant</span> — Your child&apos;s
              data is always protected
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
