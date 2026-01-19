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
  type: 'movement' | 'sports' | 'fitness' | 'health';
}

export function K5PE() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const engine = new SubjectEngine();
        const learnerId = localStorage.getItem('user_id') || '';
        const content = await engine.getSubjectContent('K5', 'pe', learnerId);
        setLessons(content.lessons as unknown as Lesson[]);
      } catch (error) {
        console.error('Failed to load content:', error);
        setLessons([
          { id: '1', title: 'Warm Up Fun', description: 'Get your body ready to move!', progress: 100, duration: '8 min', type: 'fitness' },
          { id: '2', title: 'Ball Skills', description: 'Learn to throw, catch, and bounce!', progress: 75, duration: '15 min', type: 'sports' },
          { id: '3', title: 'Dance Along', description: 'Move to the music!', progress: 60, duration: '12 min', type: 'movement' },
          { id: '4', title: 'Balance Challenge', description: 'Stand on one foot and more!', progress: 40, duration: '10 min', type: 'fitness' },
          { id: '5', title: 'Healthy Habits', description: 'Learn about staying healthy!', progress: 20, duration: '10 min', type: 'health' },
          { id: '6', title: 'Team Games', description: 'Play games with friends!', progress: 0, duration: '20 min', type: 'sports' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  return (
    <SubjectTemplate
      subject="PE"
      gradeLevel="K-5"
      icon="🏃"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500" style={{ width: '49%' }} />
              </div>
              <span className="text-lg font-bold text-red-600">49%</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {lesson.type === 'movement' && '💃'}
                      {lesson.type === 'sports' && '⚽'}
                      {lesson.type === 'fitness' && '💪'}
                      {lesson.type === 'health' && '❤️'}
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
                      className="h-full bg-red-500 transition-all duration-300"
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

export default K5PE;
