'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function HSEnglish() {
  const lessons = [
    { id: '1', title: 'Literary Analysis', description: 'Deep dive into classic texts', progress: 100, duration: '40 min', type: 'reading' },
    { id: '2', title: 'Research Writing', description: 'Academic writing and citations', progress: 75, duration: '45 min', type: 'practice' },
    { id: '3', title: 'Rhetoric & Persuasion', description: 'The art of argument', progress: 50, duration: '35 min', type: 'lesson' },
    { id: '4', title: 'American Literature', description: 'From Twain to Morrison', progress: 25, duration: '50 min', type: 'reading' },
    { id: '5', title: 'Creative Writing', description: 'Finding your voice', progress: 0, duration: '40 min', type: 'practice' },
  ];

  return (
    <SubjectTemplate subject="English" gradeLevel="High School" icon="📖">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500" style={{ width: '50%' }} />
            </div>
            <span className="text-lg font-bold text-rose-600">50%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'reading' ? '📚' : '✍️'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${lesson.progress}%` }} />
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

export default HSEnglish;
