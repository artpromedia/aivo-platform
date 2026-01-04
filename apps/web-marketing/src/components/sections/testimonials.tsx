'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  details?: string;
  rating: number;
  badge: string;
  avatar: string;
  highlight?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "For the first time, my daughter actually looks forward to learning. The AI tutor understands her ADHD and keeps her engaged without frustration. We've seen a complete transformation in just 8 weeks.",
    author: 'Pilot Parent',
    role: 'Parent',
    details: 'Daughter with ADHD, Age 9',
    rating: 5,
    badge: 'Pilot Family',
    avatar: 'P',
    highlight: 'Complete transformation',
  },
  {
    id: 2,
    quote:
      "As a special education teacher, I've tried many tools. AIVO is the first that truly differentiates for each student's needs. The IEP integration saves me hours of documentation.",
    author: 'Pilot Educator',
    role: 'Special Ed Teacher',
    details: '12 years experience',
    rating: 5,
    badge: 'Pilot Educator',
    avatar: 'E',
    highlight: 'Saves hours',
  },
  {
    id: 3,
    quote:
      "My son is on the autism spectrum and struggles with traditional learning. AIVO's predictable routines and sensory-friendly design have made all the difference. His confidence has soared.",
    author: 'Pilot Family',
    role: 'Parents',
    details: 'Son with ASD, Age 7',
    rating: 5,
    badge: 'Pilot Family',
    avatar: 'F',
    highlight: 'Confidence has soared',
  },
];

const stats = [
  { value: '4.9', label: 'Average Rating', suffix: '/5' },
  { value: '150', label: 'Pilot Students', suffix: '+' },
  { value: '94', label: 'Would Recommend', suffix: '%' },
  { value: '3', label: 'Months to Results', suffix: '' },
];

export function Testimonials() {
  return (
    <Section id="testimonials" background="gradient" padding="lg">
      <SectionHeader
        badge="Success Stories"
        title={
          <>
            Loved by <span className="text-gradient-primary">Families &amp; Educators</span>
          </>
        }
        description="Don't just take our word for it. Hear from the families and educators in our pilot program."
      />

      {/* Testimonial Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative bg-white rounded-3xl p-8 shadow-soft border border-gray-100 hover:shadow-soft-lg transition-shadow"
          >
            {/* Quote Icon */}
            <div className="absolute -top-4 -left-2">
              <div className="w-10 h-10 bg-theme-primary-100 rounded-full flex items-center justify-center">
                <Quote className="w-5 h-5 text-theme-primary-600" />
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-5 h-5',
                    i < testimonial.rating ? 'text-sunshine-500 fill-current' : 'text-gray-200'
                  )}
                />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-gray-700 mb-6 leading-relaxed">
              &quot;{testimonial.quote}&quot;
            </blockquote>

            {/* Highlight */}
            {testimonial.highlight && (
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-mint-50 text-mint-700 text-sm font-medium rounded-full">
                  ✨ {testimonial.highlight}
                </span>
              </div>
            )}

            {/* Author */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-400 to-coral-400 rounded-full flex items-center justify-center text-white font-bold">
                {testimonial.avatar}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{testimonial.author}</div>
                <div className="text-sm text-gray-500">{testimonial.role}</div>
                {testimonial.details && (
                  <div className="text-xs text-gray-400">{testimonial.details}</div>
                )}
              </div>
            </div>

            {/* Badge */}
            <div className="absolute top-6 right-6">
              <Badge variant="primary" size="sm">
                {testimonial.badge}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white rounded-3xl p-8 shadow-soft border border-gray-100"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                {stat.value}
                <span className="text-theme-primary-500">{stat.suffix}</span>
              </div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Trust Message */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-gray-500 mt-8"
      >
        Results from our 3-month pilot program with real families and educators.
      </motion.p>
    </Section>
  );
}
