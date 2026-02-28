import { useEffect, useState } from 'react';

/**
 * Debounce a value by `delay` ms.
 * Returns the debounced value which updates only after the caller
 * stops changing the input for the specified delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
