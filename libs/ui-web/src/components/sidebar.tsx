'use client';

import { useState, useCallback, createContext, useContext, type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  badge?: string | number;
  children?: SidebarItem[];
  disabled?: boolean;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Navigation items */
  items: SidebarItem[];
  /** Currently active item ID */
  activeId?: string;
  /** Called when a nav item is clicked */
  onNavigate?: (item: SidebarItem) => void;
  /** Header content (logo, brand) */
  header?: ReactNode;
  /** Footer content (user profile, settings) */
  footer?: ReactNode;
  /** Whether sidebar starts collapsed */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Called when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function ChevronIcon({ direction = 'right' }: { direction?: 'left' | 'right' | 'down' }) {
  const rotation = { left: 'rotate-180', right: 'rotate-0', down: 'rotate-90' };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform', rotation[direction])}
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav Item                                                           */
/* ------------------------------------------------------------------ */

function NavItem({
  item,
  activeId,
  onNavigate,
  collapsed,
  depth = 0,
}: {
  item: SidebarItem;
  activeId?: string;
  onNavigate?: (item: SidebarItem) => void;
  collapsed: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = item.id === activeId;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (item.disabled) return;
    if (hasChildren) {
      setExpanded((prev) => !prev);
    }
    onNavigate?.(item);
  }, [item, hasChildren, onNavigate]);

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        disabled={item.disabled}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          depth > 0 && 'ml-4 pl-4 border-l border-slate-200',
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          item.disabled && 'opacity-40 cursor-not-allowed',
          collapsed && 'justify-center px-2'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.icon && (
          <span className={cn('flex-shrink-0', isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600')}>
            {item.icon}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {item.badge != null && (
              <span className="ml-auto flex-shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                {item.badge}
              </span>
            )}
            {hasChildren && <ChevronIcon direction={expanded ? 'down' : 'right'} />}
          </>
        )}
      </button>
      {hasChildren && expanded && !collapsed && (
        <ul className="mt-1 space-y-0.5">
          {item.children!.map((child) => (
            <NavItem key={child.id} item={child} activeId={activeId} onNavigate={onNavigate} collapsed={collapsed} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Component                                                  */
/* ------------------------------------------------------------------ */

/**
 * Collapsible sidebar navigation component.
 *
 * Features:
 * - Expand/collapse with smooth animation
 * - Nested navigation items with expand/collapse
 * - Active state indication
 * - Badge support for notifications/counts
 * - Header and footer slots
 */
export function Sidebar({
  items,
  activeId,
  onNavigate,
  header,
  footer,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
  ...props
}: Readonly<SidebarProps>) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const toggle = useCallback(() => {
    const next = !collapsed;
    if (!isControlled) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  }, [collapsed, isControlled, onCollapsedChange]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[260px]',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className={cn('flex items-center border-b border-slate-100 px-4 py-4', collapsed && 'justify-center px-2')}>
          {!collapsed && header}
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex-shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors',
              !collapsed && !!header && 'ml-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <MenuIcon /> : <ChevronIcon direction="left" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {items.map((item) => (
              <NavItem key={item.id} item={item} activeId={activeId} onNavigate={onNavigate} collapsed={collapsed} />
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {footer && (
          <div className={cn('border-t border-slate-100 px-4 py-3', collapsed && 'px-2')}>
            {footer}
          </div>
        )}
      </aside>
    </SidebarContext.Provider>
  );
}
