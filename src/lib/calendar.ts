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

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

export function longDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
