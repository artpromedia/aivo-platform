import React, { forwardRef, useId, useState, useCallback } from 'react';

export interface AccessibleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  error?: string;
  description?: string;
  hideLabel?: boolean;
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  descriptionClassName?: string;
  wrapperClassName?: string;
}

/**
 * Accessible input component
 *
 * Features:
 * - Associated label
 * - Error messages linked via aria-describedby
 * - Description text linked via aria-describedby
 * - Required indicator
 * - Invalid state
 *
 * @example
 * <AccessibleInput
 *   label="Email"
 *   type="email"
 *   error={errors.email}
 *   required
 * />
 */
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      error,
      description,
      hideLabel = false,
      onChange,
      inputClassName,
      labelClassName,
      errorClassName,
      descriptionClassName,
      wrapperClassName,
      required,
      disabled,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const baseId = useId();
    const inputId = providedId || `${baseId}-input`;
    const errorId = `${baseId}-error`;
    const descriptionId = `${baseId}-description`;

    const [isTouched, setIsTouched] = useState(false);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value, e);
      },
      [onChange]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsTouched(true);
        props.onBlur?.(e);
      },
      [props.onBlur]
    );

    const showError = isTouched && error;

    const describedBy = [
      description ? descriptionId : null,
      showError ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={wrapperClassName} style={{ marginBottom: '16px' }}>
        <label
          htmlFor={inputId}
          className={labelClassName}
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
            className={descriptionClassName}
            style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              color: '#666',
            }}
          >
            {description}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-required={required}
          aria-invalid={showError ? true : undefined}
          aria-describedby={describedBy}
          aria-errormessage={showError ? errorId : undefined}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputClassName}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${showError ? '#d32f2f' : '#ccc'}`,
            borderRadius: '4px',
            fontSize: '16px',
            ...(disabled && {
              backgroundColor: '#f5f5f5',
              cursor: 'not-allowed',
            }),
          }}
          {...props}
        />

        {showError && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className={errorClassName}
            style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#d32f2f',
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';
