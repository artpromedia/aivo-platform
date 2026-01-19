'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngine, generateMathItems, type GameResult } from '@/lib/GameEngine';
import type { MathRaceGameProps } from './types';
import { GameScoreDisplay } from './GameScoreDisplay';
import { GameResults } from './GameResults';

interface MathProblem {
  id: string;
  question: string;
  answer: number;
  options: number[];
  points: number;
}

export function MathRaceGame({
  gameId,
  learnerId,
  difficulty,
  level = 1,
  questionCount = 10,
  onComplete,
  onExit,
}: MathRaceGameProps) {
  const [engine] = useState(() => new GameEngine());
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [result, setResult] = useState<GameResult | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate problems
  useEffect(() => {
    const difficultyLevel = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    const actualLevel = Math.max(level, difficultyLevel);
    const items = generateMathItems(actualLevel, questionCount);

    const mathProblems: MathProblem[] = items.map(item => {
      const content = item.content as { question: string; answer: number };
      const wrongAnswers = generateWrongAnswers(content.answer, 3);
      const options = [content.answer, ...wrongAnswers].sort(() => Math.random() - 0.5);

      return {
        id: item.id,
        question: content.question,
        answer: content.answer,
        options,
        points: item.points,
      };
    });

    setProblems(mathProblems);
  }, [level, questionCount, difficulty]);

  // Generate plausible wrong answers
  const generateWrongAnswers = (correct: number, count: number): number[] => {
    const wrong: number[] = [];
    const used = new Set([correct]);

    while (wrong.length < count) {
      // Generate answers that are close to the correct answer
      const offset = Math.floor(Math.random() * 10) - 5;
      const candidate = correct + offset || correct + (Math.random() > 0.5 ? 1 : -1);

      if (!used.has(candidate) && candidate >= 0) {
        wrong.push(candidate);
        used.add(candidate);
      }
    }

    return wrong;
  };

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleGameComplete('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Start game
  const startGame = async () => {
    await engine.startGame({
      id: gameId,
      type: 'math_race',
      title: 'Math Race',
      description: 'Solve math problems fast!',
      difficulty,
      timeLimit: 60,
      targetScore: 100,
    }, learnerId);

    engine.play();
    setGameState('playing');
    setTimeRemaining(60);
  };

  // Handle answer selection
  const handleAnswer = useCallback((answer: number) => {
    if (selectedAnswer !== null || gameState !== 'playing') return;

    setSelectedAnswer(answer);
    const currentProblem = problems[currentIndex];
    const isCorrect = answer === currentProblem.answer;

    if (isCorrect) {
      // Correct answer
      const timeBonus = Math.floor(timeRemaining / 10);
      const points = currentProblem.points + timeBonus + streak * 2;

      engine.submitAnswer(currentProblem.id, answer, true, points);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      setFeedback({ correct: true, message: 'Correct! 🎉' });
    } else {
      // Wrong answer
      engine.submitAnswer(currentProblem.id, answer, false, 0);
      setStreak(0);
      setLives(prev => prev - 1);
      setFeedback({ correct: false, message: `Oops! It was ${currentProblem.answer}` });
    }

    // Move to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null);
      setFeedback(null);

      if (lives <= 1 && !isCorrect) {
        handleGameComplete('failed');
      } else if (currentIndex >= problems.length - 1) {
        handleGameComplete('complete');
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 1000);
  }, [selectedAnswer, gameState, problems, currentIndex, timeRemaining, streak, engine, lives]);

  // Handle game complete
  const handleGameComplete = async (reason: 'complete' | 'failed' | 'timeout') => {
    if (timerRef.current) clearInterval(timerRef.current);

    const gameResult = await engine.endGame(reason === 'timeout' ? 'failed' : reason);
    setResult(gameResult);
    setGameState('complete');
    onComplete(gameResult);
  };

  // Render intro
  if (gameState === 'intro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-green-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <span className="text-7xl mb-4 block">🏎️</span>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Math Race</h1>
          <p className="text-gray-600 mb-6">
            Solve {questionCount} math problems before time runs out!
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-800 mb-2">Rules:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>You have 60 seconds total</li>
              <li>Faster answers = more points</li>
              <li>Build streaks for bonus points</li>
              <li>You have 3 lives</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onExit}
              className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Start Race!
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render results
  if (gameState === 'complete' && result) {
    return (
      <GameResults
        result={result}
        onPlayAgain={() => {
          setGameState('intro');
          setScore(0);
          setStreak(0);
          setLives(3);
          setCurrentIndex(0);
          setTimeRemaining(60);
        }}
        onExit={onExit}
      />
    );
  }

  // Render game
  const currentProblem = problems[currentIndex];
  const progress = ((currentIndex + 1) / problems.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <GameScoreDisplay
          score={score}
          streak={streak}
          lives={lives}
          timeRemaining={timeRemaining}
        />
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Question {currentIndex + 1} of {problems.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Problem card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentProblem?.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Question */}
            <div className="text-center mb-8">
              <p className="text-5xl font-bold text-gray-800 mb-4">
                {currentProblem?.question} = ?
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              {currentProblem?.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentProblem.answer;
                const showResult = selectedAnswer !== null;

                let bgColor = 'bg-gray-100 hover:bg-blue-100';
                if (showResult) {
                  if (isCorrect) {
                    bgColor = 'bg-green-500';
                  } else if (isSelected && !isCorrect) {
                    bgColor = 'bg-red-500';
                  } else {
                    bgColor = 'bg-gray-100';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                    whileTap={{ scale: 0.95 }}
                    className={`p-6 rounded-xl text-3xl font-bold transition-colors ${bgColor} ${
                      showResult && (isCorrect || isSelected) ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-6 p-4 rounded-xl text-center font-semibold ${
                    feedback.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {feedback.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Quit button */}
      <div className="max-w-lg mx-auto mt-6 text-center">
        <button
          onClick={onExit}
          className="px-4 py-2 text-gray-500 hover:text-gray-700"
        >
          Quit Game
        </button>
      </div>
    </div>
  );
}
