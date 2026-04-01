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

## Architecture

React 19 + TypeScript SPA that syncs workout data from the Speediance smart gym API and supports FitNote CSV imports. Deployed to GitHub Pages at `/workout-tracker-spa/`.

### State Management

Single React Context (`AppContext`) provides all shared state via `useApp()` hook. Three persistent stores backed by `useLocalStorage`:
- `config` (Config) - auth credentials, region, device type
- `records` (TrainingRecordsStore) - training records keyed by ID
- `templates` (WorkoutTemplatesStore) - workout templates keyed by code

UI state (active modal, toast) lives in AppContext but is not persisted.

### Routing & Auth

`PasscodeGate` wraps the entire app with local SHA-256 passcode verification (no server). Inside the gate, `AppProvider` > `HashRouter` provides two routes:
- `/` - RecordsPage (training history)
- `/templates` - TemplatesPage (workout templates)

### API Layer

`SpeedianceClient` (`src/api/speediance.ts`) handles all Speediance API communication. It uses mobile app headers for CORS compatibility. Auth is two-step: verify identity then password login. Throws `AuthError` on 401/token expiry.

### Data Model

Records can come from two sources with different detail shapes:
- **Speediance API**: `SpeedianceExercise[]` with `finishedReps` containing per-set weight/rep data via `trainingInfoDetail.weights`
- **FitNote CSV import**: `{ actionTrainingInfoList: FitNoteExercise[] }` with `setTrainingInfoList` for sets

Both are stored in the same `TrainingRecord.detail` field (discriminated by `type`). The `RecordDetail` union type in `src/types/index.ts` defines all variants.

### Styling

All styles live in `src/index.css` - a single file with CSS custom properties (dark theme, gold accent `#d4a843`). No CSS modules, no component library. Responsive with mobile-first cards that become tables at 768px+. Modals render as bottom sheets on mobile, centered dialogs on desktop.

### Component Patterns

- **Responsive dual rendering**: Components like `RecordList` render both card (mobile) and table (desktop) layouts, toggled by CSS breakpoints
- **Modal system**: `ModalContainer` in App.tsx switches on `activeModal` state; individual modals use a shared `Modal` wrapper
- **Toast**: Global toast via `showToast()` from context, auto-dismisses after 4s
