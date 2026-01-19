'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function MSHistory() {
  const lessons = [
    { id: '1', title: 'Ancient Civilizations', description: 'Egypt, Greece, and Rome', progress: 100, duration: '25 min', type: 'lesson' },
    { id: '2', title: 'Middle Ages', description: 'Knights, castles, and kingdoms', progress: 80, duration: '28 min', type: 'video' },
    { id: '3', title: 'Renaissance & Exploration', description: 'Art, science, and new worlds', progress: 55, duration: '30 min', type: 'interactive' },
    { id: '4', title: 'American Revolution', description: 'Birth of a nation', progress: 30, duration: '32 min', type: 'lesson' },
    { id: '5', title: 'Industrial Revolution', description: 'Machines change the world', progress: 5, duration: '28 min', type: 'video' },
  ];

  return (
    <SubjectTemplate subject="History" gradeLevel="Middle School" icon="🏛️">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 to-red-500" style={{ width: '54%' }} />
            </div>
            <span className="text-lg font-bold text-rose-600">54%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'lesson' ? '📘' : lesson.type === 'video' ? '🎬' : '🗺️'}</span>
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

export default MSHistory;
