'use client';

import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle,
  Shield,
  Heart,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { AivoLogo } from '@/components/ui/aivo-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ===========================================
// FOOTER DATA
// ===========================================

interface FooterLink {
  readonly label: string;
  readonly href: string;
  readonly badge?: string;
  readonly badgeVariant?: 'success' | 'primary';
  readonly external?: boolean;
}

interface FooterSection {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

function useFooterLinks(t: (key: string) => string): Record<string, FooterSection> {
  return {
    product: {
      title: t('footer.sections.product'),
      links: [
        { label: t('footer.productLinks.features'), href: '/#features' },
        { label: t('footer.productLinks.howItWorks'), href: '/how-it-works' },
        { label: t('footer.productLinks.pricing'), href: '/pricing' },
        { label: t('footer.productLinks.aiTutoring'), href: '/#features' },
        { label: t('footer.productLinks.aivoPad'), href: '/aivo-pad', badge: t('footer.productLinks.new'), badgeVariant: 'success' as const },
        { label: t('footer.productLinks.accessibility'), href: '/accessibility' },
      ],
    },
    solutions: {
      title: t('footer.sections.solutions'),
      links: [
        { label: t('footer.solutionsLinks.forParents'), href: '/features/parents' },
        { label: t('footer.solutionsLinks.forTeachers'), href: '/features/teachers' },
        { label: t('footer.solutionsLinks.forStudents'), href: '/features/students' },
        { label: t('footer.solutionsLinks.forSchools'), href: '/features/schools' },
        { label: t('footer.solutionsLinks.forDistricts'), href: '/features/districts' },
        { label: t('footer.solutionsLinks.homeschool'), href: '/features/homeschool' },
      ],
    },
    resources: {
      title: t('footer.sections.resources'),
      links: [
        { label: t('footer.resourcesLinks.helpCenter'), href: '/help' },
        { label: t('footer.resourcesLinks.blog'), href: '/blog' },
        { label: t('footer.resourcesLinks.research'), href: '/research' },
        { label: t('footer.resourcesLinks.caseStudies'), href: '/case-studies' },
        { label: t('footer.resourcesLinks.webinars'), href: '/webinars' },
        { label: t('footer.resourcesLinks.apiDocs'), href: '/docs', external: true },
      ],
    },
    company: {
      title: t('footer.sections.company'),
      links: [
        { label: t('footer.companyLinks.aboutUs'), href: '/about' },
        { label: t('footer.companyLinks.careers'), href: '/careers', badge: t('footer.companyLinks.hiring'), badgeVariant: 'primary' as const },
        { label: t('footer.companyLinks.press'), href: '/press' },
        { label: t('footer.companyLinks.contact'), href: '/contact' },
        { label: t('footer.companyLinks.partners'), href: '/partners' },
      ],
    },
    legal: {
      title: t('footer.sections.legal'),
      links: [
        { label: t('footer.legalLinks.privacyPolicy'), href: '/privacy' },
        { label: t('footer.legalLinks.termsOfService'), href: '/terms' },
        { label: t('footer.legalLinks.cookiePolicy'), href: '/cookies' },
        { label: t('footer.legalLinks.coppaCompliance'), href: '/compliance/coppa' },
        { label: t('footer.legalLinks.ferpaCompliance'), href: '/compliance/ferpa' },
        { label: t('footer.legalLinks.accessibilityStatement'), href: '/accessibility-statement' },
      ],
    },
  };
}

// Custom social media icons (lucide brand icons are deprecated)
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      ry="5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.5" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" />
  </svg>
);

const socialLinks = [
  {
    name: 'Facebook',
    href: 'https://facebook.com/aivolearning',
    icon: FacebookIcon,
    color: 'hover:bg-blue-100 hover:text-blue-600',
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/aivolearning',
    icon: TwitterIcon,
    color: 'hover:bg-sky-100 hover:text-sky-500',
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/aivolearning',
    icon: InstagramIcon,
    color: 'hover:bg-pink-100 hover:text-pink-600',
  },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/company/aivolearning',
    icon: LinkedinIcon,
    color: 'hover:bg-blue-100 hover:text-blue-700',
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/aivolearning',
    icon: YoutubeIcon,
    color: 'hover:bg-red-100 hover:text-red-600',
  },
];

// trustBadges and contactInfo moved inside component for i18n

// ===========================================
// FOOTER COMPONENT
// ===========================================

export function Footer() {
  const { t } = useTranslation('marketing');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = React.useState('');

  const currentYear = new Date().getFullYear();

  const footerLinks = useFooterLinks(t);

  const trustBadges = [
    { label: t('footer.trustBadges.ferpa'), icon: Shield },
    { label: t('footer.trustBadges.coppa'), icon: Shield },
    { label: t('footer.trustBadges.soc2'), icon: Shield },
    { label: t('footer.trustBadges.wcag'), icon: CheckCircle },
  ];

  const contactInfo = [
    {
      icon: Mail,
      label: t('footer.contactInfo.email'),
      href: 'mailto:hello@aivolearning.com',
    },
    {
      icon: Phone,
      label: t('footer.contactInfo.phone'),
      href: 'tel:+18002486338',
    },
    {
      icon: MapPin,
      label: t('footer.contactInfo.location'),
      href: null,
    },
  ];

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError(t('footer.newsletter.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailError(t('footer.newsletter.emailInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'footer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSubmitStatus('success');
      setEmail('');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      {/* Newsletter Section */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border border-gray-200 shadow-soft">

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary-50 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-theme-primary-600" />
                  <span className="text-theme-primary-700 text-sm font-medium">{t('footer.newsletter.subscriberBadge')}</span>
                </div>

                <h3 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  {t('footer.newsletter.heading')}
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {t('footer.newsletter.description')}
                </p>

                <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) validateEmail(e.target.value);
                          }}
                          placeholder={t('footer.newsletter.placeholder')}
                          className={cn(
                            'w-full pl-12 pr-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors',
                            emailError
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-gray-50 focus:border-theme-primary-400 focus:bg-white'
                          )}
                        />
                      </div>
                      {emailError && (
                        <p className="text-left text-red-200 text-sm mt-1">{emailError}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-theme-primary-600 hover:bg-theme-primary-700 text-white px-6 py-3.5 rounded-xl font-semibold whitespace-nowrap"
                    >
                      {isSubmitting ? t('footer.newsletter.subscribing') : t('footer.newsletter.subscribe')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>

                {submitStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-center gap-2 text-mint-600"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{t('footer.newsletter.successMessage')}</span>
                  </motion.div>
                )}

                {submitStatus === 'error' && (
                  <p className="mt-4 text-red-500">{t('footer.newsletter.errorMessage')}</p>
                )}

                <p className="mt-4 text-xs text-gray-400">
                  {t('footer.newsletter.privacyNote')}{' '}
                  <Link href="/privacy" className="underline hover:text-gray-900">
                    {t('footer.newsletter.privacyPolicyLink')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <AivoLogo size="lg" variant="stacked-dark" className="mb-6" />

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {t('footer.brandTagline')}
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-center gap-3 text-sm text-gray-600 hover:text-theme-primary-600 transition-colors">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span>{item.label}</span>
                  </div>
                );

                return item.href ? (
                  <a key={item.label} href={item.href}>
                    {content}
                  </a>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 transition-colors',
                      social.color
                    )}
                    aria-label={t(`footer.socialLabels.${social.name.toLowerCase()}`)}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-gray-900 mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-theme-primary-600 transition-colors"
                      {...(link.external && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      {link.label}
                      {link.badge && (
                        <Badge variant={link.badgeVariant || 'primary'} size="sm">
                          {link.badge}
                        </Badge>
                      )}
                      {link.external && <ExternalLink className="w-3 h-3" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges & Bottom Bar */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200"
                >
                  <Icon className="w-4 h-4 text-mint-600" />
                  <span className="text-sm font-medium text-gray-700">{badge.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-gray-500">
              <span>{t('footer.copyright', { year: currentYear })}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                {t('footer.madeWith')} <Heart className="w-4 h-4 text-coral-500 fill-current" /> {t('footer.forLearners')}
              </span>
            </div>

            {/* Bottom Links */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/sitemap-html" className="hover:text-theme-primary-600 transition-colors">
                {t('footer.sitemap')}
              </Link>
              <Link
                href="/accessibility-statement"
                className="hover:text-theme-primary-600 transition-colors"
              >
                {t('footer.accessibility')}
              </Link>
              <button
                onClick={() => {
                  // Dispatch custom event to open cookie consent modal
                  window.dispatchEvent(new CustomEvent('openCookiePreferences'));
                }}
                className="hover:text-theme-primary-600 transition-colors"
              >
                {t('footer.cookiePreferences')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
