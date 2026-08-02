/**
 * Minimal promise-based key/value store over IndexedDB.
 *
 * The app's synced data (training records especially) runs to several MB, which
 * overruns localStorage's ~5 MB per-origin cap on mobile Safari and used to
 * crash the FitNote import. IndexedDB has a far larger quota, so the bulk stores
 * live here instead. Small preferences (theme, config, passcode) stay on
 * localStorage — they must be read synchronously, and they are tiny.
 *
 * This is a deliberately small hand-rolled keyval wrapper (one database, one
 * object store) rather than a dependency; the app only needs get/set/delete.
 */

const DB_NAME = "liftlog";
const STORE = "keyval";
const VERSION = 1;

// Resolves to the database, or to null if IndexedDB cannot be opened at all
// (e.g. some locked-down privacy modes). Computed once. When null, every call
// falls back to localStorage so the app still runs.
let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const req = fn(transaction.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** localStorage fallback, used only when IndexedDB is unavailable. */
function lsGet<T>(key: string): T | undefined {
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  if (!db) return lsGet<T>(key);
  return tx<T | undefined>(db, "readonly", (s) => s.get(key));
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  if (!db) {
    // No IndexedDB — this can still throw QuotaExceededError, which the caller
    // handles, but at least the app is not silently broken.
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  // A rejection here (e.g. quota exceeded at IndexedDB's much larger limit) is
  // propagated so the caller can report it — the same contract as before.
  await tx(db, "readwrite", (s) => s.put(value, key));
}

export async function idbDel(key: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    localStorage.removeItem(key);
    return;
  }
  await tx(db, "readwrite", (s) => s.delete(key));
}

/**
 * Read a key, migrating it out of localStorage on first run.
 *
 * If the value already lives in IndexedDB, return it. Otherwise, if an older
 * build left it in localStorage, copy it into IndexedDB and delete the
 * localStorage copy to reclaim that space, then return it. Falls back to the
 * default when neither has it.
 */
export async function idbGetMigrating<T>(key: string, defaultValue: T): Promise<T> {
  const existing = await idbGet<T>(key);
  if (existing !== undefined) return existing;

  const raw = localStorage.getItem(key);
  if (raw == null) return defaultValue;

  let parsed: T;
  try {
    parsed = JSON.parse(raw) as T;
  } catch {
    // Corrupt/unparseable — nothing to recover; drop it.
    localStorage.removeItem(key);
    return defaultValue;
  }

  // Only delete the localStorage copy once the IndexedDB write has succeeded.
  // If it fails, keep the copy and return the data anyway, so this session
  // still works and the next load can retry the migration.
  try {
    await idbSet(key, parsed);
    localStorage.removeItem(key);
  } catch {
    /* keep the localStorage copy for a later retry */
  }
  return parsed;
}
