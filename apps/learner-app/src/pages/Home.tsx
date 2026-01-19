'use client';

import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome back!
        </h1>
        <p className="text-gray-600 mb-8">
          Ready to continue your learning journey?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard</h2>
            <p className="text-gray-600">View your progress and achievements</p>
          </button>
          <button
            onClick={() => navigate('/assessment/baseline')}
            className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Assessment</h2>
            <p className="text-gray-600">Take a baseline assessment</p>
          </button>
        </div>
      </div>
    </div>
  );
}
