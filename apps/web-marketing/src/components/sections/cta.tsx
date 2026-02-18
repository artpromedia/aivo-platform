'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  CreditCard,
  Calendar,
  XCircle,
  Mail,
} from 'lucide-react';
import * as React from 'react';

const trustPoints = [
  { icon: CreditCard, text: 'No credit card required' },
  { icon: Calendar, text: '14-day free trial' },
  { icon: XCircle, text: 'Cancel anytime' },
];

export function CTA() {
  const [email, setEmail] = React.useState('');

  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      window.location.href = `${parentAppUrl}/register?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Indigo Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-600 via-theme-primary-700 to-theme-primary-900" />

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
        className="absolute bottom-10 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"
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
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
          >
            Ready to Start{' '}
            <span className="underline decoration-accent-400/50 decoration-4 underline-offset-4">
              Learning?
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
            Join thousands of learners and educators who trust AIVO for personalized, AI-powered
            education.
          </motion.p>

          {/* Email Capture */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto mb-8"
          >
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-12 pr-4 py-4 rounded-full text-gray-900 bg-white border-0 focus:ring-2 focus:ring-accent-400 outline-none text-base"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.form>

          {/* Trust Points */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
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
            transition={{ delay: 0.4 }}
            className="mt-10 inline-flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
          >
            <Shield className="w-5 h-5 text-white" />
            <span className="text-white text-sm">
              <span className="font-semibold">FERPA &amp; COPPA Compliant</span> — Your
              child&apos;s data is always protected
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
