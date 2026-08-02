import { useCallback, useRef, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Mirrors storedValue so a functional update can read the latest value
  // synchronously. setValue is the only writer, so this stays in step.
  const latest = useRef(storedValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue =
        value instanceof Function ? (value as (p: T) => T)(latest.current) : value;

      /*
       * Persist BEFORE updating state, and OUTSIDE the state updater.
       *
       * This used to run `localStorage.setItem` inside the setStoredValue
       * updater, i.e. during React's render phase. When the write threw — most
       * often Safari's QuotaExceededError, whose storage budget is far smaller
       * on mobile than on desktop — the error escaped into rendering, and with
       * no error boundary it unmounted the whole app: a blank screen, nothing
       * saved. Doing the write here means a failure throws in the caller's
       * event handler, which cannot unmount the tree, and callers that care
       * (the FitNote import) catch it and tell the user. State is left
       * untouched on failure, so it never drifts from what is persisted.
       */
      localStorage.setItem(key, JSON.stringify(newValue));
      latest.current = newValue;
      setStoredValue(newValue);
    },
    [key],
  );

  return [storedValue, setValue];
}
