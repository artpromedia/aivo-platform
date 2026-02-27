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
import { useTranslation } from 'react-i18next';

export function CTA() {
  const { t } = useTranslation('marketing');
  const [email, setEmail] = React.useState('');

  const trustPoints = [
    { icon: CreditCard, text: t('cta.trustPoints.0') },
    { icon: Calendar, text: t('cta.trustPoints.1') },
    { icon: XCircle, text: t('cta.trustPoints.2') },
  ];

  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      window.location.href = `${parentAppUrl}/register?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <section className="relative py-24 overflow-hidden bg-gray-50">

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
          >
            {t('cta.headlinePrefix')}{' '}
            <span className="text-theme-primary-600">
              {t('cta.headlineHighlight')}
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
          >
            {t('cta.subheadline')}
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
                placeholder={t('cta.emailPlaceholder')}
                className="w-full pl-12 pr-4 py-4 rounded-full text-gray-900 bg-white border border-gray-200 focus:ring-2 focus:ring-theme-primary-400 outline-none text-base"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 bg-theme-primary-600 hover:bg-theme-primary-700 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              {t('cta.submitButton')}
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
              <div key={text} className="flex items-center gap-2 text-gray-500 text-sm">
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
            className="mt-10 inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full border border-gray-200 shadow-sm"
          >
            <Shield className="w-5 h-5 text-mint-600" />
            <span className="text-gray-600 text-sm">
              <span className="font-semibold text-gray-900">{t('cta.complianceBold')}</span> —{' '}
              {t('cta.complianceText')}
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
