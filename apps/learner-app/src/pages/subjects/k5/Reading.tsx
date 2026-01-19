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
  type: 'story' | 'phonics' | 'vocabulary' | 'comprehension';
}

export function K5Reading() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const engine = new SubjectEngine();
        const learnerId = localStorage.getItem('user_id') || '';
        const content = await engine.getSubjectContent('K5', 'reading', learnerId);
        setLessons(content.lessons as unknown as Lesson[]);
      } catch (error) {
        console.error('Failed to load content:', error);
        setLessons([
          { id: '1', title: 'Letter Sounds', description: 'Learn the sounds each letter makes!', progress: 100, duration: '10 min', type: 'phonics' },
          { id: '2', title: 'Sight Words', description: 'Recognize common words quickly!', progress: 80, duration: '12 min', type: 'vocabulary' },
          { id: '3', title: 'The Magic Tree', description: 'An adventure story about friendship!', progress: 60, duration: '15 min', type: 'story' },
          { id: '4', title: 'Reading Detective', description: 'Find clues in what you read!', progress: 30, duration: '18 min', type: 'comprehension' },
          { id: '5', title: 'Rhyming Words', description: 'Words that sound the same!', progress: 0, duration: '10 min', type: 'phonics' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  return (
    <SubjectTemplate
      subject="Reading"
      gradeLevel="K-5"
      icon="📚"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: '54%' }} />
              </div>
              <span className="text-lg font-bold text-purple-600">54%</span>
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
                      {lesson.type === 'story' && '📖'}
                      {lesson.type === 'phonics' && '🔤'}
                      {lesson.type === 'vocabulary' && '📝'}
                      {lesson.type === 'comprehension' && '🔍'}
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
                      className="h-full bg-purple-500 transition-all duration-300"
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

export default K5Reading;
