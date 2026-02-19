'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  details?: string;
  rating: number;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "My daughter actually looks forward to learning now. The AI tutor adapts to her ADHD and keeps her engaged without frustration. We saw real improvement in just 8 weeks of the pilot program.",
    author: 'Parent',
    role: 'Parent of a 4th Grader',
    details: 'Minneapolis, MN',
    rating: 5,
    avatar: 'P',
  },
  {
    id: 2,
    quote:
      "The IEP integration actually works. I can see each student's goals tracked automatically, and the AI recommendations help me adjust instruction in real time. This saves hours of documentation.",
    author: 'Educator',
    role: 'Special Education Teacher',
    details: 'New York, NY',
    rating: 5,
    avatar: 'E',
  },
  {
    id: 3,
    quote:
      "The predictable routines and sensory-friendly design made all the difference for my son on the autism spectrum. His confidence in learning has really grown during the pilot.",
    author: 'Parent',
    role: 'Parent of a 2nd Grader',
    details: 'Minneapolis, MN',
    rating: 5,
    avatar: 'P',
  },
];

const stats = [
  { value: '150', label: 'Pilot Students', suffix: '+' },
  { value: '3', label: 'Month Pilot', suffix: 'mo' },
  { value: '100', label: 'IEP Aligned', suffix: '%' },
  { value: 'K-12', label: 'Full Curriculum', suffix: '' },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const next = () => setActiveIndex((i) => (i + 1) % testimonials.length);
  const prev = () => setActiveIndex((i) => (i - 1 + testimonials.length) % testimonials.length);

  // Auto-advance every 6 seconds
  React.useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[activeIndex];

  return (
    <Section id="testimonials" background="gradient" padding="lg">
      <SectionHeader
        badge="Success Stories"
        title={
          <>
            Loved by <span className="text-gradient-primary">Families &amp; Educators</span>
          </>
        }
        description="Hear from the families and educators who trust AIVO every day."
      />

      {/* Testimonial Carousel */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="relative bg-white rounded-3xl p-8 md:p-12 shadow-soft border border-gray-100 min-h-[320px] flex flex-col justify-between">
          {/* Quote Icon */}
          <div className="absolute -top-5 left-8">
            <div className="w-10 h-10 bg-theme-primary-100 rounded-full flex items-center justify-center">
              <Quote className="w-5 h-5 text-theme-primary-600" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5',
                      i < current.rating ? 'text-sunshine-500 fill-current' : 'text-gray-200'
                    )}
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 text-lg md:text-xl leading-relaxed mb-8">
                &ldquo;{current.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-theme-primary-400 to-theme-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {current.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{current.author}</div>
                  <div className="text-sm text-gray-500">{current.role}</div>
                  {current.details && (
                    <div className="text-xs text-gray-400">{current.details}</div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav Arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-5">
            <button
              onClick={prev}
              className="w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-5">
            <button
              onClick={next}
              className="w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all duration-300',
                i === activeIndex
                  ? 'bg-theme-primary-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
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
    </Section>
  );
}
