'use client';

import type { TutorPersona } from '../../lib/hooks/use-tutor-session';
import { AnimatedTutorAvatar } from './animated-tutor-avatar';

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Mathematics',
  ELA: 'Reading & Writing',
  SCIENCE: 'Science',
  HISTORY: 'History',
  CODING: 'Coding',
};

const SUBJECT_COLORS: Record<string, string> = {
  MATH: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50',
  ELA: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50',
  SCIENCE: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50',
  HISTORY: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/50',
  CODING: 'border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50/50',
};

interface TutorPersonaCardProps {
  persona: TutorPersona;
  onSelect: (persona: TutorPersona) => void;
}

export function TutorPersonaCard({ persona, onSelect }: TutorPersonaCardProps) {
  const subjectColor = SUBJECT_COLORS[persona.subject] ?? 'border-gray-200 hover:border-gray-400';

  return (
    <button
      onClick={() => onSelect(persona)}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 bg-white p-6 text-center transition-all duration-200 ${subjectColor}`}
    >
      <AnimatedTutorAvatar
        personaSlug={persona.slug}
        personaName={persona.name}
        size="lg"
        emotion="HAPPY"
        isAnimating={false}
      />

      <div>
        <h3 className="text-lg font-bold text-gray-900">{persona.name}</h3>
        <p className="text-sm font-medium text-gray-500">
          {SUBJECT_LABELS[persona.subject] ?? persona.subject}
        </p>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{persona.description}</p>
    </button>
  );
}
