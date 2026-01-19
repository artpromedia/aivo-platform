'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function K5SocialStudies() {
  const lessons = [
    { id: '1', title: 'My Community', description: 'Learn about the people and places around you!', progress: 100, duration: '12 min', type: 'exploration' },
    { id: '2', title: 'Maps & Directions', description: 'Find your way with maps!', progress: 65, duration: '14 min', type: 'interactive' },
    { id: '3', title: 'Holidays & Traditions', description: 'Celebrations around the world!', progress: 40, duration: '16 min', type: 'video' },
    { id: '4', title: 'Helpers in Our Community', description: 'Meet firefighters, teachers, and more!', progress: 15, duration: '10 min', type: 'video' },
    { id: '5', title: 'Then and Now', description: 'How things have changed over time!', progress: 0, duration: '15 min', type: 'exploration' },
  ];

  return (
    <SubjectTemplate subject="Social Studies" gradeLevel="K-5" icon="🌍">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: '44%' }} />
            </div>
            <span className="text-lg font-bold text-orange-600">44%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'video' ? '🎬' : lesson.type === 'interactive' ? '🎮' : '🔍'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${lesson.progress}%` }} />
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

export default K5SocialStudies;
