# Template Editor Design

**Date:** 2026-04-07  
**Feature:** Create, edit, and delete workout templates via the Speediance API

## Overview

Add full CRUD for workout templates: browse the Speediance exercise library, build templates with per-set weight/reps/rest configuration, save to the API, and delete existing templates. The editor is a dedicated page with full viewport to accommodate the exercise library browser and set configuration UI.

---

## Routing

Two new routes added to `App.tsx` (HashRouter):

| Route | Mode | Component |
|---|---|---|
| `/templates/new` | Create | `TemplateEditorPage` |
| `/templates/edit/:code` | Edit | `TemplateEditorPage` |

`TemplateEditorPage` determines mode by checking whether `:code` is present. In edit mode it loads the template from the local store by code. After save/cancel/delete, navigates back to `/templates`.

The existing `/templates` route is unchanged except:
- A "New template" button is added to `TemplatesPage`
- Each template row/card gets Edit and Delete actions

---

## Exercise Library Cache

The exercise library is fetched once per device type and persisted in localStorage under `wt_exercise_library_{deviceType}`.

### Fetch sequence (matches reference project)

1. `GET /api/app/actionLibraryTab/list?deviceType=X` → category tabs
2. For each tab: `GET /api/app/actionLibraryGroup/trainingPartGroup?tabId=X&deviceTypeList=X` → exercises grouped by muscle
3. Batch detail: `GET /api/app/actionLibraryGroup/list?ids=...` → variant IDs (`actionLibraryList[0].id`) and `isUnilateral` flag

### Cached shape

```ts
interface ExerciseLibraryStore {
  device_type: number;
  fetched_at: string;       // ISO timestamp
  tabs: Array<{ id: number; name: string }>;
  exercises: ExerciseGroup[];
}

interface ExerciseGroup {
  id: number;               // groupId
  name: string;
  category_id: number;
  category_name: string;
  isUnilateral: boolean;
  actionLibraryList: Array<{ id: number; [key: string]: unknown }>;
  [key: string]: unknown;
}
```

A new `getExerciseLibrary(forceRefresh?: boolean)` method on `SpeedianceClient` orchestrates the multi-step fetch. The library store is added to `AppContext` as a new `useLocalStorage` entry (`wt_exercise_library`, keyed by device type inside the value).

---

## New API Methods (SpeedianceClient)

| Method | HTTP | Endpoint |
|---|---|---|
| `getExerciseLibrary(forceRefresh?)` | GET (multi-step) | See above |
| `saveTemplate(payload)` | POST | `/api/app/v2/customTrainingTemplate` |
| `deleteTemplate(id)` | DELETE | `/api/app/customTrainingTemplate?ids={id}` |

`saveTemplate` accepts an optional `id` field in the payload — if present, the API updates the existing template; if absent, it creates a new one.

---

## Editor State

Local React state in `TemplateEditorPage` (not persisted):

```ts
interface EditorExercise {
  groupId: number;
  actionLibraryId: number;        // variant ID from actionLibraryList[0].id
  presetId: -1 | 1 | 3 | 5;      // -1=custom KG/LBS, 1=GainMuscle, 3=Stamina, 5=Strength
  isUnilateral: boolean;
  name: string;
  sets: EditorSet[];
}

interface EditorSet {
  reps: number;
  weight: number;
  rest: number;                   // seconds
  mode: number;                   // 1=standard
  unit: 'reps' | 'sec';
}
```

Top-level editor state:

```ts
{ name: string; device_type: number; exercises: EditorExercise[] }
```

### Preset rules (from reference project)

| presetId | Label | Weight range | Rep range | Rest range |
|---|---|---|---|---|
| -1 | KG or LBS | 3.5–100 kg / 7–220 lbs | 1–99 | 0–300s |
| 1 | RM (Gain Muscle) | 9–13 | 8–12 | 45–120s |
| 3 | RM (Stamina) | 15–20 | 13–20 | 30–180s |
| 5 | RM (Strength) | 4–9 | 2–8 | 60–180s |

Weight validation clamps to min/max and snaps to step (0.5 for metric, 1 for imperial/RM).

### Unilateral handling

Unilateral exercises appear as normal sets in the editor. On save, the `leftRight` CSV is interleaved `1,2,1,2,...`. The `isUnilateral` flag comes from the library cache.

---

## Component Structure

```
TemplateEditorPage
├── Header (name input, device type selector, Save / Cancel buttons)
├── ExerciseList
│   └── ExerciseRow (drag handle, preset selector, add/remove set, remove exercise)
│       └── SetTable (one row per set: reps, weight, rest)
└── ExerciseLibraryBrowser (slide-in panel)
    ├── Search input
    ├── Category tabs
    └── ExerciseList (rows with Add button)
```

`ExerciseLibraryBrowser` receives `onAdd(exercise: ExerciseGroup)` and `onClose()` props. Adding an exercise appends it to the editor list with defaults: presetId `-1`, 3 sets × 10 reps × 10 kg × 60s rest.

---

## Save Flow

1. Build API payload from editor state:
   - Per-set CSV strings: `setsAndReps`, `weights`, `breakTime`, `breakTime2`, `sportMode`, `leftRight`, `selectCompletionMethod`, `completionMethod`, `countType`, `level`
   - `capacity` per exercise (sum of reps × weight for each set)
   - `totalCapacity` (sum across exercises)
   - Include `id` field if editing an existing template
2. `POST /api/app/v2/customTrainingTemplate`
3. On success: extract `code` from the POST response (present for both create and update), then re-fetch via `getWorkoutDetail(code)` to get canonical server representation
4. Upsert into local templates store, show success toast, navigate to `/templates`
5. On error: show error toast, stay on editor page

The save button shows a loading spinner during the request. AuthError surfaces as an error toast.

---

## Delete Flow

1. Delete button on each template row/card in `TemplateList`
2. Inline confirmation: "Delete [name]? This cannot be undone." with Confirm/Cancel
3. On confirm: `DELETE /api/app/customTrainingTemplate?ids={id}`
4. Remove from local templates store, show success toast
5. Templates without an `id` have delete disabled (grayed out button)

---

## Styling

Follows existing conventions:
- Single `src/index.css` file — new styles appended
- Editor page uses `page` class with a two-column layout on desktop (editor left, library browser right), single column on mobile
- Library browser is a bottom sheet on mobile, right-side panel on desktop (same breakpoint as existing modals: 768px)
- Drag-to-reorder uses HTML5 drag-and-drop (no external library)
