import type { TrainingRecord, TrainingRecordsStore } from "../types";
import { addDays, dateToStr, parseDateStr, startOfWeek } from "./calendar";
import { buildExerciseMap, detectPRs } from "./exercise-progress";

/**
 * Aggregate training statistics.
 *
 * Pure functions over the record store, in the same shape as
 * exercise-progress.ts — consumers memoise at the page level.
 *
 * ## Metric coverage
 *
 * `capacity` (volume) is populated for every record regardless of source, so
 * volume is the only metric with complete coverage and the one safe to headline.
 *
 * `duration` and `calories` are 0 for every FitNote-imported record, because
 * that export carries neither. Those zeroes are missing data, not real values:
 * summing them silently depresses every total. So sums here include only
 * records that actually carry the field, and each is reported alongside a
 * coverage fraction. Any tile showing time or calories at coverage < 1 must say
 * so ("N of M sessions"); averages must divide by the contributor count, never
 * by the session count.
 *
 * ## Dates
 *
 * All dates are `YYYY-MM-DD` and compared lexicographically, which is correct
 * for that format and avoids constructing Dates (and the timezone bugs that
 * come with them) in hot paths.
 */

export type Bucket = "day" | "week" | "month" | "year";

export interface PeriodStats {
  sessions: number;
  /** Sum of `capacity`. Full coverage across all sources. */
  volumeKg: number;
  /** Sum over records carrying calories. See caloriesCoverage. */
  calories: number;
  /** Sum over records carrying a duration, in seconds. See durationCoverage. */
  durationSec: number;
  /** 0..1 — contributing records / total records. 0 when there are none. */
  caloriesCoverage: number;
  durationCoverage: number;
}

export interface DateRange {
  /** Inclusive `YYYY-MM-DD`. */
  from: string;
  /** Inclusive `YYYY-MM-DD`. */
  to: string;
}

export interface BucketPoint {
  key: string;
  label: string;
  range: DateRange;
  stats: PeriodStats;
}

export interface Delta {
  abs: number;
  /** null when the previous period was zero — render "—", never "+∞%". */
  pct: number | null;
  direction: "up" | "down" | "flat" | "none";
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastWorkoutDate: string | null;
}

export interface PRFeedItem {
  exercise: string;
  displayName: string;
  date: string;
  kind: "weight" | "e1rm";
  value: number;
}

const EMPTY_STATS: PeriodStats = {
  sessions: 0,
  volumeKg: 0,
  calories: 0,
  durationSec: 0,
  caloriesCoverage: 0,
  durationCoverage: 0,
};

// ── Selection ──────────────────────────────────────────────────

/** All records, oldest first. */
export function allRecords(store: TrainingRecordsStore): TrainingRecord[] {
  return Object.values(store.records).sort((a, b) => a.date.localeCompare(b.date));
}

export function recordsInRange(records: TrainingRecord[], range: DateRange): TrainingRecord[] {
  return records.filter((r) => r.date >= range.from && r.date <= range.to);
}

// ── Aggregation ────────────────────────────────────────────────

export function aggregate(records: TrainingRecord[]): PeriodStats {
  if (records.length === 0) return { ...EMPTY_STATS };

  let volumeKg = 0;
  let calories = 0;
  let durationSec = 0;
  let calorieContributors = 0;
  let durationContributors = 0;

  for (const r of records) {
    volumeKg += r.capacity || 0;
    // > 0 rather than != null: FitNote writes a literal 0 for "no data".
    if (r.calories > 0) {
      calories += r.calories;
      calorieContributors++;
    }
    if (r.duration > 0) {
      durationSec += r.duration;
      durationContributors++;
    }
  }

  return {
    sessions: records.length,
    volumeKg,
    calories,
    durationSec,
    caloriesCoverage: calorieContributors / records.length,
    durationCoverage: durationContributors / records.length,
  };
}

// ── Ranges ─────────────────────────────────────────────────────

/** The bucket-sized range containing `today`. */
export function currentPeriodRange(bucket: Bucket, today = todayStr()): DateRange {
  const d = parseDateStr(today);
  switch (bucket) {
    case "day":
      return { from: today, to: today };
    case "week": {
      const from = startOfWeek(today);
      return { from, to: addDays(from, 6) };
    }
    case "month": {
      const from = dateToStr(new Date(d.getFullYear(), d.getMonth(), 1));
      const to = dateToStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      return { from, to };
    }
    case "year":
      return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
  }
}

/** The equally-long window immediately before `range`. */
export function previousRange(range: DateRange): DateRange {
  const days = daysBetween(range.from, range.to);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -days), to };
}

function daysBetween(from: string, to: string): number {
  const ms = parseDateStr(to).getTime() - parseDateStr(from).getTime();
  return Math.round(ms / 86_400_000);
}

// ── Bucketing ──────────────────────────────────────────────────

function bucketKey(date: string, bucket: Bucket): string {
  switch (bucket) {
    case "day":
      return date;
    case "week":
      return startOfWeek(date);
    case "month":
      return date.slice(0, 7);
    case "year":
      return date.slice(0, 4);
  }
}

function bucketLabel(key: string, bucket: Bucket): string {
  switch (bucket) {
    case "day":
      return parseDateStr(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "week":
      return parseDateStr(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "month":
      return parseDateStr(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    case "year":
      return key;
  }
}

function nextBucketStart(key: string, bucket: Bucket): string {
  switch (bucket) {
    case "day":
      return addDays(key, 1);
    case "week":
      return addDays(key, 7);
    case "month": {
      const [y, m] = key.split("-").map(Number);
      return dateToStr(new Date(y, m, 1)).slice(0, 7);
    }
    case "year":
      return String(Number(key) + 1);
  }
}

function bucketRange(key: string, bucket: Bucket): DateRange {
  switch (bucket) {
    case "day":
      return { from: key, to: key };
    case "week":
      return { from: key, to: addDays(key, 6) };
    case "month": {
      const [y, m] = key.split("-").map(Number);
      return { from: `${key}-01`, to: dateToStr(new Date(y, m, 0)) };
    }
    case "year":
      return { from: `${key}-01-01`, to: `${key}-12-31` };
  }
}

/**
 * Group records into buckets spanning `range`, zero-filling empty ones.
 *
 * The zero-fill matters: without it a sparkline joins the points either side of
 * a lay-off and reads as steady training through a gap that never happened.
 */
export function bucketRecords(
  records: TrainingRecord[],
  bucket: Bucket,
  range: DateRange,
): BucketPoint[] {
  const grouped = new Map<string, TrainingRecord[]>();
  for (const r of recordsInRange(records, range)) {
    const key = bucketKey(r.date, bucket);
    const list = grouped.get(key);
    if (list) list.push(r);
    else grouped.set(key, [r]);
  }

  const points: BucketPoint[] = [];
  const endKey = bucketKey(range.to, bucket);
  let key = bucketKey(range.from, bucket);

  // Bounded so a malformed range cannot spin forever.
  for (let guard = 0; guard < 4000; guard++) {
    points.push({
      key,
      label: bucketLabel(key, bucket),
      range: bucketRange(key, bucket),
      stats: aggregate(grouped.get(key) ?? []),
    });
    if (key >= endKey) break;
    key = nextBucketStart(key, bucket);
  }

  return points;
}

// ── Derived figures ────────────────────────────────────────────

export function computeDelta(current: number, previous: number): Delta {
  const abs = current - previous;
  if (previous === 0) {
    // No baseline to compare against — the UI shows "—" rather than a fake %.
    return { abs, pct: null, direction: "none" };
  }
  const pct = (abs / previous) * 100;
  return {
    abs,
    pct,
    direction: Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down",
  };
}

function todayStr(): string {
  return dateToStr(new Date());
}

/**
 * Consecutive days trained, counting back from today.
 *
 * If today has no workout the streak is measured from yesterday, so it does not
 * appear to break at midnight before the user has had a chance to train.
 */
export function computeStreak(store: TrainingRecordsStore, today = todayStr()): StreakInfo {
  const dates = new Set<string>();
  for (const r of Object.values(store.records)) dates.add(r.date);
  if (dates.size === 0) return { current: 0, longest: 0, lastWorkoutDate: null };

  const sorted = [...dates].sort();
  const lastWorkoutDate = sorted[sorted.length - 1];

  let cursor = dates.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (dates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return { current, longest, lastWorkoutDate };
}

/** Most recent sessions, newest first. */
export function recentSessions(store: TrainingRecordsStore, n = 5): TrainingRecord[] {
  return allRecords(store).slice(-n).reverse();
}

/**
 * Personal bests set within the last `sinceDays`.
 *
 * detectPRs flags the first-ever set of an exercise as a PR, since it compares
 * against a starting max of 0. Those are not achievements — without skipping
 * them a fresh import reports a PR for every exercise at once — so the first
 * session of each exercise is excluded.
 */
export function recentPRs(store: TrainingRecordsStore, sinceDays = 7, today = todayStr()): PRFeedItem[] {
  const cutoff = addDays(today, -sinceDays);
  const items: PRFeedItem[] = [];

  for (const [key, { displayName, sessions }] of buildExerciseMap(store)) {
    if (sessions.length < 2) continue;
    detectPRs(sessions);

    for (const session of sessions.slice(1)) {
      if (session.date < cutoff) continue;
      let bestWeight = 0;
      let bestE1rm = 0;
      for (const set of session.sets) {
        if (set.isWeightPR && set.weight > bestWeight) bestWeight = set.weight;
        if (set.is1rmPR && set.e1rm > bestE1rm) bestE1rm = set.e1rm;
      }
      if (bestWeight > 0) {
        items.push({ exercise: key, displayName, date: session.date, kind: "weight", value: bestWeight });
      }
      if (bestE1rm > 0) {
        items.push({ exercise: key, displayName, date: session.date, kind: "e1rm", value: bestE1rm });
      }
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

/** Sessions logged this week against a target. */
export function weeklyGoalProgress(
  store: TrainingRecordsStore,
  target: number,
  today = todayStr(),
): { done: number; target: number; pct: number } {
  const week = currentPeriodRange("week", today);
  const done = recordsInRange(allRecords(store), week).length;
  return {
    done,
    target,
    pct: target > 0 ? Math.min(1, done / target) : 0,
  };
}
