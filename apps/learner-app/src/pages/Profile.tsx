'use client';

import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-gray-800 transition-colors"
        >
          &larr; Back
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Profile</h1>
          
          <div className="flex items-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
              L
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-800">Learner</h2>
              <p className="text-gray-500">Grade Level: K5</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Learning Style</h3>
              <p className="text-gray-800">Visual Learner</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Strongest Subject</h3>
              <p className="text-gray-800">Mathematics</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
              <p className="text-gray-800">January 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
