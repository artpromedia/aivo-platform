'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function MSPreAlgebra() {
  const lessons = [
    { id: '1', title: 'Integers', description: 'Positive and negative numbers', progress: 100, duration: '18 min', type: 'lesson' },
    { id: '2', title: 'Fractions & Decimals', description: 'Working with parts of numbers', progress: 80, duration: '22 min', type: 'practice' },
    { id: '3', title: 'Ratios & Proportions', description: 'Comparing quantities', progress: 55, duration: '20 min', type: 'interactive' },
    { id: '4', title: 'Percentages', description: 'Parts per hundred', progress: 30, duration: '18 min', type: 'lesson' },
    { id: '5', title: 'Introduction to Variables', description: 'Getting ready for algebra', progress: 5, duration: '25 min', type: 'lesson' },
  ];

  return (
    <SubjectTemplate subject="Pre-Algebra" gradeLevel="Middle School" icon="➕">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: '54%' }} />
            </div>
            <span className="text-lg font-bold text-violet-600">54%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'practice' ? '✏️' : '🎯'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${lesson.progress}%` }} />
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

export default MSPreAlgebra;
