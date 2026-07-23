import type { RecordType } from "../../types";

/**
 * Display labels for `TrainingRecord.type`.
 *
 * The reference app legends its calendar Scheduled / Program / Completed /
 * From health app. This app has no scheduling model, so pills are keyed on the
 * record's origin instead — real data, and for imports it means much the same
 * as "from health app".
 *
 * Records can also carry no type at all (the API omits it for ad-hoc sessions
 * such as "Free Lift"), so "other" is a first-class entry rather than an
 * unexplained grey pill.
 */
const TYPES: { cls: string; label: string }[] = [
  { cls: "custom", label: "Custom" },
  { cls: "plan", label: "Program" },
  { cls: "course", label: "Course" },
  { cls: "fitnote", label: "Imported" },
  { cls: "other", label: "Unlabelled" },
];

const KNOWN = new Set(["custom", "plan", "course", "fitnote"]);

/** CSS modifier suffix; missing or unrecognised types fall back to "other". */
export function typeClass(type: RecordType): string {
  return type && KNOWN.has(type) ? type : "other";
}

/** Legend entries, in a stable order, filtered to the classes actually shown. */
export function legendFor(present: Set<string>): { cls: string; label: string }[] {
  return TYPES.filter((t) => present.has(t.cls));
}
