# Template Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD for workout templates — browse the Speediance exercise library, create/edit templates with per-set config, save to the API, and delete templates.

**Architecture:** Two new routes (`/templates/new`, `/templates/edit/:code`) render `TemplateEditorPage`, which manages editor state locally and orchestrates an `ExerciseLibraryBrowser` slide-in panel and per-exercise `ExerciseSetEditor` rows. The exercise library is fetched once from the API and cached in localStorage per device type via `AppContext`. A pure `buildTemplatePayload` function converts editor state to the API's CSV-string format.

**Tech Stack:** React 19, TypeScript (strict), Vite, React Router (HashRouter), no test framework — verification via `npm run build` (tsc -b + vite build).

**Verify command:** `npm run build` — must exit 0 with no TypeScript errors after each task.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | Add ExerciseGroup, ExerciseLibraryStore, EditorSet, EditorExercise, PRESET_RULES |
| `src/api/speediance.ts` | Modify | Add fetchExerciseLibrary, saveTemplate, deleteTemplate |
| `src/context/AppContext.tsx` | Modify | Add exerciseLibrary as 4th localStorage store |
| `src/lib/template-payload.ts` | Create | Pure fns: buildTemplatePayload, mapDetailToEditorExercises |
| `src/components/templates/TemplateList.tsx` | Modify | Add edit (navigate) + delete (inline confirm) per row/card |
| `src/components/templates/ExerciseLibraryBrowser.tsx` | Create | Slide-in panel: search, category tabs, exercise list with Add |
| `src/components/templates/ExerciseSetEditor.tsx` | Create | Per-exercise card: preset selector, drag-to-reorder sets, set table |
| `src/pages/TemplateEditorPage.tsx` | Create | Main editor page: loads/saves template, hosts browser + set editors |
| `src/pages/TemplatesPage.tsx` | Modify | Add "New Template" button |
| `src/App.tsx` | Modify | Add two new routes |
| `src/index.css` | Modify | Styles for editor, library browser, set table |

---

## Task 1: Add types to `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new types and PRESET_RULES to the end of `src/types/index.ts`**

```typescript
// ── Exercise Library ────────────────────────────────────────────

export interface ExerciseGroup {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  isUnilateral: boolean;
  actionLibraryList: Array<{ id: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface ExerciseLibraryStore {
  device_type: number;
  fetched_at: string;
  tabs: Array<{ id: number; name: string }>;
  exercises: ExerciseGroup[];
}

// ── Template Editor ─────────────────────────────────────────────

export interface EditorSet {
  reps: number;
  weight: number;
  rest: number;
  mode: number;
  unit: "reps" | "sec";
}

export interface EditorExercise {
  groupId: number;
  actionLibraryId: number;
  presetId: -1 | 1 | 3 | 5;
  isUnilateral: boolean;
  name: string;
  sets: EditorSet[];
}

export const PRESET_RULES = {
  "-1": { label: "KG", step: 0.5, defW: 10, minW: 3.5, maxW: 100, defR: 10, minR: 1,  maxR: 99, defRest: 60 },
  "1":  { label: "RM", step: 1,   defW: 13, minW: 9,   maxW: 13,  defR: 12, minR: 8,  maxR: 12, defRest: 60 },
  "3":  { label: "RM", step: 1,   defW: 17, minW: 15,  maxW: 20,  defR: 15, minR: 13, maxR: 20, defRest: 45 },
  "5":  { label: "RM", step: 1,   defW: 7,  minW: 4,   maxW: 9,   defR: 6,  minR: 2,  maxR: 8,  defRest: 90 },
} as const;

export type PresetId = keyof typeof PRESET_RULES;
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add exercise library and editor types"
```

---

## Task 2: Add `fetchExerciseLibrary` to `SpeedianceClient`

**Files:**
- Modify: `src/api/speediance.ts`

- [ ] **Step 1: Add import for ExerciseLibraryStore and ExerciseGroup at the top of `src/api/speediance.ts`**

```typescript
import type { Config, ExerciseLibraryStore, ExerciseGroup } from "../types";
```

- [ ] **Step 2: Add `fetchExerciseLibrary` method inside the `SpeedianceClient` class, after `getWorkoutDetail`**

```typescript
async fetchExerciseLibrary(deviceType: number): Promise<ExerciseLibraryStore> {
  // 1. Tabs
  const tabsBody = await this.request(
    "GET",
    `${this.baseUrl}/api/app/actionLibraryTab/list?deviceType=${deviceType}`,
    { headers: this.getHeaders() },
  );
  const tabs = (tabsBody.data ?? []) as Array<{ id: number; name: string }>;

  // 2. Exercises per tab (deduplicated by id)
  const exerciseMap = new Map<number, Record<string, unknown>>();
  for (const tab of tabs) {
    const groupsBody = await this.request(
      "GET",
      `${this.baseUrl}/api/app/actionLibraryGroup/trainingPartGroup?tabId=${tab.id}&deviceTypeList=${deviceType}`,
      { headers: this.getHeaders() },
    );
    const muscleGroups = (groupsBody.data ?? []) as Array<{
      actionLibraryGroupList?: Record<string, unknown>[];
    }>;
    for (const mg of muscleGroups) {
      for (const ex of mg.actionLibraryGroupList ?? []) {
        const id = ex.id as number;
        if (!exerciseMap.has(id)) {
          exerciseMap.set(id, { ...ex, category_id: tab.id, category_name: tab.name });
        }
      }
    }
  }

  // 3. Batch details (actionLibraryList, isUnilateral)
  const ids = Array.from(exerciseMap.keys());
  const query = ids.map((id) => `ids=${id}`).join("&");
  const detailBody = await this.request(
    "GET",
    `${this.baseUrl}/api/app/actionLibraryGroup/list?${query}`,
    { headers: this.getHeaders() },
  );
  const details = (detailBody.data ?? []) as Record<string, unknown>[];

  const exercises: ExerciseGroup[] = details.map((d) => {
    const base = exerciseMap.get(d.id as number) ?? {};
    return {
      ...d,
      id: d.id as number,
      name: String(d.name ?? base.name ?? "Unknown"),
      category_id: base.category_id as number,
      category_name: String(base.category_name ?? ""),
      isUnilateral: Boolean(d.isUnilateral),
      actionLibraryList: (d.actionLibraryList ?? []) as Array<{ id: number }>,
    } as ExerciseGroup;
  });

  return {
    device_type: deviceType,
    fetched_at: new Date().toISOString(),
    tabs,
    exercises,
  };
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/api/speediance.ts src/types/index.ts
git commit -m "feat: add fetchExerciseLibrary to SpeedianceClient"
```

---

## Task 3: Add `saveTemplate` and `deleteTemplate` to `SpeedianceClient`

**Files:**
- Modify: `src/api/speediance.ts`

- [ ] **Step 1: Add `saveTemplate` and `deleteTemplate` methods inside `SpeedianceClient`, after `fetchExerciseLibrary`**

```typescript
async saveTemplate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const body = await this.request("POST", `${this.baseUrl}/api/app/v2/customTrainingTemplate`, {
    headers: this.getHeaders(),
    body: JSON.stringify(payload),
  });
  return (body.data ?? {}) as Record<string, unknown>;
}

async deleteTemplate(id: number): Promise<void> {
  await this.request("DELETE", `${this.baseUrl}/api/app/customTrainingTemplate?ids=${id}`, {
    headers: this.getHeaders(),
  });
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/api/speediance.ts
git commit -m "feat: add saveTemplate and deleteTemplate to SpeedianceClient"
```

---

## Task 4: Add `exerciseLibrary` store to `AppContext`

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Update imports in `src/context/AppContext.tsx`**

Add `ExerciseLibraryStore` to the import from `"../types"`.

```typescript
import type {
  Config,
  TrainingRecordsStore,
  WorkoutTemplatesStore,
  ExerciseLibraryStore,
  ModalType,
  ToastState,
} from "../types";
```

- [ ] **Step 2: Add `exerciseLibrary` and `setExerciseLibrary` to the `AppContextValue` interface**

Replace the existing `AppContextValue` interface with:

```typescript
interface AppContextValue {
  config: Config;
  setConfig: (value: Config | ((prev: Config) => Config)) => void;
  records: TrainingRecordsStore;
  setRecords: (value: TrainingRecordsStore | ((prev: TrainingRecordsStore) => TrainingRecordsStore)) => void;
  templates: WorkoutTemplatesStore;
  setTemplates: (value: WorkoutTemplatesStore | ((prev: WorkoutTemplatesStore) => WorkoutTemplatesStore)) => void;
  exerciseLibrary: ExerciseLibraryStore | null;
  setExerciseLibrary: (value: ExerciseLibraryStore | null) => void;
  isLoggedIn: boolean;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  toast: ToastState;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}
```

- [ ] **Step 3: Wire up the new store inside `AppProvider`**

Add after the existing `useLocalStorage` calls:

```typescript
const [exerciseLibrary, setExerciseLibraryRaw] = useLocalStorage<ExerciseLibraryStore | null>(
  "wt_exercise_library",
  null,
);
const setExerciseLibrary = (value: ExerciseLibraryStore | null) => setExerciseLibraryRaw(value);
```

And add to the `AppContext.Provider` value:

```typescript
exerciseLibrary, setExerciseLibrary,
```

- [ ] **Step 4: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: add exerciseLibrary store to AppContext"
```

---

## Task 5: Create `src/lib/template-payload.ts`

**Files:**
- Create: `src/lib/template-payload.ts`

- [ ] **Step 1: Create the file**

```typescript
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
        const apiWeight = set.weight * 2.2;
        weightsList.push(apiWeight.toFixed(1));
        setCapacity += set.reps * apiWeight;
      } else {
        weightsList.push("3.5");
        counterList.push(String(Math.round(set.weight)));
        setCapacity += set.reps * set.weight * 2.2;
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
  const actionList = (detail.customTrainingTemplateActionList ?? []) as Record<string, unknown>[];

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
        const raw = Number(weightsArr[i] ?? 22);
        // API stores in LBS internally; convert to KG and round to nearest 0.5
        weight = Math.round((raw / 2.2) * 2) / 2;
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

function csvSplit(value: string | undefined | null): string[] {
  if (!value) return [];
  return String(value).split(",").filter(Boolean);
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/template-payload.ts
git commit -m "feat: add template payload builder and detail mapper"
```

---

## Task 6: Add delete action to `TemplateList`

**Files:**
- Modify: `src/components/templates/TemplateList.tsx`

- [ ] **Step 1: Rewrite `src/components/templates/TemplateList.tsx`**

The delete button appears on each card/row. Clicking it shows an inline confirmation. On confirm, calls `deleteTemplate`, removes from store, shows toast.

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { SpeedianceClient, AuthError } from "../../api/speediance";
import type { WorkoutTemplate } from "../../types";

const ChevronDown = () => (
  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

function useDeleteTemplate() {
  const { config, setConfig, templates, setTemplates, showToast } = useApp();
  const [deleting, setDeleting] = useState(false);

  const deleteTemplate = async (template: WorkoutTemplate) => {
    if (!template.id) return;
    setDeleting(true);
    try {
      const client = new SpeedianceClient(config);
      await client.deleteTemplate(template.id);
      const next = { ...templates.templates };
      delete next[template.code];
      setTemplates({ ...templates, templates: next });
      showToast(`Deleted "${template.name}".`, "success");
    } catch (err) {
      if (err instanceof AuthError) {
        setConfig({ ...config, token: "", user_id: "" });
        showToast("Session expired. Please log in again.", "error");
      } else {
        showToast(err instanceof Error ? err.message : "Delete failed", "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  return { deleteTemplate, deleting };
}

function TemplateDetail({ template }: { template: WorkoutTemplate }) {
  if (!template.exercises || template.exercises.length === 0) {
    return (
      <div className="detail-panel">
        <span className="text-muted">No detail data for this template.</span>
      </div>
    );
  }
  return (
    <div className="detail-panel">
      {template.exercises.map((ex, i) => (
        <div className="template-exercise" key={i}>
          <span className="template-exercise-name">{ex.title}</span>
          <span className="template-exercise-sets">{ex.setsAndReps}</span>
        </div>
      ))}
    </div>
  );
}

function TemplateActions({ template }: { template: WorkoutTemplate }) {
  const navigate = useNavigate();
  const { deleteTemplate, deleting } = useDeleteTemplate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div className="tpl-confirm-delete">
        <span className="tpl-confirm-text">Delete "{template.name}"?</span>
        <button
          className="btn btn-danger"
          style={{ padding: "2px 10px", fontSize: "var(--text-xs)" }}
          onClick={(e) => { e.stopPropagation(); deleteTemplate(template); }}
          disabled={deleting}
        >
          {deleting ? <span className="spinner" /> : "Delete"}
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: "2px 10px", fontSize: "var(--text-xs)" }}
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="tpl-actions">
      <button
        className="btn btn-ghost tpl-action-btn"
        onClick={(e) => { e.stopPropagation(); navigate(`/templates/edit/${template.code}`); }}
        title="Edit template"
      >
        <EditIcon />
      </button>
      {template.id && (
        <button
          className="btn btn-ghost tpl-action-btn"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          title="Delete template"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: WorkoutTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const device = template.device_type === 2 ? "Gym Pal" : "Gym Monster";

  return (
    <div>
      <div className={`card${expanded ? " expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
        <div className="card-top">
          <span className="card-name">{template.name}</span>
          <div className="card-right">
            <TemplateActions template={template} />
            <ChevronDown />
          </div>
        </div>
        <div className="card-meta">
          <span>{template.exercises?.length || 0} exercises</span>
          <span>{device}</span>
        </div>
      </div>
      {expanded && <TemplateDetail template={template} />}
    </div>
  );
}

function TemplateRow({ template }: { template: WorkoutTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const device = template.device_type === 2 ? "Gym Pal" : "Gym Monster";

  return (
    <>
      <tr className={expanded ? "expanded" : ""} onClick={() => setExpanded(!expanded)}>
        <td className="col-name">{template.name}</td>
        <td>{template.exercises?.length || 0}</td>
        <td>{device}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <TemplateActions template={template} />
        </td>
        <td><ChevronDown /></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={5}><TemplateDetail template={template} /></td>
        </tr>
      )}
    </>
  );
}

export function TemplateList() {
  const { templates } = useApp();
  const sorted = Object.values(templates.templates).sort((a, b) => a.name.localeCompare(b.name));

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#xe3af;</div>
        <p className="empty-state-text">
          No templates yet. Sync your templates using the sync button above.
        </p>
      </div>
    );
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Exercises</th>
            <th>Device</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tpl) => (
            <TemplateRow key={tpl.code} template={tpl} />
          ))}
        </tbody>
      </table>

      <div className="card-list">
        {sorted.map((tpl) => (
          <TemplateCard key={tpl.code} template={tpl} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/TemplateList.tsx
git commit -m "feat: add edit and delete actions to TemplateList"
```

---

## Task 7: Create `ExerciseLibraryBrowser` component

**Files:**
- Create: `src/components/templates/ExerciseLibraryBrowser.tsx`

- [ ] **Step 1: Create `src/components/templates/ExerciseLibraryBrowser.tsx`**

```typescript
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import type { ExerciseGroup } from "../../types";

interface Props {
  onAdd: (exercise: ExerciseGroup) => void;
  onClose: () => void;
}

export function ExerciseLibraryBrowser({ onAdd, onClose }: Props) {
  const { exerciseLibrary } = useApp();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const tabs = exerciseLibrary?.tabs ?? [];
  const selectedTab = activeTab ?? tabs[0]?.id ?? null;

  const filtered = useMemo(() => {
    if (!exerciseLibrary) return [];
    let exercises = exerciseLibrary.exercises;
    if (selectedTab !== null) {
      exercises = exercises.filter((ex) => ex.category_id === selectedTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      exercises = exercises.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return exercises;
  }, [exerciseLibrary, selectedTab, search]);

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-panel" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <span className="library-title">Add Exercise</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <div className="library-search-row">
          <input
            className="form-input"
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {!exerciseLibrary ? (
          <div className="library-loading">
            <span className="spinner" /> Loading exercise library…
          </div>
        ) : (
          <>
            <div className="library-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`library-tab${selectedTab === tab.id ? " active" : ""}`}
                  onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            <div className="library-list">
              {filtered.length === 0 && (
                <p className="text-muted" style={{ padding: "var(--space-md)" }}>No exercises found.</p>
              )}
              {filtered.map((ex) => (
                <div key={ex.id} className="library-exercise-row">
                  <div className="library-exercise-info">
                    <span className="library-exercise-name">{ex.name}</span>
                    <span className="library-exercise-meta">{ex.category_name}</span>
                  </div>
                  <button
                    className="btn btn-ghost library-add-btn"
                    onClick={() => onAdd(ex)}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/ExerciseLibraryBrowser.tsx
git commit -m "feat: add ExerciseLibraryBrowser component"
```

---

## Task 8: Create `ExerciseSetEditor` component

**Files:**
- Create: `src/components/templates/ExerciseSetEditor.tsx`

- [ ] **Step 1: Create `src/components/templates/ExerciseSetEditor.tsx`**

```typescript
import { useRef } from "react";
import type { EditorExercise, EditorSet, PresetId } from "../../types";
import { PRESET_RULES } from "../../types";

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
  const presetKey = String(exercise.presetId) as PresetId;
  const rules = PRESET_RULES[presetKey];
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

  const changePreset = (presetId: -1 | 1 | 3 | 5) => {
    const newRules = PRESET_RULES[String(presetId) as PresetId];
    const sets = exercise.sets.map((s) => ({
      ...s,
      weight: clamp(newRules.defW, newRules.minW, newRules.maxW, newRules.step),
      reps: clamp(newRules.defR, newRules.minR, newRules.maxR, 1),
      rest: newRules.defRest,
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
          onChange={(e) => changePreset(Number(e.target.value) as -1 | 1 | 3 | 5)}
        >
          <option value={-1}>Custom KG</option>
          <option value={1}>Gain Muscle (RM)</option>
          <option value={3}>Stamina (RM)</option>
          <option value={5}>Strength (RM)</option>
        </select>
        <button className="btn btn-ghost editor-action-btn" onClick={addSet} title="Add set">+ Set</button>
        <button className="btn btn-ghost editor-action-btn editor-remove-btn" onClick={onRemove} title="Remove exercise">✕</button>
      </div>

      {exercise.sets.length > 0 && (
        <table className="editor-set-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Reps</th>
              <th>{rules.label}</th>
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
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/ExerciseSetEditor.tsx
git commit -m "feat: add ExerciseSetEditor component"
```

---

## Task 9: Create `TemplateEditorPage`

**Files:**
- Create: `src/pages/TemplateEditorPage.tsx`

- [ ] **Step 1: Create `src/pages/TemplateEditorPage.tsx`**

```typescript
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { SpeedianceClient, AuthError } from "../api/speediance";
import { ExerciseLibraryBrowser } from "../components/templates/ExerciseLibraryBrowser";
import { ExerciseSetEditor } from "../components/templates/ExerciseSetEditor";
import { buildTemplatePayload, mapDetailToEditorExercises } from "../lib/template-payload";
import { PRESET_RULES } from "../types";
import type { EditorExercise, ExerciseGroup } from "../types";

const DEFAULT_SETS = () => [
  { reps: 10, weight: 10, rest: 60, mode: 1, unit: "reps" as const },
  { reps: 10, weight: 10, rest: 60, mode: 1, unit: "reps" as const },
  { reps: 10, weight: 10, rest: 60, mode: 1, unit: "reps" as const },
];

export function TemplateEditorPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { config, setConfig, templates, setTemplates, exerciseLibrary, setExerciseLibrary, showToast } = useApp();

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
  }, [deviceType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddExercise = useCallback((ex: ExerciseGroup) => {
    const rules = PRESET_RULES["-1"];
    const newExercise: EditorExercise = {
      groupId: ex.id,
      actionLibraryId: ex.actionLibraryList[0]?.id ?? 0,
      presetId: -1,
      isUnilateral: ex.isUnilateral,
      name: ex.name,
      sets: DEFAULT_SETS().map((s) => ({ ...s, weight: rules.defW, reps: rules.defR, rest: rules.defRest })),
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
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
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
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TemplateEditorPage.tsx
git commit -m "feat: add TemplateEditorPage"
```

---

## Task 10: Wire up routes and add "New Template" button

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/TemplatesPage.tsx`

- [ ] **Step 1: Add new routes to `src/App.tsx`**

Add the import:

```typescript
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
```

Add two routes inside `<Routes>` in `AppInner`, before the `*` catch-all:

```typescript
<Route path="/templates/new" element={<TemplateEditorPage />} />
<Route path="/templates/edit/:code" element={<TemplateEditorPage />} />
```

- [ ] **Step 2: Add "New Template" button to `src/pages/TemplatesPage.tsx`**

Replace the file content:

```typescript
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { TemplateList } from "../components/templates/TemplateList";

export function TemplatesPage() {
  const { templates } = useApp();
  const navigate = useNavigate();
  const lastSynced = templates.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <button className="btn btn-primary" onClick={() => navigate("/templates/new")}>
          + New Template
        </button>
      </div>
      <TemplateList />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/TemplatesPage.tsx
git commit -m "feat: add template editor routes and New Template button"
```

---

## Task 11: Add CSS for editor and library browser

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append new styles to the end of `src/index.css`**

```css
/* ── Template Actions ─────────────────────────────────────── */

.tpl-actions {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.tpl-action-btn {
  padding: var(--space-xs) var(--space-sm);
  line-height: 1;
}

.tpl-confirm-delete {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.tpl-confirm-text {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

/* ── Template Editor Page ─────────────────────────────────── */

.editor-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: 80px; /* room for bottom nav */
}

.editor-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border);
}

.editor-name-input {
  flex: 1;
  min-width: 160px;
}

.editor-device-select {
  width: auto;
}

.editor-exercise-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.editor-exercise {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.editor-exercise-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  flex-wrap: wrap;
  background: var(--bg-elevated);
}

.editor-drag-handle {
  cursor: grab;
  color: var(--text-muted);
  font-size: 1.1rem;
  user-select: none;
}

.editor-exercise-name {
  flex: 1;
  font-weight: 500;
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-width: 80px;
}

.editor-badge {
  font-size: var(--text-xs);
  background: var(--accent-glow);
  color: var(--accent);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

.editor-preset-select {
  width: auto;
  font-size: var(--text-xs);
  padding: 4px 8px;
}

.editor-action-btn {
  padding: 2px var(--space-sm);
  font-size: var(--text-xs);
}

.editor-remove-btn {
  color: var(--danger);
}

.editor-set-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.editor-set-table th {
  padding: var(--space-xs) var(--space-sm);
  text-align: left;
  color: var(--text-muted);
  font-weight: 500;
  font-size: var(--text-xs);
  border-bottom: 1px solid var(--border-subtle);
}

.editor-set-table td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.editor-set-table tr:last-child td {
  border-bottom: none;
}

.editor-set-num {
  color: var(--text-muted);
  font-size: var(--text-xs);
  width: 24px;
}

.editor-set-input {
  width: 70px;
  padding: 4px 6px;
  font-size: var(--text-sm);
  text-align: center;
}

.editor-add-exercise-btn {
  align-self: flex-start;
  margin-top: var(--space-sm);
}

/* ── Exercise Library Browser ─────────────────────────────── */

.library-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
}

@media (min-width: 768px) {
  .library-overlay {
    align-items: stretch;
    justify-content: flex-end;
  }
}

.library-panel {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 768px) {
  .library-panel {
    border-top: none;
    border-left: 1px solid var(--border);
    width: 380px;
    max-height: 100vh;
  }
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border);
}

.library-title {
  font-weight: 600;
  font-size: var(--text-lg);
}

.library-search-row {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
}

.library-loading {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.library-tabs {
  display: flex;
  overflow-x: auto;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
  scrollbar-width: none;
}

.library-tabs::-webkit-scrollbar { display: none; }

.library-tab {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius);
  padding: 4px 12px;
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.library-tab.active {
  background: var(--accent-glow);
  color: var(--accent);
  border-color: var(--accent-dim);
}

.library-tab:hover:not(.active) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.library-list {
  flex: 1;
  overflow-y: auto;
}

.library-exercise-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
  gap: var(--space-sm);
}

.library-exercise-row:hover {
  background: var(--bg-hover);
}

.library-exercise-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.library-exercise-name {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-exercise-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.library-add-btn {
  padding: 4px 12px;
  font-size: var(--text-xs);
  flex-shrink: 0;
}

/* ── Status bar flex (for New Template button) ────────────── */

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add CSS for template editor and library browser"
```

---

## Done

All tasks complete. The feature should be fully functional:
- `/templates` — lists templates with Edit and Delete (with confirmation) per row
- `/templates/new` — create a new template
- `/templates/edit/:code` — edit an existing template
- Exercise library is fetched from the API and cached in localStorage per device type
- Per-set configuration with preset mode (Custom KG / Gain Muscle / Stamina / Strength)
- Drag-to-reorder exercises via HTML5 DnD
- Save posts to Speediance API and refreshes local store
