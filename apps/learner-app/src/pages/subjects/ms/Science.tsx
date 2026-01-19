'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function MSScience() {
  const lessons = [
    { id: '1', title: 'Scientific Method', description: 'How scientists discover truths', progress: 100, duration: '18 min', type: 'lesson' },
    { id: '2', title: 'Cells & Life', description: 'The building blocks of living things', progress: 85, duration: '25 min', type: 'interactive' },
    { id: '3', title: 'Matter & Energy', description: 'What everything is made of', progress: 65, duration: '22 min', type: 'experiment' },
    { id: '4', title: 'Earth Systems', description: 'Rocks, water, and weather', progress: 40, duration: '28 min', type: 'lesson' },
    { id: '5', title: 'Forces & Motion', description: 'How things move', progress: 15, duration: '30 min', type: 'experiment' },
  ];

  return (
    <SubjectTemplate subject="Science" gradeLevel="Middle School" icon="🔬">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: '61%' }} />
            </div>
            <span className="text-lg font-bold text-green-600">61%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'experiment' ? '🧪' : '🔍'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${lesson.progress}%` }} />
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

export default MSScience;
