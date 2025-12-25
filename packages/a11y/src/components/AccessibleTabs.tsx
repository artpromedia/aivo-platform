import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useId,
  useEffect,
  Children,
  isValidElement,
  cloneElement,
} from 'react';
import { KeyboardPatterns } from '../keyboard-navigation';

export interface Tab {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccessibleTabsProps {
  tabs: Tab[];
  defaultValue?: string;
  value?: string;
  onChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  activationMode?: 'automatic' | 'manual';
  className?: string;
  tabListClassName?: string;
  tabClassName?: string;
  tabPanelClassName?: string;
  'aria-label'?: string;
}

/**
 * Accessible tabs component
 *
 * Features:
 * - Arrow key navigation
 * - Home/End key support
 * - Automatic or manual activation
 * - Proper ARIA attributes
 * - Roving tabindex
 *
 * @example
 * <AccessibleTabs
 *   tabs={[
 *     { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
 *     { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
 *     { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div>, disabled: true },
 *   ]}
 *   aria-label="Example tabs"
 * />
 */
export const AccessibleTabs = forwardRef<HTMLDivElement, AccessibleTabsProps>(
  (
    {
      tabs,
      defaultValue,
      value,
      onChange,
      orientation = 'horizontal',
      activationMode = 'automatic',
      className,
      tabListClassName,
      tabClassName,
      tabPanelClassName,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const baseId = useId();
    const tabListRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const [activeTab, setActiveTab] = useState(() => {
      if (value !== undefined) return value;
      if (defaultValue !== undefined) return defaultValue;
      return enabledTabs[0]?.id || tabs[0]?.id;
    });

    const currentTab = value !== undefined ? value : activeTab;

    useEffect(() => {
      if (value !== undefined) {
        setActiveTab(value);
      }
    }, [value]);

    const handleTabChange = useCallback(
      (tabId: string) => {
        if (value === undefined) {
          setActiveTab(tabId);
        }
        onChange?.(tabId);
      },
      [value, onChange]
    );

    const getCurrentIndex = useCallback(() => {
      return tabs.findIndex((tab) => tab.id === currentTab);
    }, [tabs, currentTab]);

    const focusTab = useCallback(
      (index: number) => {
        const ref = tabRefs.current[index];
        if (ref) {
          ref.focus();
          if (activationMode === 'automatic') {
            handleTabChange(tabs[index].id);
          }
        }
      },
      [tabs, activationMode, handleTabChange]
    );

    const getNextEnabledIndex = useCallback(
      (startIndex: number, direction: 1 | -1): number => {
        let index = startIndex;
        const totalTabs = tabs.length;

        for (let i = 0; i < totalTabs; i++) {
          index = (index + direction + totalTabs) % totalTabs;
          if (!tabs[index].disabled) {
            return index;
          }
        }

        return startIndex;
      },
      [tabs]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const currentIndex = getCurrentIndex();
        const isHorizontal = orientation === 'horizontal';

        const keyActions: Record<string, () => void> = {
          [isHorizontal ? 'ArrowRight' : 'ArrowDown']: () => {
            e.preventDefault();
            const nextIndex = getNextEnabledIndex(currentIndex, 1);
            focusTab(nextIndex);
          },
          [isHorizontal ? 'ArrowLeft' : 'ArrowUp']: () => {
            e.preventDefault();
            const prevIndex = getNextEnabledIndex(currentIndex, -1);
            focusTab(prevIndex);
          },
          Home: () => {
            e.preventDefault();
            const firstEnabledIndex = tabs.findIndex((tab) => !tab.disabled);
            if (firstEnabledIndex !== -1) {
              focusTab(firstEnabledIndex);
            }
          },
          End: () => {
            e.preventDefault();
            const lastEnabledIndex = [...tabs].reverse().findIndex((tab) => !tab.disabled);
            if (lastEnabledIndex !== -1) {
              focusTab(tabs.length - 1 - lastEnabledIndex);
            }
          },
        };

        keyActions[e.key]?.();
      },
      [getCurrentIndex, orientation, getNextEnabledIndex, focusTab, tabs]
    );

    return (
      <div ref={ref} className={className}>
        <div
          ref={tabListRef}
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation={orientation}
          className={tabListClassName}
          style={{
            display: 'flex',
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            gap: '4px',
          }}
        >
          {tabs.map((tab, index) => {
            const isSelected = tab.id === currentTab;
            const tabId = `${baseId}-tab-${tab.id}`;
            const panelId = `${baseId}-panel-${tab.id}`;

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                id={tabId}
                aria-selected={isSelected}
                aria-controls={panelId}
                aria-disabled={tab.disabled}
                tabIndex={isSelected ? 0 : -1}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id)}
                onKeyDown={handleKeyDown}
                className={tabClassName}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: isSelected ? '#e0e0e0' : 'transparent',
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  opacity: tab.disabled ? 0.5 : 1,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {tabs.map((tab) => {
          const isSelected = tab.id === currentTab;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={panelId}
              aria-labelledby={tabId}
              hidden={!isSelected}
              tabIndex={0}
              className={tabPanelClassName}
              style={{
                padding: '16px',
              }}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    );
  }
);

AccessibleTabs.displayName = 'AccessibleTabs';
