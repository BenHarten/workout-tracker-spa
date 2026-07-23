import type { TrainingRecord } from "../types";

/**
 * Calendar date helpers.
 *
 * Weeks are Monday-first throughout the app. `mondayIndex` is the single
 * source of that convention — stats bucketing must import it rather than
 * re-deriving the offset, so the calendar and the charts can never disagree.
 *
 * All date strings are `YYYY-MM-DD` and are compared lexicographically.
 * Never round-trip them through `toISOString()`, which yields the UTC date
 * and is off by one either side of midnight depending on the user's offset.
 */

/** Weekday index with Monday as 0 (JS `getDay()` uses Sunday as 0). */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function groupRecordsByDate(
  records: TrainingRecord[],
): Record<string, TrainingRecord[]> {
  const result: Record<string, TrainingRecord[]> = {};
  for (const r of records) {
    if (!result[r.date]) result[r.date] = [];
    result[r.date].push(r);
  }
  return result;
}

/** Day numbers (1–N) with leading nulls padding the first week to Mon=0. */
export function getMonthCells(year: number, month: number): (number | null)[] {
  const offset = mondayIndex(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A Date as a local `YYYY-MM-DD`.
 *
 * Never use `toISOString().slice(0, 10)` for this: that yields the UTC date,
 * so east of UTC it returns yesterday in the small hours and west of UTC it
 * returns tomorrow in the evening. Streaks, "this week" and "today" all hinge
 * on this being the user's local date.
 */
export function dateToStr(d: Date): string {
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse a `YYYY-MM-DD` as local midnight (not UTC). */
export function parseDateStr(s: string): Date {
  return new Date(s + "T00:00:00");
}

/** Shift a `YYYY-MM-DD` by whole days, staying in local time. */
export function addDays(s: string, days: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

/** Monday-start date of the week containing `s`. */
export function startOfWeek(s: string): string {
  const d = parseDateStr(s);
  return addDays(s, -mondayIndex(d));
}

/*
 * Locale strings live only here.
 *
 * The calendar was the app's one pocket of German while format.ts and the
 * progress pages used en-GB; the mix was the actual bug. Monday-first week
 * order is kept — that is a convention, not a locale.
 */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function longDateLabel(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
