# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript type-check + Vite production build
npm run lint       # ESLint (flat config)
npm run preview    # Preview production build locally
```

No test framework is configured. Validation is via `tsc -b` (strict mode) and ESLint only.

`npm run lint` currently reports two pre-existing errors (a `setState`-in-effect in
`PasscodeGate` and a `react-refresh/only-export-components` warning in `AppContext`).
Both predate the current work; a clean run means "still two", not "zero".

## Architecture

React 19 + TypeScript SPA that syncs workout data from the Speediance smart gym API and supports FitNote CSV imports. Deployed to GitHub Pages at `/workout-tracker-spa/`.

### State Management

Single React Context (`AppContext`) provides all shared state via the `useApp()` hook. Persistent stores, all backed by `useLocalStorage`:

| Key | Type | Contents |
|---|---|---|
| `wt_config` | `Config` | auth credentials, region, device type, weekly goal |
| `wt_training_records` | `TrainingRecordsStore` | training records keyed by id |
| `wt_workout_templates` | `WorkoutTemplatesStore` | workout templates keyed by code |
| `wt_exercise_library` | `ExerciseLibraryStore \| null` | cached exercise library for the editor |
| `wt_exercise_muscles` | `ExerciseMuscleStore \| null` | muscle metadata keyed by `actionLibraryGroupId` |
| `wt_theme` | `ThemePref` | `"light" \| "dark" \| "auto"` |

Pages also persist their own view state (`wt_progress_view`, `wt_history_range`, `wt_dismissed_pr_sig`).

UI state (active modal, toast) lives in AppContext but is not persisted.

### Routing & Auth

`PasscodeGate` wraps the entire app with local SHA-256 passcode verification (no server). Inside the gate, `AppProvider` > `HashRouter` > `AppShell`:

| Route | Page |
|---|---|
| `/` | `DashboardPage` |
| `/calendar` | `CalendarPage` |
| `/workouts` | `WorkoutsPage` |
| `/workouts/new`, `/workouts/edit/:code` | `TemplateEditorPage` |
| `/progress` | `ProgressPage` |
| `/progress/exercise/:exerciseName` | `ExerciseRoute` |
| `/history` | `HistoryPage` |

Legacy hash URLs redirect: `/records` → `/history`, `/templates*` → `/workouts*`,
`/progress/:exerciseName` → `/progress/exercise/:exerciseName`.

⚠ **Route order matters.** `/progress/:exerciseName` must be declared *after*
`/progress/exercise/:exerciseName` or it swallows it. `/templates/edit/:code` needs a
param-forwarding component, not a plain `<Navigate>`.

### Navigation shell

`AppShell` renders a sectioned sidebar (TRAIN / INSIGHTS / ACCOUNT). Below 768px it is a
slide-out drawer with its own backdrop, focus management and body scroll lock, all gated on
`useMediaQuery(MOBILE_QUERY)` so none of it applies to the permanent desktop column.

### API Layer

`SpeedianceClient` (`src/api/speediance.ts`) handles all Speediance API communication. It uses mobile app headers for CORS compatibility. Auth is two-step: verify identity then password login. Throws `AuthError` on 401/token expiry.

`docs/speediance-api.md` documents every endpoint family that has been observed, including
the finding that **no muscle-report endpoint exists** — per-muscle volume is derived
client-side (see below).

### Data Model

Records can come from two sources with different detail shapes:
- **Speediance API**: `SpeedianceExercise[]` with `finishedReps` containing per-set weight/rep data via `trainingInfoDetail.weights`
- **FitNote CSV import**: `{ actionTrainingInfoList: FitNoteExercise[] }` with `setTrainingInfoList` for sets

Both are stored in the same `TrainingRecord.detail` field (discriminated by `type`). The `RecordDetail` union type in `src/types/index.ts` defines all variants.

**Metric coverage is not uniform, and this drives several UI decisions.** `capacity`
(volume) is populated for every record regardless of source. `duration` and `calories` are
`0` for every FitNote-imported record because that export carries neither — those zeroes
are *missing data, not real values*. `src/lib/stats.ts` therefore sums only records that
carry the field and reports a `*Coverage` fraction alongside; any tile below full coverage
must render an "N of M sessions" footnote. Never average a metric by session count.

### Derived analytics (`src/lib/`)

- **`stats.ts`** — aggregation, bucketing, streaks, deltas, PR feed. Dates are `YYYY-MM-DD`
  and compared lexicographically; avoid constructing `Date`s in hot paths.
- **`exercise-progress.ts`** — per-exercise sessions, Epley e1RM, PR detection, trend.
  `detectPRs()` flags every exercise's first-ever session, so any PR feed must skip
  `sessions[0]`. Trend uses a **half-mean** comparison, not endpoints, and excludes
  sessions marked light.
- **Light sessions** — warmup exercises and deload weeks are detected by relative load
  against a recent reference window (`LIGHT_LOAD_RATIO`). They are excluded from the trend
  and PR detection, and charts plot them as hollow points on a **separate dataset** so the
  trend line does not pass through them.
- **`muscle-focus.ts`** — per-muscle volume, derived by joining each exercise to its muscle
  metadata via `actionLibraryGroupId`. Volume is credited **in full** to every engaged
  muscle rather than split, so totals sum to ~2.5× session volume by design. Excludes
  FitNote imports (no group id).
- **`presets.ts`** — template presets are read from the API's `templatePresetList`, not
  hardcoded. Load-based and time-based presets are not interchangeable.

### Styling

Styles live in `src/styles/`. `src/index.css` is the entry point and `@import`s them in a
deliberate order: `tokens.css` → `base.css` → `layout.css` → `components.css` →
`responsive.css` → `pages.css` → `dashboard.css`. No CSS modules, no component library.

⚠ `responsive.css` is imported *before* the page stylesheets, so a later unconditional rule
in `pages.css` beats a media-query rule of equal specificity in `responsive.css`. When a
breakpoint override appears not to apply, check this before adding specificity.

**Theming rule: variable names are frozen, only values change per theme.** `tokens.css`
holds `:root` (theme-independent), `:root, [data-theme="light"]` (light is the default so
an unset attribute still renders) and `[data-theme="dark"]`. Do not introduce a literal
colour outside `tokens.css`; the only exceptions are colours baked into inline SVG data
URIs and the three commented literals (video letterboxing, and text/accent on the
workout-card gradient band).

The attribute is set pre-paint by a blocking script in `index.html` and thereafter by
`src/hooks/useTheme.ts`. Chart.js colours are read from tokens via
`src/lib/chart-theme.ts`, which uses a **detached probe element** carrying the requested
theme — reading `document.documentElement` returns the *outgoing* theme mid-switch.

All light-theme colour pairs are checked against WCAG AA, including text over the soft
tints (`--accent-soft`, `--success-soft`, pill backgrounds), which are the cases that fail
first. Filled buttons take `color: var(--bg-base)` so the label inverts with the theme.

### Component Patterns

- **Responsive dual rendering**: components like `RecordList` and `CalendarPage` render
  both layouts and let CSS decide. No JS width checks for pure styling — `useMediaQuery`
  is only for cases where *behaviour* differs (focus traps, `inert`, split panes).
- **Modal system**: `ModalContainer` in App.tsx switches on `activeModal` state; individual modals use a shared `Modal` wrapper
- **Toast**: Global toast via `showToast()` from context, auto-dismisses after 4s
- **Motion**: a global `prefers-reduced-motion` block neutralises transitions and
  keyframes (the spinner is deliberately exempted and slowed instead). Chart.js animates in
  JS and cannot be reached by CSS, so it reads `REDUCED_MOTION_QUERY` directly.
- **Focus**: one `:focus-visible` ring defined once in `base.css` via `:where(...)`, so it
  carries zero specificity and any component can override it.
