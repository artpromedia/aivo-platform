/**
 * Teacher Gamification Controls
 *
 * Allows teachers to manage gamification settings for their classes
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Trophy,
  Target,
  Flame,
  Users,
  Shield,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  Save,
  Plus,
} from 'lucide-react';

interface ClassGamificationSettings {
  classId: string;
  className: string;
  enabled: boolean;
  features: {
    xpEnabled: boolean;
    achievementsEnabled: boolean;
    streaksEnabled: boolean;
    leaderboardEnabled: boolean;
    challengesEnabled: boolean;
    shopEnabled: boolean;
    celebrationsEnabled: boolean;
  };
  leaderboardSettings: {
    showRank: boolean;
    showXP: boolean;
    showStreak: boolean;
    anonymizeNames: boolean;
    topNOnly?: number;
  };
  antiAddiction: {
    enabled: boolean;
    maxDailyMinutes: number;
    breakReminderMinutes: number;
    cooldownBetweenSessions: number;
  };
  xpModifiers: {
    lessonMultiplier: number;
    quizMultiplier: number;
    practiceMultiplier: number;
  };
}

interface TeacherGamificationControlsProps {
  readonly classes: ReadonlyArray<{ id: string; name: string; studentCount: number }>;
  readonly settings: readonly ClassGamificationSettings[];
  readonly onSaveSettings: (settings: ClassGamificationSettings) => Promise<void>;
  readonly onCreateChallenge: (classId: string) => void;
}

interface SettingsSectionProps {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
}

function SettingsSection({ title, description, icon, children, defaultOpen = false }: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-500">{icon}</div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-4 border-t border-gray-200 dark:border-gray-700"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

interface ToggleSwitchProps {
  readonly enabled: boolean;
  readonly onChange: (enabled: boolean) => void;
  readonly label: string;
  readonly description?: string;
}

function ToggleSwitch({ enabled, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
          animate={{ left: enabled ? '1.5rem' : '0.25rem' }}
        />
      </button>
    </div>
  );
}

interface SliderInputProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly label: string;
  readonly unit?: string;
}

function SliderInput({ value, onChange, min, max, step = 1, label, unit }: SliderInputProps) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-sm text-blue-600 font-semibold">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

export function TeacherGamificationControls({
  classes,
  settings,
  onSaveSettings,
  onCreateChallenge,
}: TeacherGamificationControlsProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [currentSettings, setCurrentSettings] = useState<ClassGamificationSettings | null>(
    settings.find((s) => s.classId === selectedClassId) || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setCurrentSettings(settings.find((s) => s.classId === classId) || null);
    setHasChanges(false);
  };

  const updateSettings = <K extends keyof ClassGamificationSettings>(
    key: K,
    value: ClassGamificationSettings[K]
  ) => {
    if (!currentSettings) return;
    setCurrentSettings({ ...currentSettings, [key]: value });
    setHasChanges(true);
  };

  const updateNestedSettings = (
    section: keyof ClassGamificationSettings,
    key: string,
    value: unknown
  ) => {
    if (!currentSettings) return;
    setCurrentSettings({
      ...currentSettings,
      [section]: {
        ...(currentSettings[section] as Record<string, unknown>),
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentSettings) return;
    setIsSaving(true);
    await onSaveSettings(currentSettings);
    setIsSaving(false);
    setHasChanges(false);
  };

  const _selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Settings className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gamification Settings
          </h1>
          <p className="text-gray-500">
            Configure how gamification works in your classes
          </p>
        </div>
      </div>

      {/* Class selector */}
      <fieldset className="mb-6 border-none p-0 m-0">
        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Class
        </legend>
        <div className="flex gap-2 flex-wrap">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => handleClassChange(cls.id)}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                ${selectedClassId === cls.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }
              `}
            >
              <Users className="w-4 h-4" />
              <span>{cls.name}</span>
              <span className="text-xs opacity-70">({cls.studentCount})</span>
            </button>
          ))}
        </div>
      </fieldset>

      {currentSettings && (
        <div className="space-y-4">
          {/* Master toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <ToggleSwitch
              enabled={currentSettings.enabled}
              onChange={(enabled) => updateSettings('enabled', enabled)}
              label="Enable Gamification"
              description="Turn gamification on or off for this class"
            />
          </div>

          {currentSettings.enabled && (
            <>
              {/* Feature toggles */}
              <SettingsSection
                title="Features"
                description="Enable or disable specific gamification features"
                icon={<Trophy className="w-5 h-5" />}
                defaultOpen
              >
                <div className="space-y-1">
                  <ToggleSwitch
                    enabled={currentSettings.features.xpEnabled}
                    onChange={(v) => updateNestedSettings('features', 'xpEnabled', v)}
                    label="XP & Levels"
                    description="Students earn experience points and level up"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.achievementsEnabled}
                    onChange={(v) => updateNestedSettings('features', 'achievementsEnabled', v)}
                    label="Achievements"
                    description="Unlock badges for milestones"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.streaksEnabled}
                    onChange={(v) => updateNestedSettings('features', 'streaksEnabled', v)}
                    label="Streaks"
                    description="Track consecutive days of learning"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.leaderboardEnabled}
                    onChange={(v) => updateNestedSettings('features', 'leaderboardEnabled', v)}
                    label="Leaderboard"
                    description="Compare progress with classmates"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.challengesEnabled}
                    onChange={(v) => updateNestedSettings('features', 'challengesEnabled', v)}
                    label="Challenges"
                    description="Daily, weekly, and class challenges"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.shopEnabled}
                    onChange={(v) => updateNestedSettings('features', 'shopEnabled', v)}
                    label="Rewards Shop"
                    description="Virtual items and customization"
                  />
                  <ToggleSwitch
                    enabled={currentSettings.features.celebrationsEnabled}
                    onChange={(v) => updateNestedSettings('features', 'celebrationsEnabled', v)}
                    label="Celebrations"
                    description="Visual effects for achievements"
                  />
                </div>
              </SettingsSection>

              {/* Leaderboard settings */}
              {currentSettings.features.leaderboardEnabled && (
                <SettingsSection
                  title="Leaderboard Settings"
                  description="Configure what students see on the leaderboard"
                  icon={<Star className="w-5 h-5" />}
                >
                  <div className="space-y-1">
                    <ToggleSwitch
                      enabled={currentSettings.leaderboardSettings.showRank}
                      onChange={(v) => updateNestedSettings('leaderboardSettings', 'showRank', v)}
                      label="Show Rank Numbers"
                    />
                    <ToggleSwitch
                      enabled={currentSettings.leaderboardSettings.showXP}
                      onChange={(v) => updateNestedSettings('leaderboardSettings', 'showXP', v)}
                      label="Show XP Amounts"
                    />
                    <ToggleSwitch
                      enabled={currentSettings.leaderboardSettings.showStreak}
                      onChange={(v) => updateNestedSettings('leaderboardSettings', 'showStreak', v)}
                      label="Show Streaks"
                    />
                    <ToggleSwitch
                      enabled={currentSettings.leaderboardSettings.anonymizeNames}
                      onChange={(v) => updateNestedSettings('leaderboardSettings', 'anonymizeNames', v)}
                      label="Anonymize Names"
                      description="Show only first name and last initial"
                    />
                    <SliderInput
                      value={currentSettings.leaderboardSettings.topNOnly || 0}
                      onChange={(v) => updateNestedSettings('leaderboardSettings', 'topNOnly', v)}
                      min={0}
                      max={20}
                      label="Show Top N Only (0 = all)"
                    />
                  </div>
                </SettingsSection>
              )}

              {/* Anti-addiction settings */}
              <SettingsSection
                title="Wellbeing & Balance"
                description="Prevent excessive screen time and gaming behavior"
                icon={<Shield className="w-5 h-5" />}
              >
                <div className="space-y-4">
                  <ToggleSwitch
                    enabled={currentSettings.antiAddiction.enabled}
                    onChange={(v) => updateNestedSettings('antiAddiction', 'enabled', v)}
                    label="Enable Wellbeing Features"
                  />
                  
                  {currentSettings.antiAddiction.enabled && (
                    <>
                      <SliderInput
                        value={currentSettings.antiAddiction.maxDailyMinutes}
                        onChange={(v) => updateNestedSettings('antiAddiction', 'maxDailyMinutes', v)}
                        min={30}
                        max={180}
                        step={15}
                        label="Max Daily Learning Time"
                        unit=" min"
                      />
                      <SliderInput
                        value={currentSettings.antiAddiction.breakReminderMinutes}
                        onChange={(v) => updateNestedSettings('antiAddiction', 'breakReminderMinutes', v)}
                        min={15}
                        max={60}
                        step={5}
                        label="Break Reminder After"
                        unit=" min"
                      />
                      <SliderInput
                        value={currentSettings.antiAddiction.cooldownBetweenSessions}
                        onChange={(v) => updateNestedSettings('antiAddiction', 'cooldownBetweenSessions', v)}
                        min={5}
                        max={30}
                        step={5}
                        label="Required Break Between Sessions"
                        unit=" min"
                      />
                    </>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-2">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Wellbeing features help students maintain a healthy balance. 
                      They&apos;ll receive gentle reminders to take breaks.
                    </p>
                  </div>
                </div>
              </SettingsSection>

              {/* XP multipliers */}
              <SettingsSection
                title="XP Modifiers"
                description="Adjust how much XP students earn for activities"
                icon={<Target className="w-5 h-5" />}
              >
                <SliderInput
                  value={currentSettings.xpModifiers.lessonMultiplier}
                  onChange={(v) => updateNestedSettings('xpModifiers', 'lessonMultiplier', v)}
                  min={0.5}
                  max={3}
                  step={0.25}
                  label="Lesson Completion"
                  unit="x"
                />
                <SliderInput
                  value={currentSettings.xpModifiers.quizMultiplier}
                  onChange={(v) => updateNestedSettings('xpModifiers', 'quizMultiplier', v)}
                  min={0.5}
                  max={3}
                  step={0.25}
                  label="Quiz & Assessments"
                  unit="x"
                />
                <SliderInput
                  value={currentSettings.xpModifiers.practiceMultiplier}
                  onChange={(v) => updateNestedSettings('xpModifiers', 'practiceMultiplier', v)}
                  min={0.5}
                  max={3}
                  step={0.25}
                  label="Practice Activities"
                  unit="x"
                />
              </SettingsSection>

              {/* Class challenges */}
              {currentSettings.features.challengesEnabled && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Class Challenges</h3>
                        <p className="text-sm text-gray-500">Create custom challenges for your class</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onCreateChallenge(selectedClassId)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Challenge
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
                ${hasChanges
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherGamificationControls;
