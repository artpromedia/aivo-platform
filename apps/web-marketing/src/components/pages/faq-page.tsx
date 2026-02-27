'use client';

import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { generateFAQSchema, SchemaScript } from '@/lib/schema-org';

const categoryKeys = [
  'aboutAivo',
  'featuresCapabilities',
  'privacySecurity',
  'pricingPlans',
  'implementationSetup',
  'forEducators',
  'resultsEffectiveness',
] as const;

export function FAQPage() {
  const { t } = useTranslation('marketing');

  const faqCategories = categoryKeys.map((key) => ({
    category: t(`faq.categories.${key}.title`),
    questions: t(`faq.categories.${key}.items`, { returnObjects: true }) as {
      question: string;
      answer: string;
    }[],
  }));

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
                  {t('faq.heading')}
                </h1>
                <p className="mb-8 text-lg text-slate-600">
                  {t('faq.description')}
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
                  {t('faq.contactHeading')}
                </h2>
                <p className="mb-6 text-slate-600">
                  {t('faq.contactDescription')}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <a
                    href="/contact"
                    className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
                  >
                    {t('faq.contactCtaPrimary')}
                  </a>
                  <a
                    href="/demo"
                    className="rounded-lg border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 hover:bg-purple-50"
                  >
                    {t('faq.contactCtaSecondary')}
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
