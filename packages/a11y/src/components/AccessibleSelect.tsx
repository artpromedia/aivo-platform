import React, {
  forwardRef,
  useId,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { KeyboardPatterns } from '../keyboard-navigation';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AccessibleSelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
  id?: string;
}

/**
 * Accessible select/combobox component
 *
 * Features:
 * - Custom styled dropdown with full keyboard navigation
 * - Arrow key navigation
 * - Type-ahead search
 * - Proper ARIA attributes
 * - Focus management
 *
 * @example
 * <AccessibleSelect
 *   label="Country"
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'ca', label: 'Canada' },
 *     { value: 'mx', label: 'Mexico' },
 *   ]}
 *   onChange={handleCountryChange}
 * />
 */
export const AccessibleSelect = forwardRef<HTMLButtonElement, AccessibleSelectProps>(
  (
    {
      label,
      options,
      value,
      defaultValue,
      onChange,
      error,
      description,
      placeholder = 'Select an option',
      required,
      disabled,
      hideLabel = false,
      className,
      id: providedId,
    },
    ref
  ) => {
    const baseId = useId();
    const buttonId = providedId || `${baseId}-button`;
    const listboxId = `${baseId}-listbox`;
    const labelId = `${baseId}-label`;
    const errorId = `${baseId}-error`;
    const descriptionId = `${baseId}-description`;

    const buttonRef = useRef<HTMLButtonElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value ?? defaultValue ?? '');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [typeAhead, setTypeAhead] = useState('');
    const typeAheadTimeout = useRef<ReturnType<typeof setTimeout>>();

    const currentValue = value !== undefined ? value : selectedValue;

    const selectedOption = useMemo(
      () => options.find((opt) => opt.value === currentValue),
      [options, currentValue]
    );

    const enabledOptions = useMemo(
      () => options.filter((opt) => !opt.disabled),
      [options]
    );

    // Update internal state when controlled value changes
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleOpen = useCallback(() => {
      if (disabled) return;
      setIsOpen(true);
      const selectedIndex = options.findIndex((opt) => opt.value === currentValue);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [disabled, options, currentValue]);

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setActiveIndex(-1);
      buttonRef.current?.focus();
    }, []);

    const handleSelect = useCallback(
      (optionValue: string) => {
        if (value === undefined) {
          setSelectedValue(optionValue);
        }
        onChange?.(optionValue);
        handleClose();
      },
      [value, onChange, handleClose]
    );

    const handleButtonKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const actions: Record<string, () => void> = {
          Enter: () => {
            e.preventDefault();
            handleOpen();
          },
          ' ': () => {
            e.preventDefault();
            handleOpen();
          },
          ArrowDown: () => {
            e.preventDefault();
            handleOpen();
          },
          ArrowUp: () => {
            e.preventDefault();
            handleOpen();
          },
        };

        actions[e.key]?.();
      },
      [handleOpen]
    );

    const handleListboxKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const getNextEnabledIndex = (start: number, direction: 1 | -1): number => {
          let index = start;
          for (let i = 0; i < options.length; i++) {
            index = (index + direction + options.length) % options.length;
            if (!options[index].disabled) return index;
          }
          return start;
        };

        const actions: Record<string, () => void> = {
          ArrowDown: () => {
            e.preventDefault();
            setActiveIndex((prev) => getNextEnabledIndex(prev, 1));
          },
          ArrowUp: () => {
            e.preventDefault();
            setActiveIndex((prev) => getNextEnabledIndex(prev, -1));
          },
          Home: () => {
            e.preventDefault();
            const firstEnabled = options.findIndex((opt) => !opt.disabled);
            if (firstEnabled >= 0) setActiveIndex(firstEnabled);
          },
          End: () => {
            e.preventDefault();
            const lastEnabled = [...options].reverse().findIndex((opt) => !opt.disabled);
            if (lastEnabled >= 0) setActiveIndex(options.length - 1 - lastEnabled);
          },
          Enter: () => {
            e.preventDefault();
            if (activeIndex >= 0 && !options[activeIndex].disabled) {
              handleSelect(options[activeIndex].value);
            }
          },
          ' ': () => {
            e.preventDefault();
            if (activeIndex >= 0 && !options[activeIndex].disabled) {
              handleSelect(options[activeIndex].value);
            }
          },
          Escape: () => {
            e.preventDefault();
            handleClose();
          },
          Tab: () => {
            handleClose();
          },
        };

        if (actions[e.key]) {
          actions[e.key]();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Type-ahead search
          clearTimeout(typeAheadTimeout.current);
          const newTypeAhead = typeAhead + e.key.toLowerCase();
          setTypeAhead(newTypeAhead);

          const matchIndex = options.findIndex(
            (opt) =>
              !opt.disabled && opt.label.toLowerCase().startsWith(newTypeAhead)
          );
          if (matchIndex >= 0) {
            setActiveIndex(matchIndex);
          }

          typeAheadTimeout.current = setTimeout(() => {
            setTypeAhead('');
          }, 500);
        }
      },
      [options, activeIndex, handleSelect, handleClose, typeAhead]
    );

    // Focus active option when it changes
    useEffect(() => {
      if (isOpen && activeIndex >= 0) {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [isOpen, activeIndex]);

    // Handle click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          !buttonRef.current?.contains(target) &&
          !listboxRef.current?.contains(target)
        ) {
          handleClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, handleClose]);

    const describedBy = [description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={className} style={{ position: 'relative', marginBottom: '16px' }}>
        <label
          id={labelId}
          style={{
            display: hideLabel ? 'none' : 'block',
            marginBottom: '4px',
            fontWeight: 500,
            ...(hideLabel && {
              position: 'absolute',
              width: '1px',
              height: '1px',
              margin: '-1px',
              padding: 0,
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }),
          }}
        >
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: '#d32f2f', marginLeft: '4px' }}>
              *
            </span>
          )}
        </label>

        {description && (
          <p
            id={descriptionId}
            style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}
          >
            {description}
          </p>
        )}

        <button
          ref={(node) => {
            (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="button"
          id={buttonId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${buttonId}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={required}
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${baseId}-option-${activeIndex}`
              : undefined
          }
          disabled={disabled}
          onClick={isOpen ? handleClose : handleOpen}
          onKeyDown={isOpen ? handleListboxKeyDown : handleButtonKeyDown}
          style={{
            width: '100%',
            padding: '8px 32px 8px 12px',
            border: `1px solid ${error ? '#d32f2f' : '#ccc'}`,
            borderRadius: '4px',
            backgroundColor: disabled ? '#f5f5f5' : '#fff',
            textAlign: 'left',
            fontSize: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            position: 'relative',
          }}
        >
          {selectedOption?.label || placeholder}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
              transition: 'transform 0.2s',
            }}
          >
            ▼
          </span>
        </button>

        {isOpen && (
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '200px',
              overflow: 'auto',
              margin: '4px 0 0 0',
              padding: 0,
              listStyle: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
            }}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                id={`${baseId}-option-${index}`}
                role="option"
                aria-selected={option.value === currentValue}
                aria-disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    index === activeIndex
                      ? '#e3f2fd'
                      : option.value === currentValue
                      ? '#f5f5f5'
                      : 'transparent',
                  opacity: option.disabled ? 0.5 : 1,
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#d32f2f' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';
