import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { SpeedianceClient, AuthError } from "../api/speediance";
import { ExerciseLibraryBrowser } from "../components/templates/ExerciseLibraryBrowser";
import { ExerciseSetEditor } from "../components/templates/ExerciseSetEditor";
import { buildTemplatePayload, mapDetailToEditorExercises } from "../lib/template-payload";
import { PRESET_RULES } from "../types";
import type { EditorExercise, ExerciseGroup } from "../types";

export function TemplateEditorPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const {
    config, setConfig,
    templates, setTemplates,
    exerciseLibrary, setExerciseLibrary,
    showToast,
  } = useApp();

  const isEdit = !!code;
  const existing = code ? templates.templates[code] : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [deviceType, setDeviceType] = useState(existing?.device_type ?? config.device_type);
  const [exercises, setExercises] = useState<EditorExercise[]>(() => {
    if (existing?.detail) {
      return mapDetailToEditorExercises(existing.detail as Record<string, unknown>);
    }
    return [];
  });
  const [showBrowser, setShowBrowser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Drag-to-reorder state
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Fetch exercise library if missing or stale (device type mismatch)
  useEffect(() => {
    if (!config.token) return;
    if (exerciseLibrary && exerciseLibrary.device_type === deviceType) return;
    setLibraryLoading(true);
    const client = new SpeedianceClient(config);
    client
      .fetchExerciseLibrary(deviceType)
      .then((lib) => setExerciseLibrary(lib))
      .catch((err) => {
        if (err instanceof AuthError) {
          setConfig({ ...config, token: "", user_id: "" });
          showToast("Session expired. Please log in again.", "error");
        } else {
          showToast("Failed to load exercise library.", "error");
        }
      })
      .finally(() => setLibraryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceType]);

  const handleAddExercise = useCallback((ex: ExerciseGroup) => {
    const rules = PRESET_RULES["-1"];
    const newExercise: EditorExercise = {
      groupId: ex.id,
      actionLibraryId: ex.actionLibraryList[0]?.id ?? 0,
      presetId: -1,
      isUnilateral: ex.isUnilateral,
      name: ex.name,
      sets: [
        { reps: rules.defR, weight: rules.defW, rest: rules.defRest, mode: 1, unit: "reps" },
        { reps: rules.defR, weight: rules.defW, rest: rules.defRest, mode: 1, unit: "reps" },
        { reps: rules.defR, weight: rules.defW, rest: rules.defRest, mode: 1, unit: "reps" },
      ],
    };
    setExercises((prev) => [...prev, newExercise]);
  }, []);

  const handleDrop = useCallback(() => {
    if (dragFrom === null || dragOver === null || dragFrom === dragOver) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }
    setExercises((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(dragOver, 0, moved);
      return next;
    });
    setDragFrom(null);
    setDragOver(null);
  }, [dragFrom, dragOver]);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Template name is required.", "error"); return; }
    if (exercises.length === 0) { showToast("Add at least one exercise.", "error"); return; }

    setSaving(true);
    try {
      const client = new SpeedianceClient(config);
      const payload = buildTemplatePayload(name.trim(), deviceType, exercises, existing?.id);
      const result = await client.saveTemplate(payload);
      const savedCode = String(result.code ?? code ?? "");

      // Re-fetch canonical template detail
      let detail: Record<string, unknown> = {};
      if (savedCode) {
        detail = (await client.getWorkoutDetail(savedCode)) ?? {};
      }

      const exerciseList = ((detail as Record<string, unknown>).customTrainingTemplateActionList ?? []) as Record<string, unknown>[];
      setTemplates({
        ...templates,
        templates: {
          ...templates.templates,
          [savedCode]: {
            code: savedCode,
            id: (result.id as number) ?? existing?.id,
            name: name.trim(),
            device_type: deviceType,
            exercises: exerciseList.map((ex) => ({
              title: String(ex.title ?? ex.actionLibraryName ?? "Unknown"),
              setsAndReps: String(ex.setsAndReps ?? ""),
              weights: ex.weights as string | undefined,
              breakTime2: ex.breakTime2 as string | undefined,
              img: ex.img as string | undefined,
              isBarbell: ex.isBarbell as number | undefined,
              mainMuscleGroupName: ex.mainMuscleGroupName as string | undefined,
              context: ex.context as string | undefined,
            })),
            raw: result,
            detail: detail,
          },
        },
      });

      showToast(isEdit ? "Template updated." : "Template created.", "success");
      navigate("/templates");
    } catch (err) {
      if (err instanceof AuthError) {
        setConfig({ ...config, token: "", user_id: "" });
        showToast("Session expired. Please log in again.", "error");
      } else {
        showToast(err instanceof Error ? err.message : "Save failed", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page editor-page">
      {/* Header */}
      <div className="editor-header">
        <button className="btn btn-ghost" onClick={() => navigate("/templates")}>← Back</button>
        <input
          className="form-input editor-name-input"
          type="text"
          placeholder="Template name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="form-input editor-device-select"
          value={deviceType}
          onChange={(e) => setDeviceType(Number(e.target.value))}
        >
          <option value={1}>Gym Monster</option>
          <option value={2}>Gym Pal</option>
        </select>
        <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <span className="spinner" /> : isEdit ? "Update" : "Create"}
        </button>
      </div>

      {/* Exercise list */}
      <div className="editor-exercise-list">
        {exercises.length === 0 && (
          <p className="text-muted" style={{ padding: "var(--space-lg) 0" }}>
            No exercises yet. Click "Add Exercise" to start.
          </p>
        )}
        {exercises.map((ex, i) => (
          <ExerciseSetEditor
            key={`${ex.groupId}-${i}`}
            exercise={ex}
            index={i}
            onChange={(updated) => setExercises((prev) => prev.map((e, idx) => idx === i ? updated : e))}
            onRemove={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
            onDragStart={(idx) => setDragFrom(idx)}
            onDragOver={(idx) => setDragOver(idx)}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Add Exercise button */}
      <button
        className="btn btn-ghost editor-add-exercise-btn"
        onClick={() => setShowBrowser(true)}
        disabled={libraryLoading}
      >
        {libraryLoading ? <><span className="spinner" /> Loading library…</> : "+ Add Exercise"}
      </button>

      {/* Library browser */}
      {showBrowser && (
        <ExerciseLibraryBrowser
          onAdd={(ex) => { handleAddExercise(ex); }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}
