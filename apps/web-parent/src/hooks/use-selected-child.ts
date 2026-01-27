/**
 * Hook for managing the selected child/student context
 * Used by pages that need to operate on a specific child
 */

import { useState, useEffect } from 'react';
import { useParentProfile } from './use-parent-data';

interface UseSelectedChildOptions {
  /**
   * Whether to auto-select the first child if none is selected
   * @default true
   */
  autoSelectFirst?: boolean;
}

interface UseSelectedChildResult {
  /** Currently selected child ID */
  selectedChildId: string | null;
  /** Set the selected child ID */
  setSelectedChildId: (id: string | null) => void;
  /** Profile of the selected child */
  selectedChild: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    grade: string;
    avatar?: string;
  } | null;
  /** All children/students */
  children: Array<{
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    grade: string;
    avatar?: string;
  }>;
  /** Whether the profile is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Whether there are multiple children (show selector) */
  hasMultipleChildren: boolean;
}

/**
 * Hook to manage selected child state with auto-selection of first child
 */
export function useSelectedChild(
  options: UseSelectedChildOptions = {}
): UseSelectedChildResult {
  const { autoSelectFirst = true } = options;
  
  const { data: profile, isLoading, error } = useParentProfile();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Get children array from profile
  const children = (profile?.students || []).map((student) => ({
    id: student.id,
    name: student.name || `${student.firstName} ${student.lastName}`,
    firstName: student.firstName,
    lastName: student.lastName,
    grade: student.grade,
    avatar: student.avatar,
  }));

  // Auto-select first child when profile loads
  useEffect(() => {
    if (autoSelectFirst && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [autoSelectFirst, children, selectedChildId]);

  // Validate selected child still exists
  useEffect(() => {
    if (selectedChildId && children.length > 0) {
      const exists = children.some((c) => c.id === selectedChildId);
      if (!exists && autoSelectFirst) {
        setSelectedChildId(children[0].id);
      }
    }
  }, [selectedChildId, children, autoSelectFirst]);

  // Find selected child profile
  const selectedChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId) || null
    : null;

  return {
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    children,
    isLoading,
    error: error as Error | null,
    hasMultipleChildren: children.length > 1,
  };
}
