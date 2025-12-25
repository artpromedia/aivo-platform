import { useCallback, useId, useMemo } from 'react';

interface FieldError {
  message: string;
  type?: string;
}

interface UseAccessibleFormOptions {
  errors?: Record<string, FieldError | undefined>;
  touched?: Record<string, boolean>;
}

interface FieldProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-errormessage'?: string;
}

interface LabelProps {
  htmlFor: string;
  id: string;
}

interface ErrorProps {
  id: string;
  role: 'alert';
  'aria-live': 'polite';
}

interface DescriptionProps {
  id: string;
}

/**
 * Hook for creating accessible form fields
 */
export function useAccessibleForm(options: UseAccessibleFormOptions = {}) {
  const { errors = {}, touched = {} } = options;
  const baseId = useId();

  const getFieldIds = useCallback(
    (name: string) => {
      const fieldId = `${baseId}-${name}`;
      return {
        fieldId,
        labelId: `${fieldId}-label`,
        errorId: `${fieldId}-error`,
        descriptionId: `${fieldId}-description`,
      };
    },
    [baseId]
  );

  const getFieldProps = useCallback(
    (
      name: string,
      additionalProps?: { required?: boolean; description?: string }
    ): FieldProps => {
      const ids = getFieldIds(name);
      const hasError = touched[name] && errors[name];
      const describedBy: string[] = [];

      if (additionalProps?.description) {
        describedBy.push(ids.descriptionId);
      }
      if (hasError) {
        describedBy.push(ids.errorId);
      }

      return {
        id: ids.fieldId,
        ...(describedBy.length > 0 && {
          'aria-describedby': describedBy.join(' '),
        }),
        ...(hasError && { 'aria-invalid': true, 'aria-errormessage': ids.errorId }),
        ...(additionalProps?.required && { 'aria-required': true }),
      };
    },
    [getFieldIds, errors, touched]
  );

  const getLabelProps = useCallback(
    (name: string): LabelProps => {
      const ids = getFieldIds(name);
      return {
        htmlFor: ids.fieldId,
        id: ids.labelId,
      };
    },
    [getFieldIds]
  );

  const getErrorProps = useCallback(
    (name: string): ErrorProps => {
      const ids = getFieldIds(name);
      return {
        id: ids.errorId,
        role: 'alert',
        'aria-live': 'polite',
      };
    },
    [getFieldIds]
  );

  const getDescriptionProps = useCallback(
    (name: string): DescriptionProps => {
      const ids = getFieldIds(name);
      return {
        id: ids.descriptionId,
      };
    },
    [getFieldIds]
  );

  const hasError = useCallback(
    (name: string): boolean => {
      return Boolean(touched[name] && errors[name]);
    },
    [touched, errors]
  );

  const getError = useCallback(
    (name: string): string | undefined => {
      if (touched[name] && errors[name]) {
        return errors[name]?.message;
      }
      return undefined;
    },
    [touched, errors]
  );

  return {
    getFieldProps,
    getLabelProps,
    getErrorProps,
    getDescriptionProps,
    hasError,
    getError,
    getFieldIds,
  };
}

/**
 * Hook for a single form field
 */
export function useAccessibleField(
  name: string,
  options?: {
    error?: string;
    touched?: boolean;
    required?: boolean;
    description?: string;
  }
) {
  const baseId = useId();

  const ids = useMemo(
    () => ({
      fieldId: `${baseId}-${name}`,
      labelId: `${baseId}-${name}-label`,
      errorId: `${baseId}-${name}-error`,
      descriptionId: `${baseId}-${name}-description`,
    }),
    [baseId, name]
  );

  const hasError = options?.touched && options?.error;

  const describedBy = useMemo(() => {
    const parts: string[] = [];
    if (options?.description) parts.push(ids.descriptionId);
    if (hasError) parts.push(ids.errorId);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }, [options?.description, hasError, ids]);

  const fieldProps = useMemo(
    () => ({
      id: ids.fieldId,
      'aria-describedby': describedBy,
      'aria-invalid': hasError || undefined,
      'aria-required': options?.required || undefined,
      'aria-errormessage': hasError ? ids.errorId : undefined,
    }),
    [ids.fieldId, ids.errorId, describedBy, hasError, options?.required]
  );

  const labelProps = useMemo(
    () => ({
      htmlFor: ids.fieldId,
      id: ids.labelId,
    }),
    [ids]
  );

  const errorProps = useMemo(
    () => ({
      id: ids.errorId,
      role: 'alert' as const,
      'aria-live': 'polite' as const,
    }),
    [ids.errorId]
  );

  const descriptionProps = useMemo(
    () => ({
      id: ids.descriptionId,
    }),
    [ids.descriptionId]
  );

  return {
    ids,
    fieldProps,
    labelProps,
    errorProps,
    descriptionProps,
    hasError: Boolean(hasError),
    error: hasError ? options?.error : undefined,
  };
}

/**
 * Hook for form validation announcements
 */
export function useFormValidation() {
  const { announceError, announceSuccess } = useAnnounce();

  const announceValidationResult = useCallback(
    (errors: Record<string, string>) => {
      const errorList = Object.values(errors).filter(Boolean);

      if (errorList.length === 0) {
        announceSuccess('Form is valid');
      } else if (errorList.length === 1) {
        announceError(errorList[0]);
      } else {
        announceError(
          `${errorList.length} validation errors. First error: ${errorList[0]}`
        );
      }
    },
    [announceError, announceSuccess]
  );

  const announceFieldError = useCallback(
    (fieldName: string, error: string) => {
      announceError(`${fieldName}: ${error}`);
    },
    [announceError]
  );

  return {
    announceValidationResult,
    announceFieldError,
  };
}

// Import for the hook above
import { useAnnounce } from './useAnnounce';
