import type {
  TrainingRecordsStore,
  SpeedianceExercise,
  FinishedRep,
  RecordDetail,
} from "../types";

// ── Types ──────────────────────────────────────────────────────

export interface ExerciseSet {
  reps: number;
  weight: number;
  e1rm: number;
  isWeightPR: boolean;
  is1rmPR: boolean;
}

/** Speediance's per-exercise form metrics. Sub-scores are out of 5. */
export interface FormScores {
  /** Sum of the sub-scores below. */
  total?: number;
  completion?: number;
  forceControl?: number;
  amplitudeStable?: number;
  /** Only present for unilateral exercises. */
  bilateralBalance?: number;
  /** Speediance's own overall rating, 1–5. */
  rating?: number;
}

export interface ExerciseSession {
  date: string;
  recordId: string | number;
  /** Workout this session belonged to, for disambiguating shared exercises. */
  workoutName: string;
  sets: ExerciseSet[];
  isPR: boolean;
  /**
   * A markedly lighter session than recent work — a warmup, or a deload week.
   * Excluded from trend and PR detection but still counted everywhere else,
   * because the work genuinely happened. See markLightSessions.
   */
  isLight: boolean;
  scores?: FormScores;
}

export interface ExerciseSummary {
  name: string;
  displayName: string;
  lastPerformed: string;
  sessionCount: number;
  bestWeight: number;
  bestE1RM: number;
  /** Top-set weight per session, oldest first, capped to the recent window. */
  recentTopSets: number[];
  /**
   * Percentage change across `recentTopSets`. null when there is only one
   * session, or the first is zero — there is no baseline to divide by.
   */
  trendPct: number | null;
  /** Sessions excluded from the trend as warmups or deloads. */
  lightCount: number;
}

/** How many recent sessions the inline trend line covers. */
const TREND_WINDOW = 8;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/**
 * Direction of travel across the recent window, as a percentage.
 *
 * Compares the mean of the first half against the mean of the second rather
 * than first value against last. Many programmes alternate heavy and light days
 * for the same lift, and an endpoint comparison on that sawtooth reports a
 * dramatic swing that reflects only which kind of day happens to sit at each
 * end — a deadlift alternating 85/30 kg read as -64% while the actual trend was
 * flat. Halves average that alternation out.
 *
 * Returns null when there is too little data, or the baseline is zero.
 */
export function computeTrendPct(series: number[]): number | null {
  if (series.length < 4) {
    // Too short to halve meaningfully; fall back to endpoints.
    const first = series[0];
    const last = series[series.length - 1];
    if (series.length < 2 || !first) return null;
    return ((last - first) / first) * 100;
  }

  const mid = Math.floor(series.length / 2);
  const before = mean(series.slice(0, mid));
  const after = mean(series.slice(mid));
  if (before === 0) return null;
  return ((after - before) / before) * 100;
}

// ── Helpers ────────────────────────────────────────────────────

export function getExerciseName(ex: SpeedianceExercise): string {
  return ex.actionName || ex.actionLibraryName || "Unknown";
}

export function calculateE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function extractSetsFromExercise(ex: SpeedianceExercise): { reps: number; weight: number }[] {
  if (ex.setTrainingInfoList && ex.setTrainingInfoList.length > 0) {
    return ex.setTrainingInfoList.map((s) => ({
      reps: s.reps,
      weight: s.weight,
    }));
  }

  if (ex.finishedReps && ex.finishedReps.length > 0) {
    const sets: { reps: number; weight: number }[] = [];
    for (const rep of ex.finishedReps as FinishedRep[]) {
      const hasWeight =
        rep.trainingInfoDetail?.weights && rep.trainingInfoDetail.weights.length > 0;
      const isTime = rep.finishedCount === 0 && !hasWeight;
      if (isTime) continue; // skip timed-only sets
      sets.push({
        reps: rep.finishedCount,
        weight: hasWeight ? rep.trainingInfoDetail!.weights![0] : 0,
      });
    }
    return sets;
  }

  return [];
}

function getExercisesFromDetail(detail: RecordDetail): SpeedianceExercise[] {
  if (!detail || (typeof detail === "object" && Object.keys(detail).length === 0)) {
    return [];
  }
  if ("actionTrainingInfoList" in detail && detail.actionTrainingInfoList) {
    return detail.actionTrainingInfoList as SpeedianceExercise[];
  }
  if (Array.isArray(detail)) {
    return detail;
  }
  return [];
}

// ── Core logic ─────────────────────────────────────────────────

export function buildExerciseMap(
  store: TrainingRecordsStore
): Map<string, { displayName: string; sessions: ExerciseSession[] }> {
  const map = new Map<string, { displayName: string; sessions: ExerciseSession[] }>();

  const records = Object.values(store.records);
  for (const record of records) {
    const exercises = getExercisesFromDetail(record.detail);
    for (const ex of exercises) {
      const name = getExerciseName(ex);
      const key = name.toLowerCase();
      const rawSets = extractSetsFromExercise(ex);
      if (rawSets.length === 0) continue;

      const sets: ExerciseSet[] = rawSets.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        e1rm: calculateE1RM(s.weight, s.reps),
        isWeightPR: false,
        is1rmPR: false,
      }));

      const num = (v: unknown) => (typeof v === "number" ? v : undefined);
      const scores: FormScores = {
        total: num(ex.score),
        completion: num(ex.completionScore),
        forceControl: num(ex.forceControlScore),
        amplitudeStable: num(ex.amplitudeStableScore),
        bilateralBalance: num(ex.bilateralBalanceScore),
        rating: num(ex.actionRating),
      };
      const hasScores = Object.values(scores).some((v) => v !== undefined);

      const session: ExerciseSession = {
        date: record.date,
        recordId: record.id,
        workoutName: record.name,
        sets,
        isPR: false,
        isLight: false,
        scores: hasScores ? scores : undefined,
      };

      if (!map.has(key)) {
        map.set(key, { displayName: name, sessions: [] });
      }
      map.get(key)!.sessions.push(session);
    }
  }

  // Sort each exercise's sessions chronologically
  for (const entry of map.values()) {
    entry.sessions.sort((a, b) => a.date.localeCompare(b.date));
  }

  return map;
}

/** A session at or below this share of recent best counts as light. */
const LIGHT_LOAD_RATIO = 0.65;
/** How many preceding sessions establish the "recent best" reference. */
const LIGHT_REFERENCE_WINDOW = 6;

export function topSetWeight(session: ExerciseSession): number {
  return Math.max(0, ...session.sets.map((s) => s.weight));
}

/**
 * Flag sessions that are markedly lighter than recent work.
 *
 * Speediance records carry no warmup or deload marker — the same exercise on a
 * warmup day and a working day is byte-identical apart from the load — so this
 * is inferred: a session whose top set falls below LIGHT_LOAD_RATIO of the best
 * of the preceding LIGHT_REFERENCE_WINDOW sessions is treated as light.
 *
 * A rolling reference rather than an all-time max, so a genuine long-term
 * decline eventually re-baselines instead of flagging every later session.
 * Bodyweight and time-based work has no load to compare, so it is never light.
 *
 * Being a heuristic, it is surfaced in the UI rather than applied silently.
 */
export function markLightSessions(sessions: ExerciseSession[]): void {
  for (let i = 0; i < sessions.length; i++) {
    const top = topSetWeight(sessions[i]);
    if (top <= 0) {
      sessions[i].isLight = false;
      continue;
    }
    const start = Math.max(0, i - LIGHT_REFERENCE_WINDOW);
    const prior = sessions.slice(start, i).map(topSetWeight).filter((w) => w > 0);
    if (prior.length === 0) {
      sessions[i].isLight = false; // nothing to compare against yet
      continue;
    }
    const reference = Math.max(...prior);
    sessions[i].isLight = top < reference * LIGHT_LOAD_RATIO;
  }
}

export function detectPRs(sessions: ExerciseSession[]): void {
  let maxWeight = 0;
  let maxE1RM = 0;

  for (const session of sessions) {
    // A warmup or deload cannot set a record; skip without moving the baseline.
    if (session.isLight) continue;
    for (const set of session.sets) {
      if (set.weight > maxWeight) {
        maxWeight = set.weight;
        set.isWeightPR = true;
        session.isPR = true;
      }
      if (set.e1rm > maxE1RM) {
        maxE1RM = set.e1rm;
        set.is1rmPR = true;
        session.isPR = true;
      }
    }
  }
}

export function getExerciseSummaries(store: TrainingRecordsStore): ExerciseSummary[] {
  return getExerciseSummariesFromMap(buildExerciseMap(store));
}

/**
 * Summaries from an already-built map.
 *
 * buildExerciseMap walks every record and every exercise within it, so pages
 * that need both the map and the summaries should build once and call this
 * rather than paying for a second full traversal.
 */
export function getExerciseSummariesFromMap(
  map: Map<string, { displayName: string; sessions: ExerciseSession[] }>,
): ExerciseSummary[] {
  const summaries: ExerciseSummary[] = [];

  for (const [key, { displayName, sessions }] of map) {
    markLightSessions(sessions);

    let bestWeight = 0;
    let bestE1RM = 0;
    let lastPerformed = "";

    for (const session of sessions) {
      if (session.date > lastPerformed) lastPerformed = session.date;
      for (const set of session.sets) {
        if (set.weight > bestWeight) bestWeight = set.weight;
        if (set.e1rm > bestE1RM) bestE1RM = set.e1rm;
      }
    }

    /*
     * Trend runs over working sessions only. Mixing warmups in makes the series
     * alternate between loads that were never meant to be compared — the reason
     * a deadlift programmed heavy on one day and light on another read as a
     * steep decline.
     */
    const working = sessions.filter((s) => !s.isLight);
    const recentTopSets = working.slice(-TREND_WINDOW).map(topSetWeight);
    const lightCount = sessions.length - working.length;

    const trendPct = computeTrendPct(recentTopSets);

    summaries.push({
      name: key,
      displayName,
      lastPerformed,
      sessionCount: sessions.length,
      bestWeight,
      bestE1RM,
      recentTopSets,
      trendPct,
      lightCount,
    });
  }

  summaries.sort((a, b) => b.lastPerformed.localeCompare(a.lastPerformed));
  return summaries;
}

export function getExerciseData(
  store: TrainingRecordsStore,
  exerciseName: string
): { displayName: string; sessions: ExerciseSession[] } | null {
  const map = buildExerciseMap(store);
  const entry = map.get(exerciseName.toLowerCase());
  if (!entry) return null;
  // Order matters: PR detection skips light sessions, so classify first.
  markLightSessions(entry.sessions);
  detectPRs(entry.sessions);
  return entry;
}
