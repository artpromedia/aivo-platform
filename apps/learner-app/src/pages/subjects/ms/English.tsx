'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function MSEnglish() {
  const lessons = [
    { id: '1', title: 'Grammar Fundamentals', description: 'Parts of speech and sentence structure', progress: 100, duration: '20 min', type: 'lesson' },
    { id: '2', title: 'Essay Writing', description: 'Organizing your thoughts on paper', progress: 75, duration: '30 min', type: 'practice' },
    { id: '3', title: 'Reading Comprehension', description: 'Understanding complex texts', progress: 60, duration: '25 min', type: 'reading' },
    { id: '4', title: 'Vocabulary Building', description: 'Expanding your word bank', progress: 40, duration: '15 min', type: 'interactive' },
    { id: '5', title: 'Literature Analysis', description: 'Exploring themes and characters', progress: 10, duration: '35 min', type: 'reading' },
  ];

  return (
    <SubjectTemplate subject="English" gradeLevel="Middle School" icon="📝">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: '57%' }} />
            </div>
            <span className="text-lg font-bold text-amber-600">57%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'practice' ? '✏️' : lesson.type === 'reading' ? '📖' : '🎯'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${lesson.progress}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-600">{lesson.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubjectTemplate>
  );
}

export default MSEnglish;
