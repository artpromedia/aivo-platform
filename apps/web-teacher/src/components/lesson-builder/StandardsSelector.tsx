'use client';

/**
 * Standards Selector Component
 *
 * Allows teachers to select and manage educational standards for lessons
 * Features:
 * - Search standards by code or description
 * - Filter by subject and grade
 * - Multi-select standards
 * - Display selected standards with descriptions
 */

import * as React from 'react';
import {
  Search,
  CheckCircle2,
  X,
  ChevronDown,
  Award,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Standard {
  id: string;
  code: string;
  description: string;
  subject: string;
  gradeLevel: string;
  category?: string;
}

interface StandardsSelectorProps {
  selected: string[];
  onChange: (standards: string[]) => void;
  subjectFilter?: string;
  gradeLevelFilter?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MOCK STANDARDS DATA (Common Core Examples)
// ════════════════════════════════════════════════════════════════════════════

const MOCK_STANDARDS: Standard[] = [
  // Math Standards
  {
    id: '1',
    code: 'CCSS.MATH.CONTENT.3.NF.A.1',
    description: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts',
    subject: 'Math',
    gradeLevel: '3rd Grade',
    category: 'Number & Operations - Fractions',
  },
  {
    id: '2',
    code: 'CCSS.MATH.CONTENT.3.NF.A.2',
    description: 'Understand a fraction as a number on the number line',
    subject: 'Math',
    gradeLevel: '3rd Grade',
    category: 'Number & Operations - Fractions',
  },
  {
    id: '3',
    code: 'CCSS.MATH.CONTENT.4.NF.A.1',
    description: 'Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b)',
    subject: 'Math',
    gradeLevel: '4th Grade',
    category: 'Number & Operations - Fractions',
  },
  {
    id: '4',
    code: 'CCSS.MATH.CONTENT.4.OA.A.1',
    description: 'Interpret a multiplication equation as a comparison',
    subject: 'Math',
    gradeLevel: '4th Grade',
    category: 'Operations & Algebraic Thinking',
  },
  {
    id: '5',
    code: 'CCSS.MATH.CONTENT.5.NBT.A.1',
    description: 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right',
    subject: 'Math',
    gradeLevel: '5th Grade',
    category: 'Number & Operations in Base Ten',
  },
  // Reading Standards
  {
    id: '6',
    code: 'CCSS.ELA-LITERACY.RL.3.1',
    description: 'Ask and answer questions to demonstrate understanding of a text',
    subject: 'Reading',
    gradeLevel: '3rd Grade',
    category: 'Key Ideas and Details',
  },
  {
    id: '7',
    code: 'CCSS.ELA-LITERACY.RL.3.2',
    description: 'Recount stories, including fables, folktales, and myths from diverse cultures',
    subject: 'Reading',
    gradeLevel: '3rd Grade',
    category: 'Key Ideas and Details',
  },
  {
    id: '8',
    code: 'CCSS.ELA-LITERACY.RI.4.1',
    description: 'Refer to details and examples in a text when explaining what the text says explicitly',
    subject: 'Reading',
    gradeLevel: '4th Grade',
    category: 'Key Ideas and Details',
  },
  {
    id: '9',
    code: 'CCSS.ELA-LITERACY.RI.5.2',
    description: 'Determine two or more main ideas of a text and explain how they are supported by key details',
    subject: 'Reading',
    gradeLevel: '5th Grade',
    category: 'Key Ideas and Details',
  },
  // Science Standards
  {
    id: '10',
    code: 'NGSS.3-LS1-1',
    description: 'Develop models to describe that organisms have unique and diverse life cycles',
    subject: 'Science',
    gradeLevel: '3rd Grade',
    category: 'Life Science',
  },
  {
    id: '11',
    code: 'NGSS.4-PS3-1',
    description: 'Use evidence to construct an explanation relating the speed of an object to the energy of that object',
    subject: 'Science',
    gradeLevel: '4th Grade',
    category: 'Physical Science',
  },
  {
    id: '12',
    code: 'NGSS.5-ESS2-1',
    description: 'Develop a model using an example to describe ways the geosphere, biosphere, hydrosphere, and/or atmosphere interact',
    subject: 'Science',
    gradeLevel: '5th Grade',
    category: 'Earth and Space Science',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function StandardsSelector({
  selected,
  onChange,
  subjectFilter,
  gradeLevelFilter,
}: StandardsSelectorProps) {
  const [search, setSearch] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(false);

  const filteredStandards = React.useMemo(() => {
    let standards = [...MOCK_STANDARDS];

    if (subjectFilter) {
      standards = standards.filter((s) => s.subject === subjectFilter);
    }
    if (gradeLevelFilter) {
      standards = standards.filter((s) => s.gradeLevel === gradeLevelFilter);
    }
    if (search) {
      const query = search.toLowerCase();
      standards = standards.filter(
        (s) =>
          s.code.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      );
    }

    return standards;
  }, [subjectFilter, gradeLevelFilter, search]);

  const standardsByCategory = React.useMemo(() => {
    const grouped: Record<string, Standard[]> = {};
    filteredStandards.forEach((standard) => {
      const category = standard.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(standard);
    });
    return grouped;
  }, [filteredStandards]);

  const toggleStandard = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((s) => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const selectedStandards = MOCK_STANDARDS.filter((s) => selected.includes(s.code));

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Standards</h3>
        {selected.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Selected Standards */}
      {selectedStandards.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedStandards.map((standard) => (
            <div
              key={standard.id}
              className="flex items-start gap-2 rounded-lg bg-primary/5 p-2"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-primary">{standard.code}</span>
                <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                  {standard.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStandard(standard.code)}
                className="h-6 w-6 shrink-0 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Standards Selector */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <span>Add Standards</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search standards..."
              className="pl-9"
            />
          </div>

          {/* Standards List */}
          <ScrollArea className="max-h-64">
            <div className="space-y-4 pr-2">
              {Object.entries(standardsByCategory).map(([category, standards]) => (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {standards.map((standard) => {
                      const isSelected = selected.includes(standard.code);
                      return (
                        <div
                          key={standard.id}
                          onClick={() => toggleStandard(standard.code)}
                          className={cn(
                            'cursor-pointer rounded-lg border p-2 transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center',
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-gray-300'
                              )}
                            >
                              {isSelected && (
                                <svg
                                  className="h-2.5 w-2.5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium">{standard.code}</span>
                              <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                                {standard.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredStandards.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No standards found
                </div>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
