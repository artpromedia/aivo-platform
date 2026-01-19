'use client';

import { Problem } from './types';

interface ProblemDisplayProps {
  content: string;
  type?: Problem['type'];
}

export function ProblemDisplay({ content, type }: ProblemDisplayProps) {
  // Render different problem types appropriately
  const renderContent = () => {
    if (type === 'geometry') {
      // For geometry problems, we might render shapes or diagrams
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-gray-800 whitespace-pre-wrap">{content}</div>
          <div className="w-full max-w-md aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Geometry visualization</span>
          </div>
        </div>
      );
    }

    if (type === 'pattern') {
      // For pattern problems, display in a sequence
      const parts = content.split(',').map(p => p.trim());
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-gray-800 mb-4">Find the pattern:</div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {parts.map((part, index) => (
              <div
                key={index}
                className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-2xl font-bold text-blue-700 shadow-sm"
              >
                {part}
              </div>
            ))}
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-400 border-2 border-dashed border-gray-300">
              ?
            </div>
          </div>
        </div>
      );
    }

    // Default text rendering for arithmetic and word problems
    return (
      <div className="text-xl md:text-2xl text-gray-800 leading-relaxed whitespace-pre-wrap text-center">
        {content}
      </div>
    );
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
      {renderContent()}
    </div>
  );
}

export default ProblemDisplay;
