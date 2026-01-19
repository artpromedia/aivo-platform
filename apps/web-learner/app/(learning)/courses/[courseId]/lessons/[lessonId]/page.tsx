'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

// Mock lesson content data
const LESSONS: Record<string, Record<string, {
  id: string;
  title: string;
  type: 'video' | 'interactive' | 'quiz' | 'practice';
  courseTitle: string;
  content: {
    introduction: string;
    sections: Array<{
      title: string;
      content: string;
      example?: string;
    }>;
    tips: string[];
  };
  quiz?: Array<{
    question: string;
    options: string[];
    correct: number;
  }>;
}>> = {
  'math-101': {
    'lesson-1': {
      id: 'lesson-1',
      title: 'Multiplying Fractions',
      type: 'interactive',
      courseTitle: 'Math 5',
      content: {
        introduction: 'Multiplying fractions is easier than you might think! Unlike adding fractions, you don\'t need a common denominator. Let\'s learn how!',
        sections: [
          {
            title: '🎯 The Simple Rule',
            content: 'To multiply fractions, simply multiply the numerators together, and multiply the denominators together.',
            example: '1/2 × 3/4 = (1×3)/(2×4) = 3/8',
          },
          {
            title: '🍕 Real-World Example',
            content: 'Imagine you have half a pizza, and you want to give your friend 1/3 of your half. You\'d multiply: 1/2 × 1/3 = 1/6. Your friend gets 1/6 of the whole pizza!',
          },
          {
            title: '✨ Pro Tip: Simplify First',
            content: 'Before multiplying, look for numbers you can cancel. If a numerator and denominator share a common factor, divide them both by that factor first.',
            example: '2/3 × 3/4 = Cancel the 3s! = 2/1 × 1/4 = 2/4 = 1/2',
          },
        ],
        tips: [
          'Multiply straight across - no common denominators needed!',
          'Always simplify your final answer',
          'You can simplify before OR after multiplying',
          'A whole number is a fraction over 1 (like 3 = 3/1)',
        ],
      },
      quiz: [
        {
          question: 'What is 1/2 × 1/4?',
          options: ['1/8', '1/6', '2/6', '1/4'],
          correct: 0,
        },
        {
          question: 'What is 2/3 × 3/5?',
          options: ['6/15', '2/5', '5/8', '1/3'],
          correct: 1,
        },
        {
          question: 'When multiplying fractions, what do we do?',
          options: [
            'Find a common denominator first',
            'Multiply numerators and denominators straight across',
            'Add the numerators and denominators',
            'Flip the second fraction',
          ],
          correct: 1,
        },
      ],
    },
    'lesson-2': {
      id: 'lesson-2',
      title: 'Dividing Fractions',
      type: 'video',
      courseTitle: 'Math 5',
      content: {
        introduction: 'Dividing fractions uses a simple trick: "Keep, Change, Flip!" Let\'s master this technique.',
        sections: [
          {
            title: '🔄 Keep, Change, Flip',
            content: 'To divide fractions: KEEP the first fraction, CHANGE division to multiplication, FLIP the second fraction.',
            example: '1/2 ÷ 1/4 → 1/2 × 4/1 = 4/2 = 2',
          },
          {
            title: '🤔 Why Does This Work?',
            content: 'Dividing by a fraction is the same as multiplying by its reciprocal (flipped version). When you flip a fraction and multiply, you\'re finding how many times it fits into the other number.',
          },
        ],
        tips: [
          'Remember: Keep, Change, Flip!',
          'The first fraction stays the same',
          'Only flip the second fraction',
          'After flipping, multiply normally',
        ],
      },
      quiz: [
        {
          question: 'What is 1/2 ÷ 1/4?',
          options: ['1/8', '2', '4', '1/2'],
          correct: 1,
        },
        {
          question: 'What is the "flip" of 3/4?',
          options: ['4/3', '3/4', '1/4', '4/4'],
          correct: 0,
        },
      ],
    },
  },
  'science-101': {
    'lesson-1': {
      id: 'lesson-1',
      title: 'The Water Cycle',
      type: 'interactive',
      courseTitle: 'Science 5',
      content: {
        introduction: 'The water cycle is Earth\'s way of recycling water! It\'s been going on for billions of years, and the same water that dinosaurs drank is the water we use today!',
        sections: [
          {
            title: '☀️ Evaporation',
            content: 'The sun heats water in oceans, lakes, and rivers. This energy causes water to change from liquid to water vapor (a gas) and rise into the air. Plants also release water vapor through transpiration.',
          },
          {
            title: '☁️ Condensation',
            content: 'As water vapor rises, it cools down. Cool air can\'t hold as much moisture, so the vapor condenses into tiny water droplets. Millions of these droplets form clouds!',
          },
          {
            title: '🌧️ Precipitation',
            content: 'When water droplets in clouds combine and become heavy enough, they fall back to Earth as precipitation - rain, snow, sleet, or hail depending on the temperature.',
          },
          {
            title: '💧 Collection',
            content: 'Water collects in oceans, rivers, lakes, and underground. Some soaks into the ground (infiltration) where it\'s stored in aquifers. Then the cycle begins again!',
          },
        ],
        tips: [
          'The water cycle has no beginning or end - it\'s continuous!',
          'About 97% of Earth\'s water is in the oceans',
          'Water can be a solid, liquid, or gas',
          'The sun provides the energy that drives the water cycle',
        ],
      },
      quiz: [
        {
          question: 'What causes evaporation?',
          options: ['Wind', 'Heat from the sun', 'Gravity', 'The moon'],
          correct: 1,
        },
        {
          question: 'What forms when water vapor condenses?',
          options: ['Rain', 'Snow', 'Clouds', 'Rivers'],
          correct: 2,
        },
        {
          question: 'Which is NOT a form of precipitation?',
          options: ['Rain', 'Evaporation', 'Snow', 'Hail'],
          correct: 1,
        },
      ],
    },
  },
};

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  
  const [currentSection, setCurrentSection] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const courseLessons = LESSONS[courseId];
  const lesson = courseLessons?.[lessonId];

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">📖</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Lesson Not Found</h1>
        <p className="text-slate-600 mb-6">This lesson doesn&apos;t exist or has been moved.</p>
        <Link
          href="/courses"
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  const totalSections = lesson.content.sections.length;
  const isLastSection = currentSection >= totalSections - 1;

  const handleNext = () => {
    if (isLastSection) {
      if (lesson.quiz) {
        setShowQuiz(true);
      } else {
        // Complete lesson
        router.push(`/courses/${courseId}`);
      }
    } else {
      setCurrentSection((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (showQuiz) {
      setShowQuiz(false);
      setQuizSubmitted(false);
    } else if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
  };

  const getQuizScore = () => {
    if (!lesson.quiz) return 0;
    let correct = 0;
    lesson.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    return Math.round((correct / lesson.quiz.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/courses" className="hover:text-blue-600">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-blue-600">{lesson.courseTitle}</Link>
        <span>/</span>
        <span className="text-slate-900">{lesson.title}</span>
      </nav>

      {/* Progress Bar */}
      <div className="rounded-xl bg-slate-100 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600">
            {showQuiz ? 'Quiz' : `Section ${currentSection + 1} of ${totalSections}`}
          </span>
          <span className="font-medium text-blue-600">
            {Math.round(((showQuiz ? totalSections : currentSection + 1) / (totalSections + (lesson.quiz ? 1 : 0))) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${((showQuiz ? totalSections : currentSection + 1) / (totalSections + (lesson.quiz ? 1 : 0))) * 100}%` }}
          />
        </div>
      </div>

      {/* Lesson Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{lesson.title}</h1>
        
        {!showQuiz ? (
          <>
            {/* Introduction (only on first section) */}
            {currentSection === 0 && (
              <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-blue-800">{lesson.content.introduction}</p>
              </div>
            )}

            {/* Current Section */}
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-50 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  {lesson.content.sections[currentSection].title}
                </h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  {lesson.content.sections[currentSection].content}
                </p>
                {lesson.content.sections[currentSection].example && (
                  <div className="rounded-lg bg-white border-2 border-purple-200 p-4 mt-4">
                    <span className="text-sm font-medium text-purple-600">Example:</span>
                    <p className="mt-2 font-mono text-lg text-slate-800">
                      {lesson.content.sections[currentSection].example}
                    </p>
                  </div>
                )}
              </div>

              {/* Tips (only on last section) */}
              {isLastSection && (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-6">
                  <h3 className="font-bold text-yellow-800 mb-3">💡 Remember These Tips:</h3>
                  <ul className="space-y-2">
                    {lesson.content.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-yellow-700">
                        <span className="text-yellow-500">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Quiz Section */
          <div className="space-y-6">
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 mb-6">
              <h2 className="font-bold text-purple-800">📝 Quick Check!</h2>
              <p className="text-purple-600">Let&apos;s see what you learned!</p>
            </div>

            {quizSubmitted ? (
              /* Quiz Results */
              <div className="text-center py-8">
                <div className="text-6xl mb-4">
                  {getQuizScore() >= 80 ? '🎉' : getQuizScore() >= 60 ? '👍' : '💪'}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  You scored {getQuizScore()}%!
                </h3>
                <p className="text-slate-600 mb-6">
                  {getQuizScore() >= 80 
                    ? 'Excellent work! You\'ve mastered this lesson!' 
                    : getQuizScore() >= 60 
                      ? 'Good job! Review the material to improve.' 
                      : 'Keep practicing! Try reviewing the lesson again.'}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizAnswers({});
                      setShowQuiz(false);
                      setCurrentSection(0);
                    }}
                    className="rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Review Lesson
                  </button>
                  <Link
                    href={`/courses/${courseId}`}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
                  >
                    Continue to Course →
                  </Link>
                </div>
              </div>
            ) : (
              /* Quiz Questions */
              <>
                {lesson.quiz?.map((q, i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-6">
                    <h3 className="font-bold text-slate-900 mb-4">
                      {i + 1}. {q.question}
                    </h3>
                    <div className="space-y-2">
                      {q.options.map((option, j) => (
                        <button
                          key={j}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [i]: j }))}
                          className={`w-full text-left rounded-lg p-4 transition ${
                            quizAnswers[i] === j
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length < (lesson.quiz?.length ?? 0)}
                    className="rounded-xl bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answers ✓
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      {!quizSubmitted && (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentSection === 0 && !showQuiz}
            className="rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          {!showQuiz && (
            <button
              onClick={handleNext}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              {isLastSection ? (lesson.quiz ? 'Take Quiz →' : 'Complete Lesson ✓') : 'Next →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
