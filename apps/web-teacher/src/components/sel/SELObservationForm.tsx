/**
 * SEL Observation Form Component
 *
 * Form for teachers to record SEL observations about students.
 * Based on ObservationForm from aivo-agentic-ai-platform.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface SELObservation {
  studentId: string;
  studentName: string;
  domain: string;
  behavior: string;
  context: string;
  intensity: 'low' | 'medium' | 'high';
  notes: string;
  timestamp: string;
}

interface Student {
  id: string;
  name: string;
  avatar?: string;
}

interface SELObservationFormProps {
  students: Student[];
  onSubmit: (observation: SELObservation) => void;
  onCancel: () => void;
  initialStudent?: string;
}

const SEL_DOMAINS = [
  { id: 'self-awareness', name: 'Self-Awareness', icon: '🪞' },
  { id: 'self-management', name: 'Self-Management', icon: '🎯' },
  { id: 'social-awareness', name: 'Social Awareness', icon: '👥' },
  { id: 'relationship-skills', name: 'Relationship Skills', icon: '🤝' },
  { id: 'responsible-decision', name: 'Responsible Decision-Making', icon: '⚖️' },
];

const BEHAVIORS = {
  'self-awareness': [
    'Identified own emotions accurately',
    'Recognized personal strengths',
    'Showed confidence in abilities',
    'Demonstrated self-reflection',
    'Expressed feelings appropriately',
  ],
  'self-management': [
    'Managed frustration well',
    'Stayed focused on task',
    'Used calming strategies',
    'Set and worked toward goals',
    'Showed impulse control',
  ],
  'social-awareness': [
    'Showed empathy for peers',
    'Respected diverse perspectives',
    'Recognized social cues',
    'Showed concern for others',
    'Appreciated differences',
  ],
  'relationship-skills': [
    'Collaborated effectively',
    'Resolved conflict peacefully',
    'Communicated clearly',
    'Listened actively',
    'Offered help to peers',
  ],
  'responsible-decision': [
    'Considered consequences',
    'Made ethical choices',
    'Took responsibility for actions',
    'Evaluated options carefully',
    'Sought help appropriately',
  ],
};

const CONTEXTS = [
  { id: 'classroom', label: 'Classroom', icon: '📚' },
  { id: 'group-work', label: 'Group Work', icon: '👥' },
  { id: 'independent', label: 'Independent Work', icon: '✏️' },
  { id: 'recess', label: 'Recess/Break', icon: '🏃' },
  { id: 'transition', label: 'Transition', icon: '🚶' },
  { id: 'other', label: 'Other', icon: '📝' },
];

export function SELObservationForm({
  students,
  onSubmit,
  onCancel,
  initialStudent,
}: SELObservationFormProps) {
  const [selectedStudent, setSelectedStudent] = useState(initialStudent || '');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedBehavior, setSelectedBehavior] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableBehaviors = selectedDomain
    ? BEHAVIORS[selectedDomain as keyof typeof BEHAVIORS] || []
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedDomain || !selectedBehavior) return;

    setIsSubmitting(true);

    const student = students.find((s) => s.id === selectedStudent);

    const observation: SELObservation = {
      studentId: selectedStudent,
      studentName: student?.name || '',
      domain: selectedDomain,
      behavior: selectedBehavior,
      context: selectedContext,
      intensity,
      notes,
      timestamp: new Date().toISOString(),
    };

    await onSubmit(observation);
    setIsSubmitting(false);
  };

  const isValid = selectedStudent && selectedDomain && selectedBehavior && selectedContext;

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-xl">
            📝
          </div>
          <div>
            <h2 className="font-semibold text-text">Record SEL Observation</h2>
            <p className="text-sm text-muted">Document student social-emotional behavior</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-muted hover:text-text transition-colors"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Student <span className="text-error">*</span>
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select a student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* SEL Domain */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            SEL Domain <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {SEL_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => {
                  setSelectedDomain(domain.id);
                  setSelectedBehavior('');
                }}
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border transition-all text-center',
                  selectedDomain === domain.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-2xl mb-1">{domain.icon}</span>
                <span className="text-xs">{domain.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Behavior */}
        {selectedDomain && (
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Observed Behavior <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              {availableBehaviors.map((behavior) => (
                <label
                  key={behavior}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedBehavior === behavior
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="radio"
                    name="behavior"
                    value={behavior}
                    checked={selectedBehavior === behavior}
                    onChange={(e) => setSelectedBehavior(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      selectedBehavior === behavior ? 'border-primary' : 'border-border'
                    )}
                  >
                    {selectedBehavior === behavior && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm text-text">{behavior}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Context */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Context <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CONTEXTS.map((context) => (
              <button
                key={context.id}
                type="button"
                onClick={() => setSelectedContext(context.id)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-all',
                  selectedContext === context.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span>{context.icon}</span>
                <span className="text-sm">{context.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Intensity Level
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-all capitalize',
                  intensity === level
                    ? level === 'low'
                      ? 'border-success bg-success/10 text-success'
                      : level === 'medium'
                        ? 'border-warning bg-warning/10 text-warning'
                        : 'border-error bg-error/10 text-error'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional context or observations..."
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-text hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={cn(
              'px-6 py-2 rounded-lg font-medium text-white transition-all',
              isValid && !isSubmitting
                ? 'bg-primary hover:opacity-90'
                : 'bg-muted cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Saving...' : 'Save Observation'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SELObservationForm;
