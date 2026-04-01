import Papa from "papaparse";
import type { TrainingRecord } from "../types";

const REQUIRED_COLUMNS = ["Date", "Exercise", "Reps"];

export function parseFitNoteCsv(fileContent: string): Record<string, TrainingRecord> {
  // Strip BOM if present
  const cleaned = fileContent.charCodeAt(0) === 0xfeff ? fileContent.slice(1) : fileContent;

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
  });

  const columns = new Set(result.meta.fields ?? []);
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.has(c));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.sort().join(", ")}`);
  }

  // Group rows by date
  const sessions = new Map<string, Record<string, string>[]>();
  for (const row of result.data) {
    const date = row.Date?.trim();
    if (date) {
      if (!sessions.has(date)) sessions.set(date, []);
      sessions.get(date)!.push(row);
    }
  }

  const records: Record<string, TrainingRecord> = {};

  for (const [dateStr, rows] of sessions) {
    // Group by exercise, preserving order of first appearance
    const exercises = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
      const name = row.Exercise?.trim();
      if (name) {
        if (!exercises.has(name)) exercises.set(name, []);
        exercises.get(name)!.push(row);
      }
    }

    const actionList = [...exercises.entries()].map(([name, sets]) => ({
      actionName: name,
      category: sets[0].Category?.trim() ?? "",
      setTrainingInfoList: sets.map((s) => ({
        reps: parseInt(s.Reps?.trim() || "0", 10),
        weight: parseFloat(s.Weight?.trim() || "0"),
      })),
    }));

    const totalCapacity = rows.reduce((sum, r) => {
      const w = parseFloat(r.Weight?.trim() || "0");
      const reps = parseInt(r.Reps?.trim() || "0", 10);
      return sum + w * reps;
    }, 0);

    const recordId = `fn-${dateStr.replace(/-/g, "")}`;
    records[recordId] = {
      id: recordId,
      training_id: null,
      date: dateStr,
      name: "FitNote Session",
      duration: 0,
      calories: 0,
      capacity: Math.round(totalCapacity * 10) / 10,
      type: "fitnote",
      start_time: "",
      end_time: "",
      detail: { actionTrainingInfoList: actionList },
      session_info: {},
      raw: {},
    };
  }

  return records;
}
