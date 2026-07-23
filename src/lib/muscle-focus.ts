import type {
  ExerciseMuscleStore,
  SpeedianceExercise,
  TrainingRecord,
  TrainingRecordsStore,
} from "../types";

/**
 * Per-muscle training volume.
 *
 * Speediance has no muscle-report endpoint. Volume is derived by joining each
 * exercise in a training record to its muscle metadata via
 * `actionLibraryGroupId`, then crediting that exercise's full `totalCapacity`
 * to every muscle it engages.
 *
 * Volume is deliberately NOT split between primary and auxiliary muscles: a
 * bench press credits its whole volume to Pecs and Triceps and Front Delts. The
 * per-muscle totals therefore sum to roughly 2.5x session volume, which is
 * expected — these are engagement figures, not a partition of work done.
 *
 * This reproduces a third-party client's published figures exactly, 14 of 14
 * muscles over a 30-day window. See docs/speediance-api.md.
 */

/** The 16 muscles Speediance models. Note there is no id 16. */
export const MUSCLE_NAMES = [
  "Lats", "Pecs", "Front Delts", "Side Delts", "Rear Delts", "Biceps",
  "Triceps", "Quads", "Hamstrings", "Glutes", "Abs", "Forearms",
  "Calves", "Traps", "Adductors", "Back Extensors",
] as const;

export type MuscleName = (typeof MUSCLE_NAMES)[number];

/*
 * Grouping for the push/pull split.
 *
 * Stabilisers are deliberately in neither group: forearms are grip work
 * engaged in pushing as much as pulling, and abs brace throughout, so
 * crediting their full volume to one side skews the ratio. Excluding them
 * also reproduces the reference implementation's figure exactly (34/66 on
 * this data; including forearms gives 32/68).
 */
const PUSH: ReadonlySet<string> = new Set(["Pecs", "Front Delts", "Side Delts", "Triceps"]);
const PULL: ReadonlySet<string> = new Set([
  "Lats", "Rear Delts", "Biceps", "Traps", "Back Extensors",
]);
const LOWER: ReadonlySet<string> = new Set([
  "Quads", "Hamstrings", "Glutes", "Calves", "Adductors",
]);

export interface MuscleVolume {
  name: string;
  volumeKg: number;
  /** Distinct days this muscle was trained in the window. */
  days: number;
  lastTrained: string | null;
}

export interface MuscleFocus {
  muscles: MuscleVolume[];
  trained: number;
  total: number;
  untrained: string[];
  pushPull: { push: number; pull: number };
  upperLower: { upper: number; lower: number };
  /** Exercise entries whose muscles could not be resolved. */
  unresolvedEntries: number;
  sessions: number;
  windowDays: number;
}

function exercisesOf(record: TrainingRecord): SpeedianceExercise[] {
  const d = record.detail;
  if (Array.isArray(d)) return d;
  if (d && "actionTrainingInfoList" in d) {
    return (d.actionTrainingInfoList ?? []) as SpeedianceExercise[];
  }
  return [];
}

export function getMuscleFocus(
  store: TrainingRecordsStore,
  muscleStore: ExerciseMuscleStore | null,
  windowDays: number,
  today: string,
): MuscleFocus {
  const from = (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - windowDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const volume = new Map<string, number>();
  const days = new Map<string, Set<string>>();
  const last = new Map<string, string>();
  let unresolvedEntries = 0;
  let sessions = 0;

  for (const record of Object.values(store.records)) {
    if (record.date < from || record.date > today) continue;
    sessions++;

    for (const ex of exercisesOf(record)) {
      const groupId = ex.actionLibraryGroupId;
      const meta = groupId != null ? muscleStore?.byGroupId[String(groupId)] : undefined;
      if (!meta || meta.muscles.length === 0) {
        unresolvedEntries++;
        continue;
      }

      const capacity = typeof ex.totalCapacity === "number" ? ex.totalCapacity : 0;
      for (const muscle of meta.muscles) {
        volume.set(muscle, (volume.get(muscle) ?? 0) + capacity);
        if (!days.has(muscle)) days.set(muscle, new Set());
        days.get(muscle)!.add(record.date);
        const prev = last.get(muscle);
        if (!prev || record.date > prev) last.set(muscle, record.date);
      }
    }
  }

  const muscles: MuscleVolume[] = MUSCLE_NAMES.map((name) => ({
    name,
    volumeKg: volume.get(name) ?? 0,
    days: days.get(name)?.size ?? 0,
    lastTrained: last.get(name) ?? null,
  })).sort((a, b) => b.volumeKg - a.volumeKg);

  const sum = (pred: (m: MuscleVolume) => boolean) =>
    muscles.filter(pred).reduce((t, m) => t + m.volumeKg, 0);

  return {
    muscles,
    trained: muscles.filter((m) => m.days > 0).length,
    total: MUSCLE_NAMES.length,
    untrained: muscles.filter((m) => m.days === 0).map((m) => m.name),
    pushPull: { push: sum((m) => PUSH.has(m.name)), pull: sum((m) => PULL.has(m.name)) },
    upperLower: { upper: sum((m) => !LOWER.has(m.name)), lower: sum((m) => LOWER.has(m.name)) },
    unresolvedEntries,
    sessions,
    windowDays,
  };
}

/** Ids referenced by records, for fetching only the metadata actually needed. */
export function referencedGroupIds(store: TrainingRecordsStore): number[] {
  const ids = new Set<number>();
  for (const record of Object.values(store.records)) {
    for (const ex of exercisesOf(record)) {
      if (typeof ex.actionLibraryGroupId === "number") ids.add(ex.actionLibraryGroupId);
    }
  }
  return [...ids];
}
