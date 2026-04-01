# Exercise Progress & History Feature

## Context

The workout tracker currently shows training sessions chronologically — you can expand a session to see its exercises, but there's no way to view an exercise's history across sessions or track progression over time. This feature adds per-exercise progress tracking with charts, personal records, and session history.

## Feature Overview

Two entry points into exercise progress data:

1. **Dedicated Progress page** (`/progress`) — a new top-level route with a searchable exercise list, sorted by last performed date
2. **Tappable exercise names** in RecordDetail — clicking an exercise name in an expanded workout record navigates directly to that exercise's progress detail

## Page 1: Exercise List (`/progress`)

A new route accessible from the header nav (alongside Records and Templates).

**Layout:**
- Page title "PROGRESS" (matches existing page-title pattern)
- Search input at top for filtering exercises by name
- Card list of all exercises, sorted by last performed date (most recent first)
- Each card shows:
  - Exercise name
  - Last performed date
  - Total session count
  - Best weight (gold accent, matching existing card-volume style)

**Data source:** Derived at render time by iterating all records in `records.records`, extracting exercise names, and grouping. No new persistent storage needed.

**Exercise name normalization:** Use the exercise name as-is from both Speediance (`actionName` or `actionLibraryName` fallback) and FitNote (`actionName`). Exact string match for grouping — no fuzzy matching in v1. Case-insensitive comparison for grouping.

## Page 2: Exercise Detail (`/progress/:exerciseName`)

Shown when tapping an exercise from the list or from a RecordDetail exercise name link.

### PR Summary Cards (top)

Three stat cards in a horizontal row:
- **Max Weight** — heaviest weight used in any set, with date of PR
- **Est. 1RM** — highest estimated one-rep max across all sets (Epley formula: `weight × (1 + reps / 30)`), with date of PR
- **Sessions** — total number of sessions containing this exercise, with first session date

### Progression Chart

Chart.js line chart with two toggleable datasets:
- **Max Weight** (default active) — heaviest weight per session over time
- **Est. 1RM** — best estimated 1RM per session over time

Chart styling:
- Dark theme matching app palette (`--bg-surface` background, `--accent` line color)
- Area fill under the line (`rgba(212,168,67,0.08)`)
- PR data points highlighted with a larger dot
- X-axis: dates, Y-axis: weight in kg
- Responsive, filling available width

Toggle implemented as a segmented control (pill-style tabs) above the chart.

### Session History

Reverse chronological list of every session containing this exercise:
- **Date** as the row header
- **All sets** shown inline (e.g., "Set 1: 8 × 90 kg  Set 2: 6 × 95 kg")
- **PR badge** — gold "PR" tag on sessions where a personal record was set
- **PR sets** — individual sets that are PRs highlighted in gold text
- Uses the same card-list pattern as the Records page (rounded corners, 2px gap)

PR detection logic:
- A set is a weight PR if its weight exceeds all previous sets for this exercise (chronologically)
- A set is a 1RM PR if its estimated 1RM exceeds all previous sets
- PR badges appear on the session card if any set in that session is a PR

## Entry Point from RecordDetail

Exercise names in the `ExerciseCard` component (`ex-card-name` class) become tappable links. Clicking navigates to `/progress/:exerciseName` (URL-encoded).

Visual treatment: exercise names get `cursor: pointer` and a subtle hover color change to `--accent` to indicate interactivity. No underline.

**URL encoding:** Exercise names are URL-encoded for the route parameter (e.g., `Barbell Bench Press` → `Barbell%20Bench%20Press`). Decoded with `decodeURIComponent` on the detail page. The exercise list page uses `useNavigate` with the encoded name.

## Navigation

- New "Progress" nav link in the header, between "Records" and "Templates"
- Progress list → detail uses standard HashRouter navigation (`/progress` → `/progress/:exerciseName`)
- Back arrow on detail page navigates to `/progress` list
- Browser back button works naturally via hash routing

## Data Extraction

A new utility module `src/lib/exercise-progress.ts` handles extracting and grouping exercise data from the existing record store.

### Key functions:

**`extractExerciseSessions(records: TrainingRecordsStore)`**
- Iterates all records, extracts exercises from both Speediance and FitNote detail shapes
- Returns `Map<string, ExerciseSession[]>` keyed by normalized exercise name
- Each `ExerciseSession` contains: date, record ID, sets (reps + weight)

**`extractSetsFromExercise(exercise, record)`**
- Handles both Speediance `finishedReps[].trainingInfoDetail.weights` and FitNote `setTrainingInfoList[].weight/reps`
- Returns normalized `{ reps: number, weight: number }[]`
- Skips timed-only sets (where `finishedCount === 0` and `time > 0` with no weight data)

**`calculateE1RM(weight: number, reps: number): number`**
- Epley formula: `weight * (1 + reps / 30)`
- Returns 0 for sets with 0 reps or 0 weight

**`detectPRs(sessions: ExerciseSession[])`**
- Walks sessions chronologically
- Tracks running max weight and max e1RM
- Marks sets and sessions that exceeded previous bests

### Types:

```typescript
interface ExerciseSession {
  date: string;           // ISO date from record
  recordId: string | number;
  sets: ExerciseSet[];
  isPR: boolean;          // any set in this session is a PR
}

interface ExerciseSet {
  reps: number;
  weight: number;
  e1rm: number;
  isWeightPR: boolean;
  is1rmPR: boolean;
}

interface ExerciseSummary {
  name: string;
  lastPerformed: string;  // ISO date
  sessionCount: number;
  bestWeight: number;
  bestE1RM: number;
}
```

## Charting

**Library:** Chart.js (via `chart.js` and `react-chartjs-2` packages)

**Chart config:**
- Type: `line`
- One data point per session (X = date, Y = max weight or best e1RM for that session)
- Gold line (`#d4a843`) with subtle area fill
- Dark theme: `#141416` background, `#2a2a30` grid lines, `#6e6d65` axis labels
- PR points: larger radius, gold fill with dark stroke
- Tooltip on hover showing date, value, and PR indicator
- Responsive with `maintainAspectRatio: false`

## Styling

All new styles added to `src/index.css` following existing patterns:
- Progress page reuses `.page`, `.page-title`, `.card-list`, `.card` patterns
- Exercise detail reuses `.detail-panel` and `.ex-card` patterns where applicable
- New classes prefixed with `.progress-` for feature-specific styles
- Chart toggle uses a segmented control pattern (new)
- PR badge: small gold pill with star icon, matching the `--accent` color
- Search input reuses `.form-input` styles

## Components

New files:
- `src/pages/ProgressPage.tsx` — exercise list with search
- `src/pages/ExerciseDetailPage.tsx` — detail view with chart and history
- `src/lib/exercise-progress.ts` — data extraction and PR logic

Modified files:
- `src/App.tsx` — add `/progress` and `/progress/:exerciseName` routes
- `src/components/Header.tsx` — add "Progress" nav link
- `src/components/records/RecordDetail.tsx` — make exercise names tappable links
- `src/index.css` — new progress-specific styles

## Verification

1. **Build check:** `npm run build` passes with no TypeScript errors
2. **Lint check:** `npm run lint` passes
3. **Manual testing:**
   - Navigate to /progress — exercise list loads, sorted by last performed
   - Search filters exercises by name
   - Tap exercise → detail page shows with correct PR cards, chart, and session history
   - Chart toggles between Max Weight and Est. 1RM
   - PR badges appear on correct sessions
   - Tap exercise name in RecordDetail → navigates to progress detail
   - Back arrow returns to exercise list
   - Browser back/forward buttons work
   - Mobile layout is responsive (cards, not tables)
   - Empty state shown when no records exist
