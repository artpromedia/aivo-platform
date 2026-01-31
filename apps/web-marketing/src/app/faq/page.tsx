import type { Metadata } from 'next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { generateFAQSchema, SchemaScript } from '@/lib/schema-org';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | AIVO Learning',
  description:
    'Find answers to common questions about AIVO Learning, our AI tutoring platform for neurodiverse students, pricing, features, and implementation.',
  openGraph: {
    title: 'FAQ - AIVO Learning',
    description: 'Common questions about AI personalized learning for neurodiverse students',
  },
};

const faqCategories = [
  {
    category: 'About AIVO',
    questions: [
      {
        question: 'What is AIVO Learning?',
        answer:
          'AIVO Learning is an AI-powered personalized learning platform specifically designed for neurodiverse K-12 students. We use Virtual Brain AI tutors that adapt to each student\'s unique learning style, pace, and needs. Our platform supports students with ADHD, autism, dyslexia, dyscalculia, and other learning differences.',
      },
      {
        question: 'What is a Virtual Brain?',
        answer:
          'A Virtual Brain is AIVO\'s personalized AI tutor that adapts to how each student learns best. It tracks learning patterns, preferences, strengths, and challenges to create a customized learning experience. Think of it as a dedicated tutor who understands exactly how your child thinks and learns.',
      },
      {
        question: 'Is AIVO only for neurodiverse students?',
        answer:
          'While AIVO is designed with neurodiverse learners in mind, our adaptive technology benefits all students. Every learner is unique, and AIVO personalizes education for each individual regardless of whether they have a diagnosed learning difference.',
      },
    ],
  },
  {
    category: 'Features & Capabilities',
    questions: [
      {
        question: 'What learning differences does AIVO support?',
        answer:
          'AIVO provides specialized support for ADHD, autism spectrum disorder, dyslexia, dyscalculia, dysgraphia, executive function challenges, and other learning differences. Each condition has dedicated features like focus mode for ADHD, visual schedules for autism, text-to-speech for dyslexia, and visual math for dyscalculia.',
      },
      {
        question: 'Can AIVO help with IEP goals?',
        answer:
          'Yes! AIVO includes real-time IEP goal tracking and progress monitoring. Teachers can align lessons with IEP objectives, track student progress toward goals, and generate detailed reports for IEP meetings. The platform automatically collects data points that demonstrate progress on specific goals.',
      },
      {
        question: 'What subjects does AIVO teach?',
        answer:
          'AIVO covers all core K-12 subjects including Math, Reading/ELA, Writing, Science, and Social Studies. We also offer SEL (Social-Emotional Learning), executive function training, and life skills modules. All content is standards-aligned and adapts to each student\'s grade level and abilities.',
      },
      {
        question: 'Does AIVO work 24/7?',
        answer:
          'Yes! AIVO\'s AI tutors are available 24/7 for homework help, practice, and learning support. Students can learn at their own pace, any time of day. Human support from our team is available 8am-8pm ET for technical issues and implementation questions.',
      },
      {
        question: 'Is AIVO accessible?',
        answer:
          'Absolutely. AIVO is built to WCAG 2.1 Level AA accessibility standards. We include text-to-speech, speech-to-text, adjustable fonts and colors, keyboard navigation, screen reader support, captions, high contrast modes, and more. Accessibility is core to our design.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        question: 'Is my child\'s data safe?',
        answer:
          'Yes. AIVO is FERPA and COPPA compliant. We use end-to-end encryption, never sell student data, never show ads, and follow strict data protection protocols. We\'re committed to the Student Privacy Pledge and are pursuing SOC 2 Type II certification.',
      },
      {
        question: 'Who can see my child\'s learning data?',
        answer:
          'Only you (the parent/guardian), your child\'s assigned teachers, and necessary school administrators can access your child\'s learning data. Data is never shared with third parties. Parents have full control and can request data deletion at any time.',
      },
      {
        question: 'Do you sell student data or show ads?',
        answer:
          'No, never. AIVO does not sell, rent, or share student data with any third parties. We do not show advertisements. Our revenue comes exclusively from subscriptions, not from monetizing user data.',
      },
    ],
  },
  {
    category: 'Pricing & Plans',
    questions: [
      {
        question: 'How much does AIVO cost?',
        answer:
          'AIVO offers several plans: Free (limited features), Family ($29/month for up to 3 students), Classroom ($15/student/month), and custom School/District pricing. All paid plans include a 30-day free trial with no credit card required.',
      },
      {
        question: 'Is there a free trial?',
        answer:
          'Yes! All paid plans include a 30-day free trial with full access to all features. No credit card is required to start your trial. You can cancel anytime during the trial with no charges.',
      },
      {
        question: 'Can I get funding or grants for AIVO?',
        answer:
          'Yes, many schools use IDEA funds, Title I funds, ESSER funds, or special education budgets to cover AIVO. We provide documentation and support for grant applications. Contact our sales team for assistance with funding options.',
      },
      {
        question: 'Do you offer discounts for multiple students?',
        answer:
          'Yes. Our Family plan covers up to 3 students at $29/month (significant savings vs individual). Schools and districts receive volume discounts. Non-profits and Title I schools may qualify for additional discounts.',
      },
    ],
  },
  {
    category: 'Implementation & Setup',
    questions: [
      {
        question: 'How long does implementation take?',
        answer:
          'For individual families: 15 minutes. For classrooms: 1-2 days for roster setup and training. For schools/districts: 2-4 weeks including rostering, training, and professional development. We provide full implementation support.',
      },
      {
        question: 'Does AIVO integrate with Google Classroom?',
        answer:
          'Yes! AIVO integrates seamlessly with Google Classroom for automatic roster sync, assignment posting, and grade passback. We also integrate with Canvas, Schoology, Clever, and ClassLink.',
      },
      {
        question: 'What devices work with AIVO?',
        answer:
          'AIVO works on any modern device: Chromebooks, iPads, tablets, Windows/Mac computers, and smartphones. We have web apps (Chrome, Safari, Firefox, Edge) and mobile apps for iOS and Android. We also offer the AIVO Pad, our purpose-built learning tablet.',
      },
      {
        question: 'Do I need special equipment?',
        answer:
          'No special equipment needed! AIVO works with standard devices and internet connection. Optional: headphones for audio content, stylus for writing activities, webcam for certain interactive features.',
      },
    ],
  },
  {
    category: 'For Educators',
    questions: [
      {
        question: 'How does AIVO help teachers save time?',
        answer:
          'AIVO automates differentiation, progress monitoring, and data collection. Teachers report saving 5-10 hours per week on lesson planning and assessment. The platform handles individualization while teachers focus on high-impact instruction and relationships.',
      },
      {
        question: 'Can teachers create custom content?',
        answer:
          'Yes! Teachers can create custom lessons, assignments, and assessments. You can also curate content from AIVO\'s library, import your existing materials, or use AI assistance to generate adapted content.',
      },
      {
        question: 'What training do teachers receive?',
        answer:
          'We provide comprehensive training including video tutorials, interactive onboarding, live webinars, and ongoing professional development. Most teachers are comfortable using AIVO within 1-2 weeks. Certification courses are also available.',
      },
    ],
  },
  {
    category: 'Results & Effectiveness',
    questions: [
      {
        question: 'What results do students see with AIVO?',
        answer:
          'Students using AIVO average 1.5 years of learning growth in one school year. 87% of students are engaged daily, and 94% of parents report their child is more confident and independent in learning. Results vary by individual.',
      },
      {
        question: 'Is AIVO research-based?',
        answer:
          'Yes. AIVO is built on evidence-based practices including Universal Design for Learning (UDL), differentiated instruction, multi-sensory instruction, spaced repetition, and cognitive load theory. We partner with research institutions to continuously validate our approach.',
      },
      {
        question: 'How quickly will I see progress?',
        answer:
          'Most families notice increased engagement within the first week. Measurable academic progress typically shows within 4-6 weeks of consistent use (3-4 times per week). Long-term gains compound over months of use.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <SchemaScript
        schema={generateFAQSchema(
          faqCategories.flatMap((cat) => cat.questions)
        )}
      />
      
      <div className="flex min-h-screen flex-col">
        <Navigation />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-purple-50 to-white py-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-4 text-4xl font-bold text-slate-900 sm:text-5xl">
                  Frequently Asked Questions
                </h1>
                <p className="mb-8 text-lg text-slate-600">
                  Find answers to common questions about AIVO Learning, our AI tutoring
                  platform, and how we support neurodiverse learners.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Content */}
          <section className="py-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-4xl">
                {faqCategories.map((category) => (
                  <div key={category.category} className="mb-12">
                    <h2 className="mb-6 text-2xl font-bold text-slate-900">
                      {category.category}
                    </h2>
                    
                    <Accordion type="single" collapsible className="space-y-4">
                      {category.questions.map((faq) => (
                        <AccordionItem
                          key={faq.question}
                          value={faq.question}
                          className="rounded-lg border bg-white px-6 shadow-sm"
                        >
                          <AccordionTrigger className="text-left text-lg font-semibold text-slate-900 hover:text-purple-600">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-slate-600">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>

              {/* Contact CTA */}
              <div className="mx-auto mt-16 max-w-3xl rounded-2xl bg-purple-50 p-8 text-center">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">
                  Still have questions?
                </h2>
                <p className="mb-6 text-slate-600">
                  Our team is here to help. Reach out and we&apos;ll respond within 24 hours.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <a
                    href="/contact"
                    className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
                  >
                    Contact Us
                  </a>
                  <a
                    href="/demo"
                    className="rounded-lg border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 hover:bg-purple-50"
                  >
                    Schedule a Demo
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
