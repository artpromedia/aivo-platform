'use client';

import { X } from 'lucide-react';

import type { TutorSession } from '../../lib/hooks/use-tutor-session';
import { AnimatedTutorAvatar } from './animated-tutor-avatar';

const SUBJECT_GRADIENTS: Record<string, string> = {
  MATH: 'from-blue-600 to-indigo-600',
  ELA: 'from-emerald-600 to-teal-600',
  SCIENCE: 'from-amber-600 to-orange-600',
  HISTORY: 'from-purple-600 to-fuchsia-600',
  CODING: 'from-cyan-600 to-blue-600',
};

interface TutorSessionHeaderProps {
  session: TutorSession;
  emotion: string;
  isConnected: boolean;
  onEndSession: () => void;
}

export function TutorSessionHeader({
  session,
  emotion,
  isConnected,
  onEndSession,
}: TutorSessionHeaderProps) {
  const gradient = SUBJECT_GRADIENTS[session.subject] ?? 'from-indigo-600 to-purple-600';

  return (
    <div
      className={`flex items-center gap-4 bg-gradient-to-r ${gradient} px-4 py-3 text-white rounded-t-2xl`}
    >
      <AnimatedTutorAvatar
        personaSlug={session.persona.slug}
        personaName={session.persona.name}
        emotion={emotion}
        size="md"
        isAnimating={emotion !== 'NEUTRAL'}
      />

      <div className="flex-1">
        <h2 className="text-lg font-bold">{session.persona.name}</h2>
        <p className="text-sm opacity-80">
          {session.topic ?? session.subject}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-xs opacity-70">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <button
          onClick={onEndSession}
          className="rounded-lg bg-white/20 p-2 transition hover:bg-white/30"
          aria-label="End session"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
