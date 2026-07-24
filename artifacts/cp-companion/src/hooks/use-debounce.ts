import { useEffect, useRef, useState } from 'react';

/**
 * Debounce hook — delays value updates until after `delay` ms of inactivity
 * Used for: search input, autocomplete triggers
 *
 * Time Complexity: O(1) per call
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Debounced callback — executes callback only after delay ms of inactivity
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (...args: Parameters<T>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => callback(...args), delay);
  };
}
