'use client';

import { LanguageSwitcher } from '@aivo/i18n';
import { Accessibility, Bell, Check, Globe, LogOut, Palette, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useProfile, useSettings, useUpdateSettings } from '@/lib/hooks/use-learner-api';

// ── Appearance / accessibility local state types ───────────

type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';

interface LocalPrefs {
  theme: Theme;
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
}

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

function loadLocalPrefs(): LocalPrefs {
  if (typeof window === 'undefined') {
    return {
      theme: 'light',
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      screenReaderOptimized: false,
    };
  }
  try {
    const raw = localStorage.getItem('aivo_learner_prefs');
    if (raw) return JSON.parse(raw) as LocalPrefs;
  } catch {
    /* use defaults */
  }
  return {
    theme: 'light',
    fontSize: 'medium',
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
  };
}

function saveLocalPrefs(prefs: LocalPrefs) {
  try {
    localStorage.setItem('aivo_learner_prefs', JSON.stringify(prefs));
  } catch {
    /* storage full or unavailable */
  }
}

// ── Components ─────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function FontSizeSelector({
  value,
  onChange,
}: {
  value: FontSize;
  onChange: (v: FontSize) => void;
}) {
  const options: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm font-medium text-gray-900">Font Size</p>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onChange(opt.value);
            }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className={FONT_SIZE_CLASSES[opt.value]}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const [localPrefs, setLocalPrefs] = useState<LocalPrefs>(loadLocalPrefs);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Sync local prefs to localStorage whenever they change
  useEffect(() => {
    saveLocalPrefs(localPrefs);
  }, [localPrefs]);

  const updateLocal = useCallback((patch: Partial<LocalPrefs>) => {
    setLocalPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleSetting = useCallback(
    (key: 'soundsEnabled' | 'streakRemindersEnabled' | 'achievementsEnabled') => {
      if (!settings) return;
      const newVal = !settings[key];
      updateSettingsMutation.mutate({ [key]: newVal });
      setSaveFlash(true);
      setTimeout(() => {
        setSaveFlash(false);
      }, 1500);
    },
    [settings, updateSettingsMutation]
  );

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* best-effort */
    }
    router.push('/login');
  }, [router]);

  // ── Loading / error states ─────────────────────────────

  const isLoading = profileLoading || settingsLoading;
  const hasError = profileError || settingsError;

  if (isLoading) return <PageSkeleton />;
  if (hasError || !profile) {
    return (
      <ErrorState
        message="Couldn't load your settings."
        onRetry={() => {
          void refetchProfile();
          void refetchSettings();
        }}
      />
    );
  }

  const { learner } = profile;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Settings className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your preferences</p>
        </div>
        {saveFlash && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      {/* 1 ─ Account Info */}
      <SectionCard icon={User} title="Account Info">
        <div className="grid gap-4 py-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="text-sm font-medium text-gray-900">
              {learner.firstName} {learner.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Grade</p>
            <p className="text-sm font-medium text-gray-900">{learner.grade || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">School</p>
            <p className="text-sm font-medium text-gray-900">{learner.school || '—'}</p>
          </div>
        </div>
      </SectionCard>

      {/* 2 ─ Appearance */}
      <SectionCard icon={Palette} title="Appearance">
        <div className="flex items-center justify-between py-3">
          <p className="text-sm font-medium text-gray-900">Theme</p>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  updateLocal({ theme: t });
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  localPrefs.theme === t
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <FontSizeSelector
          value={localPrefs.fontSize}
          onChange={(v) => {
            updateLocal({ fontSize: v });
          }}
        />
      </SectionCard>

      {/* 3 ─ Accessibility */}
      <SectionCard icon={Accessibility} title="Accessibility">
        <Toggle
          label="High Contrast Mode"
          description="Increase contrast for better visibility"
          enabled={localPrefs.highContrast}
          onToggle={() => {
            updateLocal({ highContrast: !localPrefs.highContrast });
          }}
        />
        <Toggle
          label="Reduced Motion"
          description="Minimize animations and transitions"
          enabled={localPrefs.reducedMotion}
          onToggle={() => {
            updateLocal({ reducedMotion: !localPrefs.reducedMotion });
          }}
        />
        <Toggle
          label="Screen Reader Optimizations"
          description="Enhanced labels and ARIA attributes"
          enabled={localPrefs.screenReaderOptimized}
          onToggle={() => {
            updateLocal({ screenReaderOptimized: !localPrefs.screenReaderOptimized });
          }}
        />
      </SectionCard>

      {/* 4 ─ Notifications */}
      <SectionCard icon={Bell} title="Notifications">
        <Toggle
          label="Sound Effects"
          description="Play sounds for XP, badges, and interactions"
          enabled={settings?.soundsEnabled ?? true}
          onToggle={() => {
            toggleSetting('soundsEnabled');
          }}
        />
        <Toggle
          label="Streak Reminders"
          description="Get reminded to keep your learning streak alive"
          enabled={settings?.streakRemindersEnabled ?? true}
          onToggle={() => {
            toggleSetting('streakRemindersEnabled');
          }}
        />
        <Toggle
          label="Achievement Alerts"
          description="Celebrate when you earn new badges"
          enabled={settings?.achievementsEnabled ?? true}
          onToggle={() => {
            toggleSetting('achievementsEnabled');
          }}
        />
      </SectionCard>

      {/* 5 ─ Language */}
      <SectionCard icon={Globe} title="Language">
        <div className="py-3">
          <p className="mb-2 text-sm font-medium text-gray-900">Display Language</p>
          <LanguageSwitcher variant="compact" />
        </div>
      </SectionCard>

      {/* 6 ─ Logout */}
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {loggingOut ? 'Logging out…' : 'Log Out'}
      </button>
    </div>
  );
}
