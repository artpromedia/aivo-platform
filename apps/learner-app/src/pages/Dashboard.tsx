'use client';

import { useNavigate } from 'react-router-dom';

const subjects = [
  { name: 'Math', path: '/subjects/k5/math' },
  { name: 'Reading', path: '/subjects/k5/reading' },
  { name: 'Science', path: '/subjects/k5/science' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Your Dashboard</h1>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Settings
          </button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Current Level</h3>
            <p className="text-3xl font-bold text-blue-600">K5</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Lessons Completed</h3>
            <p className="text-3xl font-bold text-green-600">24</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Weekly Streak</h3>
            <p className="text-3xl font-bold text-orange-600">5 days</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.name}
                onClick={() => navigate(subject.path)}
                className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <h3 className="font-medium text-gray-800">{subject.name}</h3>
                <p className="text-sm text-gray-500">Continue where you left off</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
