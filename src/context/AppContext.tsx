import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useIdbState } from "../hooks/useIdbState";
import type {
  Config,
  TrainingRecordsStore,
  WorkoutTemplatesStore,
  ExerciseLibraryStore,
  ExerciseMuscleStore,
  ModalType,
  ResolvedTheme,
  ThemePref,
  ToastState,
} from "../types";
import { DEFAULT_CONFIG } from "../types";
import { THEME_STORAGE_KEY, useTheme } from "../hooks/useTheme";
import { useState } from "react";

interface AppContextValue {
  config: Config;
  setConfig: (value: Config | ((prev: Config) => Config)) => void;
  records: TrainingRecordsStore;
  setRecords: (value: TrainingRecordsStore | ((prev: TrainingRecordsStore) => TrainingRecordsStore)) => void;
  templates: WorkoutTemplatesStore;
  setTemplates: (value: WorkoutTemplatesStore | ((prev: WorkoutTemplatesStore) => WorkoutTemplatesStore)) => void;
  exerciseLibrary: ExerciseLibraryStore | null;
  setExerciseLibrary: (value: ExerciseLibraryStore | null) => void;
  /** Muscle metadata for exercises in the user's records; powers muscle focus. */
  exerciseMuscles: ExerciseMuscleStore | null;
  setExerciseMuscles: (value: ExerciseMuscleStore | null) => void;
  isLoggedIn: boolean;
  /** User preference; may be "auto". */
  themePref: ThemePref;
  setThemePref: (value: ThemePref) => void;
  /** Theme actually applied, after resolving "auto". Chart colours key off this. */
  resolvedTheme: ResolvedTheme;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  toast: ToastState;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_RECORDS: TrainingRecordsStore = { records: {}, last_synced: "" };
const DEFAULT_TEMPLATES: WorkoutTemplatesStore = { templates: {}, last_synced: "" };

export function AppProvider({ children }: { children: ReactNode }) {
  // Small, synchronously-read preferences stay on localStorage.
  const [config, setConfig] = useLocalStorage<Config>("wt_config", DEFAULT_CONFIG);
  const [themePref, setThemePref] = useLocalStorage<ThemePref>(THEME_STORAGE_KEY, "auto");

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
  }, []);

  /*
   * The bulk synced stores live in IndexedDB — they run to several MB, which
   * overruns localStorage's quota on mobile. Writes report failures through
   * this callback rather than throwing into render.
   */
  const onStoreError = useCallback(
    () =>
      showToast(
        "Couldn't save — this device's browser storage is full.",
        "error",
      ),
    [showToast],
  );

  const [records, setRecords, hydrateRecords] = useIdbState<TrainingRecordsStore>("wt_training_records", DEFAULT_RECORDS, onStoreError);
  const [templates, setTemplates, hydrateTemplates] = useIdbState<WorkoutTemplatesStore>("wt_workout_templates", DEFAULT_TEMPLATES, onStoreError);
  const [exerciseLibrary, setExerciseLibrary, hydrateLibrary] = useIdbState<ExerciseLibraryStore | null>("wt_exercise_library", null, onStoreError);
  const [exerciseMuscles, setExerciseMuscles, hydrateMuscles] = useIdbState<ExerciseMuscleStore | null>("wt_exercise_muscles", null, onStoreError);

  const resolvedTheme = useTheme(themePref);

  // Load the IndexedDB-backed stores once, migrating them out of localStorage
  // on first run. Rendering is gated on this so pages never see the defaults
  // flash past before the real data arrives.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([hydrateRecords(), hydrateTemplates(), hydrateLibrary(), hydrateMuscles()])
      .catch(onStoreError)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrateRecords, hydrateTemplates, hydrateLibrary, hydrateMuscles, onStoreError]);

  return (
    <AppContext.Provider
      value={{
        config, setConfig,
        records, setRecords,
        templates, setTemplates,
        exerciseLibrary, setExerciseLibrary,
        exerciseMuscles, setExerciseMuscles,
        isLoggedIn: !!config.token,
        themePref, setThemePref,
        resolvedTheme,
        activeModal, setActiveModal,
        toast, showToast,
      }}
    >
      {hydrated ? children : <AppLoading />}
    </AppContext.Provider>
  );
}

/** Brief hold while the IndexedDB-backed stores load; typically a few frames. */
function AppLoading() {
  return (
    <div className="app-loading">
      <span className="spinner" />
    </div>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
