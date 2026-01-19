'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function K5Art() {
  const lessons = [
    { id: '1', title: 'Colors & Mixing', description: 'Create new colors by mixing!', progress: 100, duration: '15 min', type: 'interactive' },
    { id: '2', title: 'Drawing Shapes', description: 'Turn shapes into amazing art!', progress: 80, duration: '12 min', type: 'practice' },
    { id: '3', title: 'Famous Artists', description: 'Meet Picasso, Van Gogh, and more!', progress: 55, duration: '18 min', type: 'video' },
    { id: '4', title: 'Patterns & Designs', description: 'Create beautiful patterns!', progress: 25, duration: '14 min', type: 'interactive' },
    { id: '5', title: 'Nature Art', description: 'Draw plants, animals, and landscapes!', progress: 0, duration: '20 min', type: 'practice' },
  ];

  return (
    <SubjectTemplate subject="Art" gradeLevel="K-5" icon="🎨">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600" style={{ width: '52%' }} />
            </div>
            <span className="text-lg font-bold text-pink-600">52%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'video' ? '🎬' : lesson.type === 'interactive' ? '🖌️' : '✏️'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500" style={{ width: `${lesson.progress}%` }} />
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

export default K5Art;
