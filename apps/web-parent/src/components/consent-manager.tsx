'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface ConsentType {
  id: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  status: 'granted' | 'denied' | 'pending';
  grantedAt?: string;
}

interface ConsentManagerProps {
  studentId: string;
  studentName: string;
  studentAge?: number;
}

export function ConsentManager({ studentId, studentName, studentAge }: ConsentManagerProps) {
  const { t } = useTranslation('parent');
  const queryClient = useQueryClient();
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const isCoppaApplicable = studentAge !== undefined && studentAge < 13;

  const { data: consents, isLoading } = useQuery({
    queryKey: ['consent', studentId],
    queryFn: () => api.get<ConsentType[]>(`/parent/students/${studentId}/consent`),
  });

  const updateConsent = useMutation({
    mutationFn: (data: { type: string; granted: boolean }) =>
      api.post(`/parent/students/${studentId}/consent`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', studentId] });
    },
  });

  const consentTypes = [
    {
      type: 'data_collection',
      label: t('consent.dataCollection'),
      description:
        'Collection of learning activity data, progress metrics, and performance data to personalize the learning experience.',
      required: true,
    },
    {
      type: 'data_sharing',
      label: t('consent.dataSharing'),
      description:
        'Sharing anonymized, aggregate data with educational researchers and school administrators.',
      required: false,
    },
    {
      type: 'ai_personalization',
      label: t('consent.aiPersonalization'),
      description:
        'Using AI algorithms to adapt content difficulty, suggest learning paths, and provide personalized recommendations.',
      required: false,
    },
    {
      type: 'analytics',
      label: t('consent.analytics'),
      description:
        'Analysis of learning patterns to generate insights and reports for parents and teachers.',
      required: false,
    },
    {
      type: 'marketing',
      label: t('consent.marketing'),
      description:
        'Receiving promotional emails about new features, educational resources, and platform updates.',
      required: false,
    },
  ];

  const getConsentStatus = (type: string): 'granted' | 'denied' | 'pending' => {
    const consent = consents?.find((c) => c.type === type);
    return consent?.status || 'pending';
  };

  const handleToggle = (type: string, currentStatus: string) => {
    const newStatus = currentStatus === 'granted' ? false : true;
    updateConsent.mutate({ type, granted: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* COPPA Notice */}
      {isCoppaApplicable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">COPPA Protection</h3>
            <p className="text-sm text-blue-700 mt-1">{t('consent.coppaNotice')}</p>
          </div>
        </div>
      )}

      {/* FERPA Notice */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-purple-900">FERPA Rights</h3>
          <p className="text-sm text-purple-700 mt-1">{t('consent.ferpaNotice')}</p>
        </div>
      </div>

      {/* Consent Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('consent.title')} - {studentName}
        </h2>

        {consentTypes.map((item) => {
          const status = getConsentStatus(item.type);
          const isExpanded = expandedType === item.type;

          return (
            <div
              key={item.type}
              className={`border rounded-lg overflow-hidden transition-colors ${
                status === 'granted'
                  ? 'border-green-200 bg-green-50/50'
                  : status === 'denied'
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : item.type)}
                      className="flex items-center gap-2 text-left"
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="font-medium text-gray-900">{item.label}</span>
                    </button>
                    {item.required && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        status === 'granted'
                          ? 'text-green-600'
                          : status === 'denied'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {t(`consent.${status}`)}
                    </span>

                    {!item.required && (
                      <button
                        onClick={() => handleToggle(item.type, status)}
                        disabled={updateConsent.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          status === 'granted' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={status === 'granted'}
                        aria-label={`${item.label}: ${status === 'granted' ? 'enabled' : 'disabled'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            status === 'granted' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 text-sm text-gray-600 pl-6">{item.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Update All Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => {
            // Could implement bulk update here
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {t('consent.updateConsent')}
        </button>
      </div>
    </div>
  );
}
