// ── Config ──────────────────────────────────────────────────────

export interface Config {
  user_id: string;
  token: string;
  region: "EU" | "Global";
  unit: number;
  device_type: number; // 1 = GymMonster, 2 = GymPal
  /** Target sessions per week, for the dashboard ring. Optional for configs
   *  persisted before this existed. */
  weekly_goal?: number;
}

export const DEFAULT_WEEKLY_GOAL = 3;

export const DEFAULT_CONFIG: Config = {
  user_id: "",
  token: "",
  region: "EU",
  unit: 0,
  device_type: 1,
  weekly_goal: DEFAULT_WEEKLY_GOAL,
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

/** User's theme preference. "auto" follows the OS via prefers-color-scheme. */
export type ThemePref = "light" | "dark" | "auto";

/** The theme actually applied, after resolving "auto". */
export type ResolvedTheme = "light" | "dark";

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
  actionLibraryList: Array<{ id: number }>;
  mainMuscleGroupName: string;
  accessories: string;
  // isUnilateral is NOT cached — only available from the detail endpoint
}

export interface ExerciseStep {
  context: string;
  img: string;
}

export interface ExerciseVariant {
  id: number;
  videoPath?: string;
  leftVideo?: string;
  rightVideo?: string;
}

export interface ExerciseDetail {
  id: number;
  isUnilateral: boolean;
  showDetails: ExerciseStep[];
  actionLibraryList: ExerciseVariant[];
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

/**
 * A training preset as the API defines it, returned inline on every exercise
 * as `templatePresetList`.
 *
 * Presets come in two shapes, distinguished by which fields are present:
 *  - load-based (Training tab): `weight` + `trainingCount` and their scopes.
 *  - time-based (Bodyweight tab): `trainingTime` and its scope, no load at all.
 *
 * Do not hardcode the set of presets — the API ships more than the handful any
 * one tab exposes, and an unmodelled id used to crash the editor outright.
 */
export interface TemplatePreset {
  id: number;
  tabId?: number;
  presetId?: number;
  name: string;
  groupCount?: number;

  // Load-based
  weight?: number;
  weightScopeStart?: number;
  weightScopeEnd?: number;
  trainingCount?: number;
  trainingCountScopeStart?: number;
  trainingCountScopeEnd?: number;
  percent1rm?: number;

  // Time-based
  trainingTime?: number;
  trainingTimeScopeStart?: number;
  trainingTimeScopeEnd?: number;

  relaxTime?: number;
  relaxTimeScopeStart?: number;
  relaxTimeScopeEnd?: number;
}

/** Sentinel for the app's own free-entry mode; not a preset the API defines. */
export const CUSTOM_KG_PRESET_ID = -1;

/** Normalised, app-facing editing rules derived from a TemplatePreset. */
export interface PresetRules {
  id: number;
  name: string;
  /** "load" shows a weight/RM column; "time" replaces reps with a duration. */
  kind: "load" | "time";
  /** Header for the load column. Undefined when kind === "time". */
  loadLabel?: string;
  step: number;
  defW: number;
  minW: number;
  maxW: number;
  /** Reps, or seconds when kind === "time". */
  defR: number;
  minR: number;
  maxR: number;
  defRest: number;
}

export interface EditorExercise {
  groupId: number;
  actionLibraryId: number;
  /** Preset id, or CUSTOM_KG_PRESET_ID. Deliberately a plain number — the API
   *  defines presets we do not enumerate. */
  presetId: number;
  /** Presets this exercise offers, straight from the API. May be empty for
   *  exercises freshly added from the library, which fall back to Custom KG. */
  presets: TemplatePreset[];
  isUnilateral: boolean;
  name: string;
  sets: EditorSet[];
}
