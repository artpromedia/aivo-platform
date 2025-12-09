'use client';

/**
 * Educator Mode Context
 *
 * Manages the Teacher/Therapist mode toggle for users who have both roles.
 * The mode affects:
 * - Default visibility when creating goals/notes
 * - Which UI components show privacy settings
 */

import { Role } from '@aivo/ts-rbac';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';

import { useAuth } from '../app/providers';

import type { EducatorMode, Visibility } from './teacher-planning-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface EducatorModeContextValue {
  /** Current mode (teacher or therapist) */
  mode: EducatorMode;
  /** Toggle mode */
  setMode: (mode: EducatorMode) => void;
  /** Whether user can toggle between modes (has both roles) */
  canToggle: boolean;
  /** Whether user is a therapist (either by role or mode) */
  isTherapist: boolean;
  /** Whether user is a teacher */
  isTeacher: boolean;
  /** Get default visibility for creating content */
  getDefaultVisibility: () => Visibility;
  /** Get visibility options available to user */
  getVisibilityOptions: () => { value: Visibility; label: string }[];
}

const STORAGE_KEY = 'aivo_educator_mode';

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

const EducatorModeContext = createContext<EducatorModeContextValue>({
  mode: 'teacher',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setMode: () => {},
  canToggle: false,
  isTherapist: false,
  isTeacher: true,
  getDefaultVisibility: () => 'ALL_EDUCATORS',
  getVisibilityOptions: () => [{ value: 'ALL_EDUCATORS', label: 'All Educators' }],
});

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export function EducatorModeProvider({ children }: { children: ReactNode }) {
  const { roles } = useAuth();

  // Determine user capabilities
  const hasTeacherRole = roles.includes(Role.TEACHER);
  const hasTherapistRole = roles.includes(Role.THERAPIST);
  const hasDistrictAdminRole = roles.includes(Role.DISTRICT_ADMIN);

  // Users can toggle if they have both teacher and therapist roles
  const canToggle = hasTeacherRole && hasTherapistRole;

  // Initialize mode from localStorage or default based on roles
  const [mode, setModeState] = useState<EducatorMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'teacher' || stored === 'therapist') {
        return stored;
      }
    }
    // Default to therapist if user only has therapist role
    if (hasTherapistRole && !hasTeacherRole) {
      return 'therapist';
    }
    return 'teacher';
  });

  // Persist mode to localStorage
  const setMode = useCallback((newMode: EducatorMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
  }, []);

  // Update mode when roles change (e.g., after login)
  useEffect(() => {
    if (!canToggle) {
      // If user can't toggle, set mode based on their single role
      if (hasTherapistRole && !hasTeacherRole) {
        setModeState('therapist');
      } else if (hasTeacherRole && !hasTherapistRole) {
        setModeState('teacher');
      }
    }
  }, [canToggle, hasTeacherRole, hasTherapistRole]);

  // Computed values
  const isTherapist = mode === 'therapist' || (hasTherapistRole && !hasTeacherRole);
  const isTeacher = mode === 'teacher' || (hasTeacherRole && !hasTherapistRole);

  // Get default visibility based on current mode
  const getDefaultVisibility = useCallback((): Visibility => {
    if (isTherapist) {
      return 'THERAPISTS_ONLY';
    }
    return 'ALL_EDUCATORS';
  }, [isTherapist]);

  // Get visibility options available to the user
  const getVisibilityOptions = useCallback((): { value: Visibility; label: string }[] => {
    const options: { value: Visibility; label: string }[] = [
      { value: 'ALL_EDUCATORS', label: 'All Educators' },
    ];

    // Therapists and district admins can create therapist-only content
    if (hasTherapistRole || hasDistrictAdminRole) {
      options.push({ value: 'THERAPISTS_ONLY', label: 'Therapists Only' });
    }

    return options;
  }, [hasTherapistRole, hasDistrictAdminRole]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      canToggle,
      isTherapist,
      isTeacher,
      getDefaultVisibility,
      getVisibilityOptions,
    }),
    [mode, setMode, canToggle, isTherapist, isTeacher, getDefaultVisibility, getVisibilityOptions]
  );

  return <EducatorModeContext.Provider value={value}>{children}</EducatorModeContext.Provider>;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useEducatorMode() {
  return useContext(EducatorModeContext);
}

// ══════════════════════════════════════════════════════════════════════════════
// VISIBILITY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get display label for visibility value
 */
export function getVisibilityLabel(visibility: Visibility): string {
  switch (visibility) {
    case 'ALL_EDUCATORS':
      return 'All Educators';
    case 'THERAPISTS_ONLY':
      return 'Therapists Only';
    case 'CUSTOM':
      return 'Custom';
    default:
      return visibility;
  }
}

/**
 * Get badge variant for visibility
 */
export function getVisibilityBadgeVariant(
  visibility: Visibility
): 'default' | 'secondary' | 'outline' {
  switch (visibility) {
    case 'ALL_EDUCATORS':
      return 'default';
    case 'THERAPISTS_ONLY':
      return 'secondary';
    case 'CUSTOM':
      return 'outline';
    default:
      return 'default';
  }
}
