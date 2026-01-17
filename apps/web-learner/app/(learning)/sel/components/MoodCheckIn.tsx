'use client';

import { useState, useEffect } from 'react';
import { createMoodCheckIn, getMoodCheckIns, getSELProgress, type MoodCheckIn as MoodCheckInType, type SELProgress } from '../../../../lib/sel-api';

interface MoodCheckInProps {
  learnerId: string;
}

const MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sad', label: 'Sad', emoji: '😢', color: 'bg-blue-100 text-blue-800' },
  { value: 'angry', label: 'Angry', emoji: '😠', color: 'bg-red-100 text-red-800' },
  { value: 'worried', label: 'Worried', emoji: '😰', color: 'bg-orange-100 text-orange-800' },
  { value: 'calm', label: 'Calm', emoji: '😌', color: 'bg-green-100 text-green-800' },
  { value: 'excited', label: 'Excited', emoji: '🤩', color: 'bg-purple-100 text-purple-800' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤', color: 'bg-rose-100 text-rose-800' },
  { value: 'tired', label: 'Tired', emoji: '😴', color: 'bg-slate-100 text-slate-800' },
] as const;

const COMMON_TRIGGERS = [
  'Schoolwork',
  'Social interaction',
  'Change in routine',
  'Noise/sensory',
  'Transition',
  'Conflict',
  'Excitement',
  'Tiredness',
];

const COPING_STRATEGIES = [
  'Deep breathing',
  'Took a break',
  'Talked to someone',
  'Used fidget',
  'Listened to music',
  'Went for a walk',
  'Positive self-talk',
  'Asked for help',
];

/**
 * Mood Check-In Component
 * 
 * Allows learners to:
 * - Select current mood and intensity
 * - Identify triggers
 * - Record coping strategies used
 * - View mood history and trends
 */
export function MoodCheckIn({ learnerId }: Readonly<MoodCheckInProps>) {
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedCoping, setSelectedCoping] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<MoodCheckInType[]>([]);
  const [progress, setProgress] = useState<SELProgress | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadHistory();
    loadProgress();
  }, [learnerId]);

  const loadHistory = async () => {
    try {
      const data = await getMoodCheckIns(learnerId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load mood history:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const data = await getSELProgress(learnerId);
      setProgress(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) return;

    setIsSubmitting(true);
    try {
      await createMoodCheckIn(learnerId, {
        mood: selectedMood as any,
        intensity,
        triggers: selectedTriggers.length > 0 ? selectedTriggers : undefined,
        copingStrategiesUsed: selectedCoping.length > 0 ? selectedCoping : undefined,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setSelectedMood('');
      setIntensity(3);
      setSelectedTriggers([]);
      setSelectedCoping([]);
      setNotes('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reload data
      await loadHistory();
      await loadProgress();
    } catch (error) {
      console.error('Failed to submit check-in:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const toggleCoping = (strategy: string) => {
    setSelectedCoping((prev) =>
      prev.includes(strategy) ? prev.filter((s) => s !== strategy) : [...prev, strategy]
    );
  };

  const getMoodEmoji = (mood: string) => {
    return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji || '😐';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Check-In Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">How are you feeling?</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mood Selection */}
            <div>
              <label htmlFor="mood-selection" className="block text-sm font-medium text-slate-700 mb-3">
                Select your mood
              </label>
              <div id="mood-selection" className="grid grid-cols-4 gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${
                        selectedMood === mood.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <span className="text-3xl">{mood.emoji}</span>
                    <span className="text-sm font-medium text-slate-700">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            {selectedMood && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  How strong is this feeling? ({intensity}/5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Strong</span>
                </div>
              </div>
            )}

            {/* Triggers */}
            <div>
              <label htmlFor="triggers-selection" className="block text-sm font-medium text-slate-700 mb-3">
                What might have triggered this feeling? (optional)
              </label>
              <div id="triggers-selection" className="flex flex-wrap gap-2">
                {COMMON_TRIGGERS.map((trigger) => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => toggleTrigger(trigger)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${
                        selectedTriggers.includes(trigger)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }
                    `}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>

            {/* Coping Strategies */}
            <div>
              <label htmlFor="coping-selection" className="block text-sm font-medium text-slate-700 mb-3">
                What helped you cope? (optional)
              </label>
              <div id="coping-selection" className="flex flex-wrap gap-2">
                {COPING_STRATEGIES.map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => toggleCoping(strategy)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${
                        selectedCoping.includes(strategy)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }
                    `}
                  >
                    {strategy}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                Additional notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Anything else you want to remember..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedMood || isSubmitting}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Check-In'}
            </button>

            {/* Success Message */}
            {showSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                ✅ Check-in saved successfully!
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Progress & History Sidebar */}
      <div className="space-y-6">
        {/* Progress Stats */}
        {progress && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600">Total Check-Ins</div>
                <div className="text-2xl font-bold text-indigo-600">{progress.totalCheckIns}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Current Streak</div>
                <div className="text-2xl font-bold text-orange-600">
                  {progress.currentStreak} days 🔥
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Longest Streak</div>
                <div className="text-xl font-semibold text-slate-700">
                  {progress.longestStreak} days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Check-Ins</h3>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No check-ins yet. Start tracking your mood!</p>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map((checkIn) => (
                <div key={checkIn.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="text-2xl">{getMoodEmoji(checkIn.mood)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 capitalize">
                      {checkIn.mood}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(checkIn.timestamp).toLocaleDateString()} • Intensity {checkIn.intensity}/5
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
