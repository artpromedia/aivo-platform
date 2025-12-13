'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { gradeBandLabels, gradeBands, type GradeBand } from './tokens';

interface GradeThemeContextValue {
  grade: GradeBand;
  setGrade: (grade: GradeBand) => void;
  availableGrades: GradeBand[];
  labels: Record<GradeBand, string>;
}

const GradeThemeContext = createContext<GradeThemeContextValue | null>(null);

export function GradeThemeProvider({
  children,
  initialGrade = 'G6_8',
}: Readonly<{
  children: ReactNode;
  initialGrade?: GradeBand;
}>) {
  const [grade, setGrade] = useState<GradeBand>(initialGrade);

  useEffect(() => {
    document.documentElement.dataset.gradeTheme = grade;
  }, [grade]);

  const value = useMemo(
    () => ({
      grade,
      setGrade,
      availableGrades: gradeBands(),
      labels: gradeBandLabels,
    }),
    [grade]
  );

  return <GradeThemeContext.Provider value={value}>{children}</GradeThemeContext.Provider>;
}

export function useGradeTheme(): GradeThemeContextValue {
  const context = useContext(GradeThemeContext);
  if (!context) {
    throw new Error('useGradeTheme must be used within a GradeThemeProvider');
  }
  return context;
}
