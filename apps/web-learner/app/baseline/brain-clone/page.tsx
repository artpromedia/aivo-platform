'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// BRAIN CLONING VISUALIZATION & PARENT CONSENT PAGE
// ══════════════════════════════════════════════════════════════════════════════

type CloningPhase = 'analyzing' | 'building' | 'personalizing' | 'ready' | 'consent';

interface NeuronNode {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  connections: number[];
}

export default function BrainClonePage() {
  const router = useRouter();

  // Cloning phases
  const [phase, setPhase] = useState<CloningPhase>('analyzing');
  const [progress, setProgress] = useState(0);
  const [neurons, setNeurons] = useState<NeuronNode[]>([]);
  const [pulsingConnections, setPulsingConnections] = useState<number[]>([]);

  // Consent state
  const [isParentPresent, setIsParentPresent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Animation canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Phase messages
  const phaseMessages: Record<CloningPhase, { title: string; message: string; emoji: string }> = {
    analyzing: {
      title: 'Analyzing Your Responses',
      message: 'Looking at how you answered each question...',
      emoji: '🔍',
    },
    building: {
      title: 'Building Your Brain',
      message: 'Creating neural pathways just for you...',
      emoji: '🧠',
    },
    personalizing: {
      title: 'Personalizing Your Experience',
      message: 'Adding your unique learning style...',
      emoji: '✨',
    },
    ready: {
      title: 'Your Learning Brain is Ready!',
      message: 'We just need one more thing...',
      emoji: '🎉',
    },
    consent: {
      title: 'Parent Approval Needed',
      message: 'A parent needs to approve activating your personalized learning brain.',
      emoji: '👨‍👩‍👧',
    },
  };

  // Generate neurons for visualization
  useEffect(() => {
    const generateNeurons = () => {
      const newNeurons: NeuronNode[] = [];
      const nodeCount = 20;

      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const connections: number[] = [];

        // Connect to 2-3 nearby neurons
        for (let j = 0; j < 3; j++) {
          const targetIdx = (i + j + 1) % nodeCount;
          if (Math.random() > 0.3) {
            connections.push(targetIdx);
          }
        }

        newNeurons.push({
          id: i,
          x: 150 + Math.cos(angle) * radius,
          y: 150 + Math.sin(angle) * radius,
          size: 6 + Math.random() * 4,
          opacity: 0.3 + Math.random() * 0.7,
          connections,
        });
      }

      // Add central neurons
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const radius = 20 + Math.random() * 20;
        newNeurons.push({
          id: nodeCount + i,
          x: 150 + Math.cos(angle) * radius,
          y: 150 + Math.sin(angle) * radius,
          size: 8 + Math.random() * 4,
          opacity: 0.8,
          connections: [Math.floor(Math.random() * nodeCount)],
        });
      }

      setNeurons(newNeurons);
    };

    generateNeurons();
  }, []);

  // Animate pulsing connections
  useEffect(() => {
    if (phase === 'analyzing' || phase === 'building' || phase === 'personalizing') {
      const interval = setInterval(() => {
        setPulsingConnections((prev) => {
          const newPulsing = [...prev];
          // Add a new random connection
          if (Math.random() > 0.3) {
            newPulsing.push(Math.floor(Math.random() * neurons.length));
          }
          // Remove old ones
          if (newPulsing.length > 5) {
            newPulsing.shift();
          }
          return newPulsing;
        });
      }, 500);

      return () => {
        clearInterval(interval);
      };
    }
  }, [phase, neurons.length]);

  // Progress through phases
  useEffect(() => {
    if (phase === 'analyzing') {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setPhase('building');
            return 0;
          }
          return prev + 2;
        });
      }, 60);
      return () => {
        clearInterval(timer);
      };
    }

    if (phase === 'building') {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setPhase('personalizing');
            return 0;
          }
          return prev + 1.5;
        });
      }, 60);
      return () => {
        clearInterval(timer);
      };
    }

    if (phase === 'personalizing') {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setPhase('ready');
            return 100;
          }
          return prev + 2.5;
        });
      }, 60);
      return () => {
        clearInterval(timer);
      };
    }
  }, [phase]);

  // Auto-advance from ready to consent after delay
  useEffect(() => {
    if (phase === 'ready') {
      const timer = setTimeout(() => {
        setPhase('consent');
      }, 2000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [phase]);

  // Handle consent and activation
  const handleActivateBrain = async () => {
    if (!consentGiven) return;

    setIsActivating(true);

    try {
      // Call API to finalize brain creation
      await fetch('/api/baseline/activate-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
        }),
      });

      // Navigate to dashboard
      router.push('/baseline/complete');
    } catch (error) {
      console.error('Failed to activate brain:', error);
      // Still proceed to dashboard
      router.push('/baseline/complete');
    }
  };

  // Render brain visualization
  const renderBrainVisualization = () => (
    <div className="relative w-[300px] h-[300px] mx-auto">
      {/* SVG Brain visualization */}
      <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0">
        {/* Connections */}
        {neurons.map((neuron) =>
          neuron.connections.map((targetId) => {
            const target = neurons[targetId];
            if (!target) return null;
            const isPulsing = pulsingConnections.includes(neuron.id);
            return (
              <line
                key={`${neuron.id}-${targetId}`}
                x1={neuron.x}
                y1={neuron.y}
                x2={target.x}
                y2={target.y}
                stroke={isPulsing ? 'var(--aivo-brand-primary)' : 'var(--aivo-purple-200)'}
                strokeWidth={isPulsing ? 2 : 1}
                strokeOpacity={isPulsing ? 0.8 : 0.4}
                className={isPulsing ? 'animate-pulse' : ''}
              />
            );
          })
        )}

        {/* Neurons */}
        {neurons.map((neuron) => {
          const isPulsing = pulsingConnections.includes(neuron.id);
          return (
            <circle
              key={neuron.id}
              cx={neuron.x}
              cy={neuron.y}
              r={neuron.size}
              fill={isPulsing ? 'var(--aivo-brand-primary)' : 'var(--aivo-teal-400)'}
              opacity={isPulsing ? 1 : neuron.opacity}
              className={isPulsing ? 'animate-ping' : ''}
            />
          );
        })}

        {/* Central brain glow */}
        <defs>
          <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--aivo-brand-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--aivo-brand-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx="150"
          cy="150"
          r="50"
          fill="url(#brainGlow)"
          className={phase !== 'consent' && phase !== 'ready' ? 'animate-pulse' : ''}
        />
      </svg>

      {/* Center brain emoji */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`text-7xl ${phase !== 'consent' && phase !== 'ready' ? 'animate-bounce' : ''}`}
        >
          🧠
        </div>
      </div>
    </div>
  );

  // Render progress bar
  const renderProgressBar = () => (
    <div className="w-full max-w-md mx-auto mt-8">
      <div className="flex justify-between text-sm text-[var(--aivo-neutral-500)] mb-2">
        <span>{phaseMessages[phase].title}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-4 bg-[var(--aivo-purple-100)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  // Render consent form
  const renderConsentForm = () => (
    <div className="mt-8 bg-white rounded-2xl p-6 border-2 border-[var(--aivo-purple-200)] max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-[var(--aivo-brand-navy)] mb-4 flex items-center gap-2">
        <span className="text-2xl">🔐</span>
        Parent Consent Required
      </h3>

      <div className="space-y-4">
        <p className="text-[var(--aivo-neutral-600)] text-sm">
          AIVO has created a personalized learning profile for your child based on their assessment.
          This &quot;learning brain&quot; will help tailor lessons to their unique needs and
          learning style.
        </p>

        <div className="bg-[var(--aivo-teal-50)] rounded-xl p-4">
          <h4 className="font-medium text-[var(--aivo-brand-navy)] mb-2">What this means:</h4>
          <ul className="text-sm text-[var(--aivo-neutral-600)] space-y-1">
            <li>✅ Lessons adapted to your child&apos;s pace</li>
            <li>✅ Content matching their interests</li>
            <li>✅ Support for their learning challenges</li>
            <li>✅ Progress tracking for parents</li>
          </ul>
        </div>

        {/* Parent verification */}
        <label className="flex items-start gap-3 p-4 bg-[var(--aivo-purple-50)] rounded-xl cursor-pointer hover:bg-[var(--aivo-purple-100)] transition-colors">
          <input
            type="checkbox"
            checked={isParentPresent}
            onChange={(e) => {
              setIsParentPresent(e.target.checked);
            }}
            className="mt-1 w-5 h-5 rounded border-2 border-[var(--aivo-neutral-300)] text-[var(--aivo-brand-primary)] focus:ring-[var(--aivo-brand-primary)]"
          />
          <div>
            <p className="font-medium text-[var(--aivo-brand-navy)]">I am a parent/guardian</p>
            <p className="text-sm text-[var(--aivo-neutral-500)]">
              I confirm I am the parent or legal guardian of this learner.
            </p>
          </div>
        </label>

        {/* Consent checkbox */}
        <label
          className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors ${
            isParentPresent
              ? 'bg-[var(--aivo-purple-50)] hover:bg-[var(--aivo-purple-100)]'
              : 'bg-[var(--aivo-neutral-100)] opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              if (isParentPresent) setConsentGiven(e.target.checked);
            }}
            disabled={!isParentPresent}
            className="mt-1 w-5 h-5 rounded border-2 border-[var(--aivo-neutral-300)] text-[var(--aivo-brand-primary)] focus:ring-[var(--aivo-brand-primary)] disabled:opacity-50"
          />
          <div>
            <p className="font-medium text-[var(--aivo-brand-navy)]">
              I consent to creating this learning profile
            </p>
            <p className="text-sm text-[var(--aivo-neutral-500)]">
              I understand AIVO will use assessment data to personalize my child&apos;s learning
              experience.
            </p>
          </div>
        </label>

        {/* Activate button */}
        <button
          onClick={handleActivateBrain}
          disabled={!consentGiven || isActivating}
          className={`w-full py-4 px-6 text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2
            ${
              consentGiven
                ? 'bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)] text-white hover:opacity-90'
                : 'bg-[var(--aivo-neutral-200)] text-[var(--aivo-neutral-400)] cursor-not-allowed'
            }`}
        >
          {isActivating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Activating...
            </>
          ) : (
            <>
              <span>🧠</span>
              Activate Learning Brain
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--aivo-teal-50)] to-[var(--aivo-purple-50)] flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
          <Image src="/images/aivo-logo-horizontal-purple.svg" alt="AIVO" width={100} height={32} />
          <h1 className="text-xl font-bold text-[var(--aivo-brand-navy)]">
            Creating Your Learning Brain
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Brain visualization */}
          <div className="mb-8">{renderBrainVisualization()}</div>

          {/* Phase message */}
          <div className="mb-6">
            <span className="text-4xl mb-4 block">{phaseMessages[phase].emoji}</span>
            <h2 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-2">
              {phaseMessages[phase].title}
            </h2>
            <p className="text-lg text-[var(--aivo-neutral-600)]">{phaseMessages[phase].message}</p>
          </div>

          {/* Progress bar (only during building phases) */}
          {(phase === 'analyzing' || phase === 'building' || phase === 'personalizing') &&
            renderProgressBar()}

          {/* Ready celebration */}
          {phase === 'ready' && (
            <div className="flex justify-center gap-2">
              <div className="text-4xl animate-bounce" style={{ animationDelay: '0ms' }}>
                🎉
              </div>
              <div className="text-4xl animate-bounce" style={{ animationDelay: '100ms' }}>
                🧠
              </div>
              <div className="text-4xl animate-bounce" style={{ animationDelay: '200ms' }}>
                ✨
              </div>
            </div>
          )}

          {/* Consent form */}
          {phase === 'consent' && renderConsentForm()}
        </div>
      </div>
    </div>
  );
}
