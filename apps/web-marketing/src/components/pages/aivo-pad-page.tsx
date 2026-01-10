'use client';

import { motion } from 'framer-motion';
import {
  Tablet,
  Zap,
  Shield,
  Eye,
  Brain,
  Focus,
  BatteryFull,
  Wifi,
  Lock,
  Palette,
  Volume2,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Sparkles,
  BookOpen,
  Gamepad2,
  Bell,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

// Key features of AIVO Pad
const features = [
  {
    icon: Brain,
    title: 'AI-Powered Learning',
    description:
      "Built-in AIVO AI adapts content in real-time to match your child's learning style and pace.",
    color: 'from-theme-primary-500 to-purple-600',
  },
  {
    icon: Focus,
    title: 'Focus Mode',
    description:
      'Eliminates distractions with a single tap. Only learning apps available during study time.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Eye,
    title: 'Eye Comfort Display',
    description:
      'Anti-glare, blue-light filtered screen reduces eye strain during extended learning sessions.',
    color: 'from-mint-500 to-teal-500',
  },
  {
    icon: Shield,
    title: 'Kid-Safe Design',
    description:
      'Rugged, drop-proof case with rounded corners. Built to withstand daily use by active kids.',
    color: 'from-coral-500 to-orange-500',
  },
];

// Technical specifications
const specs = [
  { icon: Tablet, label: '10.2" Display', detail: 'Retina-quality, anti-glare' },
  { icon: BatteryFull, label: '12+ Hours', detail: 'All-day battery life' },
  { icon: Wifi, label: 'WiFi + LTE', detail: 'Learn anywhere (optional)' },
  { icon: Lock, label: 'Parental Controls', detail: 'Full content control' },
  { icon: Volume2, label: 'Adaptive Audio', detail: 'Noise-isolating speakers' },
  { icon: Palette, label: 'Customizable', detail: 'Themes for sensory needs' },
];

// Built-in apps and features
const builtInApps = [
  {
    icon: BookOpen,
    name: 'AIVO Learn',
    description: 'Full K-12 curriculum adapted to your child',
  },
  {
    icon: Brain,
    name: 'Virtual Brain',
    description: 'AI tutor that grows with your child',
  },
  {
    icon: Gamepad2,
    name: 'Learning Games',
    description: 'Educational games for skill-building fun',
  },
  {
    icon: Clock,
    name: 'Schedule',
    description: 'Visual routines reduce anxiety',
  },
  {
    icon: Bell,
    name: 'Focus Timer',
    description: 'Pomodoro-style work sessions',
  },
  {
    icon: Settings,
    name: 'Sensory Settings',
    description: 'Customize colors, sounds, motion',
  },
];

// Why AIVO Pad vs regular tablets
const comparisons = [
  {
    feature: 'Distraction-Free Learning',
    aivoPad: true,
    regularTablet: false,
    detail: 'No social media, games, or ads to pull attention away',
  },
  {
    feature: 'Built-in AI Tutor',
    aivoPad: true,
    regularTablet: false,
    detail: 'Personalized learning without extra subscriptions',
  },
  {
    feature: 'Neurodiverse-Friendly UI',
    aivoPad: true,
    regularTablet: false,
    detail: 'Designed for ADHD, autism, dyslexia from the ground up',
  },
  {
    feature: 'Focus Mode Hardware Button',
    aivoPad: true,
    regularTablet: false,
    detail: 'One-touch distraction elimination',
  },
  {
    feature: 'Rugged Kid-Proof Design',
    aivoPad: true,
    regularTablet: false,
    detail: 'Built for real-world use by active children',
  },
  {
    feature: 'Parent Dashboard Integration',
    aivoPad: true,
    regularTablet: false,
    detail: 'Real-time progress tracking and controls',
  },
];

// Testimonials
const testimonials = [
  {
    quote:
      'My son with ADHD can finally focus on his learning. The Focus Mode button is genius—one tap and distractions disappear.',
    author: 'Pilot Parent',
    child: 'Son, age 9, ADHD',
    rating: 5,
  },
  {
    quote:
      'We tried regular tablets but the temptation to play games was too strong. AIVO Pad solved that completely.',
    author: 'Pilot Family',
    child: 'Daughter, age 11, ASD',
    rating: 5,
  },
  {
    quote:
      'The sensory customization is incredible. We adjusted the colors and sounds to match what works for our daughter.',
    author: 'Pilot Parent',
    child: 'Daughter, age 7, Sensory Processing',
    rating: 5,
  },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export function AivoPadPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-blue-50/30 -z-10" />
          <motion.div
            className="absolute top-20 right-10 w-72 h-72 bg-theme-primary-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -z-10"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />

          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge
                  variant="outline"
                  className="mb-6 px-4 py-1.5 border-theme-primary-200 bg-theme-primary-50"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-theme-primary-500" />
                  <span className="text-theme-primary-700">Now Available for Pre-Order</span>
                </Badge>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-theme-primary-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AIVO Pad
                </h1>
                <p className="text-2xl md:text-3xl text-gray-600 mb-4">
                  The Learning Tablet Built for
                  <span className="text-theme-primary-600 font-semibold"> Neurodiverse Minds</span>
                </p>
                <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
                  A purpose-built device that eliminates distractions, adapts to your child&apos;s
                  unique learning style, and makes education accessible for every brain.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                  <Button
                    size="lg"
                    className="bg-theme-primary-600 hover:bg-theme-primary-700 text-white px-8 py-6 text-lg"
                    asChild
                  >
                    <Link href="#preorder">
                      <Zap className="w-5 h-5 mr-2" />
                      Pre-Order Now - $299
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-300 px-8 py-6 text-lg"
                    asChild
                  >
                    <Link href="#features">
                      Learn More
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </motion.div>

              {/* Device Preview */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto max-w-lg">
                  {/* Tablet Frame */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                    <div className="bg-gradient-to-br from-theme-primary-100 to-blue-100 rounded-[2rem] aspect-[4/3] flex items-center justify-center relative overflow-hidden">
                      {/* Screen Content */}
                      <div className="absolute inset-4 bg-white rounded-2xl shadow-inner p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-theme-primary-500 rounded-xl flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">Good morning, Alex! 🌟</p>
                            <p className="text-sm text-gray-500">
                              Ready for today&apos;s adventure?
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-theme-primary-100 rounded-full w-3/4" />
                          <div className="h-3 bg-mint-100 rounded-full w-1/2" />
                          <div className="h-3 bg-coral-100 rounded-full w-2/3" />
                        </div>
                      </div>
                      {/* Focus Mode Button Indicator */}
                      <div className="absolute -right-1 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                        <div className="bg-theme-primary-500 text-white text-xs px-2 py-1 rounded-l-lg font-medium">
                          Focus
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating badges */}
                  <motion.div
                    className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Shield className="w-6 h-6 text-mint-500" />
                  </motion.div>
                  <motion.div
                    className="absolute -right-4 top-1/3 bg-white rounded-xl shadow-lg p-3"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Focus className="w-6 h-6 text-theme-primary-500" />
                  </motion.div>
                  <motion.div
                    className="absolute -left-8 bottom-1/4 bg-white rounded-xl shadow-lg p-3"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity }}
                  >
                    <Eye className="w-6 h-6 text-blue-500" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <Section id="features" className="bg-gray-50">
          <SectionHeader
            title="Designed for Neurodiverse Success"
            description="Every feature purpose-built for children who learn differently"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br',
                    feature.color
                  )}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* Specifications */}
        <Section>
          <SectionHeader
            title="Built to Last, Made for Learning"
            description="Premium hardware designed for daily educational use"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {specs.map((spec) => (
              <motion.div
                key={spec.label}
                variants={fadeInUp}
                className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 text-center border border-gray-100"
              >
                <spec.icon className="w-8 h-8 mx-auto mb-2 text-theme-primary-500" />
                <p className="font-semibold text-gray-800">{spec.label}</p>
                <p className="text-sm text-gray-500">{spec.detail}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* Built-in Apps */}
        <Section className="bg-gradient-to-br from-theme-primary-50 via-white to-blue-50">
          <SectionHeader
            title="Everything Your Child Needs, Pre-Installed"
            description="No subscriptions, no in-app purchases, no ads"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {builtInApps.map((app) => (
              <motion.div
                key={app.name}
                variants={fadeInUp}
                className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <app.icon className="w-6 h-6 text-theme-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{app.name}</h3>
                  <p className="text-sm text-gray-600">{app.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* Comparison Section */}
        <Section>
          <SectionHeader
            title="Why AIVO Pad vs a Regular Tablet?"
            description="Purpose-built beats general-purpose every time"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-gray-50 border-b">
                <div className="p-4 font-semibold text-gray-600">Feature</div>
                <div className="p-4 font-semibold text-center text-theme-primary-600 bg-theme-primary-50">
                  AIVO Pad
                </div>
                <div className="p-4 font-semibold text-center text-gray-600">Regular Tablet</div>
              </div>
              {/* Rows */}
              {comparisons.map((row, index) => (
                <div
                  key={row.feature}
                  className={cn(
                    'grid grid-cols-3 border-b last:border-0',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  )}
                >
                  <div className="p-4">
                    <p className="font-medium text-gray-800">{row.feature}</p>
                    <p className="text-sm text-gray-500">{row.detail}</p>
                  </div>
                  <div className="p-4 flex items-center justify-center bg-theme-primary-50/50">
                    <CheckCircle className="w-6 h-6 text-mint-500" />
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </Section>

        {/* Testimonials */}
        <Section className="bg-gray-50">
          <SectionHeader
            title="Parents Love AIVO Pad"
            description="Real families sharing their experiences"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-800">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.child}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* Pre-order CTA */}
        <Section
          id="preorder"
          className="bg-gradient-to-br from-theme-primary-600 to-purple-700 text-white"
        >
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 text-white border-0">
              <Sparkles className="w-4 h-4 mr-2" />
              Limited Time Pre-Order Price
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Reserve Your AIVO Pad Today</h2>
            <p className="text-xl text-white/80 mb-8">
              Pre-order now and save $100 off the retail price. Ships Spring 2025.
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-3xl text-white/50 line-through">$399</span>
                <span className="text-5xl font-bold">$299</span>
              </div>
              <p className="text-white/70">Includes AIVO Pad + 1 Year AIVO Premium Subscription</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-theme-primary-600 hover:bg-gray-100 px-8 py-6 text-lg"
                asChild
              >
                <Link href={`${appUrl}/checkout?product=aivo-pad-preorder`}>
                  <Zap className="w-5 h-5 mr-2" />
                  Pre-Order Now
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
                asChild
              >
                <Link href="/contact">
                  Contact Sales
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-white/60">
              30-day money-back guarantee • Free shipping • 2-year warranty
            </p>
          </div>
        </Section>

        {/* FAQ Teaser */}
        <Section>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Questions? We&apos;re Here to Help
            </h2>
            <p className="text-gray-600 mb-8">
              Our team of educators and specialists are ready to answer your questions about AIVO
              Pad and how it can support your child&apos;s learning journey.
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">
                Contact Our Team
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
