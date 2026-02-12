'use client';

import { motion } from 'framer-motion';
import {
  Handshake,
  BarChart3,
  GraduationCap,
  HeartHandshake,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Building2,
  Globe,
  BookOpen,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { Navigation, Footer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface PartnerTier {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  benefits: string[];
}

const partnerTiers: PartnerTier[] = [
  {
    name: 'Referral Partner',
    description: 'Recommend AIVO to schools and families and earn rewards for every successful introduction.',
    icon: HeartHandshake,
    color: 'from-theme-primary-500 to-purple-600',
    benefits: [
      'Revenue share on referrals',
      'Co-branded marketing materials',
      'Partner portal access',
      'Quarterly business reviews',
    ],
  },
  {
    name: 'Integration Partner',
    description: 'Build integrations between AIVO and your EdTech product to deliver a seamless experience for shared users.',
    icon: Zap,
    color: 'from-coral-500 to-salmon-500',
    benefits: [
      'API & SDK access',
      'Technical integration support',
      'Joint go-to-market campaigns',
      'Featured in marketplace',
      'Dedicated engineering liaison',
    ],
  },
  {
    name: 'Strategic Partner',
    description: 'Deep collaboration for districts, publishers, and organisations committed to inclusive education at scale.',
    icon: Building2,
    color: 'from-mint-500 to-emerald-500',
    benefits: [
      'Custom deployment plans',
      'White-label options',
      'Dedicated success team',
      'Early access to features',
      'Co-development opportunities',
      'Executive sponsorship',
    ],
  },
];

const partnerTypes = [
  { icon: GraduationCap, title: 'Schools & Districts', description: 'Bring AIVO to your classrooms with dedicated district support and FERPA-compliant deployment.' },
  { icon: BookOpen, title: 'Content Publishers', description: 'Integrate your curriculum into AIVO's adaptive learning engine for wider reach.' },
  { icon: Globe, title: 'EdTech Companies', description: 'Build integrations that create seamless experiences for educators and learners.' },
  { icon: BarChart3, title: 'Research Institutions', description: 'Collaborate on studies in neurodiversity, AI in education, and learning science.' },
  { icon: Users, title: 'Non-Profits & Advocates', description: 'Partner to expand access to inclusive education tools for underserved communities.' },
  { icon: Handshake, title: 'Consultants & Resellers', description: 'Add AIVO to your portfolio and help schools find the right inclusive learning solution.' },
];

const stats = [
  { value: '50+', label: 'Partner Organisations' },
  { value: '12', label: 'Active Integrations' },
  { value: '3,200+', label: 'Learners via Partners' },
  { value: '98%', label: 'Partner Satisfaction' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PartnersPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-theme-primary-50 to-white relative overflow-hidden">
          <div className="absolute top-20 -right-32 w-64 h-64 bg-coral-200/20 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" className="mb-4">Partners</Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Partner With{' '}
                <span className="text-gradient-primary">AIVO</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Together we can make inclusive, AI-powered education accessible to every learner. Join our growing partner ecosystem.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-soft"
                >
                  <div className="text-3xl md:text-4xl font-bold text-theme-primary-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partner Tiers ───────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <Badge variant="primary" className="mb-4">Programme Tiers</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">Choose Your Partnership Level</h2>
              <p className="text-gray-600 max-w-xl mx-auto">From referral partnerships to deep strategic collaborations — find the right fit.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {partnerTiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-shadow"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-5`}>
                    <tier.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-gray-600 text-sm mb-5">{tier.description}</p>
                  <div className="space-y-2">
                    {tier.benefits.map((b) => (
                      <div key={b} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-mint-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{b}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partner Types ───────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">Who We Partner With</h2>
              <p className="text-gray-600 max-w-xl mx-auto">We work with organisations across the education ecosystem.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {partnerTypes.map((pt, i) => (
                <motion.div
                  key={pt.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <pt.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">{pt.title}</h3>
                  <p className="text-gray-600 text-sm">{pt.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust ───────────────────────────────────────────── */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: Shield, label: 'FERPA & COPPA Compliant' },
                { icon: Shield, label: 'SOC 2 Type II' },
                { icon: Globe, label: 'Global Availability' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
                  <Icon className="w-5 h-5 text-theme-primary-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-br from-theme-primary-600 to-purple-700">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Handshake className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Let&apos;s Build the Future of Education Together</h2>
              <p className="text-theme-primary-100 text-lg max-w-xl mx-auto mb-8">
                Ready to explore a partnership? Our team would love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-theme-primary-600 font-semibold rounded-2xl hover:shadow-lg transition-shadow">
                  Contact Partnerships <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/demo" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors">
                  Request a Demo
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
