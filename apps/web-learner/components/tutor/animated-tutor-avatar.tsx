'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type TutorAvatarState =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'celebrating'
  | 'encouraging'
  | 'waving'
  | 'listening';

type RiveModule = typeof import('@rive-app/react-canvas');

// ═══════════════════════════════════════════════════════════════════════════════
// Persona colours & config
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONA_COLORS: Record<
  string,
  { bg: string; text: string; gradient: string; initial: string; from: string; to: string }
> = {
  'nova-math': {
    bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-indigo-500 to-purple-500',
    initial: 'N', from: '#6366F1', to: '#A855F7',
  },
  'sage-ela': {
    bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-400 to-teal-500',
    initial: 'S', from: '#10B981', to: '#14B8A6',
  },
  'spark-science': {
    bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-400 to-orange-500',
    initial: 'S', from: '#F59E0B', to: '#F97316',
  },
  'chrono-history': {
    bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-400 to-rose-500',
    initial: 'C', from: '#8B5CF6', to: '#F43F5E',
  },
  'pixel-coding': {
    bg: 'bg-cyan-100', text: 'text-cyan-700', gradient: 'from-cyan-400 to-blue-500',
    initial: 'P', from: '#06B6D4', to: '#3B82F6',
  },
};

const STATE_TRIGGERS: Partial<Record<TutorAvatarState, string>> = {
  talking: 'trigTalk',
  thinking: 'trigThink',
  celebrating: 'trigCelebrate',
  encouraging: 'trigEncourage',
  waving: 'trigWave',
};

const STATE_EMOJI: Partial<Record<TutorAvatarState, string>> = {
  thinking: '\u{1F914}',    // 🤔
  celebrating: '\u{1F389}', // 🎉
  encouraging: '\u{1F44D}', // 👍
  waving: '\u{1F44B}',      // 👋
};

const RIVE_BASE_PATH = '/rive/tutors';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedTutorAvatarProps {
  /** Persona slug (e.g. 'nova-math', 'sage-ela'). */
  personaSlug: string;
  /** Display name (used for initial in fallback). */
  personaName: string;
  /** Current animation state. */
  state?: TutorAvatarState;
  /** Mouth open amount for lip-sync (0–1). */
  mouthOpenAmount?: number;
  /** Size variant. */
  size?: 'sm' | 'md' | 'lg';
  /** Emotion overlay. */
  emotion?: string;
  /** Whether animation is active (legacy compat). */
  isAnimating?: boolean;
  /** When true, show static fallback instead of Rive animation. */
  reducedMotion?: boolean;
}

export const AnimatedTutorAvatar = memo(function AnimatedTutorAvatar({
  personaSlug,
  personaName,
  state = 'idle',
  mouthOpenAmount = 0,
  size = 'md',
  emotion = 'NEUTRAL',
  isAnimating = true,
  reducedMotion = false,
}: AnimatedTutorAvatarProps) {
  const colors = PERSONA_COLORS[personaSlug] ?? PERSONA_COLORS['nova-math']!;

  const sizePx = useMemo(() => {
    switch (size) {
      case 'sm': return 40;
      case 'lg': return 96;
      default: return 64;
    }
  }, [size]);

  // ---------------------------------------------------------------------------
  // Rive loading (lazy import — falls back gracefully if not installed)
  // ---------------------------------------------------------------------------
  const [riveModule, setRiveModule] = useState<RiveModule | null>(null);
  const [riveError, setRiveError] = useState(false);
  const previousState = useRef<TutorAvatarState>(state);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    import('@rive-app/react-canvas')
      .then((mod) => { if (!cancelled) setRiveModule(mod); })
      .catch(() => { if (!cancelled) setRiveError(true); });
    return () => { cancelled = true; };
  }, [reducedMotion]);

  // If we have Rive and a .riv file exists, render it; otherwise fallback.
  const useRiveFallback = reducedMotion || riveError || !riveModule;

  if (useRiveFallback) {
    return (
      <FallbackAvatar
        colors={colors}
        personaName={personaName}
        state={state}
        mouthOpenAmount={mouthOpenAmount}
        emotion={emotion}
        sizePx={sizePx}
        reducedMotion={reducedMotion}
      />
    );
  }

  return (
    <RiveAvatar
      rive={riveModule}
      personaSlug={personaSlug}
      personaName={personaName}
      colors={colors}
      state={state}
      previousStateRef={previousState}
      mouthOpenAmount={mouthOpenAmount}
      emotion={emotion}
      isAnimating={isAnimating}
      sizePx={sizePx}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Rive-backed avatar (loaded lazily)
// ═══════════════════════════════════════════════════════════════════════════════

function RiveAvatar({
  rive,
  personaSlug,
  personaName,
  colors,
  state,
  previousStateRef,
  mouthOpenAmount,
  emotion,
  isAnimating,
  sizePx,
}: {
  rive: RiveModule;
  personaSlug: string;
  personaName: string;
  colors: (typeof PERSONA_COLORS)[string];
  state: TutorAvatarState;
  previousStateRef: React.MutableRefObject<TutorAvatarState>;
  mouthOpenAmount: number;
  emotion: string;
  isAnimating: boolean;
  sizePx: number;
}) {
  const { useRive, useStateMachineInput } = rive;
  const slug = personaSlug.replace(/-/g, '_');
  const src = `${RIVE_BASE_PATH}/${slug}.riv`;

  const { rive: riveInstance, RiveComponent } = useRive({
    src,
    stateMachines: 'TutorController',
    autoplay: isAnimating,
    onLoadError: () => {
      // .riv not found — RiveComponent will be null, fallback renders instead.
    },
  });

  // Bind inputs
  const mouthOpen = useStateMachineInput(riveInstance, 'TutorController', 'mouthOpen');
  const isListening = useStateMachineInput(riveInstance, 'TutorController', 'isListening');
  const trigTalk = useStateMachineInput(riveInstance, 'TutorController', 'trigTalk');
  const trigStopTalk = useStateMachineInput(riveInstance, 'TutorController', 'trigStopTalk');
  const trigThink = useStateMachineInput(riveInstance, 'TutorController', 'trigThink');
  const trigCelebrate = useStateMachineInput(riveInstance, 'TutorController', 'trigCelebrate');
  const trigEncourage = useStateMachineInput(riveInstance, 'TutorController', 'trigEncourage');
  const trigWave = useStateMachineInput(riveInstance, 'TutorController', 'trigWave');

  const triggerMap: Record<string, ReturnType<typeof useStateMachineInput>> = {
    trigTalk, trigStopTalk, trigThink, trigCelebrate, trigEncourage, trigWave,
  };

  // Update mouthOpen at 60fps
  useEffect(() => {
    if (mouthOpen) {
      (mouthOpen as { value: number }).value = Math.min(1, Math.max(0, mouthOpenAmount));
    }
  }, [mouthOpen, mouthOpenAmount]);

  // Fire triggers on state change
  useEffect(() => {
    const prev = previousStateRef.current;
    if (prev === state) return;

    // Stop previous state
    if (prev === 'talking') trigStopTalk?.fire?.();
    if (prev === 'listening' && isListening) {
      (isListening as { value: boolean }).value = false;
    }

    // Start new state
    if (state === 'listening' && isListening) {
      (isListening as { value: boolean }).value = true;
    } else {
      const triggerName = STATE_TRIGGERS[state];
      if (triggerName) triggerMap[triggerName]?.fire?.();
    }

    previousStateRef.current = state;
  }, [state, trigStopTalk, isListening, triggerMap, previousStateRef]);

  if (!RiveComponent) {
    return (
      <FallbackAvatar
        colors={colors}
        personaName={personaName}
        state={state}
        mouthOpenAmount={mouthOpenAmount}
        emotion={emotion}
        sizePx={sizePx}
        reducedMotion={false}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`AI tutor ${personaName}, ${state}`}
      style={{ width: sizePx, height: sizePx }}
    >
      <RiveComponent />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fallback avatar (CSS / Framer Motion)
// ═══════════════════════════════════════════════════════════════════════════════

function FallbackAvatar({
  colors,
  personaName,
  state,
  mouthOpenAmount,
  emotion,
  sizePx,
  reducedMotion,
}: {
  colors: (typeof PERSONA_COLORS)[string];
  personaName: string;
  state: TutorAvatarState;
  mouthOpenAmount: number;
  emotion: string;
  sizePx: number;
  reducedMotion: boolean;
}) {
  const initial = personaName.charAt(0).toUpperCase();
  const emoji = STATE_EMOJI[state];
  const badgeSize = Math.max(16, sizePx * 0.24);
  const fontSize = sizePx * 0.38;

  return (
    <div
      role="img"
      aria-label={`AI tutor ${personaName}, ${state}`}
      className="relative inline-flex items-center justify-center"
      style={{ width: sizePx, height: sizePx }}
    >
      {/* Listening pulse ring */}
      {state === 'listening' && !reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${colors.from}33` }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      )}

      {/* Main circle */}
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br ${colors.gradient}`}
        style={{ width: sizePx, height: sizePx }}
      >
        <span className="font-bold text-white" style={{ fontSize }}>
          {initial}
        </span>
      </div>

      {/* Talking dots */}
      <AnimatePresence>
        {state === 'talking' && !reducedMotion && (
          <motion.div
            className="absolute flex gap-0.5"
            style={{ bottom: sizePx * 0.06 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="rounded-full bg-white"
                style={{ width: sizePx * 0.06, height: sizePx * 0.06 }}
                animate={{
                  scale: [0.6, 0.6 + 0.4 * Math.min(1, Math.max(0.2, mouthOpenAmount)), 0.6],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* State emoji badge */}
      {emoji && (
        <span
          className="absolute flex items-center justify-center rounded-full bg-white shadow-sm"
          style={{
            bottom: 0,
            right: 0,
            width: badgeSize,
            height: badgeSize,
            fontSize: badgeSize * 0.6,
          }}
        >
          {emoji}
        </span>
      )}

      {/* Emotion indicator (legacy compat) */}
      {emotion !== 'NEUTRAL' && !emoji && (
        <span
          className="absolute flex items-center justify-center rounded-full bg-white shadow-sm"
          style={{
            bottom: -2,
            right: -2,
            width: 16,
            height: 16,
            fontSize: 10,
          }}
        >
          {emotion === 'HAPPY' && '\u{1F60A}'}
          {emotion === 'THINKING' && '\u{1F914}'}
          {emotion === 'ENCOURAGING' && '\u{1F4AA}'}
          {emotion === 'EXCITED' && '\u{1F31F}'}
          {emotion === 'EMPATHETIC' && '\u{1F49C}'}
        </span>
      )}
    </div>
  );
});
