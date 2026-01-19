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
  type: 'creative' | 'handwriting' | 'grammar' | 'spelling';
}

export function K5Writing() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const engine = new SubjectEngine();
        const learnerId = localStorage.getItem('user_id') || '';
        const content = await engine.getSubjectContent('K5', 'writing', learnerId);
        setLessons(content.lessons as unknown as Lesson[]);
      } catch (error) {
        console.error('Failed to load content:', error);
        setLessons([
          { id: '1', title: 'Letter Formation', description: 'Learn to write uppercase and lowercase letters!', progress: 100, duration: '12 min', type: 'handwriting' },
          { id: '2', title: 'Spelling Fun', description: 'Practice spelling everyday words!', progress: 80, duration: '10 min', type: 'spelling' },
          { id: '3', title: 'Sentence Building', description: 'Put words together to make sentences!', progress: 55, duration: '15 min', type: 'grammar' },
          { id: '4', title: 'My Story Time', description: 'Write your own short story!', progress: 30, duration: '20 min', type: 'creative' },
          { id: '5', title: 'Capital Letters', description: 'When to use big letters!', progress: 10, duration: '10 min', type: 'grammar' },
          { id: '6', title: 'Journal Writing', description: 'Write about your day!', progress: 0, duration: '15 min', type: 'creative' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  return (
    <SubjectTemplate
      subject="Writing"
      gradeLevel="K-5"
      icon="✏️"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500" style={{ width: '46%' }} />
              </div>
              <span className="text-lg font-bold text-amber-600">46%</span>
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
                      {lesson.type === 'creative' && '🎨'}
                      {lesson.type === 'handwriting' && '✍️'}
                      {lesson.type === 'grammar' && '📝'}
                      {lesson.type === 'spelling' && '🔤'}
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
                      className="h-full bg-amber-500 transition-all duration-300"
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

export default K5Writing;
