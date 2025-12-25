import { useId, useMemo } from 'react';

/**
 * Hook for generating accessible IDs for ARIA relationships
 */
export function useAriaId(prefix?: string) {
  const baseId = useId();
  const id = prefix ? `${prefix}-${baseId}` : baseId;

  return useMemo(
    () => ({
      id,
      labelId: `${id}-label`,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      headingId: `${id}-heading`,
      contentId: `${id}-content`,
      triggerId: `${id}-trigger`,
      panelId: `${id}-panel`,
      listboxId: `${id}-listbox`,
      menuId: `${id}-menu`,
      tooltipId: `${id}-tooltip`,
      dialogId: `${id}-dialog`,
    }),
    [id]
  );
}

/**
 * Hook for generating IDs for a list of items
 */
export function useAriaIds(count: number, prefix?: string) {
  const baseId = useId();
  const idPrefix = prefix ? `${prefix}-${baseId}` : baseId;

  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${idPrefix}-item-${i}`,
        labelId: `${idPrefix}-item-${i}-label`,
        descriptionId: `${idPrefix}-item-${i}-description`,
      })),
    [idPrefix, count]
  );
}

/**
 * Hook for generating tab-related IDs
 */
export function useTabIds(tabCount: number, prefix?: string) {
  const baseId = useId();
  const idPrefix = prefix ? `${prefix}-${baseId}` : baseId;

  return useMemo(
    () => ({
      tablistId: `${idPrefix}-tablist`,
      tabs: Array.from({ length: tabCount }, (_, i) => ({
        tabId: `${idPrefix}-tab-${i}`,
        panelId: `${idPrefix}-panel-${i}`,
      })),
    }),
    [idPrefix, tabCount]
  );
}
