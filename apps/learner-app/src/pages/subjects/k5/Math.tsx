'use client';

import { useEffect, useState } from 'react';
import { SubjectTemplate } from '@/components/SubjectTemplate';
import { SubjectEngine } from '@/systems/subjects/SubjectEngine';

interface Lesson {
  id: string;
  title: string;
  description: string;
  progress: number;
  duration: string;
  type: 'video' | 'interactive' | 'practice' | 'game';
}

export function K5Math() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const engine = new SubjectEngine();
        const learnerId = localStorage.getItem('user_id') || '';
        const content = await engine.getSubjectContent('K5', 'math', learnerId);
        setLessons(content.lessons as unknown as Lesson[]);
      } catch (error) {
        console.error('Failed to load content:', error);
        // Use placeholder lessons
        setLessons([
          { id: '1', title: 'Counting to 100', description: 'Learn to count numbers from 1 to 100!', progress: 100, duration: '10 min', type: 'interactive' },
          { id: '2', title: 'Addition Fun', description: 'Add numbers together with fun games!', progress: 75, duration: '15 min', type: 'game' },
          { id: '3', title: 'Subtraction Adventure', description: 'Take away numbers like a pro!', progress: 50, duration: '15 min', type: 'interactive' },
          { id: '4', title: 'Shapes All Around', description: 'Discover circles, squares, and triangles!', progress: 25, duration: '12 min', type: 'video' },
          { id: '5', title: 'Telling Time', description: 'Learn to read clocks and tell time!', progress: 0, duration: '20 min', type: 'practice' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  return (
    <SubjectTemplate
      subject="Math"
      gradeLevel="K-5"
      icon="🔢"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500" style={{ width: '45%' }} />
              </div>
              <span className="text-lg font-bold text-blue-600">45%</span>
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {lesson.type === 'video' && '🎬'}
                      {lesson.type === 'interactive' && '🎮'}
                      {lesson.type === 'practice' && '✏️'}
                      {lesson.type === 'game' && '🎯'}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      {lesson.type}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{lesson.duration}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${lesson.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{lesson.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SubjectTemplate>
  );
}

export default K5Math;
