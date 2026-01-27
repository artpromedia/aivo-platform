'use client';

import { useState } from 'react';
import { AdaptiveInputProfile } from '../../../../lib/motor-skills-api';

interface AdaptiveSettingsModalProps {
  profile: AdaptiveInputProfile;
  onSave: (profile: AdaptiveInputProfile) => void;
  onClose: () => void;
}

export function AdaptiveSettingsModal({
  profile,
  onSave,
  onClose,
}: AdaptiveSettingsModalProps) {
  const [formData, setFormData] = useState<AdaptiveInputProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const fontOptions = [
    { value: 'system-ui', label: 'System Default' },
    { value: 'Georgia, serif', label: 'Georgia (Serif)' },
    { value: 'Comic Sans MS, cursive', label: 'Comic Sans (Friendly)' },
    { value: 'OpenDyslexic, sans-serif', label: 'OpenDyslexic' },
    { value: 'Lexie Readable, sans-serif', label: 'Lexie Readable' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Adaptive Input Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Handwriting Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
              <span className="mr-2">✍️</span>
              Handwriting Settings
            </h3>
            <div className="space-y-4">
              {/* Line Height */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Line Height: {formData.lineHeight}px
                </label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={formData.lineHeight}
                  onChange={(e) =>
                    setFormData({ ...formData, lineHeight: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>

              {/* Stroke Width */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Stroke Width: {formData.strokeWidth}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.strokeWidth}
                  onChange={(e) =>
                    setFormData({ ...formData, strokeWidth: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Thin</span>
                  <span>Thick</span>
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">Preferred Font</label>
                <select
                  value={formData.preferredFont}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredFont: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Preview */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-2">Preview:</p>
                <p
                  className="text-2xl"
                  style={{ fontFamily: formData.preferredFont }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>

              {/* Show Guidelines */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showGuidelines}
                  onChange={(e) =>
                    setFormData({ ...formData, showGuidelines: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Show writing guidelines</span>
              </label>
            </div>
          </div>

          {/* Touch Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
              <span className="mr-2">👆</span>
              Touch & Input Settings
            </h3>
            <div className="space-y-4">
              {/* Touch Sensitivity */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Touch Sensitivity: {formData.touchSensitivity}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={formData.touchSensitivity}
                  onChange={(e) =>
                    setFormData({ ...formData, touchSensitivity: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Less sensitive</span>
                  <span>More sensitive</span>
                </div>
              </div>

              {/* Touch Target Size */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Touch Target Size: {formData.touchTargetSize}px
                </label>
                <input
                  type="range"
                  min="32"
                  max="96"
                  value={formData.touchTargetSize}
                  onChange={(e) =>
                    setFormData({ ...formData, touchTargetSize: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>

              {/* Target Preview */}
              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-center">
                <div
                  className="bg-blue-500 rounded-full flex items-center justify-center text-white"
                  style={{
                    width: formData.touchTargetSize,
                    height: formData.touchTargetSize,
                  }}
                >
                  <span className="text-xs">Tap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
              <span className="mr-2">👁️</span>
              Visual Settings
            </h3>
            <div className="space-y-4">
              {/* High Contrast */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.highContrast}
                  onChange={(e) =>
                    setFormData({ ...formData, highContrast: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">High contrast mode</span>
                  <p className="text-xs text-slate-500">Increases visual distinction</p>
                </div>
              </label>

              {/* Reduce Motion */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.reduceMotion}
                  onChange={(e) =>
                    setFormData({ ...formData, reduceMotion: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">Reduce motion</span>
                  <p className="text-xs text-slate-500">Minimizes animations</p>
                </div>
              </label>
            </div>
          </div>

          {/* Audio Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
              <span className="mr-2">🔊</span>
              Audio Feedback
            </h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.audioFeedback}
                  onChange={(e) =>
                    setFormData({ ...formData, audioFeedback: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">Enable audio feedback</span>
                  <p className="text-xs text-slate-500">Sounds for actions and achievements</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hapticFeedback}
                  onChange={(e) =>
                    setFormData({ ...formData, hapticFeedback: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">Enable haptic feedback</span>
                  <p className="text-xs text-slate-500">Vibration on touch (mobile devices)</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
