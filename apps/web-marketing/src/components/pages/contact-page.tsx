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
import { useTranslation } from 'react-i18next';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const { t } = useTranslation('marketing');

  /* ── Locale-driven data ─────────────────────────────────── */
  const contactInfoKeys = ['email', 'phone', 'address', 'hours'] as const;
  const contactInfoIcons = [Mail, Phone, MapPin, Clock];
  const contactInfoColors = [
    'bg-theme-primary-100 text-theme-primary-600',
    'bg-coral-100 text-coral-600',
    'bg-mint-100 text-mint-600',
    'bg-sunshine-100 text-sunshine-600',
  ];
  const contactInfo = contactInfoKeys.map((key, i) => {
    const d = t(`contact.contactInfo.${key}`, { returnObjects: true }) as {
      title: string;
      values: string[];
    };
    return { icon: contactInfoIcons[i], title: d.title, details: d.values, color: contactInfoColors[i] };
  });

  const topicLabels = t('contact.topicOptions', { returnObjects: true }) as string[];
  const subjectValues = ['', 'general', 'support', 'sales', 'partnership', 'press', 'other'];
  const subjectOptions = topicLabels.map((label, i) => ({ value: subjectValues[i], label }));
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
      newErrors.name = t('contact.validation.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('contact.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contact.validation.emailInvalid');
    }

    if (!formData.subject) {
      newErrors.subject = t('contact.validation.topicRequired');
    }

    if (!formData.message.trim()) {
      newErrors.message = t('contact.validation.messageRequired');
    } else if (formData.message.trim().length < 10) {
      newErrors.message = t('contact.validation.messageMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        ...errors,
        message: error instanceof Error ? error.message : t('contact.validation.submitFailed'),
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
                {t('contact.heroBadge')}
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                {t('contact.heroHeading')}
              </h1>

              <p className="text-xl text-gray-600">
                {t('contact.heroDescription')}
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
                    {t('contact.contactInfo.heading')}
                  </h2>
                  <p className="text-gray-600">
                    {t('contact.contactInfo.description')}
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
                    <p className="font-medium text-mint-700">{t('contact.responseTime.label')}</p>
                    <p className="text-sm text-mint-600">{t('contact.responseTime.value')}</p>
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
                          {t('contact.success.heading')}
                        </h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                          {t('contact.success.description')}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button variant="outline" onClick={resetForm}>
                            <ArrowLeft className="w-4 h-4" />
                            {t('contact.success.sendAnother')}
                          </Button>
                          <Button variant="primary" asChild>
                            <Link href="/">{t('contact.success.returnHome')}</Link>
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
                            {t('contact.form.heading')}
                          </h2>
                          <p className="text-gray-500 text-sm">
                            {t('contact.form.description')}
                          </p>
                        </div>

                        {/* Name Field */}
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            {t('contact.form.nameLabel')} <span className="text-red-500">{t('contact.form.required')}</span>
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
                            placeholder={t('contact.form.namePlaceholder')}
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
                            {t('contact.form.emailLabel')} <span className="text-red-500">{t('contact.form.required')}</span>
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
                            placeholder={t('contact.form.emailPlaceholder')}
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
                            {t('contact.form.topicLabel')} <span className="text-red-500">{t('contact.form.required')}</span>
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
                            {t('contact.form.messageLabel')} <span className="text-red-500">{t('contact.form.required')}</span>
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
                            placeholder={t('contact.form.messagePlaceholder')}
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
                          {isSubmitting ? t('contact.form.submitting') : t('contact.form.submitButton')}
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          {t('contact.form.privacyNotice')}{' '}
                          <Link href="/privacy" className="text-theme-primary-600 hover:underline">
                            {t('contact.form.privacyPolicyLink')}
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
              {t('contact.quickLinks.heading')}
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {(t('contact.quickLinks.items', { returnObjects: true }) as Array<{
                title: string;
                description: string;
              }>).map((item, i) => {
                const icons = [HelpCircle, Users, Building, Mail];
                const hrefs = ['/#faq', '/features/schools', '/contact?subject=partnership', `mailto:${t('contact.quickLinks.pressEmail')}`];
                const Icon = icons[i];
                return (
                  <Link
                    key={item.title}
                    href={hrefs[i]}
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
