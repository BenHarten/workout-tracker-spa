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

// ── Exercise Library ────────────────────────────────────────────

export interface ExerciseGroup {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  isUnilateral: boolean;
  actionLibraryList: Array<{ id: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface ExerciseLibraryStore {
  device_type: number;
  fetched_at: string;
  tabs: Array<{ id: number; name: string }>;
  exercises: ExerciseGroup[];
}

// ── Template Editor ─────────────────────────────────────────────

export interface EditorSet {
  reps: number;
  weight: number;
  rest: number;
  mode: number;
  unit: "reps" | "sec";
}

export interface EditorExercise {
  groupId: number;
  actionLibraryId: number;
  presetId: -1 | 1 | 3 | 5;
  isUnilateral: boolean;
  name: string;
  sets: EditorSet[];
}

export const PRESET_RULES = {
  "-1": { label: "KG", step: 0.5, defW: 10, minW: 3.5, maxW: 100, defR: 10, minR: 1,  maxR: 99, defRest: 60 },
  "1":  { label: "RM", step: 1,   defW: 13, minW: 9,   maxW: 13,  defR: 12, minR: 8,  maxR: 12, defRest: 60 },
  "3":  { label: "RM", step: 1,   defW: 17, minW: 15,  maxW: 20,  defR: 15, minR: 13, maxR: 20, defRest: 45 },
  "5":  { label: "RM", step: 1,   defW: 7,  minW: 4,   maxW: 9,   defR: 6,  minR: 2,  maxR: 8,  defRest: 90 },
} as const;

export type PresetId = keyof typeof PRESET_RULES;
