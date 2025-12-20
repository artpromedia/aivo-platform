'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Sparkles, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComingSoonPageProps {
  readonly title: string;
  readonly description?: string;
  readonly expectedDate?: string;
  readonly showNewsletter?: boolean;
  readonly icon?: React.ReactNode;
  readonly gradient?: string;
}

export function ComingSoonPage({
  title,
  description = "We're working hard to bring you something amazing. Stay tuned!",
  expectedDate,
  showNewsletter = true,
  icon,
  gradient = 'from-theme-primary-500 to-purple-600',
}: ComingSoonPageProps) {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <>
      <Navigation />

      <main className="min-h-screen flex items-center justify-center py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            {/* Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={cn(
                'w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center bg-gradient-to-br',
                gradient
              )}
            >
              {icon ?? <Sparkles className="w-12 h-12 text-white" />}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              {title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 mb-6"
            >
              {description}
            </motion.p>

            {/* Expected Date */}
            {expectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary-50 rounded-full text-theme-primary-700 font-medium mb-8"
              >
                <Bell className="w-4 h-4" />
                <span>Expected: {expectedDate}</span>
              </motion.div>
            )}

            {/* Newsletter Signup */}
            {showNewsletter && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8"
              >
                {isSubmitted ? (
                  <div className="flex items-center justify-center gap-2 text-mint-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>We&apos;ll notify you when this page is ready!</span>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 mb-4">Get notified when this page is ready:</p>
                    <form
                      onSubmit={handleNotifySubmit}
                      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                    >
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                          }}
                          placeholder="Enter your email"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-theme-primary-500 focus:ring-2 focus:ring-theme-primary-100 outline-none transition-all"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-theme-primary-600 hover:bg-theme-primary-700 text-white px-6"
                      >
                        {isSubmitting ? 'Subscribing...' : 'Notify Me'}
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>
            )}

            {/* Back Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-theme-primary-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
