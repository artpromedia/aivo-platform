'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Sun,
  Contrast,
  Palette,
  Volume2,
  Music,
  Type,
  AlignJustify,
  Accessibility,
  MonitorSmartphone,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

interface SensoryProfile {
  brightness: number;
  contrast: number;
  colorOverlay: string;
  volume: number;
  backgroundSounds: boolean;
  fontSize: number;
  lineSpacing: number;
  dyslexiaFont: boolean;
  reduceAnimations: boolean;
}

const DEFAULT_PROFILE: SensoryProfile = {
  brightness: 100,
  contrast: 100,
  colorOverlay: 'none',
  volume: 80,
  backgroundSounds: false,
  fontSize: 16,
  lineSpacing: 1.5,
  dyslexiaFont: false,
  reduceAnimations: false,
};

const COLOR_OVERLAYS = [
  { value: 'none', label: 'None', color: 'bg-white border-gray-200' },
  { value: 'warm', label: 'Warm', color: 'bg-amber-50 border-amber-200' },
  { value: 'cool', label: 'Cool', color: 'bg-blue-50 border-blue-200' },
  { value: 'sepia', label: 'Sepia', color: 'bg-yellow-50 border-yellow-200' },
  { value: 'green', label: 'Green', color: 'bg-green-50 border-green-200' },
];

// ── Slider sub-component ───────────────────────────────────

function RangeSlider({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 text-gray-400" />
          {label}
        </div>
        <span className="text-sm tabular-nums text-gray-500">
          {value}{unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600 h-2 rounded-full appearance-none bg-gray-200 cursor-pointer"
        aria-label={label}
      />
    </div>
  );
}

// ── Toggle sub-component ───────────────────────────────────

function Toggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Icon className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// ── Page Component ─────────────────────────────────────────

export default function SensoryPage() {
  const [profile, setProfile] = useState<SensoryProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/learner/sensory-profile', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json()) as SensoryProfile;
          setProfile(data);
        }
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  const update = useCallback(<K extends keyof SensoryProfile>(key: K, value: SensoryProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/learner/sensory-profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <SlidersHorizontal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sensory Profile</h1>
            <p className="text-sm text-gray-500">Customize your learning environment</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* ── Visual Settings ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5" aria-label="Visual settings">
        <h2 className="text-lg font-semibold text-gray-900">Visual Settings</h2>

        <RangeSlider icon={Sun} label="Brightness" value={profile.brightness} min={50} max={100} step={5} unit="%" onChange={(v) => update('brightness', v)} />
        <RangeSlider icon={Contrast} label="Contrast" value={profile.contrast} min={50} max={150} step={5} unit="%" onChange={(v) => update('contrast', v)} />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Palette className="w-4 h-4 text-gray-400" />
            Color Overlay
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OVERLAYS.map((o) => (
              <button
                key={o.value}
                onClick={() => update('colorOverlay', o.value)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${o.color} ${
                  profile.colorOverlay === o.value
                    ? 'ring-2 ring-indigo-400 ring-offset-1'
                    : 'hover:shadow-sm'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audio Settings ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5" aria-label="Audio settings">
        <h2 className="text-lg font-semibold text-gray-900">Audio Settings</h2>
        <RangeSlider icon={Volume2} label="Volume" value={profile.volume} min={0} max={100} step={5} unit="%" onChange={(v) => update('volume', v)} />
        <Toggle icon={Music} label="Background Sounds" description="Play ambient sounds during lessons" checked={profile.backgroundSounds} onChange={(v) => update('backgroundSounds', v)} />
      </section>

      {/* ── Reading Preferences ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5" aria-label="Reading preferences">
        <h2 className="text-lg font-semibold text-gray-900">Reading Preferences</h2>
        <RangeSlider icon={Type} label="Font Size" value={profile.fontSize} min={14} max={24} step={1} unit="px" onChange={(v) => update('fontSize', v)} />
        <RangeSlider icon={AlignJustify} label="Line Spacing" value={profile.lineSpacing} min={1} max={2.5} step={0.1} onChange={(v) => update('lineSpacing', v)} />
        <Toggle icon={Accessibility} label="Dyslexia-Friendly Font" description="Use OpenDyslexic font for all reading content" checked={profile.dyslexiaFont} onChange={(v) => update('dyslexiaFont', v)} />
      </section>

      {/* ── Motion Preferences ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5" aria-label="Motion preferences">
        <h2 className="text-lg font-semibold text-gray-900">Motion Preferences</h2>
        <Toggle icon={MonitorSmartphone} label="Reduce Animations" description="Minimize motion and transitions throughout the app" checked={profile.reduceAnimations} onChange={(v) => update('reduceAnimations', v)} />
      </section>

      {/* Preview */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" aria-label="Preview">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview</h2>
        <div
          className="rounded-xl border border-gray-200 p-5"
          style={{
            filter: `brightness(${profile.brightness}%) contrast(${profile.contrast}%)`,
            fontSize: `${profile.fontSize}px`,
            lineHeight: profile.lineSpacing,
            fontFamily: profile.dyslexiaFont ? '"OpenDyslexic", sans-serif' : 'inherit',
          }}
        >
          <p className="text-gray-800">
            This is a preview of how your reading content will look. Adjust the settings above to find what works best for you.
          </p>
        </div>
      </section>
    </div>
  );
}
