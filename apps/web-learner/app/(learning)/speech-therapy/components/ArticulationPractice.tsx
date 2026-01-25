'use client';

import { useState } from 'react';

interface ArticulationPracticeProps {
  learnerId: string;
}

interface Phoneme {
  id: string;
  sound: string;
  symbol: string;
  examples: string[];
  position: 'initial' | 'medial' | 'final';
  difficulty: number;
  mastered: boolean;
}

const PHONEMES: Phoneme[] = [
  { id: 's-initial', sound: 'S', symbol: '/s/', examples: ['sun', 'soap', 'sing'], position: 'initial', difficulty: 1, mastered: true },
  { id: 's-medial', sound: 'S', symbol: '/s/', examples: ['listen', 'missing', 'lesson'], position: 'medial', difficulty: 2, mastered: false },
  { id: 'r-initial', sound: 'R', symbol: '/r/', examples: ['run', 'red', 'rain'], position: 'initial', difficulty: 2, mastered: false },
  { id: 'r-medial', sound: 'R', symbol: '/r/', examples: ['carrot', 'mirror', 'orange'], position: 'medial', difficulty: 3, mastered: false },
  { id: 'l-initial', sound: 'L', symbol: '/l/', examples: ['love', 'lamp', 'lion'], position: 'initial', difficulty: 1, mastered: true },
  { id: 'th-initial', sound: 'TH', symbol: '/θ/', examples: ['think', 'three', 'thumb'], position: 'initial', difficulty: 3, mastered: false },
  { id: 'ch-initial', sound: 'CH', symbol: '/tʃ/', examples: ['chair', 'cheese', 'child'], position: 'initial', difficulty: 2, mastered: false },
  { id: 'sh-initial', sound: 'SH', symbol: '/ʃ/', examples: ['ship', 'shoe', 'shell'], position: 'initial', difficulty: 2, mastered: true },
];

export function ArticulationPractice({ learnerId: _learnerId }: Readonly<ArticulationPracticeProps>) {
  const [phonemes, setPhonemes] = useState<Phoneme[]>(PHONEMES);
  const [selectedPhoneme, setSelectedPhoneme] = useState<Phoneme | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const masteredCount = phonemes.filter((p) => p.mastered).length;

  const startPractice = (phoneme: Phoneme) => {
    setSelectedPhoneme(phoneme);
    setCurrentWordIndex(0);
  };

  const nextWord = () => {
    if (selectedPhoneme && currentWordIndex < selectedPhoneme.examples.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
    } else {
      // Mark as mastered after practicing all words
      if (selectedPhoneme) {
        setPhonemes((prev) =>
          prev.map((p) => (p.id === selectedPhoneme.id ? { ...p, mastered: true } : p))
        );
      }
      setSelectedPhoneme(null);
      setCurrentWordIndex(0);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In production, this would use the Web Audio API
  };

  if (selectedPhoneme) {
    const currentWord = selectedPhoneme.examples[currentWordIndex];
    const progress = ((currentWordIndex + 1) / selectedPhoneme.examples.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Progress Bar */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600">Practice Progress</span>
            <span className="font-medium text-purple-600">
              {currentWordIndex + 1} of {selectedPhoneme.examples.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Practice Card */}
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-lg text-slate-500">
            Practicing: <span className="font-bold text-purple-600">{selectedPhoneme.sound}</span> sound
          </div>

          <div className="my-8">
            <div className="mb-2 text-6xl font-bold text-slate-900">{currentWord}</div>
            <div className="text-xl text-slate-500">{selectedPhoneme.symbol}</div>
          </div>

          {/* Visual Mouth Position Guide */}
          <div className="mx-auto mb-6 max-w-md rounded-lg bg-purple-50 p-4">
            <p className="text-sm text-purple-800">
              <strong>Tip:</strong> Place your tongue behind your top teeth and push air through.
              Watch yourself in a mirror!
            </p>
          </div>

          {/* Recording Button */}
          <button
            onClick={toggleRecording}
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-all ${
              isRecording
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
            }`}
          >
            <span className="text-3xl">{isRecording ? '⏹️' : '🎙️'}</span>
          </button>
          <p className="mb-6 text-sm text-slate-500">
            {isRecording ? 'Recording... Tap to stop' : 'Tap to record yourself'}
          </p>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => { setSelectedPhoneme(null); }}
              className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={nextWord}
              className="rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
            >
              {currentWordIndex < selectedPhoneme.examples.length - 1 ? 'Next Word →' : 'Complete ✓'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
        <h2 className="text-xl font-semibold">Articulation Practice</h2>
        <p className="mt-1 text-orange-100">
          Practice specific sounds to improve your pronunciation
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="rounded-lg bg-white/20 px-4 py-2">
            <span className="text-2xl font-bold">{masteredCount}</span>
            <span className="ml-2 text-sm">sounds mastered</span>
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2">
            <span className="text-2xl font-bold">{phonemes.length - masteredCount}</span>
            <span className="ml-2 text-sm">to practice</span>
          </div>
        </div>
      </div>

      {/* Phoneme Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {phonemes.map((phoneme) => (
          <button
            key={phoneme.id}
            onClick={() => { startPractice(phoneme); }}
            className={`rounded-xl border-2 p-6 text-left transition-all hover:shadow-md ${
              phoneme.mastered
                ? 'border-green-200 bg-green-50'
                : 'border-slate-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="text-3xl font-bold text-slate-900">{phoneme.sound}</div>
              {phoneme.mastered && (
                <span className="rounded-full bg-green-500 px-2 py-1 text-xs text-white">✓</span>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-500">{phoneme.symbol}</div>
            <div className="mt-3 text-xs text-slate-400">
              Position: {phoneme.position}
            </div>
            <div className="mt-2 flex">
              {(['level-1', 'level-2', 'level-3'] as const).map((level, levelIndex) => (
                <span
                  key={`${phoneme.id}-${level}`}
                  className={`mr-1 h-2 w-2 rounded-full ${
                    levelIndex < phoneme.difficulty ? 'bg-purple-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
