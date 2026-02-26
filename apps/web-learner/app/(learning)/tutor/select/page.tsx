'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { TutorPersonaCard } from '../../../../components/tutor/tutor-persona-card';
import type { TutorPersona } from '../../../../lib/hooks/use-tutor-session';

const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';

export default function TutorSelectPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<TutorPersona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const res = await fetch(`${API_BASE}/personas`);
        if (res.ok) {
          const data = (await res.json()) as { personas: TutorPersona[] };
          setPersonas(data.personas);
        }
      } catch {
        // Use fallback personas if API unavailable
        setPersonas([
          { id: '1', slug: 'nova-math', name: 'Nova', subject: 'MATH', description: 'A curious space explorer who makes math feel like an adventure through the cosmos.', avatarAssetKey: 'nova_math.riv', personality: {}, sortOrder: 1 },
          { id: '2', slug: 'sage-ela', name: 'Sage', subject: 'ELA', description: 'A wise storyteller who brings reading and writing to life through imagination.', avatarAssetKey: 'sage_ela.riv', personality: {}, sortOrder: 2 },
          { id: '3', slug: 'spark-science', name: 'Spark', subject: 'SCIENCE', description: 'An energetic inventor who turns science into exciting experiments and discoveries.', avatarAssetKey: 'spark_science.riv', personality: {}, sortOrder: 3 },
          { id: '4', slug: 'chrono-history', name: 'Chrono', subject: 'HISTORY', description: 'A time-traveling explorer who makes history come alive with vivid stories from the past.', avatarAssetKey: 'chrono_history.riv', personality: {}, sortOrder: 4 },
          { id: '5', slug: 'pixel-coding', name: 'Pixel', subject: 'CODING', description: 'A friendly robot who teaches coding through games, puzzles, and creative projects.', avatarAssetKey: 'pixel_coding.riv', personality: {}, sortOrder: 5 },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadPersonas();
  }, []);

  const handleSelectPersona = (persona: TutorPersona) => {
    // Navigate to new session with this persona
    const params = new URLSearchParams({
      personaId: persona.id,
      subject: persona.subject,
    });
    router.push(`/tutor?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm text-indigo-600 mb-4">
          <Sparkles className="h-4 w-4" /> AI Tutors
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Tutor</h1>
        <p className="mt-2 text-gray-600">
          Pick a tutor to help you learn. Each tutor has their own personality and teaching style!
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <TutorPersonaCard
              key={persona.id}
              persona={persona}
              onSelect={handleSelectPersona}
            />
          ))}
        </div>
      )}
    </div>
  );
}
