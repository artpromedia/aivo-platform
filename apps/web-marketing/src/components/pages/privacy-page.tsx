'use client';

import { Shield, Mail } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export function PrivacyPage() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              {t('privacy.badge')}
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('privacy.heading')}
            </h1>
            <p className="text-gray-500">
              {t('privacy.lastUpdated')} {t('privacy.lastUpdatedDate')}
            </p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto prose prose-gray prose-lg">
            {/* Introduction */}
            <section>
              <h2>{t('privacy.sections.introduction')}</h2>
              <p>{t('privacy.body.introduction.p1')}</p>
              <p>{t('privacy.body.introduction.p2')}</p>
              <div className="bg-mint-50 border border-mint-200 rounded-xl p-4 not-prose">
                <p className="text-mint-800 font-medium flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('privacy.body.introduction.callout')}
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section>
              <h2>{t('privacy.sections.informationWeCollect')}</h2>

              <h3>{t('privacy.sections.accountInformation')}</h3>
              <p>{t('privacy.body.accountInformation.intro')}</p>
              <ul>
                {(
                  t('privacy.body.accountInformation.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3>{t('privacy.sections.learningData')}</h3>
              <p>{t('privacy.body.learningData.intro')}</p>
              <ul>
                {(t('privacy.body.learningData.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>

              <h3>{t('privacy.sections.technicalData')}</h3>
              <p>{t('privacy.body.technicalData.intro')}</p>
              <ul>
                {(t('privacy.body.technicalData.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2>{t('privacy.sections.childrensPrivacy')}</h2>
              <p>{t('privacy.body.childrensPrivacy.p1')}</p>

              <h3>{t('privacy.sections.parentalConsent')}</h3>
              <p>{t('privacy.body.parentalConsent.p1')}</p>

              <h3>{t('privacy.sections.informationFromChildren')}</h3>
              <p>{t('privacy.body.informationFromChildren.p1')}</p>
              <ul>
                {(
                  t('privacy.body.informationFromChildren.items', {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3>{t('privacy.sections.parentalRights')}</h3>
              <p>{t('privacy.body.parentalRights.intro')}</p>
              <ul>
                {(t('privacy.body.parentalRights.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2>{t('privacy.sections.howWeUse')}</h2>
              <p>{t('privacy.body.howWeUse.intro')}</p>
              <ul>
                {(t('privacy.body.howWeUse.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p>
                <strong>{t('privacy.body.howWeUse.doNotIntro')}</strong>
              </p>
              <ul>
                {(t('privacy.body.howWeUse.doNotItems', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2>{t('privacy.sections.dataSecurity')}</h2>
              <p>{t('privacy.body.dataSecurity.intro')}</p>
              <ul>
                {(
                  t('privacy.body.dataSecurity.items', { returnObjects: true }) as {
                    label: string;
                    text: string;
                  }[]
                ).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> {item.text}
                  </li>
                ))}
              </ul>
            </section>

            {/* FERPA Compliance */}
            <section>
              <h2>{t('privacy.sections.ferpaCompliance')}</h2>
              <p>{t('privacy.body.ferpaCompliance.p1')}</p>
              <ul>
                {(t('privacy.body.ferpaCompliance.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p>{t('privacy.body.ferpaCompliance.p2')}</p>
            </section>

            {/* Your Rights */}
            <section>
              <h2>{t('privacy.sections.yourRights')}</h2>
              <p>{t('privacy.body.yourRights.intro')}</p>
              <ul>
                {(
                  t('privacy.body.yourRights.items', { returnObjects: true }) as {
                    label: string;
                    text: string;
                  }[]
                ).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> {item.text}
                  </li>
                ))}
              </ul>
              <p>{t('privacy.body.yourRights.p2')}</p>
            </section>

            {/* Data Retention */}
            <section>
              <h2>{t('privacy.sections.dataRetention')}</h2>
              <p>{t('privacy.body.dataRetention.intro')}</p>
              <ul>
                {(
                  t('privacy.body.dataRetention.items', { returnObjects: true }) as {
                    label: string;
                    text: string;
                  }[]
                ).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> {item.text}
                  </li>
                ))}
              </ul>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2>{t('privacy.sections.thirdPartyServices')}</h2>
              <p>{t('privacy.body.thirdPartyServices.intro')}</p>
              <ul>
                {(
                  t('privacy.body.thirdPartyServices.items', { returnObjects: true }) as {
                    label: string;
                    text: string;
                  }[]
                ).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> {item.text}
                  </li>
                ))}
              </ul>
              <p>{t('privacy.body.thirdPartyServices.p2')}</p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2>{t('privacy.sections.changesToPolicy')}</h2>
              <p>{t('privacy.body.changesToPolicy.p1')}</p>
              <ul>
                {(t('privacy.body.changesToPolicy.items', { returnObjects: true }) as string[]).map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p>{t('privacy.body.changesToPolicy.p2')}</p>
            </section>

            {/* Contact Us */}
            <section>
              <h2>{t('privacy.sections.contactUs')}</h2>
              <p>{t('privacy.body.contactUs.p1')}</p>
              <div className="bg-gray-50 rounded-xl p-6 not-prose">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t('privacy.contactBlock.department')}
                    </p>
                    <p className="text-gray-600">{t('privacy.contactBlock.company')}</p>
                    <p className="text-gray-600">
                      {t('privacy.contactBlock.emailLabel')}{' '}
                      <a
                        href={`mailto:${t('privacy.contactBlock.email')}`}
                        className="text-theme-primary-600 hover:underline"
                      >
                        {t('privacy.contactBlock.email')}
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
              {t('privacy.backToHome')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
