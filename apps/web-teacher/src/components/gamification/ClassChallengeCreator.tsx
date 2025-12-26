/**
 * Class Challenge Creator
 *
 * Modal for teachers to create custom class challenges
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Calendar, Star, Coins, AlertCircle } from 'lucide-react';

interface ClassChallengeCreatorProps {
  classId: string;
  className: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (challenge: CreateChallengeData) => Promise<void>;
}

interface CreateChallengeData {
  classId: string;
  title: string;
  description: string;
  targetType: 'xp' | 'lessons' | 'achievements' | 'streak';
  targetValue: number;
  startDate: string;
  endDate: string;
  rewardXP: number;
  rewardCoins: number;
}

const TARGET_TYPES = [
  { id: 'xp', label: 'Earn XP', icon: '⭐', unit: 'XP' },
  { id: 'lessons', label: 'Complete Lessons', icon: '📚', unit: 'lessons' },
  { id: 'achievements', label: 'Earn Achievements', icon: '🏆', unit: 'achievements' },
  { id: 'streak', label: 'Maintain Streak', icon: '🔥', unit: 'days' },
] as const;

const PRESET_CHALLENGES = [
  {
    title: 'Weekly XP Race',
    description: 'Earn the most XP this week!',
    targetType: 'xp' as const,
    targetValue: 500,
    days: 7,
    rewardXP: 100,
    rewardCoins: 50,
  },
  {
    title: 'Lesson Marathon',
    description: 'Complete 10 lessons this week',
    targetType: 'lessons' as const,
    targetValue: 10,
    days: 7,
    rewardXP: 150,
    rewardCoins: 75,
  },
  {
    title: 'Streak Challenge',
    description: 'Keep your streak alive for 5 days',
    targetType: 'streak' as const,
    targetValue: 5,
    days: 7,
    rewardXP: 100,
    rewardCoins: 25,
  },
];

export function ClassChallengeCreator({
  classId,
  className,
  isOpen,
  onClose,
  onCreate,
}: ClassChallengeCreatorProps) {
  const [step, setStep] = useState<'preset' | 'custom'>('preset');
  const [formData, setFormData] = useState<Partial<CreateChallengeData>>({
    classId,
    targetType: 'xp',
    targetValue: 100,
    rewardXP: 50,
    rewardCoins: 25,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handlePresetSelect = (preset: typeof PRESET_CHALLENGES[0]) => {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + preset.days);

    setFormData({
      classId,
      title: preset.title,
      description: preset.description,
      targetType: preset.targetType,
      targetValue: preset.targetValue,
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rewardXP: preset.rewardXP,
      rewardCoins: preset.rewardCoins,
    });
    setStep('custom');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.targetValue || formData.targetValue < 1) {
      newErrors.targetValue = 'Target must be at least 1';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsCreating(true);
    try {
      await onCreate(formData as CreateChallengeData);
      onClose();
    } catch (error) {
      console.error('Failed to create challenge:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTargetType = TARGET_TYPES.find((t) => t.id === formData.targetType);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Create Class Challenge
                </h2>
                <p className="text-sm text-gray-500">{className}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {step === 'preset' ? (
              /* Preset selection */
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-500">Choose a template or create from scratch:</p>

                {PRESET_CHALLENGES.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {TARGET_TYPES.find((t) => t.id === preset.targetType)?.icon}
                      </span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {preset.title}
                        </h3>
                        <p className="text-sm text-gray-500">{preset.description}</p>
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setStep('custom')}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  Create Custom Challenge
                </button>
              </div>
            ) : (
              /* Custom form */
              <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`
                      w-full px-3 py-2 border rounded-lg
                      ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      bg-white dark:bg-gray-900
                    `}
                    placeholder="e.g., Weekly XP Challenge"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`
                      w-full px-3 py-2 border rounded-lg
                      ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      bg-white dark:bg-gray-900
                    `}
                    placeholder="Describe the challenge..."
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                  )}
                </div>

                {/* Target type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Challenge Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, targetType: type.id })}
                        className={`
                          p-3 border rounded-lg text-left flex items-center gap-2
                          ${formData.targetType === type.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target ({selectedTargetType?.unit})
                  </label>
                  <input
                    type="number"
                    value={formData.targetValue || ''}
                    onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                    min={1}
                    className={`
                      w-full px-3 py-2 border rounded-lg
                      ${errors.targetValue ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      bg-white dark:bg-gray-900
                    `}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={`
                        w-full px-3 py-2 border rounded-lg
                        ${errors.startDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                        bg-white dark:bg-gray-900
                      `}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className={`
                        w-full px-3 py-2 border rounded-lg
                        ${errors.endDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                        bg-white dark:bg-gray-900
                      `}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      XP Reward
                    </label>
                    <input
                      type="number"
                      value={formData.rewardXP || ''}
                      onChange={(e) => setFormData({ ...formData, rewardXP: Number(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      Coin Reward
                    </label>
                    <input
                      type="number"
                      value={formData.rewardCoins || ''}
                      onChange={(e) => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('preset')}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Challenge'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ClassChallengeCreator;
