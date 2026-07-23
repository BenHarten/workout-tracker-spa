import type { EditorExercise, EditorSet, WorkoutTemplate } from "../types";
import { CUSTOM_KG_PRESET_ID } from "../types";
import { parsePresetList, rulesFor } from "./presets";

// ── Payload builder ────────────────────────────────────────────

export function buildTemplatePayload(
  name: string,
  deviceType: number,
  exercises: EditorExercise[],
  templateId?: number,
): Record<string, unknown> {
  let totalCapacity = 0;

  const actionLibraryList = exercises.map((ex) => {
    const rules = rulesFor(ex.presets, ex.presetId);
    const timeBased = rules.kind === "time";
    const repsList: string[] = [];
    const weightsList: string[] = [];
    const counterList: string[] = [];
    const breakList: string[] = [];
    const modeList: string[] = [];
    const leftRightList: string[] = [];
    const completionList: string[] = [];
    const completionMethodList: string[] = [];
    const countTypeList: string[] = [];
    const levelList: string[] = [];
    let setCapacity = 0;

    ex.sets.forEach((set: EditorSet, i: number) => {
      repsList.push(String(set.reps));
      breakList.push(String(set.rest));
      modeList.push(String(set.mode));
      levelList.push("0");
      completionList.push("1");
      completionMethodList.push(set.unit === "sec" ? "2" : "1");
      countTypeList.push(set.unit === "sec" ? "2" : "1");
      leftRightList.push(ex.isUnilateral ? (i % 2 === 0 ? "1" : "2") : "0");

      if (timeBased) {
        /*
         * Bodyweight/time presets carry no load, and observed payloads store
         * zeroes in both weights and counterweight. They contribute nothing to
         * capacity, which is a kg x reps figure.
         */
        weightsList.push("0.0");
        counterList.push("0");
      } else if (ex.presetId === CUSTOM_KG_PRESET_ID) {
        weightsList.push(set.weight.toFixed(1));
        setCapacity += set.reps * set.weight;
      } else {
        weightsList.push("3.5");
        counterList.push(String(Math.round(set.weight)));
        setCapacity += set.reps * set.weight;
      }
    });

    totalCapacity += setCapacity;
    const finalCounter =
      ex.presetId !== CUSTOM_KG_PRESET_ID ? counterList.join(",") : "";

    return {
      groupId: ex.groupId,
      actionLibraryId: ex.actionLibraryId,
      templatePresetId: ex.presetId,
      setsAndReps: repsList.join(","),
      breakTime: breakList.join(","),
      breakTime2: breakList.join(","),
      sportMode: modeList.join(","),
      leftRight: leftRightList.join(","),
      selectCompletionMethod: completionList.join(","),
      completionMethod: completionMethodList.join(","),
      countType: countTypeList.join(","),
      weights: weightsList.join(","),
      counterweight2: finalCounter,
      counterweight: finalCounter,
      level: levelList.join(","),
      capacity: setCapacity,
    };
  });

  const payload: Record<string, unknown> = {
    name,
    actionLibraryList,
    totalCapacity,
    deviceType,
    bgColor: 0,
  };

  if (templateId !== undefined) {
    payload.id = templateId;
  }

  return payload;
}

// ── Map API detail → EditorExercise[] ─────────────────────────

export function mapDetailToEditorExercises(
  detail: Record<string, unknown>,
): EditorExercise[] {
  const actionList = (detail.actionLibraryList ?? []) as Record<string, unknown>[];

  return actionList.map((ex) => {
    const repsArr = csvSplit(ex.setsAndReps as string);
    const weightsArr = csvSplit(ex.weights as string);
    const breakArr = csvSplit((ex.breakTime2 ?? ex.breakTime) as string);
    const modeArr = csvSplit(ex.sportMode as string);
    const leftRightArr = csvSplit(ex.leftRight as string);
    const completionMethodArr = csvSplit(ex.completionMethod as string);
    const counterArr = csvSplit((ex.counterweight2 ?? ex.counterweight) as string);
    const presets = parsePresetList(ex.templatePresetList);
    const presetId = Number(ex.templatePresetId ?? CUSTOM_KG_PRESET_ID);
    const rules = rulesFor(presets, presetId);
    const isUnilateral = leftRightArr.some((v) => v === "1" || v === "2");

    const sets: EditorSet[] = repsArr.map((reps, i) => {
      const completionMethod = Number(completionMethodArr[i] ?? 1);
      let weight: number;
      if (rules.kind === "time") {
        // Time-based presets carry no load; the machine is not even engaged.
        weight = 0;
      } else if (presetId === CUSTOM_KG_PRESET_ID) {
        weight = Number(weightsArr[i] ?? rules.defW);
      } else {
        // Load presets are stored on the RM scale in counterweight, not kilos.
        weight = Number(counterArr[i] ?? rules.defW);
      }
      return {
        reps: Number(reps || rules.defR),
        weight: Math.max(0, weight),
        rest: Number(breakArr[i] ?? rules.defRest),
        mode: Number(modeArr[i] ?? 1),
        // For time presets `setsAndReps` holds seconds, so the unit follows the
        // preset rather than completionMethod (which is 0 on these exercises).
        unit: rules.kind === "time" || completionMethod === 2 ? "sec" : "reps",
      };
    });

    return {
      groupId: Number(ex.groupId),
      actionLibraryId: Number(ex.actionLibraryId),
      presetId,
      presets,
      isUnilateral,
      name: String(ex.title ?? ex.actionLibraryName ?? "Unknown"),
      sets,
    };
  });
}

export function csvSplit(value: string | undefined | null): string[] {
  if (!value) return [];
  return String(value).split(",").filter(Boolean);
}

/*
 * Rough duration estimate for a template.
 *
 * Templates carry no duration, so this is derived from work + rest and must
 * always be shown with a "~". Rest is the honest part — `breakTime2` is real
 * per-set data. Work is not: a rep count says nothing about tempo, so it is
 * priced at a flat SECONDS_PER_REP.
 *
 * Time-based exercises (bodyweight holds) store seconds in the same field as
 * reps, with no weights alongside. Multiplying those by SECONDS_PER_REP would
 * treat a 60-second plank as three minutes, so a set with no load and an
 * implausible rep count is read as seconds instead.
 */
const SECONDS_PER_REP = 3;
const DEFAULT_REST_SEC = 60;
const REPS_AS_SECONDS_THRESHOLD = 25;

export function estimateTemplateMinutes(template: WorkoutTemplate): number {
  let seconds = 0;

  for (const ex of template.exercises) {
    const counts = csvSplit(ex.setsAndReps).map(Number);
    const rests = csvSplit(ex.breakTime2).map(Number);
    const hasLoad = csvSplit(ex.weights).some((w) => Number(w) > 0);

    counts.forEach((count, i) => {
      if (!Number.isFinite(count) || count <= 0) return;
      const isDuration = !hasLoad && count >= REPS_AS_SECONDS_THRESHOLD;
      seconds += isDuration ? count : count * SECONDS_PER_REP;

      const rest = rests[i];
      seconds += Number.isFinite(rest) && rest > 0 ? rest : DEFAULT_REST_SEC;
    });
  }

  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}
