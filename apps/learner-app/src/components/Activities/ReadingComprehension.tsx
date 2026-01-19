'use client';

import { useState, useRef, useEffect } from 'react';
import { ReadingPassage, ComprehensionQuestion, ActivityResult } from './types';

interface Props {
  passage: ReadingPassage;
  onComplete: (result: ActivityResult) => void;
  showTimer?: boolean;
}

export function ReadingComprehension({ passage, onComplete, showTimer = true }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means reading phase
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ questionId: string; correct: boolean; userAnswer: string }[]>([]);
  const startTimeRef = useRef(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = passage.questions[currentQuestionIndex];

  const handleStartQuestions = () => {
    setCurrentQuestionIndex(0);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < passage.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate results
      const questionResults = passage.questions.map(q => ({
        questionId: q.id,
        correct: answers[q.id]?.toLowerCase() === q.correctAnswer.toLowerCase(),
        userAnswer: answers[q.id] || '',
      }));
      setResults(questionResults);
      setShowResults(true);
    }
  };

  const handleComplete = () => {
    const correctCount = results.filter(r => r.correct).length;
    const totalQuestions = passage.questions.length;
    const accuracy = (correctCount / totalQuestions) * 100;

    onComplete({
      correct: accuracy >= 70,
      attempts: 1,
      timeSpent: Date.now() - startTimeRef.current,
      score: Math.round(accuracy),
    });
  };

  const renderQuestion = (question: ComprehensionQuestion) => {
    const selectedAnswer = answers[question.id];

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-800">{question.text}</h4>

        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-600 mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            ))}
          </div>
        )}

        {question.type === 'true_false' && (
          <div className="flex gap-4">
            {['True', 'False'].map(option => (
              <button
                key={option}
                onClick={() => handleAnswer(question.id, option)}
                className={`flex-1 p-4 rounded-lg border-2 font-medium transition-colors ${
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {question.type === 'short_answer' && (
          <textarea
            value={selectedAnswer || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            className="w-full p-4 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="Type your answer here..."
          />
        )}
      </div>
    );
  };

  // Reading phase
  if (currentQuestionIndex === -1) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">{passage.title}</h3>
          {showTimer && (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            Grade {passage.gradeLevel} • {passage.questions.length} Questions
          </span>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {passage.content}
            </p>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          Read the passage carefully, then answer the questions. You can refer back to the passage while answering.
        </p>

        <button
          onClick={handleStartQuestions}
          className="w-full py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          I'm Ready to Answer Questions
        </button>
      </div>
    );
  }

  // Results phase
  if (showResults) {
    const correctCount = results.filter(r => r.correct).length;
    const totalQuestions = passage.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            percentage >= 70 ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            <span className={`text-4xl font-bold ${
              percentage >= 70 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {percentage}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
          </h3>
          <p className="text-gray-600">
            You got {correctCount} out of {totalQuestions} questions correct.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {passage.questions.map((question, index) => {
            const result = results.find(r => r.questionId === question.id);
            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border-2 ${
                  result?.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                    result?.correct ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {result?.correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">
                      {index + 1}. {question.text}
                    </p>
                    {!result?.correct && (
                      <p className="text-sm text-gray-600">
                        Correct answer: <span className="font-medium text-green-700">{question.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleComplete}
          className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // Questions phase
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {passage.questions.length}
          </span>
          <h3 className="text-xl font-bold text-gray-800">{passage.title}</h3>
        </div>
        {showTimer && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full mb-6">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / passage.questions.length) * 100}%` }}
        />
      </div>

      {/* Collapsible passage reference */}
      <details className="mb-6 bg-gray-50 rounded-lg">
        <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:text-gray-900">
          📖 View Passage
        </summary>
        <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed">
          {passage.content}
        </div>
      </details>

      {/* Current question */}
      <div className="mb-6">
        {renderQuestion(currentQuestion)}
      </div>

      <button
        onClick={handleNextQuestion}
        disabled={!answers[currentQuestion.id]}
        className="w-full py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {currentQuestionIndex < passage.questions.length - 1 ? 'Next Question' : 'See Results'}
      </button>
    </div>
  );
}

export default ReadingComprehension;
