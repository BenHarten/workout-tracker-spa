import type { EditorExercise, EditorSet } from "../types";

// ── Payload builder ────────────────────────────────────────────

export function buildTemplatePayload(
  name: string,
  deviceType: number,
  exercises: EditorExercise[],
  templateId?: number,
): Record<string, unknown> {
  let totalCapacity = 0;

  const actionLibraryList = exercises.map((ex) => {
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

      if (ex.presetId === -1) {
        weightsList.push(set.weight.toFixed(1));
        setCapacity += set.reps * set.weight;
      } else {
        weightsList.push("3.5");
        counterList.push(String(Math.round(set.weight)));
        setCapacity += set.reps * set.weight;
      }
    });

    totalCapacity += setCapacity;
    const finalCounter = ex.presetId !== -1 ? counterList.join(",") : "";

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
    const presetId = (Number(ex.templatePresetId ?? -1)) as -1 | 1 | 3 | 5;
    const isUnilateral = leftRightArr.some((v) => v === "1" || v === "2");

    const sets: EditorSet[] = repsArr.map((reps, i) => {
      const completionMethod = Number(completionMethodArr[i] ?? 1);
      let weight: number;
      if (presetId === -1) {
        weight = Number(weightsArr[i] ?? 10);
      } else {
        weight = Number(counterArr[i] ?? 13);
      }
      return {
        reps: Number(reps || 10),
        weight: Math.max(0, weight),
        rest: Number(breakArr[i] ?? 60),
        mode: Number(modeArr[i] ?? 1),
        unit: completionMethod === 2 ? "sec" : "reps",
      };
    });

    return {
      groupId: Number(ex.groupId),
      actionLibraryId: Number(ex.actionLibraryId),
      presetId,
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
