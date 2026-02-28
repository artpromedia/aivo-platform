'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  CloudRain,
  Waves,
  Trees,
  Radio,
  Timer,
  Eye,
  Ear,
  Hand,
  Heart,
  SmilePlus,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────

const EMOTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😟', label: 'Worried' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😴', label: 'Tired' },
];

const AMBIENT_SOUNDS = [
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'ocean', label: 'Ocean', icon: Waves },
  { id: 'forest', label: 'Forest', icon: Trees },
  { id: 'white', label: 'White Noise', icon: Radio },
] as const;

const BREAK_DURATIONS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

const GROUNDING_STEPS = [
  { count: 5, sense: 'SEE', icon: Eye, prompt: 'Name 5 things you can see' },
  { count: 4, sense: 'TOUCH', icon: Hand, prompt: 'Name 4 things you can touch' },
  { count: 3, sense: 'HEAR', icon: Ear, prompt: 'Name 3 things you can hear' },
  { count: 2, sense: 'SMELL', icon: Wind, prompt: 'Name 2 things you can smell' },
  { count: 1, sense: 'TASTE', icon: SmilePlus, prompt: 'Name 1 thing you can taste' },
];

// ── Breathing phases ───────────────────────────────────────

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'idle';

const PHASE_DURATIONS: Record<Exclude<BreathPhase, 'idle'>, number> = {
  inhale: 4000,
  hold: 4000,
  exhale: 6000,
};

const PHASE_LABEL: Record<BreathPhase, string> = {
  inhale: 'Breathe in…',
  hold: 'Hold…',
  exhale: 'Breathe out…',
  idle: 'Press play to start',
};

// ── Component ──────────────────────────────────────────────

export default function CalmPage() {
  // ── Emotion check-in ──
  const [emotionBefore, setEmotionBefore] = useState<string | null>(null);
  const [emotionAfter, setEmotionAfter] = useState<string | null>(null);
  const [checkinPhase, setCheckinPhase] = useState<'before' | 'done-before' | 'after' | 'complete'>('before');

  const recordEmotion = useCallback(async (emotion: string, context: 'before' | 'after') => {
    try {
      await fetch('/api/learner/emotion-checkin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion, intensity: 3, context, activity: 'calming-space' }),
      });
    } catch { /* best-effort */ }
  }, []);

  const handleEmotionBefore = useCallback((label: string) => {
    setEmotionBefore(label);
    recordEmotion(label, 'before');
    setCheckinPhase('done-before');
  }, [recordEmotion]);

  const handleEmotionAfter = useCallback((label: string) => {
    setEmotionAfter(label);
    recordEmotion(label, 'after');
    setCheckinPhase('complete');
  }, [recordEmotion]);

  // ── Breathing exercise ──
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('idle');
  const breathTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runBreathCycle = useCallback(() => {
    const cycle = (phase: Exclude<BreathPhase, 'idle'>) => {
      setBreathPhase(phase);
      breathTimer.current = setTimeout(() => {
        if (phase === 'inhale') cycle('hold');
        else if (phase === 'hold') cycle('exhale');
        else cycle('inhale');
      }, PHASE_DURATIONS[phase]);
    };
    cycle('inhale');
  }, []);

  const toggleBreathing = useCallback(() => {
    if (breathRunning) {
      if (breathTimer.current) clearTimeout(breathTimer.current);
      setBreathRunning(false);
      setBreathPhase('idle');
    } else {
      setBreathRunning(true);
      runBreathCycle();
    }
  }, [breathRunning, runBreathCycle]);

  useEffect(() => {
    return () => { if (breathTimer.current) clearTimeout(breathTimer.current); };
  }, []);

  // Scale the circle based on phase
  const circleScale =
    breathPhase === 'inhale' ? 'scale-110' :
    breathPhase === 'hold' ? 'scale-110' :
    breathPhase === 'exhale' ? 'scale-75' : 'scale-90';

  // ── Ambient sounds ──
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const toggleSound = useCallback((id: string) => {
    setActiveSound((prev) => (prev === id ? null : id));
  }, []);

  // ── Quick timer ──
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerSeconds(seconds);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerSeconds(0);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Grounding ──
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingActive, setGroundingActive] = useState(false);

  // ── Render ──

  // Emotion check-in overlay (before)
  if (checkinPhase === 'before') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <Heart className="w-10 h-10 text-pink-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">How are you feeling right now?</h1>
        <p className="text-sm text-gray-500">Pick the emoji that matches your mood</p>
        <div className="flex flex-wrap justify-center gap-4">
          {EMOTIONS.map((e) => (
            <button
              key={e.label}
              onClick={() => handleEmotionBefore(e.label)}
              className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border border-gray-100 bg-white hover:border-indigo-300 hover:shadow-sm transition-all w-24"
            >
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-xs font-medium text-gray-600">{e.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
          <Wind className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calming Space</h1>
          <p className="text-sm text-gray-500">Take a break and recharge</p>
        </div>
      </div>

      {/* ── Breathing Exercise ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" aria-label="Breathing exercise">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Breathing Exercise</h2>
        <div className="flex flex-col items-center gap-5">
          {/* Animated circle */}
          <div
            className={`w-40 h-40 rounded-full bg-gradient-to-br from-teal-200 to-cyan-300 flex items-center justify-center transition-transform ease-in-out ${circleScale}`}
            style={{
              transitionDuration:
                breathPhase === 'inhale' ? '4000ms' :
                breathPhase === 'hold' ? '200ms' :
                breathPhase === 'exhale' ? '6000ms' : '500ms',
            }}
            role="img"
            aria-label={PHASE_LABEL[breathPhase]}
          >
            <span className="text-sm font-semibold text-teal-800 text-center px-2">
              {PHASE_LABEL[breathPhase]}
            </span>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={toggleBreathing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
              aria-label={breathRunning ? 'Pause breathing exercise' : 'Start breathing exercise'}
            >
              {breathRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {breathRunning ? 'Pause' : 'Start'}
            </button>
          </div>
          <p className="text-xs text-gray-400">Inhale 4 s &middot; Hold 4 s &middot; Exhale 6 s</p>
        </div>
      </section>

      {/* ── Ambient Sounds ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" aria-label="Ambient sounds">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ambient Sounds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AMBIENT_SOUNDS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSound === s.id;
            return (
              <button
                key={s.id}
                onClick={() => toggleSound(s.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-teal-300 bg-teal-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
                aria-pressed={isActive}
                aria-label={`${s.label} ${isActive ? '(playing)' : ''}`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-teal-700' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {isActive && (
                  <span className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-1 bg-teal-400 rounded-full animate-pulse"
                        style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick Timer ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" aria-label="Quick timer">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Break Timer</h2>

        {timerRunning || timerSeconds > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-5xl font-bold text-gray-900 tabular-nums" aria-live="polite">
              {fmtTime(timerSeconds)}
            </span>
            {timerSeconds === 0 && (
              <p className="text-sm font-medium text-teal-600">Time&apos;s up! Great job taking a break.</p>
            )}
            <button
              onClick={resetTimer}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {BREAK_DURATIONS.map((d) => (
              <button
                key={d.seconds}
                onClick={() => startTimer(d.seconds)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-all"
              >
                <Timer className="w-4 h-4 text-gray-400" />
                {d.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Grounding Exercise (5-4-3-2-1) ── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" aria-label="Grounding exercise">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">5-4-3-2-1 Grounding</h2>
        <p className="text-sm text-gray-500 mb-5">A quick way to feel more present and connected.</p>

        {!groundingActive ? (
          <button
            onClick={() => { setGroundingActive(true); setGroundingStep(0); }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start Grounding Exercise
          </button>
        ) : (
          <div className="space-y-5">
            {GROUNDING_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isDone = i < groundingStep;
              const isCurrent = i === groundingStep;
              return (
                <div
                  key={step.sense}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-indigo-300 bg-indigo-50'
                      : isDone
                        ? 'border-gray-100 bg-gray-50 opacity-60'
                        : 'border-gray-100 bg-white opacity-40'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isCurrent ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {step.count} &mdash; {step.sense}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{step.prompt}</p>
                  </div>
                  {isCurrent && (
                    <button
                      onClick={() => setGroundingStep((s) => s + 1)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
                    >
                      Done
                    </button>
                  )}
                </div>
              );
            })}
            {groundingStep >= GROUNDING_STEPS.length && (
              <div className="text-center space-y-3 py-2">
                <p className="text-sm font-medium text-teal-600">You did it! Feel more grounded?</p>
                <button
                  onClick={() => { setGroundingActive(false); setGroundingStep(0); }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Start over
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Emotion Check-in (after) ── */}
      {checkinPhase === 'done-before' && (
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-100 p-6" aria-label="Emotion check-in after">
          <div className="text-center space-y-4">
            <Heart className="w-8 h-8 text-pink-500 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">How do you feel now?</h2>
            <p className="text-sm text-gray-500">Check in after your calming activities</p>
            <div className="flex flex-wrap justify-center gap-3">
              {EMOTIONS.map((e) => (
                <button
                  key={e.label}
                  onClick={() => handleEmotionAfter(e.label)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-white bg-white/80 hover:border-pink-300 hover:shadow-sm transition-all w-20"
                >
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-[10px] font-medium text-gray-600">{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {checkinPhase === 'complete' && (
        <div className="text-center text-sm text-gray-500 py-2">
          Before: <span className="font-medium text-gray-700">{emotionBefore}</span> → After: <span className="font-medium text-gray-700">{emotionAfter}</span>
        </div>
      )}
    </div>
  );
}
