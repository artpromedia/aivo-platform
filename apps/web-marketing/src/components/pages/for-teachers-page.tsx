'use client';

import { motion } from 'framer-motion';
import {
  GraduationCap,
  BarChart3,
  FileText,
  Target,
  Users,
  Clock,
  ArrowRight,
  Star,
  CheckCircle,
  Layers,
  PieChart,
  Settings,
  Brain,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

/**
 * Get progress bar color based on progress percentage
 */
function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-mint-500';
  if (progress >= 50) return 'bg-sunshine-500';
  return 'bg-coral-500';
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export function ForTeachersPage() {
  const { t } = useTranslation('marketing');

  const benefitIcons = [Layers, BarChart3, Target, FileText];
  const benefitColors = [
    'from-theme-primary-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-mint-500 to-teal-500',
    'from-coral-500 to-pink-500',
  ];
  const benefits = (
    t('forTeachers.benefits', { returnObjects: true }) as Array<{ title: string; description: string }>
  ).map((b, i) => ({ ...b, icon: benefitIcons[i], color: benefitColors[i] }));

  const featureIcons = [Users, PieChart, Brain, Clock, Settings, Shield];
  const classroomFeatures = (
    t('forTeachers.features', { returnObjects: true }) as Array<{ title: string; description: string }>
  ).map((f, i) => ({ ...f, icon: featureIcons[i] }));

  const testimonials = t('forTeachers.testimonials', { returnObjects: true }) as Array<{
    quote: string;
    author: string;
    role: string;
    experience: string;
  }>;

  const stats = t('forTeachers.stats', { returnObjects: true }) as Array<{
    value: string;
    label: string;
  }>;

  const heroCheckPoints = t('forTeachers.heroCheckPoints', { returnObjects: true }) as string[];
  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-blue-50/30 -z-10" />
          <motion.div
            className="absolute top-20 right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.div variants={fadeInUp}>
                  <Badge variant="primary" className="mb-6">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {t('forTeachers.heroBadge')}
                  </Badge>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
                >
                  {t('forTeachers.heroHeadingPrefix')}{' '}
                  <span className="bg-gradient-to-r from-theme-primary-600 to-blue-600 bg-clip-text text-transparent">
                    {t('forTeachers.heroHeadingHighlight')}
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-xl text-gray-600 mb-8 leading-relaxed"
                >
                  {t('forTeachers.heroDescription')}
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row items-start gap-4"
                >
                  <Button variant="primary" size="lg" asChild>
                    <Link href="/demo">
                      {t('forTeachers.heroCtaPrimary')}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#features">{t('forTeachers.heroCtaSecondary')}</Link>
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="mt-8 flex items-center gap-4 text-sm text-gray-500"
                >
                  {heroCheckPoints.map((cp) => (
                    <span key={cp} className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-mint-500" />
                      {cp}
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Dashboard Visual */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
              >
                <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">{t('forTeachers.dashboardPreview.title')}</h3>
                    <Badge variant="outline">{t('forTeachers.dashboardPreview.studentsBadge')}</Badge>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-mint-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-mint-700">{t('forTeachers.dashboardPreview.onTrack')}</div>
                      <div className="text-xs text-mint-600">{t('forTeachers.dashboardPreview.onTrackLabel')}</div>
                    </div>
                    <div className="bg-sunshine-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-sunshine-700">{t('forTeachers.dashboardPreview.needsSupport')}</div>
                      <div className="text-xs text-sunshine-600">{t('forTeachers.dashboardPreview.needsSupportLabel')}</div>
                    </div>
                    <div className="bg-theme-primary-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-theme-primary-700">{t('forTeachers.dashboardPreview.excelling')}</div>
                      <div className="text-xs text-theme-primary-600">{t('forTeachers.dashboardPreview.excellingLabel')}</div>
                    </div>
                  </div>

                  {/* Student list preview */}
                  <div className="space-y-2">
                    {[
                      {
                        name: t('forTeachers.dashboardPreview.studentA'),
                        status: t('forTeachers.dashboardPreview.studentADetail'),
                        progress: 72,
                        iep: true,
                      },
                      {
                        name: t('forTeachers.dashboardPreview.studentB'),
                        status: t('forTeachers.dashboardPreview.studentBDetail'),
                        progress: 100,
                        iep: false,
                      },
                      { name: t('forTeachers.dashboardPreview.studentC'), status: t('forTeachers.dashboardPreview.studentCDetail'), progress: 45, iep: true },
                    ].map((student) => (
                      <div
                        key={student.name}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="w-8 h-8 bg-theme-primary-100 rounded-full flex items-center justify-center text-theme-primary-700 font-semibold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {student.name}
                            </span>
                            {student.iep && (
                              <Badge variant="primary" size="sm">
                                {t('forTeachers.dashboardPreview.iepBadge')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{student.status}</div>
                        </div>
                        <div className="w-16">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                getProgressColor(student.progress)
                              )}
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <Section background="gray" padding="default">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Benefits Section */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge={t('forTeachers.benefitsBadge')}
            title={t('forTeachers.benefitsHeading')}
            description={t('forTeachers.benefitsDescription')}
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={fadeInUp}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br',
                      benefit.color
                    )}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* Features Grid */}
        <Section id="features" background="gradient" padding="lg">
          <SectionHeader
            badge={t('forTeachers.featuresBadge')}
            title={t('forTeachers.featuresHeading')}
            description={t('forTeachers.featuresDescription')}
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {classroomFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* Testimonials */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge={t('forTeachers.testimonialsBadge')}
            title={t('forTeachers.testimonialsHeading')}
            description={t('forTeachers.testimonialsDescription')}
          />

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={`star-${n}`} className="w-5 h-5 text-sunshine-500 fill-current" />
                  ))}
                </div>

                <blockquote className="text-gray-700 mb-6 leading-relaxed text-lg">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">
                      {testimonial.role} • {testimonial.experience}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-600 to-blue-700" />
          <motion.div
            className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                {t('forTeachers.ctaHeading')}
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                {t('forTeachers.ctaDescription')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-theme-primary-600 hover:bg-white/90"
                  asChild
                >
                  <Link href="/demo">
                    {t('forTeachers.ctaButtonPrimary')}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/features/schools">{t('forTeachers.ctaButtonSecondary')}</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
