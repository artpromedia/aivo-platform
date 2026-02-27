'use client';

import { Cookie, Settings, Shield, BarChart3, Target, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const cookieTypeConfig = [
  {
    key: 'essential' as const,
    icon: Shield,
    iconBg: 'bg-mint-100',
    iconColor: 'text-mint-600',
    badgeVariant: 'success' as const,
  },
  {
    key: 'analytics' as const,
    icon: BarChart3,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badgeVariant: 'outline' as const,
  },
  {
    key: 'functional' as const,
    icon: Settings,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badgeVariant: 'outline' as const,
  },
  {
    key: 'marketing' as const,
    icon: Target,
    iconBg: 'bg-coral-100',
    iconColor: 'text-coral-600',
    badgeVariant: 'outline' as const,
  },
];

const browserLinks = [
  { name: 'Chrome', href: 'https://support.google.com/chrome/answer/95647' },
  {
    name: 'Firefox',
    href: 'https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer',
  },
  {
    name: 'Safari',
    href: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac',
  },
  {
    name: 'Edge',
    href: 'https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09',
  },
];

const optOutLinks = [
  { name: 'Google Analytics Opt-out', href: 'https://tools.google.com/dlpage/gaoptout' },
  { name: 'NAI Opt-out', href: 'https://optout.networkadvertising.org/' },
  { name: 'DAA Opt-out', href: 'https://optout.aboutads.info/' },
];

export function CookiesPage() {
  const { t } = useTranslation('marketing');

  const quickSummaryPoints = t('cookies.quickSummary.points', {
    returnObjects: true,
  }) as string[];
  const whatAreCookiesParagraphs = t('cookies.whatAreCookies.paragraphs', {
    returnObjects: true,
  }) as string[];
  const changesParagraphs = t('cookies.changes.paragraphs', {
    returnObjects: true,
  }) as string[];
  const cookieTableData = t('cookies.cookieTable.cookies', {
    returnObjects: true,
  }) as { name: string; provider: string; purpose: string; duration: string; type: string }[];

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Cookie className="w-3 h-3 mr-1" />
              {t('cookies.badge')}
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('cookies.heading')}
            </h1>
            <p className="text-gray-500">
              {t('cookies.lastUpdated')} {t('cookies.lastUpdatedDate')}
            </p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto">
            {/* Quick Summary */}
            <section className="mb-12">
              <div className="bg-theme-primary-50 border border-theme-primary-100 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-theme-primary-600" />
                  {t('cookies.quickSummary.heading')}
                </h2>
                <ul className="space-y-2 text-gray-700">
                  {quickSummaryPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* What Are Cookies */}
            <section className="prose prose-gray max-w-none mb-12">
              <h2>{t('cookies.whatAreCookies.heading')}</h2>
              {whatAreCookiesParagraphs.map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </section>

            {/* Types of Cookies */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                {t('cookies.typesHeading')}
              </h2>

              <div className="space-y-6">
                {cookieTypeConfig.map(({ key, icon: Icon, iconBg, iconColor, badgeVariant }) => {
                  const examples = t(`cookies.types.${key}.examples`, {
                    returnObjects: true,
                  }) as string[];

                  return (
                    <div key={key} className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}
                        >
                          <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {t(`cookies.types.${key}.title`)}
                            </h3>
                            <Badge variant={badgeVariant}>
                              {t(`cookies.types.${key}.badge`)}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-4">
                            {t(`cookies.types.${key}.description`)}
                          </p>
                          {key === 'marketing' && (
                            <p className="text-gray-600 mb-4">
                              <strong>{t('cookies.types.marketing.note')}</strong>
                            </p>
                          )}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {t(`cookies.types.${key}.examplesLabel`)}
                            </p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {examples.map((ex: string, i: number) => (
                                <li key={i}>• {ex}</li>
                              ))}
                            </ul>
                          </div>
                          {key === 'marketing' && (
                            <div className="mt-4 p-3 bg-mint-50 border border-mint-200 rounded-lg">
                              <p className="text-sm text-mint-800">
                                <strong>COPPA Compliance:</strong>{' '}
                                {t('cookies.types.marketing.coppaNote')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Cookie Table */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                {t('cookies.cookieTable.heading')}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        {t('cookies.cookieTable.headers.name')}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        {t('cookies.cookieTable.headers.provider')}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        {t('cookies.cookieTable.headers.purpose')}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        {t('cookies.cookieTable.headers.duration')}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        {t('cookies.cookieTable.headers.type')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cookieTableData.map(
                      (
                        cookie: {
                          name: string;
                          provider: string;
                          purpose: string;
                          duration: string;
                          type: string;
                        },
                        i: number
                      ) => (
                        <tr key={i}>
                          <td className="py-3 px-4 font-mono text-xs">{cookie.name}</td>
                          <td className="py-3 px-4">{cookie.provider}</td>
                          <td className="py-3 px-4">{cookie.purpose}</td>
                          <td className="py-3 px-4">{cookie.duration}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={cookie.type === 'Essential' ? 'success' : 'outline'}
                              size="sm"
                            >
                              {cookie.type}
                            </Badge>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Managing Cookies */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                {t('cookies.managing.heading')}
              </h2>

              <div className="prose prose-gray max-w-none mb-6">
                <p>{t('cookies.managing.description')}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('cookies.managing.preferencesCenter.heading')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('cookies.managing.preferencesCenter.description')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('openCookiePreferences'));
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t('cookies.managing.preferencesCenter.button')}
                  </Button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('cookies.managing.browserSettings.heading')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('cookies.managing.browserSettings.description')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {browserLinks.map((browser) => (
                      <a
                        key={browser.name}
                        href={browser.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme-primary-600 hover:underline text-sm"
                      >
                        {browser.name}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('cookies.managing.optOutTools.heading')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('cookies.managing.optOutTools.description')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {optOutLinks.map((tool) => (
                      <a
                        key={tool.name}
                        href={tool.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme-primary-600 hover:underline text-sm"
                      >
                        {tool.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-sunshine-50 border border-sunshine-200 rounded-2xl p-6">
                <p className="text-gray-700">
                  <strong>{t('cookies.managing.warning.noteLabel')}</strong>{' '}
                  {t('cookies.managing.warning.text')}
                </p>
              </div>
            </section>

            {/* Updates */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                {t('cookies.changes.heading')}
              </h2>
              <div className="prose prose-gray max-w-none">
                {changesParagraphs.map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>

            {/* Contact */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                {t('cookies.contactHeading')}
              </h2>
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-gray-600 mb-4">{t('cookies.contactDescription')}</p>
                <p className="text-gray-700">
                  <strong>{t('cookies.contactEmailLabel')}</strong>{' '}
                  <a
                    href={`mailto:${t('cookies.contactEmail')}`}
                    className="text-theme-primary-600 hover:underline"
                  >
                    {t('cookies.contactEmail')}
                  </a>
                </p>
              </div>
            </section>
          </article>

          {/* Back to Home */}
          <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-theme-primary-600 hover:underline inline-flex items-center gap-2"
            >
              {t('cookies.backToHome')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
