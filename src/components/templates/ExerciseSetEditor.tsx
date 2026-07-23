import { useRef } from "react";
import type { EditorExercise, EditorSet } from "../../types";
import { CUSTOM_KG_PRESET_ID } from "../../types";
import { CUSTOM_KG_RULES, rulesFor } from "../../lib/presets";

interface Props {
  exercise: EditorExercise;
  index: number;
  onChange: (updated: EditorExercise) => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
}

const DEFAULT_SET: EditorSet = { reps: 10, weight: 10, rest: 60, mode: 1, unit: "reps" };

function clamp(v: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, v));
  return Math.round(clamped / step) * step;
}

export function ExerciseSetEditor({ exercise, index, onChange, onRemove, onDragStart, onDragOver, onDrop }: Props) {
  /*
   * Rules come from the preset the API shipped with this exercise. rulesFor()
   * falls back to Custom KG for an unknown id, so an unmodelled preset degrades
   * one row rather than blanking the editor.
   */
  const rules = rulesFor(exercise.presets, exercise.presetId);
  const timeBased = rules.kind === "time";
  const dragging = useRef(false);

  const updateSet = (setIdx: number, field: keyof EditorSet, raw: string) => {
    const sets = exercise.sets.map((s, i) => {
      if (i !== setIdx) return s;
      if (field === "unit") return { ...s, unit: raw as "reps" | "sec" };
      const num = parseFloat(raw);
      if (isNaN(num)) return s;
      if (field === "reps") return { ...s, reps: clamp(num, rules.minR, rules.maxR, 1) };
      if (field === "weight") return { ...s, weight: clamp(num, rules.minW, rules.maxW, rules.step) };
      if (field === "rest") return { ...s, rest: clamp(num, 0, 300, 1) };
      return s;
    });
    onChange({ ...exercise, sets });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1] ?? DEFAULT_SET;
    onChange({ ...exercise, sets: [...exercise.sets, { ...last }] });
  };

  const removeSet = (setIdx: number) => {
    onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== setIdx) });
  };

  const changePreset = (presetId: number) => {
    const newRules = rulesFor(exercise.presets, presetId);
    const sets = exercise.sets.map((s) => ({
      ...s,
      weight:
        newRules.kind === "time"
          ? 0
          : clamp(newRules.defW, newRules.minW, newRules.maxW, newRules.step),
      reps: clamp(newRules.defR, newRules.minR, newRules.maxR, 1),
      rest: newRules.defRest,
      unit: newRules.kind === "time" ? ("sec" as const) : ("reps" as const),
    }));
    onChange({ ...exercise, presetId, sets });
  };

  return (
    <div
      className="editor-exercise"
      draggable
      onDragStart={() => { dragging.current = true; onDragStart(index); }}
      onDragEnd={() => { dragging.current = false; }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="editor-exercise-header">
        <span className="editor-drag-handle" title="Drag to reorder">⠿</span>
        <span className="editor-exercise-name">{exercise.name}</span>
        {exercise.isUnilateral && <span className="editor-badge">Unilateral</span>}
        <select
          className="form-input editor-preset-select"
          value={exercise.presetId}
          onChange={(e) => changePreset(Number(e.target.value))}
        >
          <option value={CUSTOM_KG_PRESET_ID}>{CUSTOM_KG_RULES.name}</option>
          {/* Options come from the API, so every preset this exercise supports
              is offered — including time-based ones the app used to crash on. */}
          {exercise.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.trainingTime !== undefined && p.weight === undefined ? " (Time)" : " (RM)"}
            </option>
          ))}
          {/* A preset already in use but missing from the list stays selectable
              so opening a template never silently rewrites it. */}
          {exercise.presetId !== CUSTOM_KG_PRESET_ID &&
            !exercise.presets.some((p) => p.id === exercise.presetId) && (
              <option value={exercise.presetId}>Preset {exercise.presetId}</option>
            )}
        </select>
        <button className="btn btn-ghost editor-action-btn" onClick={addSet} title="Add set">+ Set</button>
        <button className="btn btn-ghost editor-action-btn editor-remove-btn" onClick={onRemove} title="Remove exercise">✕</button>
      </div>

      {exercise.sets.length > 0 && (
        <table className="editor-set-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{timeBased ? "Time (s)" : "Reps"}</th>
              {!timeBased && <th>{rules.loadLabel}</th>}
              <th>Rest (s)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set, si) => (
              <tr key={si}>
                <td className="editor-set-num">{si + 1}</td>
                <td>
                  <input
                    className="form-input editor-set-input"
                    type="number"
                    min={rules.minR}
                    max={rules.maxR}
                    step={1}
                    value={set.reps}
                    onChange={(e) => updateSet(si, "reps", e.target.value)}
                  />
                </td>
                {!timeBased && (
                  <td>
                    <input
                      className="form-input editor-set-input"
                      type="number"
                      min={rules.minW}
                      max={rules.maxW}
                      step={rules.step}
                      value={set.weight}
                      onChange={(e) => updateSet(si, "weight", e.target.value)}
                    />
                  </td>
                )}
                <td>
                  <input
                    className="form-input editor-set-input"
                    type="number"
                    min={0}
                    max={300}
                    step={5}
                    value={set.rest}
                    onChange={(e) => updateSet(si, "rest", e.target.value)}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-ghost editor-action-btn editor-remove-btn"
                    onClick={() => removeSet(si)}
                    disabled={exercise.sets.length <= 1}
                    title="Remove set"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
