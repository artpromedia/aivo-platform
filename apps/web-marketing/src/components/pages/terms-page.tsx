'use client';

import { FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export function TermsPage() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <FileText className="w-3 h-3 mr-1" />
              {t('terms.badge')}
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('terms.heading')}
            </h1>
            <p className="text-gray-500">
              {t('terms.lastUpdated')} {t('terms.lastUpdatedDate')} | {t('terms.effective')}{' '}
              {t('terms.effectiveDate')}
            </p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto prose prose-gray prose-lg">
            {/* 1. Agreement to Terms */}
            <section>
              <h2>{t('terms.sections.agreementToTerms.title')}</h2>
              <p>{t('terms.body.agreementToTerms.p1')}</p>
              <p>{t('terms.body.agreementToTerms.p2')}</p>
            </section>

            {/* 2. Description of Service */}
            <section>
              <h2>{t('terms.sections.descriptionOfService.title')}</h2>
              <p>{t('terms.body.descriptionOfService.p1')}</p>
              <ul>
                {(
                  t('terms.body.descriptionOfService.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{t('terms.body.descriptionOfService.p2')}</p>
            </section>

            {/* 3. User Accounts */}
            <section>
              <h2>{t('terms.sections.userAccounts.title')}</h2>

              <h3>
                {(t('terms.sections.userAccounts.subs', { returnObjects: true }) as string[])[0]}
              </h3>
              <p>{t('terms.body.userAccounts.accountCreation.intro')}</p>
              <ul>
                {(
                  t('terms.body.userAccounts.accountCreation.items', {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3>
                {(t('terms.sections.userAccounts.subs', { returnObjects: true }) as string[])[1]}
              </h3>
              <p>{t('terms.body.userAccounts.accountsForMinors.p1')}</p>

              <h3>
                {(t('terms.sections.userAccounts.subs', { returnObjects: true }) as string[])[2]}
              </h3>
              <p>{t('terms.body.userAccounts.accountTermination.p1')}</p>
            </section>

            {/* 4. Acceptable Use */}
            <section>
              <h2>{t('terms.sections.acceptableUse.title')}</h2>
              <p>{t('terms.body.acceptableUse.intro')}</p>
              <ul>
                {(t('terms.body.acceptableUse.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p>{t('terms.body.acceptableUse.p2')}</p>
            </section>

            {/* 5. Intellectual Property */}
            <section>
              <h2>{t('terms.sections.intellectualProperty.title')}</h2>

              <h3>
                {
                  (
                    t('terms.sections.intellectualProperty.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[0]
                }
              </h3>
              <p>{t('terms.body.intellectualProperty.ourContent.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.intellectualProperty.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[1]
                }
              </h3>
              <p>{t('terms.body.intellectualProperty.yourContent.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.intellectualProperty.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[2]
                }
              </h3>
              <p>{t('terms.body.intellectualProperty.permittedUse.p1')}</p>
            </section>

            {/* 6. Subscription and Payment */}
            <section>
              <h2>{t('terms.sections.subscriptionAndPayment.title')}</h2>

              <h3>
                {
                  (
                    t('terms.sections.subscriptionAndPayment.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[0]
                }
              </h3>
              <p>{t('terms.body.subscriptionAndPayment.pricing.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.subscriptionAndPayment.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[1]
                }
              </h3>
              <p>{t('terms.body.subscriptionAndPayment.billing.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.subscriptionAndPayment.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[2]
                }
              </h3>
              <p>{t('terms.body.subscriptionAndPayment.cancellation.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.subscriptionAndPayment.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[3]
                }
              </h3>
              <p>{t('terms.body.subscriptionAndPayment.freeTrials.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.subscriptionAndPayment.subs', {
                      returnObjects: true,
                    }) as string[]
                  )[4]
                }
              </h3>
              <p>{t('terms.body.subscriptionAndPayment.refunds.p1')}</p>
            </section>

            {/* 7. Educational Content Disclaimer */}
            <section>
              <h2>{t('terms.sections.educationalDisclaimer.title')}</h2>
              <p>{t('terms.body.educationalDisclaimer.p1')}</p>
              <ul>
                {(
                  t('terms.body.educationalDisclaimer.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{t('terms.body.educationalDisclaimer.p2')}</p>
            </section>

            {/* 8. Limitation of Liability */}
            <section>
              <h2>{t('terms.sections.limitationOfLiability.title')}</h2>
              <p>{t('terms.body.limitationOfLiability.p1')}</p>
              <ul>
                {(
                  t('terms.body.limitationOfLiability.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{t('terms.body.limitationOfLiability.p2')}</p>
            </section>

            {/* 9. Disclaimer of Warranties */}
            <section>
              <h2>{t('terms.sections.disclaimerOfWarranties.title')}</h2>
              <p>{t('terms.body.disclaimerOfWarranties.p1')}</p>
              <ul>
                {(
                  t('terms.body.disclaimerOfWarranties.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{t('terms.body.disclaimerOfWarranties.p2')}</p>
            </section>

            {/* 10. Indemnification */}
            <section>
              <h2>{t('terms.sections.indemnification.title')}</h2>
              <p>{t('terms.body.indemnification.p1')}</p>
              <ul>
                {(t('terms.body.indemnification.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
            </section>

            {/* 11. Termination */}
            <section>
              <h2>{t('terms.sections.termination.title')}</h2>

              <h3>
                {(t('terms.sections.termination.subs', { returnObjects: true }) as string[])[0]}
              </h3>
              <p>{t('terms.body.termination.byYou.p1')}</p>

              <h3>
                {(t('terms.sections.termination.subs', { returnObjects: true }) as string[])[1]}
              </h3>
              <p>{t('terms.body.termination.byUs.p1')}</p>
              <ul>
                {(t('terms.body.termination.byUs.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>

              <h3>
                {(t('terms.sections.termination.subs', { returnObjects: true }) as string[])[2]}
              </h3>
              <p>{t('terms.body.termination.effectOfTermination.p1')}</p>
            </section>

            {/* 12. Dispute Resolution */}
            <section>
              <h2>{t('terms.sections.disputeResolution.title')}</h2>

              <h3>
                {
                  (
                    t('terms.sections.disputeResolution.subs', { returnObjects: true }) as string[]
                  )[0]
                }
              </h3>
              <p>{t('terms.body.disputeResolution.informalResolution.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.disputeResolution.subs', { returnObjects: true }) as string[]
                  )[1]
                }
              </h3>
              <p>{t('terms.body.disputeResolution.arbitration.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.disputeResolution.subs', { returnObjects: true }) as string[]
                  )[2]
                }
              </h3>
              <p>{t('terms.body.disputeResolution.classActionWaiver.p1')}</p>

              <h3>
                {
                  (
                    t('terms.sections.disputeResolution.subs', { returnObjects: true }) as string[]
                  )[3]
                }
              </h3>
              <p>{t('terms.body.disputeResolution.exceptions.p1')}</p>
            </section>

            {/* 13. Changes to Terms */}
            <section>
              <h2>{t('terms.sections.changesToTerms.title')}</h2>
              <p>{t('terms.body.changesToTerms.p1')}</p>
              <ul>
                {(t('terms.body.changesToTerms.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p>{t('terms.body.changesToTerms.p2')}</p>
            </section>

            {/* 14. Governing Law */}
            <section>
              <h2>{t('terms.sections.governingLaw.title')}</h2>
              <p>{t('terms.body.governingLaw.p1')}</p>
            </section>

            {/* 15. Severability */}
            <section>
              <h2>{t('terms.sections.severability.title')}</h2>
              <p>{t('terms.body.severability.p1')}</p>
            </section>

            {/* 16. Entire Agreement */}
            <section>
              <h2>{t('terms.sections.entireAgreement.title')}</h2>
              <p>{t('terms.body.entireAgreement.p1')}</p>
            </section>

            {/* 17. Contact Information */}
            <section>
              <h2>{t('terms.sections.contactInformation.title')}</h2>
              <p>{t('terms.body.contactInformation.p1')}</p>
              <div className="bg-gray-50 rounded-xl p-6 not-prose">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t('terms.contactBlock.department')}
                    </p>
                    <p className="text-gray-600">{t('terms.contactBlock.company')}</p>
                    <p className="text-gray-600">
                      {t('terms.contactBlock.emailLabel')}{' '}
                      <a
                        href={`mailto:${t('terms.contactBlock.email')}`}
                        className="text-theme-primary-600 hover:underline"
                      >
                        {t('terms.contactBlock.email')}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </article>

          {/* Back to Home */}
          <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-theme-primary-600 hover:underline inline-flex items-center gap-2"
            >
              {t('terms.backToHome')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
