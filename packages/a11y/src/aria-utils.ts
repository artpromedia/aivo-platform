/**
 * ARIA Utilities
 *
 * Provides utilities for working with ARIA attributes
 */

import { InteractiveRole, LandmarkRole } from './types';

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

/**
 * Reset the ID counter (for testing)
 */
export function resetAriaIdCounter(): void {
  idCounter = 0;
}

/**
 * ARIA attribute helpers for common patterns
 */
export const aria = {
  /**
   * Set up labelled-by relationship
   */
  labelledBy(labelId: string): { 'aria-labelledby': string } {
    return { 'aria-labelledby': labelId };
  },

  /**
   * Set up described-by relationship
   */
  describedBy(descriptionId: string): { 'aria-describedby': string } {
    return { 'aria-describedby': descriptionId };
  },

  /**
   * Set up controls relationship
   */
  controls(controlledId: string): { 'aria-controls': string } {
    return { 'aria-controls': controlledId };
  },

  /**
   * Set up expanded state
   */
  expanded(isExpanded: boolean): { 'aria-expanded': boolean } {
    return { 'aria-expanded': isExpanded };
  },

  /**
   * Set up selected state
   */
  selected(isSelected: boolean): { 'aria-selected': boolean } {
    return { 'aria-selected': isSelected };
  },

  /**
   * Set up checked state
   */
  checked(isChecked: boolean | 'mixed'): { 'aria-checked': boolean | 'mixed' } {
    return { 'aria-checked': isChecked };
  },

  /**
   * Set up pressed state (toggle button)
   */
  pressed(isPressed: boolean | 'mixed'): { 'aria-pressed': boolean | 'mixed' } {
    return { 'aria-pressed': isPressed };
  },

  /**
   * Set up hidden state
   */
  hidden(isHidden: boolean): { 'aria-hidden': boolean } {
    return { 'aria-hidden': isHidden };
  },

  /**
   * Set up disabled state
   */
  disabled(isDisabled: boolean): { 'aria-disabled': boolean } {
    return { 'aria-disabled': isDisabled };
  },

  /**
   * Set up invalid state
   */
  invalid(isInvalid: boolean): { 'aria-invalid': boolean } {
    return { 'aria-invalid': isInvalid };
  },

  /**
   * Set up required state
   */
  required(isRequired: boolean): { 'aria-required': boolean } {
    return { 'aria-required': isRequired };
  },

  /**
   * Set up busy state
   */
  busy(isBusy: boolean): { 'aria-busy': boolean } {
    return { 'aria-busy': isBusy };
  },

  /**
   * Set up live region
   */
  live(
    politeness: 'polite' | 'assertive' | 'off' = 'polite'
  ): { 'aria-live': 'polite' | 'assertive' | 'off' } {
    return { 'aria-live': politeness };
  },

  /**
   * Set up atomic announcement
   */
  atomic(isAtomic: boolean): { 'aria-atomic': boolean } {
    return { 'aria-atomic': isAtomic };
  },

  /**
   * Set up current state
   */
  current(
    value: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  ): { 'aria-current': boolean | 'page' | 'step' | 'location' | 'date' | 'time' } {
    return { 'aria-current': value };
  },

  /**
   * Set up has-popup
   */
  hasPopup(
    value: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  ): { 'aria-haspopup': boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' } {
    return { 'aria-haspopup': value };
  },

  /**
   * Set up owns relationship (for virtual containment)
   */
  owns(ownedIds: string | string[]): { 'aria-owns': string } {
    const ids = Array.isArray(ownedIds) ? ownedIds.join(' ') : ownedIds;
    return { 'aria-owns': ids };
  },

  /**
   * Set up activedescendant
   */
  activeDescendant(id: string | undefined): { 'aria-activedescendant'?: string } {
    return id ? { 'aria-activedescendant': id } : {};
  },

  /**
   * Set up setsize and posinset for lists
   */
  listItem(
    position: number,
    total: number
  ): { 'aria-setsize': number; 'aria-posinset': number } {
    return { 'aria-setsize': total, 'aria-posinset': position };
  },

  /**
   * Set up level for headings and tree items
   */
  level(level: number): { 'aria-level': number } {
    return { 'aria-level': level };
  },

  /**
   * Set up value for range widgets
   */
  valueNow(value: number): { 'aria-valuenow': number } {
    return { 'aria-valuenow': value };
  },

  /**
   * Set up min/max for range widgets
   */
  valueRange(
    min: number,
    max: number,
    current: number
  ): {
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-valuenow': number;
  } {
    return {
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': current,
    };
  },

  /**
   * Set up value text for range widgets
   */
  valueText(text: string): { 'aria-valuetext': string } {
    return { 'aria-valuetext': text };
  },

  /**
   * Set up modal dialog
   */
  modal(isModal: boolean): { 'aria-modal': boolean } {
    return { 'aria-modal': isModal };
  },

  /**
   * Set up multiselectable
   */
  multiSelectable(isMulti: boolean): { 'aria-multiselectable': boolean } {
    return { 'aria-multiselectable': isMulti };
  },

  /**
   * Set up orientation
   */
  orientation(
    orientation: 'horizontal' | 'vertical'
  ): { 'aria-orientation': 'horizontal' | 'vertical' } {
    return { 'aria-orientation': orientation };
  },

  /**
   * Set up readonly
   */
  readOnly(isReadOnly: boolean): { 'aria-readonly': boolean } {
    return { 'aria-readonly': isReadOnly };
  },

  /**
   * Set up sort direction for tables
   */
  sort(
    direction: 'ascending' | 'descending' | 'none' | 'other'
  ): { 'aria-sort': 'ascending' | 'descending' | 'none' | 'other' } {
    return { 'aria-sort': direction };
  },

  /**
   * Set up error message relationship
   */
  errorMessage(errorId: string): { 'aria-errormessage': string } {
    return { 'aria-errormessage': errorId };
  },

  /**
   * Set up details relationship
   */
  details(detailsId: string): { 'aria-details': string } {
    return { 'aria-details': detailsId };
  },

  /**
   * Set up keyshortcuts
   */
  keyShortcuts(shortcuts: string): { 'aria-keyshortcuts': string } {
    return { 'aria-keyshortcuts': shortcuts };
  },

  /**
   * Set up role description
   */
  roleDescription(description: string): { 'aria-roledescription': string } {
    return { 'aria-roledescription': description };
  },
};

/**
 * Role attribute helpers
 */
export function role(
  roleName: InteractiveRole | LandmarkRole | string
): { role: string } {
  return { role: roleName };
}

/**
 * Build ARIA props for a disclosure pattern (accordion, collapsible)
 */
export function buildDisclosureProps(
  isExpanded: boolean,
  triggerId: string,
  panelId: string
): {
  trigger: {
    id: string;
    'aria-expanded': boolean;
    'aria-controls': string;
  };
  panel: {
    id: string;
    'aria-labelledby': string;
    hidden: boolean;
  };
} {
  return {
    trigger: {
      id: triggerId,
      'aria-expanded': isExpanded,
      'aria-controls': panelId,
    },
    panel: {
      id: panelId,
      'aria-labelledby': triggerId,
      hidden: !isExpanded,
    },
  };
}

/**
 * Build ARIA props for a dialog
 */
export function buildDialogProps(
  titleId: string,
  descriptionId?: string
): {
  role: 'dialog';
  'aria-modal': true;
  'aria-labelledby': string;
  'aria-describedby'?: string;
} {
  return {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    ...(descriptionId && { 'aria-describedby': descriptionId }),
  };
}

/**
 * Build ARIA props for a menu
 */
export function buildMenuProps(
  labelledBy?: string,
  orientation: 'horizontal' | 'vertical' = 'vertical'
): {
  role: 'menu';
  'aria-orientation': 'horizontal' | 'vertical';
  'aria-labelledby'?: string;
} {
  return {
    role: 'menu',
    'aria-orientation': orientation,
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
  };
}

/**
 * Build ARIA props for a menu item
 */
export function buildMenuItemProps(
  isDisabled = false
): {
  role: 'menuitem';
  tabIndex: number;
  'aria-disabled'?: boolean;
} {
  return {
    role: 'menuitem',
    tabIndex: -1,
    ...(isDisabled && { 'aria-disabled': true }),
  };
}

/**
 * Build ARIA props for a tab list
 */
export function buildTabListProps(
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): {
  role: 'tablist';
  'aria-orientation': 'horizontal' | 'vertical';
} {
  return {
    role: 'tablist',
    'aria-orientation': orientation,
  };
}

/**
 * Build ARIA props for a tab
 */
export function buildTabProps(
  isSelected: boolean,
  panelId: string
): {
  role: 'tab';
  'aria-selected': boolean;
  'aria-controls': string;
  tabIndex: number;
} {
  return {
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Build ARIA props for a tab panel
 */
export function buildTabPanelProps(
  tabId: string
): {
  role: 'tabpanel';
  'aria-labelledby': string;
  tabIndex: number;
} {
  return {
    role: 'tabpanel',
    'aria-labelledby': tabId,
    tabIndex: 0,
  };
}

/**
 * Build ARIA props for a combobox
 */
export function buildComboboxProps(
  isExpanded: boolean,
  listboxId: string,
  activeDescendant?: string
): {
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-haspopup': 'listbox';
  'aria-controls': string;
  'aria-activedescendant'?: string;
} {
  return {
    role: 'combobox',
    'aria-expanded': isExpanded,
    'aria-haspopup': 'listbox',
    'aria-controls': listboxId,
    ...(activeDescendant && { 'aria-activedescendant': activeDescendant }),
  };
}

/**
 * Build ARIA props for a progress bar
 */
export function buildProgressProps(
  value: number,
  min = 0,
  max = 100,
  label?: string
): {
  role: 'progressbar';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-valuetext'?: string;
} {
  const percentage = Math.round(((value - min) / (max - min)) * 100);

  return {
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': label || `${percentage}%`,
  };
}

/**
 * Build ARIA props for a slider
 */
export function buildSliderProps(
  value: number,
  min: number,
  max: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  valueText?: string
): {
  role: 'slider';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-orientation': 'horizontal' | 'vertical';
  'aria-valuetext'?: string;
  tabIndex: number;
} {
  return {
    role: 'slider',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-orientation': orientation,
    ...(valueText && { 'aria-valuetext': valueText }),
    tabIndex: 0,
  };
}
