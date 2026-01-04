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
  readonly external?: boolean;
}

interface FooterSection {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

const footerLinks: Record<string, FooterSection> = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'AI Tutoring', href: '/#features' },
      { label: 'AIVO Pad', href: '/aivo-pad', badge: 'New' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'For Parents', href: '/features/parents' },
      { label: 'For Teachers', href: '/features/teachers' },
      { label: 'For Students', href: '/features/students' },
      { label: 'For Schools', href: '/features/schools' },
      { label: 'For Districts', href: '/features/districts' },
      { label: 'Homeschool', href: '/features/homeschool' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Blog', href: '/blog' },
      { label: 'Research', href: '/research' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Webinars', href: '/webinars' },
      { label: 'API Docs', href: '/docs', external: true },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers', badge: 'Hiring' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
      { label: 'Partners', href: '/partners' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'COPPA Compliance', href: '/compliance/coppa' },
      { label: 'FERPA Compliance', href: '/compliance/ferpa' },
      { label: 'Accessibility Statement', href: '/accessibility-statement' },
    ],
  },
};

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

const trustBadges = [
  { label: 'FERPA Compliant', icon: Shield },
  { label: 'COPPA Certified', icon: Shield },
  { label: 'SOC 2 Type II', icon: Shield },
  { label: 'WCAG 2.1 AA', icon: CheckCircle },
];

const contactInfo = [
  {
    icon: Mail,
    label: 'hello@aivolearning.com',
    href: 'mailto:hello@aivolearning.com',
  },
  {
    icon: Phone,
    label: '1-800-AIVO-EDU',
    href: 'tel:+18002486338',
  },
  {
    icon: MapPin,
    label: 'San Francisco, CA',
    href: null,
  },
];

// ===========================================
// FOOTER COMPONENT
// ===========================================

export function Footer() {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = React.useState('');

  const currentYear = new Date().getFullYear();

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailError('Please enter a valid email');
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
      // TODO: Replace with actual newsletter API
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
            <div className="bg-gradient-to-br from-theme-primary-500 to-theme-primary-600 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Join 10,000+ subscribers</span>
                </div>

                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                  Stay Updated with AIVO
                </h3>
                <p className="text-white/80 mb-8 max-w-md mx-auto">
                  Get the latest updates on new features, learning tips, and special offers
                  delivered to your inbox.
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
                          placeholder="Enter your email"
                          className={cn(
                            'w-full pl-12 pr-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors',
                            emailError
                              ? 'border-red-300 bg-red-50'
                              : 'border-transparent bg-white focus:border-coral-300'
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
                      className="bg-coral-500 hover:bg-coral-600 text-white px-6 py-3.5 rounded-xl font-semibold whitespace-nowrap"
                    >
                      {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>

                {submitStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-center gap-2 text-white"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Thanks for subscribing! Check your inbox.</span>
                  </motion.div>
                )}

                {submitStatus === 'error' && (
                  <p className="mt-4 text-red-200">Something went wrong. Please try again.</p>
                )}

                <p className="mt-4 text-xs text-white/60">
                  We respect your privacy. Unsubscribe at any time.{' '}
                  <Link href="/privacy" className="underline hover:text-white">
                    Privacy Policy
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
              AI-powered personalized learning for neurodiverse students. Supporting ADHD, Autism,
              Dyslexia, and all learning differences.
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
                    aria-label={social.name}
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
                        <Badge variant={link.badge === 'New' ? 'success' : 'primary'} size="sm">
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
              <span>© {currentYear} AIVO Learning, Inc. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                Made with <Heart className="w-4 h-4 text-coral-500 fill-current" /> for neurodiverse
                learners
              </span>
            </div>

            {/* Bottom Links */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/sitemap-html" className="hover:text-theme-primary-600 transition-colors">
                Sitemap
              </Link>
              <Link
                href="/accessibility-statement"
                className="hover:text-theme-primary-600 transition-colors"
              >
                Accessibility
              </Link>
              <button
                onClick={() => {
                  // Open cookie preferences modal
                  console.log('Open cookie preferences');
                }}
                className="hover:text-theme-primary-600 transition-colors"
              >
                Cookie Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
