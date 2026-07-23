import { dateToStr } from "./calendar";

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Sync stamps are stored as a bare local `YYYY-MM-DDTHH:MM:SS`. Rendering that
 * raw puts machine punctuation in a sentence, so show date + time of day.
 */
export function formatSyncTime(stamp: string | undefined): string {
  if (!stamp) return "never";
  const [date, time] = stamp.split("T");
  if (!date) return "never";
  return time ? `${formatDate(date)}, ${time.slice(0, 5)}` : formatDate(date);
}

export function formatVolume(kg: number): string {
  if (!kg) return "0 kg";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

/*
 * Both of these previously used `toISOString().slice(0, 10)`, which returns the
 * UTC date — so for a user east of UTC they reported yesterday between midnight
 * and the offset, and west of UTC they reported tomorrow during the evening.
 * dateToStr() reads the local calendar date instead.
 */

export function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return dateToStr(d);
}

export function todayDate(): string {
  return dateToStr(new Date());
}
