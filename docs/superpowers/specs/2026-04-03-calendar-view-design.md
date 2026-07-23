# Calendar View Design

**Date:** 2026-04-03

## Context

The app currently shows training records only as a list (table on desktop, cards on mobile). Users want to see at a glance on which days they trained — a calendar view makes training frequency and consistency immediately visible. Clicking a day reveals the workout detail, the same way the list does today.

## Design

### Integration: Toggle in RecordsPage

- A List | Calendar toggle is added at the top of `RecordsPage` (left side, near the status bar)
- View state is local React state (`useState`), defaulting to `"list"`
- Navigating away and back resets to list — intentional, no URL param needed
- The existing `RecordList` renders unchanged in list mode

### New Component: `CalendarView` (`src/components/records/CalendarView.tsx`)

**Calendar grid:**
- CSS Grid, 7 columns (Mon–Sun), weekday header row
- Month navigation: `‹ April 2026 ›` arrows, starts at current month
- Data: `Object.values(records.records)` grouped by `date` (YYYY-MM-DD)

**Day cell rendering (responsive):**

| Situation | Desktop | Mobile |
|-----------|---------|--------|
| No workout | Grey number | Grey number |
| 1 workout | Workout name in gold | Gold highlight |
| 2+ workouts | Dot indicator (e.g. `● ●`) | Gold highlight + small count badge |

**Interaction:**
- Clicking a day with workouts selects it (highlighted border/ring)
- Clicking the same day again deselects it (collapses detail)
- Days with no workout are not clickable

**Detail section (below the grid):**
- Shown when a day is selected
- Header: formatted date (e.g. "9. April 2026")
- For each training record on that day: renders `<RecordDetail record={r} />` — the exact same component used inline in the list
- Multiple records separated by a divider line

### Files Changed

| File | Change |
|------|--------|
| `src/pages/RecordsPage.tsx` | Add view toggle state + conditional render of `CalendarView` |
| `src/components/records/CalendarView.tsx` | New component (calendar grid + detail section) |
| `src/index.css` | Calendar styles (grid, cells, responsive breakpoints) |

### Reused

- `RecordDetail` (`src/components/records/RecordDetail.tsx`) — rendered as-is for each workout in the day detail
- `formatDate` (`src/lib/format.ts`) — for the detail section header
- CSS custom properties (`--gold: #d4a843`, dark theme variables) — used throughout calendar styles

## Verification

1. `npm run dev` — toggle appears on Records page, switches between list and calendar
2. Navigate months, verify only dates with records are highlighted
3. Click a single-workout day → detail expands below with correct exercises/sets
4. Click a multi-workout day → both records shown, separated by divider; dot indicator on desktop / badge on mobile
5. Click selected day → collapses
6. Resize window → desktop shows workout name in tile, mobile shows gold highlight only
7. `npm run build` — TypeScript + lint pass with no errors
