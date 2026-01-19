'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function HSBiology() {
  const lessons = [
    { id: '1', title: 'Cell Biology', description: 'Structure and function of cells', progress: 100, duration: '30 min', type: 'lesson' },
    { id: '2', title: 'Genetics & DNA', description: 'The code of life', progress: 85, duration: '35 min', type: 'interactive' },
    { id: '3', title: 'Evolution', description: 'Natural selection and adaptation', progress: 60, duration: '40 min', type: 'lesson' },
    { id: '4', title: 'Ecology', description: 'Organisms and their environment', progress: 35, duration: '35 min', type: 'experiment' },
    { id: '5', title: 'Human Anatomy', description: 'Systems of the body', progress: 10, duration: '45 min', type: 'interactive' },
  ];

  return (
    <SubjectTemplate subject="Biology" gradeLevel="High School" icon="🧬">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-600 to-emerald-600" style={{ width: '58%' }} />
            </div>
            <span className="text-lg font-bold text-green-600">58%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'experiment' ? '🧪' : '🔬'}</span>
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

export default HSBiology;
