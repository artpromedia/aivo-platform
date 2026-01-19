'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function HSAlgebra2() {
  const lessons = [
    { id: '1', title: 'Complex Numbers', description: 'Imaginary and complex arithmetic', progress: 100, duration: '30 min', type: 'lesson' },
    { id: '2', title: 'Polynomial Functions', description: 'Higher degree polynomials', progress: 75, duration: '35 min', type: 'practice' },
    { id: '3', title: 'Exponential & Logarithms', description: 'Growth and decay functions', progress: 50, duration: '40 min', type: 'interactive' },
    { id: '4', title: 'Sequences & Series', description: 'Patterns and summations', progress: 20, duration: '35 min', type: 'lesson' },
    { id: '5', title: 'Trigonometry', description: 'Angles and ratios', progress: 0, duration: '45 min', type: 'practice' },
  ];

  return (
    <SubjectTemplate subject="Algebra 2" gradeLevel="High School" icon="📈">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: '49%' }} />
            </div>
            <span className="text-lg font-bold text-cyan-600">49%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'practice' ? '✏️' : '📊'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${lesson.progress}%` }} />
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

export default HSAlgebra2;
