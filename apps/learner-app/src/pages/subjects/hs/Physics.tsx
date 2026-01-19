'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function HSPhysics() {
  const lessons = [
    { id: '1', title: 'Kinematics', description: 'Motion and velocity', progress: 100, duration: '35 min', type: 'lesson' },
    { id: '2', title: "Newton's Laws", description: 'Forces and motion', progress: 85, duration: '40 min', type: 'interactive' },
    { id: '3', title: 'Energy & Work', description: 'Conservation principles', progress: 55, duration: '35 min', type: 'practice' },
    { id: '4', title: 'Waves & Sound', description: 'Vibrations and acoustics', progress: 30, duration: '40 min', type: 'experiment' },
    { id: '5', title: 'Electricity & Magnetism', description: 'EM forces and circuits', progress: 5, duration: '50 min', type: 'lesson' },
  ];

  return (
    <SubjectTemplate subject="Physics" gradeLevel="High School" icon="⚡">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500" style={{ width: '55%' }} />
            </div>
            <span className="text-lg font-bold text-yellow-600">55%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'experiment' ? '🔭' : lesson.type === 'practice' ? '✏️' : '⚙️'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: `${lesson.progress}%` }} />
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

export default HSPhysics;
