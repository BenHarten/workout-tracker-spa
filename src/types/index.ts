// ── Config ──────────────────────────────────────────────────────

export interface Config {
  user_id: string;
  token: string;
  region: "EU" | "Global";
  unit: number;
  device_type: number; // 1 = GymMonster, 2 = GymPal
}

export const DEFAULT_CONFIG: Config = {
  user_id: "",
  token: "",
  region: "EU",
  unit: 0,
  device_type: 1,
};

// ── Training Records ────────────────────────────────────────────

export type RecordType = "custom" | "plan" | "course" | "fitnote" | null;

export interface SetInfo {
  reps: number;
  weight: number;
}

export interface TrainingInfoDetail {
  weights?: number[];
  leftWatts?: number[];
  rightWatts?: number[];
  leftAmplitudes?: number[];
  rightAmplitudes?: number[];
  [key: string]: unknown;
}

export interface FinishedRep {
  id: number;
  finishedCount: number;
  targetCount: number;
  capacity: number;
  time: number;
  trainingInfoDetail?: TrainingInfoDetail;
}

export interface FitNoteExercise {
  actionName: string;
  category: string;
  setTrainingInfoList: SetInfo[];
}

export interface SpeedianceExercise {
  actionLibraryName?: string;
  actionName?: string;
  actionLibraryGroupId?: number;
  score?: number;
  totalCapacity?: number;
  maxWeight?: number;
  finishedReps?: FinishedRep[];
  setTrainingInfoList?: SetInfo[];
  [key: string]: unknown;
}

export type RecordDetail =
  | SpeedianceExercise[]
  | { actionTrainingInfoList: (FitNoteExercise | SpeedianceExercise)[] }
  | Record<string, never>;

export interface TrainingRecord {
  id: number | string;
  training_id: number | null;
  date: string;
  name: string;
  duration: number;
  calories: number;
  capacity: number;
  type: RecordType;
  start_time: string;
  end_time: string;
  detail: RecordDetail;
  session_info: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface TrainingRecordsStore {
  records: Record<string, TrainingRecord>;
  last_synced: string;
  last_fitnote_import?: string;
}

// ── Workout Templates ───────────────────────────────────────────

export interface TemplateExercise {
  title: string;
  setsAndReps: string;
  weights?: string;
  breakTime2?: string;
  img?: string;
  isBarbell?: number;
  mainMuscleGroupName?: string;
  context?: string;
  [key: string]: unknown;
}

export interface WorkoutTemplate {
  code: string;
  id?: number;
  name: string;
  device_type: number;
  exercises: TemplateExercise[];
  raw?: Record<string, unknown>;
  detail?: Record<string, unknown>;
}

export interface WorkoutTemplatesStore {
  templates: Record<string, WorkoutTemplate>;
  last_synced: string;
}

// ── App State ───────────────────────────────────────────────────

export type ModalType = "settings" | "sync" | null;

export interface ToastState {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
}
