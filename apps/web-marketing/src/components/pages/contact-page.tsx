'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  ArrowLeft,
  MessageSquare,
  HelpCircle,
  Building,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Contact info data
const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    details: ['hello@aivolearning.com', 'support@aivolearning.com'],
    color: 'bg-theme-primary-100 text-theme-primary-600',
  },
  {
    icon: Phone,
    title: 'Phone',
    details: ['1-800-AIVO-EDU', '(800) 248-6338'],
    color: 'bg-coral-100 text-coral-600',
  },
  {
    icon: MapPin,
    title: 'Address',
    details: ['123 Education Street', 'Learning City, CA 94105'],
    color: 'bg-mint-100 text-mint-600',
  },
  {
    icon: Clock,
    title: 'Hours',
    details: ['Mon - Fri: 9am - 6pm EST', 'Weekend: Email support'],
    color: 'bg-sunshine-100 text-sunshine-600',
  },
];

// Subject options
const subjectOptions = [
  { value: '', label: 'Select a topic...' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'sales', label: 'Sales & Pricing' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'press', label: 'Press & Media' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function ContactPage() {
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a topic';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', subject: '', message: '' });
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-coral-50/30 -z-10" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <Badge variant="primary" className="mb-6">
                <MessageSquare className="w-3 h-3 mr-1" />
                Get in Touch
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Contact Us
              </h1>

              <p className="text-xl text-gray-600">
                Have questions about AIVO? We&apos;re here to help. Reach out and we&apos;ll respond
                as soon as possible.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
              {/* Contact Info - Left Column */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 space-y-6"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
                    Let&apos;s Connect
                  </h2>
                  <p className="text-gray-600">
                    Choose the best way to reach us. We typically respond within 24 hours.
                  </p>
                </div>

                <div className="space-y-4">
                  {contactInfo.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-soft"
                      >
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                            item.color
                          )}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          {item.details.map((detail, i) => (
                            <p key={i} className="text-gray-600 text-sm">
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Response Time Badge */}
                <div className="flex items-center gap-3 p-4 bg-mint-50 rounded-2xl border border-mint-200">
                  <Clock className="w-5 h-5 text-mint-600" />
                  <div>
                    <p className="font-medium text-mint-700">Average Response Time</p>
                    <p className="text-sm text-mint-600">Within 24 hours on business days</p>
                  </div>
                </div>
              </motion.div>

              {/* Contact Form - Right Column */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-3"
              >
                <div className="bg-white rounded-3xl p-8 shadow-soft-lg border border-gray-100">
                  <AnimatePresence mode="wait">
                    {isSubmitted ? (
                      /* Success State */
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className="w-20 h-20 bg-mint-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                          <CheckCircle className="w-10 h-10 text-mint-600" />
                        </motion.div>

                        <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                          Message Sent!
                        </h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                          Thank you for reaching out. We&apos;ve received your message and will get
                          back to you within 24-48 hours.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button variant="outline" onClick={resetForm}>
                            <ArrowLeft className="w-4 h-4" />
                            Send Another Message
                          </Button>
                          <Button variant="primary" asChild>
                            <Link href="/">Return to Home</Link>
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      /* Contact Form */
                      <motion.form
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-6"
                      >
                        <div>
                          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
                            Send Us a Message
                          </h2>
                          <p className="text-gray-500 text-sm">
                            Fill out the form below and we&apos;ll be in touch.
                          </p>
                        </div>

                        {/* Name Field */}
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Your Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent',
                              errors.name
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            placeholder="John Doe"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                          )}
                        </div>

                        {/* Email Field */}
                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent',
                              errors.email
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            placeholder="john@example.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                          )}
                        </div>

                        {/* Subject Field */}
                        <div>
                          <label
                            htmlFor="subject"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Topic <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent appearance-none bg-white',
                              errors.subject
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            {subjectOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {errors.subject && (
                            <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
                          )}
                        </div>

                        {/* Message Field */}
                        <div>
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Message <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            rows={5}
                            value={formData.message}
                            onChange={handleChange}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent resize-none',
                              errors.message
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            placeholder="How can we help you?"
                          />
                          {errors.message && (
                            <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          variant="coral"
                          size="lg"
                          className="w-full"
                          loading={isSubmitting}
                        >
                          <Send className="w-5 h-5" />
                          {isSubmitting ? 'Sending...' : 'Send Message'}
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          By submitting this form, you agree to our{' '}
                          <Link href="/privacy" className="text-theme-primary-600 hover:underline">
                            Privacy Policy
                          </Link>
                          .
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-center text-gray-900 mb-8">
              Looking for Something Specific?
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                {
                  icon: HelpCircle,
                  title: 'Help Center',
                  description: 'Browse our FAQ',
                  href: '/#faq',
                },
                {
                  icon: Users,
                  title: 'For Schools',
                  description: 'Enterprise solutions',
                  href: '/features/schools',
                },
                {
                  icon: Building,
                  title: 'Partnerships',
                  description: 'Work with us',
                  href: '/contact?subject=partnership',
                },
                {
                  icon: Mail,
                  title: 'Press Inquiries',
                  description: 'Media contact',
                  href: 'mailto:press@aivolearning.com',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-theme-primary-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-theme-primary-50 flex items-center justify-center group-hover:bg-theme-primary-100 transition-colors">
                      <Icon className="w-6 h-6 text-theme-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
