/**
 * Safety Settings Component
 *
 * Allows parents to configure safety and privacy settings
 * for their children's learning experience.
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, UserX, MapPin, Camera, Lock, Save, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

interface SafetySettings {
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
}

interface SafetySettingsProps {
  settings: SafetySettings;
  onSave: (settings: SafetySettings) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_SETTINGS: SafetySettings = {
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
};

export function SafetySettings({
  settings: initialSettings,
  onSave,
  isSaving,
}: SafetySettingsProps) {
  const [settings, setSettings] = useState<SafetySettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  }, [initialSettings]);

  const updatePrivacy = (updates: Partial<SafetySettings['privacy']>) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, ...updates },
    }));
    setHasChanges(true);
  };

  const updateData = (updates: Partial<SafetySettings['data']>) => {
    setSettings((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
    setHasChanges(true);
  };

  const updateAccess = (updates: Partial<SafetySettings['access']>) => {
    setSettings((prev) => ({
      ...prev,
      access: { ...prev.access, ...updates },
    }));
    setHasChanges(true);
  };

  const updateEmergency = (updates: Partial<SafetySettings['emergency']>) => {
    setSettings((prev) => ({
      ...prev,
      emergency: { ...prev.emergency, ...updates },
    }));
    setHasChanges(true);
  };

  const handleSetPin = () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    updateAccess({ requirePinForSettings: true, pin: newPin });
    setShowPinInput(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  const handleSave = async () => {
    await onSave(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg">
            <Shield className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Safety & Privacy</h2>
            <p className="text-sm text-gray-500">Protect your child&apos;s privacy and data</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Privacy Settings */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Privacy Settings</h3>
          </div>
          <div className="space-y-3">
            <ToggleOption
              icon={UserX}
              label="Hide from Classmates"
              description="Your child won't appear in classmate lists or leaderboards"
              checked={settings.privacy.hideFromClassmates}
              onChange={(checked) => updatePrivacy({ hideFromClassmates: checked })}
            />
            <ToggleOption
              icon={Camera}
              label="Hide Profile Photo"
              description="Use a default avatar instead of profile photo"
              checked={settings.privacy.hideProfilePhoto}
              onChange={(checked) => updatePrivacy({ hideProfilePhoto: checked })}
            />
            <ToggleOption
              icon={Eye}
              label="Hide Progress"
              description="Don't share progress information with other students"
              checked={settings.privacy.hideProgress}
              onChange={(checked) => updatePrivacy({ hideProgress: checked })}
            />
            <ToggleOption
              icon={UserX}
              label="Anonymous Mode"
              description="Use a randomly generated username instead of real name"
              checked={settings.privacy.anonymousMode}
              onChange={(checked) => updatePrivacy({ anonymousMode: checked })}
              warning={settings.privacy.anonymousMode}
              warningText="Teachers will still see your child's real name"
            />
          </div>
        </div>

        {/* Data Settings */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Data & Analytics</h3>
          </div>
          <div className="space-y-3">
            <ToggleOption
              label="Allow Analytics"
              description="Help improve the platform by sharing anonymous usage data"
              checked={settings.data.allowAnalytics}
              onChange={(checked) => updateData({ allowAnalytics: checked })}
            />
            <ToggleOption
              label="Personalized Learning"
              description="Allow AI to personalize content based on learning patterns"
              checked={settings.data.allowPersonalization}
              onChange={(checked) => updateData({ allowPersonalization: checked })}
            />
            <ToggleOption
              label="Third-Party Sharing"
              description="Share data with educational research partners"
              checked={settings.data.allowThirdPartySharing}
              onChange={(checked) => updateData({ allowThirdPartySharing: checked })}
              warning={settings.data.allowThirdPartySharing}
              warningText="Data will be anonymized before sharing"
            />
          </div>
        </div>

        {/* Access Control */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Access Control</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">PIN Protection</label>
                  <p className="text-sm text-gray-500">Require PIN to access parental controls</p>
                </div>
                {settings.access.requirePinForSettings ? (
                  <button
                    onClick={() => {
                      updateAccess({ requirePinForSettings: false, pin: undefined });
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    Remove PIN
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPinInput(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Set PIN
                  </button>
                )}
              </div>

              {showPinInput && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">New PIN</label>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter PIN"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Confirm PIN</label>
                      <input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Confirm PIN"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {pinError && (
                    <p className="text-sm text-red-600">{pinError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowPinInput(false);
                        setNewPin('');
                        setConfirmPin('');
                        setPinError('');
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetPin}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                    >
                      Set PIN
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ToggleOption
              label="Two-Factor Authentication"
              description="Add extra security with 2FA"
              checked={settings.access.twoFactorEnabled}
              onChange={(checked) => updateAccess({ twoFactorEnabled: checked })}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Emergency Contact</h3>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <ToggleOption
              label="Enable Emergency Contact"
              description="Allow teachers to contact you in case of emergency"
              checked={settings.emergency.emergencyContactEnabled}
              onChange={(checked) => updateEmergency({ emergencyContactEnabled: checked })}
            />

            {settings.emergency.emergencyContactEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Emergency Email</label>
                  <input
                    type="email"
                    value={settings.emergency.emergencyEmail || ''}
                    onChange={(e) => updateEmergency({ emergencyEmail: e.target.value })}
                    placeholder="emergency@email.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={settings.emergency.emergencyPhone || ''}
                    onChange={(e) => updateEmergency({ emergencyPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
        {hasChanges && (
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ToggleOption({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  warning,
  warningText,
}: {
  icon?: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  warning?: boolean;
  warningText?: string;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="w-5 h-5 text-gray-400 mt-0.5" />}
        <div>
          <label className="font-medium text-gray-700">{label}</label>
          <p className="text-sm text-gray-500">{description}</p>
          {warning && warningText && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {warningText}
            </p>
          )}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
      </label>
    </div>
  );
}

export default SafetySettings;
