'use client';

import { useState } from 'react';
import { VirtualManipulatives } from './VirtualManipulatives';
import { StepByStepSolutions } from './StepByStepSolutions';
import { FormulaReference } from './FormulaReference';
import { PracticeProblems } from './PracticeProblems';

interface MathSupportContainerProps {
  learnerId: string;
}

type Tab = 'manipulatives' | 'solutions' | 'formulas' | 'practice';

/**
 * Container component for all math support tools
 * Manages tab navigation between different math features
 */
export function MathSupportContainer({ learnerId }: MathSupportContainerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('manipulatives');

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'manipulatives', label: 'Virtual Manipulatives', icon: '🧮' },
    { id: 'solutions', label: 'Step-by-Step Solutions', icon: '📐' },
    { id: 'formulas', label: 'Formula Reference', icon: '📏' },
    { id: 'practice', label: 'Practice Problems', icon: '✏️' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'manipulatives' && <VirtualManipulatives learnerId={learnerId} />}
        {activeTab === 'solutions' && <StepByStepSolutions learnerId={learnerId} />}
        {activeTab === 'formulas' && <FormulaReference />}
        {activeTab === 'practice' && <PracticeProblems learnerId={learnerId} />}
      </div>
    </div>
  );
}
