'use client';

import { useParams } from 'react-router-dom';

export default function Quiz() {
  const { quizId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Quiz: {quizId}
        </h1>
        <p className="text-gray-600">
          Quiz questions will be displayed here.
        </p>
      </div>
    </div>
  );
}
