'use client';

import { useState } from 'react';

interface SpeechExercisesProps {
  learnerId: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: string;
  category: string;
  icon: string;
  completed: boolean;
}

const EXERCISES: Exercise[] = [
  {
    id: 'breathing-basics',
    title: 'Breathing Basics',
    description: 'Practice deep breathing to support clear speech',
    difficulty: 'easy',
    duration: '3 min',
    category: 'Foundation',
    icon: '🌬️',
    completed: false,
  },
  {
    id: 'tongue-twisters',
    title: 'Tongue Twisters',
    description: 'Fun phrases to improve articulation speed',
    difficulty: 'medium',
    duration: '5 min',
    category: 'Articulation',
    icon: '👅',
    completed: false,
  },
  {
    id: 'vowel-sounds',
    title: 'Vowel Sounds',
    description: 'Practice clear vowel pronunciation',
    difficulty: 'easy',
    duration: '4 min',
    category: 'Phonemes',
    icon: '🔤',
    completed: true,
  },
  {
    id: 'consonant-blends',
    title: 'Consonant Blends',
    description: 'Practice bl, cl, fl, and other blends',
    difficulty: 'medium',
    duration: '6 min',
    category: 'Phonemes',
    icon: '🎯',
    completed: false,
  },
  {
    id: 'sentence-rhythm',
    title: 'Sentence Rhythm',
    description: 'Practice natural speech patterns and pacing',
    difficulty: 'hard',
    duration: '8 min',
    category: 'Fluency',
    icon: '🎵',
    completed: false,
  },
  {
    id: 'word-stress',
    title: 'Word Stress Patterns',
    description: 'Learn which syllables to emphasize',
    difficulty: 'medium',
    duration: '5 min',
    category: 'Prosody',
    icon: '💪',
    completed: true,
  },
];

export function SpeechExercises({ learnerId: _learnerId }: Readonly<SpeechExercisesProps>) {
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  const categories = ['all', ...new Set(EXERCISES.map((e) => e.category))];

  const filteredExercises =
    selectedCategory === 'all'
      ? exercises
      : exercises.filter((e) => e.category === selectedCategory);

  const completedCount = exercises.filter((e) => e.completed).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const startExercise = (exercise: Exercise) => {
    setActiveExercise(exercise);
  };

  const completeExercise = () => {
    if (activeExercise) {
      setExercises((prev) =>
        prev.map((e) => (e.id === activeExercise.id ? { ...e, completed: true } : e))
      );
      setActiveExercise(null);
    }
  };

  if (activeExercise) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-6xl">{activeExercise.icon}</span>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">{activeExercise.title}</h2>
          <p className="mt-2 text-slate-600">{activeExercise.description}</p>

          <div className="mt-8 rounded-lg bg-purple-50 p-6">
            <p className="text-lg text-purple-800">
              Follow the on-screen prompts and practice at your own pace.
              <br />
              Take breaks whenever you need them!
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => { setActiveExercise(null); }}
              className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 hover:bg-slate-50"
            >
              Back to Exercises
            </button>
            <button
              onClick={completeExercise}
              className="rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
            >
              Complete Exercise ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Today&apos;s Progress</h2>
            <p className="mt-1 text-purple-100">
              {completedCount} of {exercises.length} exercises completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {Math.round((completedCount / exercises.length) * 100)}%
            </div>
            <div className="text-purple-100">Complete</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-purple-400/30">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${(completedCount / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => { setSelectedCategory(category); }}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className={`rounded-xl border-2 p-6 transition-all hover:shadow-md ${
              exercise.completed
                ? 'border-green-200 bg-green-50'
                : 'border-slate-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{exercise.icon}</span>
              {exercise.completed && (
                <span className="rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                  ✓ Done
                </span>
              )}
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">{exercise.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{exercise.description}</p>

            <div className="mt-4 flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty}
              </span>
              <span className="text-xs text-slate-500">⏱️ {exercise.duration}</span>
            </div>

            <button
              onClick={() => { startExercise(exercise); }}
              className={`mt-4 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                exercise.completed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {exercise.completed ? 'Practice Again' : 'Start Exercise'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
