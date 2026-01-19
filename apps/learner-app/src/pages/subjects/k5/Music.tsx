'use client';

import { SubjectTemplate } from '@/components/SubjectTemplate';

export function K5Music() {
  const lessons = [
    { id: '1', title: 'Rhythm & Beat', description: 'Clap along to the rhythm!', progress: 100, duration: '10 min', type: 'interactive' },
    { id: '2', title: 'Musical Instruments', description: 'Explore different instruments!', progress: 75, duration: '15 min', type: 'video' },
    { id: '3', title: 'Singing Songs', description: 'Learn fun songs to sing!', progress: 50, duration: '12 min', type: 'practice' },
    { id: '4', title: 'High & Low Notes', description: 'Hear the difference in pitches!', progress: 20, duration: '14 min', type: 'interactive' },
    { id: '5', title: 'Music from Around the World', description: 'Discover global music styles!', progress: 0, duration: '18 min', type: 'video' },
  ];

  return (
    <SubjectTemplate subject="Music" gradeLevel="K-5" icon="🎵">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: '49%' }} />
            </div>
            <span className="text-lg font-bold text-indigo-600">49%</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.type === 'video' ? '🎬' : lesson.type === 'interactive' ? '🎹' : '🎤'}</span>
                <span className="text-sm text-gray-500">{lesson.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{lesson.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${lesson.progress}%` }} />
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

export default K5Music;
