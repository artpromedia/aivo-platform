'use client';

import { useMemo } from 'react';

const PERSONA_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  'nova-math': { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-400 to-indigo-500' },
  'sage-ela': { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-400 to-teal-500' },
  'spark-science': { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-400 to-orange-500' },
  'chrono-history': { bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-400 to-fuchsia-500' },
  'pixel-coding': { bg: 'bg-cyan-100', text: 'text-cyan-700', gradient: 'from-cyan-400 to-blue-500' },
};

const EMOTION_EXPRESSIONS: Record<string, string> = {
  NEUTRAL: '',
  HAPPY: 'animate-bounce',
  THINKING: 'animate-pulse',
  ENCOURAGING: 'animate-bounce',
  EXCITED: 'animate-bounce',
  EMPATHETIC: 'animate-pulse',
};

interface AnimatedTutorAvatarProps {
  personaSlug: string;
  personaName: string;
  emotion?: string;
  size?: 'sm' | 'md' | 'lg';
  isAnimating?: boolean;
}

export function AnimatedTutorAvatar({
  personaSlug,
  personaName,
  emotion = 'NEUTRAL',
  size = 'md',
  isAnimating = false,
}: AnimatedTutorAvatarProps) {
  const colors = PERSONA_COLORS[personaSlug] ?? PERSONA_COLORS['nova-math'];
  const animationClass = isAnimating ? EMOTION_EXPRESSIONS[emotion] ?? '' : '';

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'h-10 w-10 text-lg';
      case 'lg':
        return 'h-24 w-24 text-4xl';
      default:
        return 'h-16 w-16 text-2xl';
    }
  }, [size]);

  const initial = personaName.charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br ${colors.gradient} ${sizeClasses} ${animationClass} transition-all duration-300`}
    >
      <span className="font-bold text-white">{initial}</span>
      {/* Emotion indicator */}
      {emotion !== 'NEUTRAL' && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs shadow-sm">
          {emotion === 'HAPPY' && '😊'}
          {emotion === 'THINKING' && '🤔'}
          {emotion === 'ENCOURAGING' && '💪'}
          {emotion === 'EXCITED' && '🌟'}
          {emotion === 'EMPATHETIC' && '💜'}
        </span>
      )}
    </div>
  );
}
