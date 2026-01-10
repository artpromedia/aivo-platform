/**
 * SEL Observation Recorder Component
 *
 * Quick observation form for recording student social-emotional learning observations.
 * Supports CASEL domains, skill demonstration levels, and follow-up flagging.
 * Inspired by aivo-agentic-ai-platform/services/api-gateway/app/api/v1/teacher_sel.py
 */

'use client';

import { useState } from 'react';
import {
  Heart,
  Users,
  Brain,
  Shield,
  Target,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

interface SELObservationRecorderProps {
  studentId?: string;
  studentName?: string;
  onSubmit?: (observation: SELObservation) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

interface SELObservation {
  studentId: string;
  observationDate: string;
  setting: string;
  caselDomain: string;
  skillDemonstration: string;
  behaviorObserved: string;
  requiresFollowUp: boolean;
  notes?: string;
}

const CASEL_DOMAINS = [
  { id: 'self-awareness', label: 'Self-Awareness', icon: Brain, color: 'purple' },
  { id: 'self-management', label: 'Self-Management', icon: Target, color: 'blue' },
  { id: 'social-awareness', label: 'Social Awareness', icon: Heart, color: 'pink' },
  { id: 'relationship-skills', label: 'Relationship Skills', icon: Users, color: 'green' },
  { id: 'responsible-decision-making', label: 'Responsible Decision Making', icon: Shield, color: 'amber' },
];

const SETTINGS = [
  { id: 'classroom', label: 'Classroom' },
  { id: 'recess', label: 'Recess' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'specials', label: 'Specials' },
  { id: 'hallway', label: 'Hallway' },
  { id: 'small_group', label: 'Small Group' },
];

const SKILL_LEVELS = [
  { id: 'independent', label: 'Independent', description: 'Demonstrates skill without support', color: 'green' },
  { id: 'prompted', label: 'Prompted', description: 'Needs occasional reminders', color: 'blue' },
  { id: 'with_support', label: 'With Support', description: 'Requires guidance', color: 'amber' },
  { id: 'not_yet', label: 'Not Yet', description: 'Still developing', color: 'red' },
];

export function SELObservationRecorder({
  studentId = '',
  studentName = 'Student',
  onSubmit,
  onCancel,
  isOpen = true,
}: SELObservationRecorderProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSetting, setSelectedSetting] = useState<string>('classroom');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [behavior, setBehavior] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDomain || !skillLevel || !behavior) return;

    setIsSubmitting(true);

    const observation: SELObservation = {
      studentId,
      observationDate: new Date().toISOString(),
      setting: selectedSetting,
      caselDomain: selectedDomain,
      skillDemonstration: skillLevel,
      behaviorObserved: behavior,
      requiresFollowUp,
      notes: notes || undefined,
    };

    await onSubmit?.(observation);
    setIsSubmitting(false);

    // Reset form
    setSelectedDomain('');
    setSkillLevel('');
    setBehavior('');
    setNotes('');
    setRequiresFollowUp(false);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">SEL Observation</h2>
              <p className="text-sm text-white/80">{studentName}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Setting Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            Setting
          </label>
          <div className="flex flex-wrap gap-2">
            {SETTINGS.map((setting) => (
              <button
                key={setting.id}
                onClick={() => setSelectedSetting(setting.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedSetting === setting.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {setting.label}
              </button>
            ))}
          </div>
        </div>

        {/* CASEL Domain Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Brain className="w-4 h-4" />
            CASEL Domain
          </label>
          <div className="grid grid-cols-1 gap-2">
            {CASEL_DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `border-${domain.color}-400 bg-${domain.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isSelected ? `bg-${domain.color}-100` : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      isSelected ? `text-${domain.color}-600` : 'text-gray-500'
                    }`} />
                  </div>
                  <span className={`font-medium ${
                    isSelected ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {domain.label}
                  </span>
                  {isSelected && (
                    <CheckCircle className={`w-5 h-5 ml-auto text-${domain.color}-500`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill Demonstration Level */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Target className="w-4 h-4" />
            Skill Demonstration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SKILL_LEVELS.map((level) => {
              const isSelected = skillLevel === level.id;
              return (
                <button
                  key={level.id}
                  onClick={() => setSkillLevel(level.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `border-${level.color}-400 bg-${level.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium ${
                    isSelected ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {level.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {level.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Behavior Observed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Behavior Observed
          </label>
          <textarea
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="Describe what you observed..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context or notes..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Follow-up Required */}
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <input
            type="checkbox"
            id="followUp"
            checked={requiresFollowUp}
            onChange={(e) => setRequiresFollowUp(e.target.checked)}
            className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
          />
          <label htmlFor="followUp" className="flex-1">
            <p className="text-sm font-medium text-amber-800">Requires Follow-up</p>
            <p className="text-xs text-amber-600">Flag this observation for additional attention</p>
          </label>
          <AlertCircle className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!selectedDomain || !skillLevel || !behavior || isSubmitting}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Observation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default SELObservationRecorder;
