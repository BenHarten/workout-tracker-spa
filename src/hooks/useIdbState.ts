import { useCallback, useRef, useState } from "react";
import { idbGetMigrating, idbSet } from "../lib/idb";

/**
 * React state backed by IndexedDB, for the app's large synced stores.
 *
 * Mirrors the shape of useLocalStorage, but persistence is asynchronous:
 *
 *  - `value` / `setValue` behave like useState, and `setValue` supports the
 *    functional-updater form. A `useRef` mirror lets an updater read the latest
 *    value synchronously without waiting for React to commit — the same pattern
 *    useLocalStorage uses to keep writes out of the render phase.
 *  - the write happens after the state update via `idbSet(...).catch(onError)`.
 *    Because IndexedDB is async, a failure surfaces through the callback instead
 *    of throwing into render, so it can never blank the app.
 *  - `hydrate()` loads the persisted value (migrating it out of localStorage on
 *    first run). The caller gates rendering on hydration so consumers never see
 *    the default flash past before the real data arrives.
 */
export function useIdbState<T>(
  key: string,
  defaultValue: T,
  onError: (err: unknown) => void,
): [T, (value: T | ((prev: T) => T)) => void, () => Promise<void>] {
  const [value, setStateValue] = useState<T>(defaultValue);
  const latest = useRef(value);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = next instanceof Function ? (next as (p: T) => T)(latest.current) : next;
      latest.current = resolved;
      setStateValue(resolved);
      idbSet(key, resolved).catch(onError);
    },
    [key, onError],
  );

  const hydrate = useCallback(async () => {
    const loaded = await idbGetMigrating(key, defaultValue);
    latest.current = loaded;
    setStateValue(loaded);
    // defaultValue is a stable module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue, hydrate];
}
