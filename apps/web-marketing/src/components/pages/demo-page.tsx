'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  Video,
  Shield,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Role options
const roleOptions = [
  { value: '', label: 'Select your role...' },
  { value: 'parent', label: 'Parent / Guardian' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'sped_teacher', label: 'Special Education Teacher' },
  { value: 'administrator', label: 'School Administrator' },
  { value: 'district', label: 'District Leader' },
  { value: 'therapist', label: 'Therapist / Specialist' },
  { value: 'other', label: 'Other' },
];

// Student count options
const studentCountOptions = [
  { value: '', label: 'How many students?' },
  { value: '1', label: '1 student (family)' },
  { value: '2-5', label: '2-5 students' },
  { value: '6-25', label: '6-25 students (classroom)' },
  { value: '26-100', label: '26-100 students (school)' },
  { value: '100+', label: '100+ students (district)' },
];

// What to expect
const expectations = [
  {
    icon: Clock,
    title: '30-Minute Session',
    description: 'Personalized walkthrough tailored to your needs',
  },
  {
    icon: Users,
    title: 'Live Q&A',
    description: 'Get all your questions answered by our education specialists',
  },
  {
    icon: Sparkles,
    title: 'See AI in Action',
    description: 'Watch our Virtual Brain adapt to different learning styles',
  },
  {
    icon: Shield,
    title: 'No Pressure',
    description: "We're here to help, not to sell. Bring your questions!",
  },
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  organization: string;
  studentCount: string;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export function DemoPage() {
  const [formData, setFormData] = React.useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    organization: '',
    studentCount: '',
    message: '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        ...errors,
        firstName: error instanceof Error ? error.message : 'Failed to submit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
                <Video className="w-3 h-3 mr-1" />
                Schedule a Demo
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                See AIVO in Action
              </h1>

              <p className="text-xl text-gray-600 mb-8">
                Get a personalized walkthrough of our AI-powered learning platform. See how AIVO can
                transform education for neurodiverse learners.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* What to Expect */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                    What to Expect
                  </h2>
                  <p className="text-gray-600">
                    Our demo sessions are tailored to your specific needs. Whether you&apos;re a
                    parent, teacher, or administrator, we&apos;ll show you exactly how AIVO can
                    help.
                  </p>
                </div>

                <div className="grid gap-4">
                  {expectations.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-soft"
                      >
                        <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-theme-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Video Preview */}
                <div className="bg-gray-900 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">
                    Can&apos;t wait? Watch our 2-minute overview
                  </h3>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Watch Video
                  </Button>
                </div>
              </motion.div>

              {/* Demo Request Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
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
                        className="text-center py-8"
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
                          Demo Request Received!
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Thank you, {formData.firstName}! One of our education specialists will
                          contact you within 24 hours to schedule your personalized demo.
                        </p>

                        <div className="bg-theme-primary-50 rounded-2xl p-6 mb-8 text-left">
                          <h4 className="font-semibold text-gray-900 mb-4">What happens next:</h4>
                          <ul className="space-y-3">
                            {[
                              'Check your email for confirmation',
                              "We'll send available time slots within 24 hours",
                              'Join via Zoom for your 30-minute demo',
                              'Get all your questions answered live',
                            ].map((step, i) => (
                              <li key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-theme-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {i + 1}
                                </div>
                                <span className="text-gray-700">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button variant="outline" asChild>
                            <Link href="/">
                              <ArrowLeft className="w-4 h-4" />
                              Back to Home
                            </Link>
                          </Button>
                          <Button variant="primary" asChild>
                            <Link href="/features">Explore Features</Link>
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      /* Demo Request Form */
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
                            Request Your Demo
                          </h2>
                          <p className="text-gray-500 text-sm">
                            Fill out the form and we&apos;ll be in touch within 24 hours.
                          </p>
                        </div>

                        {/* Name Fields */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="firstName"
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="firstName"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleChange}
                              className={cn(
                                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent',
                                errors.firstName
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                              placeholder="John"
                            />
                            {errors.firstName && (
                              <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="lastName"
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="lastName"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleChange}
                              className={cn(
                                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent',
                                errors.lastName
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                              placeholder="Doe"
                            />
                            {errors.lastName && (
                              <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                            )}
                          </div>
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

                        {/* Phone Field (Optional) */}
                        <div>
                          <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Phone Number <span className="text-gray-400">(optional)</span>
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent"
                            placeholder="(555) 123-4567"
                          />
                        </div>

                        {/* Role Field */}
                        <div>
                          <label
                            htmlFor="role"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Your Role <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent appearance-none bg-white',
                              errors.role
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {errors.role && (
                            <p className="mt-1 text-sm text-red-500">{errors.role}</p>
                          )}
                        </div>

                        {/* Organization Field */}
                        <div>
                          <label
                            htmlFor="organization"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            School / Organization <span className="text-gray-400">(optional)</span>
                          </label>
                          <input
                            type="text"
                            id="organization"
                            name="organization"
                            value={formData.organization}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent"
                            placeholder="Lincoln Elementary School"
                          />
                        </div>

                        {/* Student Count Field */}
                        <div>
                          <label
                            htmlFor="studentCount"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Number of Students <span className="text-gray-400">(optional)</span>
                          </label>
                          <select
                            id="studentCount"
                            name="studentCount"
                            value={formData.studentCount}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent appearance-none bg-white"
                          >
                            {studentCountOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Message Field */}
                        <div>
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            What would you like to see in the demo?{' '}
                            <span className="text-gray-400">(optional)</span>
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            rows={3}
                            value={formData.message}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent resize-none"
                            placeholder="Tell us about your specific needs or questions..."
                          />
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          variant="coral"
                          size="lg"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          <Calendar className="w-5 h-5" />
                          {isSubmitting ? 'Submitting...' : 'Request Demo'}
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          By submitting, you agree to our{' '}
                          <Link href="/privacy" className="text-theme-primary-600 hover:underline">
                            Privacy Policy
                          </Link>
                          . We&apos;ll never share your information.
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="font-display text-xl font-bold text-gray-900 mb-8">
              Trusted by Educators Nationwide
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              {/* Placeholder logos - replace with actual school/district logos */}
              {['District A', 'School B', 'Academy C', 'Learning Center D'].map((name) => (
                <div key={name} className="px-6 py-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
