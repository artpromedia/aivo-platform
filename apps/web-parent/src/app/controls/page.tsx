/**
 * Parental Controls Page
 *
 * Dashboard for managing all parental control settings including
 * screen time, content filtering, subject access, and safety settings.
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { User, ChevronDown, Shield, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ScreenTimeLimits,
  ContentFiltering,
  SubjectAccess,
  NotificationPreferences,
  SafetySettings,
  PinVerificationDialog,
  usePinVerification,
} from '@/components/controls';
import { QueryErrorDisplay } from '@/components/error-boundary';
import { ControlsPageSkeleton } from '@/components/skeletons';
import { useParentProfile, useParentalControls, useUpdateParentalControls, usePinStatus } from '@/hooks';

interface Child {
  id: string;
  name: string;
  grade?: string;
  avatar?: string;
}

interface ParentalControlsData {
  screenTime: {
    dailyLimit: number;
    scheduleEnabled: boolean;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
    breakReminders: boolean;
    breakInterval: number;
    breakDuration: number;
  };
  contentFilter: {
    restrictionLevel: 'strict' | 'moderate' | 'minimal';
    blockExternalLinks: boolean;
    safeSearch: boolean;
    hideAchievementLeaderboards: boolean;
    restrictChat: boolean;
    blockedTopics: string[];
    allowedTopics: string[];
  };
  subjectAccess: {
    subjects: Record<string, { enabled: boolean; maxLevel?: number }>;
    requireParentApprovalForNewSubjects: boolean;
    allowAdvancedContent: boolean;
  };
  notifications: {
    email: {
      enabled: boolean;
      dailyDigest: boolean;
      weeklyReport: boolean;
      achievements: boolean;
      concerns: boolean;
      teacherMessages: boolean;
    };
    push: {
      enabled: boolean;
      achievements: boolean;
      milestones: boolean;
      concerns: boolean;
      teacherMessages: boolean;
      screenTimeAlerts: boolean;
    };
    inApp: {
      enabled: boolean;
      achievements: boolean;
      progress: boolean;
      recommendations: boolean;
    };
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  safety: {
    privacy: {
      hideFromClassmates: boolean;
      hideProfilePhoto: boolean;
      hideProgress: boolean;
      anonymousMode: boolean;
    };
    data: {
      allowAnalytics: boolean;
      allowPersonalization: boolean;
      allowThirdPartySharing: boolean;
    };
    access: {
      requirePinForSettings: boolean;
      pin?: string;
      allowAccountDeletion: boolean;
      twoFactorEnabled: boolean;
    };
    emergency: {
      emergencyContactEnabled: boolean;
      emergencyEmail?: string;
      emergencyPhone?: string;
    };
  };
}

const AVAILABLE_SUBJECTS = [
  {
    id: 'math',
    name: 'Math',
    maxLevel: 5,
    description: 'Numbers, operations, and problem-solving',
  },
  { id: 'reading', name: 'Reading', maxLevel: 5, description: 'Comprehension and literacy skills' },
  { id: 'science', name: 'Science', maxLevel: 5, description: 'Natural world and experiments' },
  { id: 'writing', name: 'Writing', maxLevel: 5, description: 'Composition and grammar' },
  {
    id: 'social-studies',
    name: 'Social Studies',
    maxLevel: 5,
    description: 'History and geography',
  },
  { id: 'art', name: 'Art', maxLevel: 3, description: 'Creative expression' },
  { id: 'music', name: 'Music', maxLevel: 3, description: 'Musical skills and appreciation' },
];

export default function ParentalControlsPage() {
  const { t } = useTranslation('parent');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const queryClient = useQueryClient();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Fetch parent profile (which includes children)
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useParentProfile();
  const children = profile?.students ?? [];

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0] as Child);
    }
  }, [children, selectedChild]);

  // Fetch controls for selected child
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    data: controls,
    isLoading: controlsLoading,
    error: controlsError,
    refetch: refetchControls,
  } = useParentalControls(selectedChild?.id ?? null);

  // Save controls mutation
  const updateControls = useUpdateParentalControls();

  // PIN verification for sensitive sections
  const { data: pinStatus } = usePinStatus();
  const pinVerification = usePinVerification();
  const [pendingSave, setPendingSave] = useState<{
    section: string;
    settings: unknown;
  } | null>(null);

  // Sections that require PIN verification
  const SENSITIVE_SECTIONS = ['screenTime', 'contentFilter', 'safety'];

  const handleSaveSection = async (section: string, settings: unknown) => {
    if (!selectedChild) return;

    // Check if PIN is required for this section
    const isPinRequired = pinStatus?.hasPin && SENSITIVE_SECTIONS.includes(section);

    if (isPinRequired && !pinVerification.isVerified) {
      // Store pending save and open PIN dialog
      setPendingSave({ section, settings });
      pinVerification.open();
      return;
    }

    // Proceed with save
    await performSave(section, settings);
  };

  const performSave = async (section: string, settings: unknown) => {
    if (!selectedChild) return;
    setSavingSection(section);
    try {
      await updateControls.mutateAsync({
        childId: selectedChild.id,
        section: section as keyof ParentalControlsData,
        settings: settings as ParentalControlsData[keyof ParentalControlsData],
      });
    } finally {
      setSavingSection(null);
    }
  };

  // Handle successful PIN verification
  const handlePinVerified = async (token: string) => {
    pinVerification.verify(token);
    if (pendingSave) {
      await performSave(pendingSave.section, pendingSave.settings);
      setPendingSave(null);
    }
  };

  if (profileLoading) {
    return <ControlsPageSkeleton />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <QueryErrorDisplay error={profileError} onRetry={() => void refetchProfile()} />
      </div>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Shield className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('controls.title', 'Parental Controls')}
              </h1>
              <p className="text-sm text-gray-500">
                Manage safety and learning settings for your children
              </p>
            </div>
          </div>

          {/* Child Selector */}
          {children && children.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  {selectedChild?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedChild.avatar}
                      alt={selectedChild.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-violet-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">
                    {selectedChild?.name || 'Select child'}
                  </p>
                  {selectedChild?.grade && (
                    <p className="text-xs text-gray-500">Grade {selectedChild.grade}</p>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setSelectedChild(child);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedChild?.id === child.id ? 'bg-violet-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                        {child.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={child.avatar}
                            alt={child.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-violet-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{child.name}</p>
                        {child.grade && (
                          <p className="text-xs text-gray-500">Grade {child.grade}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {selectedChild ? (
          controlsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Screen Time Limits */}
              <ScreenTimeLimits
                settings={
                  controls?.screenTime || {
                    dailyLimit: 120,
                    scheduleEnabled: false,
                    schedule: {},
                    breakReminders: true,
                    breakInterval: 30,
                    breakDuration: 5,
                  }
                }
                onSave={(settings) => handleSaveSection('screenTime', settings)}
                isSaving={savingSection === 'screenTime'}
              />

              {/* Content Filtering */}
              <ContentFiltering
                settings={
                  controls?.contentFilter || {
                    restrictionLevel: 'moderate',
                    blockExternalLinks: true,
                    safeSearch: true,
                    hideAchievementLeaderboards: false,
                    restrictChat: true,
                    blockedTopics: [],
                    allowedTopics: [],
                  }
                }
                onSave={(settings) => handleSaveSection('contentFilter', settings)}
                isSaving={savingSection === 'contentFilter'}
              />

              {/* Subject Access */}
              <SubjectAccess
                settings={
                  controls?.subjectAccess || {
                    subjects: {},
                    requireParentApprovalForNewSubjects: true,
                    allowAdvancedContent: false,
                  }
                }
                availableSubjects={AVAILABLE_SUBJECTS}
                onSave={(settings) => handleSaveSection('subjectAccess', settings)}
                isSaving={savingSection === 'subjectAccess'}
              />

              {/* Notification Preferences */}
              <NotificationPreferences
                settings={
                  controls?.notifications || {
                    email: {
                      enabled: true,
                      dailyDigest: false,
                      weeklyReport: true,
                      achievements: true,
                      concerns: true,
                      teacherMessages: true,
                    },
                    push: {
                      enabled: true,
                      achievements: true,
                      milestones: true,
                      concerns: true,
                      teacherMessages: true,
                      screenTimeAlerts: true,
                    },
                    inApp: {
                      enabled: true,
                      achievements: true,
                      progress: true,
                      recommendations: true,
                    },
                    quietHours: {
                      enabled: false,
                      start: '21:00',
                      end: '07:00',
                    },
                  }
                }
                onSave={(settings) => handleSaveSection('notifications', settings)}
                isSaving={savingSection === 'notifications'}
              />

              {/* Safety Settings */}
              <SafetySettings
                settings={
                  controls?.safety || {
                    privacy: {
                      hideFromClassmates: false,
                      hideProfilePhoto: false,
                      hideProgress: false,
                      anonymousMode: false,
                    },
                    data: {
                      allowAnalytics: true,
                      allowPersonalization: true,
                      allowThirdPartySharing: false,
                    },
                    access: {
                      requirePinForSettings: false,
                      allowAccountDeletion: false,
                      twoFactorEnabled: false,
                    },
                    emergency: {
                      emergencyContactEnabled: false,
                    },
                  }
                }
                onSave={(settings) => handleSaveSection('safety', settings)}
                isSaving={savingSection === 'safety'}
              />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No children found</h2>
            <p className="text-sm text-gray-500">
              Add a child to your account to configure parental controls.
            </p>
          </div>
        )}
      </div>

      {/* PIN Verification Dialog */}
      <PinVerificationDialog
        isOpen={pinVerification.isOpen}
        onClose={pinVerification.close}
        onVerified={handlePinVerified}
        title="Verify PIN"
        description="Enter your 4-digit PIN to modify parental control settings"
      />
    </main>
  );
}
