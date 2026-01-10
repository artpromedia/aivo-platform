'use client';

import { Bell, Clock, Loader2, Mail, MessageSquare, Moon, Save, Smartphone } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationPreferencesData {
  enabled: boolean;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  digest: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    time: string;
  };
  types: Record<
    string,
    {
      enabled: boolean;
      channels?: {
        inApp?: boolean;
        push?: boolean;
        email?: boolean;
      };
    }
  >;
}

export interface NotificationPreferencesProps {
  preferences: NotificationPreferencesData;
  onSave: (preferences: NotificationPreferencesData) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const notificationTypeGroups = [
  {
    id: 'learning',
    label: 'Learning',
    description: 'Notifications about your learning progress',
    types: [
      {
        id: 'ACHIEVEMENT',
        label: 'Achievements',
        description: 'When you earn badges or complete milestones',
      },
      {
        id: 'SESSION_SUMMARY',
        label: 'Session Summaries',
        description: 'After completing a learning session',
      },
      { id: 'REMINDER', label: 'Reminders', description: 'Study reminders and scheduled sessions' },
      { id: 'GOAL_UPDATE', label: 'Goal Updates', description: 'Progress on your learning goals' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    description: 'Notifications about messages and interactions',
    types: [
      { id: 'MESSAGE', label: 'Messages', description: 'New messages from teachers or classmates' },
    ],
  },
  {
    id: 'account',
    label: 'Account & Security',
    description: 'Important account notifications',
    types: [
      {
        id: 'CONSENT_REQUEST',
        label: 'Consent Requests',
        description: 'Parental consent requests',
      },
      {
        id: 'ALERT',
        label: 'Security Alerts',
        description: 'Important security notifications',
        disabled: true,
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification Preferences Component
 *
 * Allows users to manage their notification preferences:
 * - Global on/off
 * - Channel preferences (push, email, in-app)
 * - Quiet hours
 * - Digest settings
 * - Per-type preferences
 */
export function NotificationPreferences({
  preferences,
  onSave,
  isLoading = false,
  className,
}: Readonly<NotificationPreferencesProps>) {
  const [localPrefs, setLocalPrefs] = React.useState<NotificationPreferencesData>(preferences);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Track changes
  React.useEffect(() => {
    setHasChanges(JSON.stringify(localPrefs) !== JSON.stringify(preferences));
  }, [localPrefs, preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localPrefs);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const updateChannel = (channel: keyof typeof localPrefs.channels, value: boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: value },
    }));
  };

  const updateQuietHours = (field: keyof typeof localPrefs.quietHours, value: string | boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, [field]: value },
    }));
  };

  const updateDigest = (field: keyof typeof localPrefs.digest, value: string | boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      digest: { ...prev.digest, [field]: value },
    }));
  };

  const updateTypePreference = (typeId: string, enabled: boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      types: {
        ...prev.types,
        [typeId]: { ...prev.types[typeId], enabled },
      },
    }));
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Global Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">All Notifications</p>
            <p className="text-sm text-muted-foreground">Turn off to disable all notifications</p>
          </div>
        </div>
        <ToggleSwitch
          checked={localPrefs.enabled}
          onChange={(checked) => {
            setLocalPrefs((prev) => ({ ...prev, enabled: checked }));
          }}
        />
      </div>

      {/* Channel Preferences */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Channels</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you want to receive notifications
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ChannelCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="In-App"
            description="Notifications within the app"
            checked={localPrefs.channels.inApp}
            onChange={(checked) => {
              updateChannel('inApp', checked);
            }}
            disabled={!localPrefs.enabled}
          />
          <ChannelCard
            icon={<Smartphone className="h-5 w-5" />}
            title="Push Notifications"
            description="Mobile and browser push notifications"
            checked={localPrefs.channels.push}
            onChange={(checked) => {
              updateChannel('push', checked);
            }}
            disabled={!localPrefs.enabled}
          />
          <ChannelCard
            icon={<Mail className="h-5 w-5" />}
            title="Email"
            description="Email notifications"
            checked={localPrefs.channels.email}
            onChange={(checked) => {
              updateChannel('email', checked);
            }}
            disabled={!localPrefs.enabled}
          />
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Quiet Hours
            </h3>
            <p className="text-sm text-muted-foreground">
              Pause notifications during specific hours
            </p>
          </div>
          <ToggleSwitch
            checked={localPrefs.quietHours.enabled}
            onChange={(checked) => {
              updateQuietHours('enabled', checked);
            }}
            disabled={!localPrefs.enabled}
          />
        </div>

        {localPrefs.quietHours.enabled && localPrefs.enabled && (
          <div className="flex items-center gap-4 pl-7">
            <div className="flex items-center gap-2">
              <label htmlFor="quiet-hours-start" className="text-sm text-muted-foreground">
                From
              </label>
              <input
                id="quiet-hours-start"
                type="time"
                value={localPrefs.quietHours.start}
                onChange={(e) => {
                  updateQuietHours('start', e.target.value);
                }}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="quiet-hours-end" className="text-sm text-muted-foreground">
                To
              </label>
              <input
                id="quiet-hours-end"
                type="time"
                value={localPrefs.quietHours.end}
                onChange={(e) => {
                  updateQuietHours('end', e.target.value);
                }}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
          </div>
        )}
      </section>

      {/* Digest Settings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Digest
            </h3>
            <p className="text-sm text-muted-foreground">
              Receive a summary of notifications instead of individual ones
            </p>
          </div>
          <ToggleSwitch
            checked={localPrefs.digest.enabled}
            onChange={(checked) => {
              updateDigest('enabled', checked);
            }}
            disabled={!localPrefs.enabled}
          />
        </div>

        {localPrefs.digest.enabled && localPrefs.enabled && (
          <div className="flex items-center gap-4 pl-7">
            <div className="flex items-center gap-2">
              <label htmlFor="digest-frequency" className="text-sm text-muted-foreground">
                Frequency
              </label>
              <select
                id="digest-frequency"
                value={localPrefs.digest.frequency}
                onChange={(e) => {
                  updateDigest('frequency', e.target.value);
                }}
                className="px-3 py-1.5 border rounded-md text-sm"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            {localPrefs.digest.frequency === 'daily' && (
              <div className="flex items-center gap-2">
                <label htmlFor="digest-time" className="text-sm text-muted-foreground">
                  At
                </label>
                <input
                  id="digest-time"
                  type="time"
                  value={localPrefs.digest.time}
                  onChange={(e) => {
                    updateDigest('time', e.target.value);
                  }}
                  className="px-3 py-1.5 border rounded-md text-sm"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Notification Types */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Notification Types</h3>
          <p className="text-sm text-muted-foreground">
            Choose which types of notifications you want to receive
          </p>
        </div>

        {notificationTypeGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div>
              <h4 className="font-medium">{group.label}</h4>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-2 pl-4">
              {group.types.map((type) => {
                const typePrefs = localPrefs.types[type.id] || { enabled: true };
                return (
                  <div key={type.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    <ToggleSwitch
                      checked={typePrefs.enabled}
                      onChange={(checked) => {
                        updateTypePreference(type.id, checked);
                      }}
                      disabled={!localPrefs.enabled || Boolean(type.disabled)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-background border-t py-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: Readonly<ToggleSwitchProps>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

interface ChannelCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

function ChannelCard({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: Readonly<ChannelCardProps>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border rounded-lg',
        disabled && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={Boolean(disabled)} />
    </div>
  );
}
