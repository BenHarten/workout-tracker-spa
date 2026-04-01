import { createContext, useContext, useCallback, useRef, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type {
  Config,
  TrainingRecordsStore,
  WorkoutTemplatesStore,
  ModalType,
  ToastState,
} from "../types";
import { DEFAULT_CONFIG } from "../types";
import { useState } from "react";

interface AppContextValue {
  config: Config;
  setConfig: (value: Config | ((prev: Config) => Config)) => void;
  records: TrainingRecordsStore;
  setRecords: (value: TrainingRecordsStore | ((prev: TrainingRecordsStore) => TrainingRecordsStore)) => void;
  templates: WorkoutTemplatesStore;
  setTemplates: (value: WorkoutTemplatesStore | ((prev: WorkoutTemplatesStore) => WorkoutTemplatesStore)) => void;
  isLoggedIn: boolean;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  toast: ToastState;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_RECORDS: TrainingRecordsStore = { records: {}, last_synced: "" };
const DEFAULT_TEMPLATES: WorkoutTemplatesStore = { templates: {}, last_synced: "" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useLocalStorage<Config>("wt_config", DEFAULT_CONFIG);
  const [records, setRecords] = useLocalStorage<TrainingRecordsStore>("wt_training_records", DEFAULT_RECORDS);
  const [templates, setTemplates] = useLocalStorage<WorkoutTemplatesStore>("wt_workout_templates", DEFAULT_TEMPLATES);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
  }, []);

  return (
    <AppContext.Provider
      value={{
        config, setConfig,
        records, setRecords,
        templates, setTemplates,
        isLoggedIn: !!config.token,
        activeModal, setActiveModal,
        toast, showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
