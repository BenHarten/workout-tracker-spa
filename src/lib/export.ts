import type { TrainingRecord, SpeedianceExercise, FinishedRep } from "../types";

interface SetRow {
  reps: number | string;
  weight: number | string;
}

function extractSetRows(ex: SpeedianceExercise): SetRow[] {
  if (ex.setTrainingInfoList && ex.setTrainingInfoList.length > 0) {
    return ex.setTrainingInfoList.map((s) => ({ reps: s.reps, weight: s.weight }));
  }

  if (ex.finishedReps && ex.finishedReps.length > 0) {
    return ex.finishedReps.map((rep: FinishedRep) => {
      const hasWeight =
        rep.trainingInfoDetail?.weights && rep.trainingInfoDetail.weights.length > 0;
      const isTime = rep.finishedCount === 0 && !hasWeight;
      if (isTime) {
        return { reps: rep.time, weight: "" };
      }
      return {
        reps: rep.finishedCount,
        weight: hasWeight ? rep.trainingInfoDetail!.weights![0] : 0,
      };
    });
  }

  return [];
}

function csvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportRecordsToCSV(records: Record<string, TrainingRecord>): string {
  const rows: string[] = [
    "date,workout_name,duration_min,calories,exercise,set_num,reps,weight_kg",
  ];

  const sorted = Object.values(records).sort((a, b) => a.date.localeCompare(b.date));

  for (const record of sorted) {
    const base = [
      record.date,
      csvCell(record.name),
      (record.duration / 60).toFixed(1),
      record.calories,
    ].join(",");

    const detail = record.detail;
    let exercises: SpeedianceExercise[] = [];

    if (Array.isArray(detail) && detail.length > 0) {
      exercises = detail;
    } else if (detail && "actionTrainingInfoList" in detail && detail.actionTrainingInfoList) {
      exercises = detail.actionTrainingInfoList as SpeedianceExercise[];
    }

    if (exercises.length === 0) {
      rows.push(`${base},,,,`);
      continue;
    }

    for (const ex of exercises) {
      const exName = csvCell(ex.actionName || ex.actionLibraryName || "Unknown");
      const sets = extractSetRows(ex);

      if (sets.length === 0) {
        rows.push(`${base},${exName},,,`);
        continue;
      }

      sets.forEach((set, i) => {
        rows.push(`${base},${exName},${i + 1},${set.reps},${set.weight}`);
      });
    }
  }

  return rows.join("\n");
}

export function downloadWorkoutsCSV(records: Record<string, TrainingRecord>): void {
  const csv = exportRecordsToCSV(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `workouts-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
