# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar view to the Records page that shows which days have workouts; clicking a day reveals the full workout detail inline.

**Architecture:** A `CalendarView` component groups `TrainingRecord[]` by `date` and renders a CSS-grid month calendar. A List | Calendar toggle in `RecordsPage` switches between the existing `RecordList` and `CalendarView`. On desktop, calendar tiles show the workout name (or a `N×` indicator for multiple); on mobile, trained days are gold-highlighted with an optional count badge. Clicking a day renders `RecordDetail` beneath the calendar grid — identical to how the list expands records.

**Tech Stack:** React 19, TypeScript (strict), CSS custom properties in `src/index.css`, no external libraries.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/records/CalendarView.tsx` | **Create** | Calendar grid, month navigation, day-click detail section |
| `src/index.css` | **Modify** | Calendar grid, day cell, responsive rules, toggle button styles |
| `src/pages/RecordsPage.tsx` | **Modify** | View-toggle state, conditional render of `CalendarView` vs `RecordList` |

---

## Task 1: Add calendar + toggle CSS to `src/index.css`

**Files:**
- Modify: `src/index.css` (append at end of file)

- [ ] **Step 1: Append calendar styles**

Open `src/index.css` and add at the very end:

```css
/* ── View Toggle ──────────────────────────────────────── */

.view-toggle {
  display: flex;
  gap: var(--space-xs);
  margin-left: auto;
}

.view-toggle-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s, border-color 0.15s;
}

.view-toggle-btn:hover {
  color: var(--text-secondary);
  border-color: var(--border);
}

.view-toggle-btn.active {
  color: var(--accent);
  border-color: var(--accent);
}

.view-toggle-btn svg {
  width: 16px;
  height: 16px;
}

/* ── Calendar ──────────────────────────────────────────── */

.calendar {
  padding: var(--space-md);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.calendar-month {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.calendar-nav {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-lg);
  line-height: 1;
  padding: 2px 10px;
  transition: color 0.15s, border-color 0.15s;
}

.calendar-nav:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.calendar-weekday {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-muted);
  padding: var(--space-xs) 0;
}

/* Mobile day cell */
.calendar-day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
  background: transparent;
  cursor: default;
  overflow: hidden;
}

.calendar-day.has-workout {
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
}

.calendar-day.has-workout:hover {
  background: var(--bg-hover);
}

.calendar-day.selected {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: var(--bg-elevated);
}

.calendar-day-num {
  font-size: var(--text-sm);
  line-height: 1;
}

.calendar-day.has-workout .calendar-day-num {
  color: var(--accent);
  font-weight: 600;
}

/* Desktop-only: workout name and multi indicator inside tile */
.calendar-day-name {
  display: none;
}

.calendar-day-multi {
  display: none;
}

/* Mobile-only: count badge top-right */
.calendar-day-badge {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 9px;
  background: var(--accent);
  color: #000;
  border-radius: 10px;
  padding: 0 4px;
  line-height: 1.6;
  font-weight: 700;
}

@media (min-width: 768px) {
  .calendar-day {
    aspect-ratio: unset;
    min-height: 64px;
    align-items: flex-start;
    justify-content: flex-start;
    padding: var(--space-xs);
  }

  /* Show name / multi indicator on desktop */
  .calendar-day-name {
    display: block;
    font-size: 10px;
    color: var(--accent);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .calendar-day-multi {
    display: block;
    font-size: 10px;
    color: var(--accent);
    margin-top: 2px;
  }

  /* Hide mobile badge on desktop */
  .calendar-day-badge {
    display: none;
  }
}

/* ── Calendar detail section ──────────────────────────── */

.calendar-detail {
  margin-top: var(--space-md);
  border-top: 1px solid var(--border);
  padding-top: var(--space-md);
}

.calendar-detail-date {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  text-transform: capitalize;
}

.calendar-detail-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.calendar-detail-divider {
  border-top: 1px solid var(--border-subtle);
  margin: var(--space-md) 0;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/uli/Code/workout-tracker-spa && npm run build
```

Expected: no TypeScript or lint errors (CSS changes don't affect TS).

---

## Task 2: Create `CalendarView` component

**Files:**
- Create: `src/components/records/CalendarView.tsx`

- [ ] **Step 1: Create the file with full implementation**

```tsx
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { RecordDetail } from "./RecordDetail";
import type { TrainingRecord } from "../../types";

function groupByDate(records: TrainingRecord[]): Record<string, TrainingRecord[]> {
  const result: Record<string, TrainingRecord[]> = {};
  for (const r of records) {
    if (!result[r.date]) result[r.date] = [];
    result[r.date].push(r);
  }
  return result;
}

/** Returns array of day numbers (1–N) with leading nulls for weekday offset (Mon=0). */
function getMonthCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // convert to Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarView() {
  const { records } = useApp();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = groupByDate(Object.values(records.records));
  const cells = getMonthCells(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(year, month, day);
    if (!byDate[dateStr]) return;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedRecords = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>‹</button>
        <span className="calendar-month">{monthLabel}</span>
        <button className="calendar-nav" onClick={nextMonth}>›</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const dateStr = toDateStr(year, month, day);
          const recs = byDate[dateStr] ?? [];
          const hasWorkout = recs.length > 0;
          const isSelected = selectedDate === dateStr;
          const multiple = recs.length > 1;

          return (
            <div
              key={dateStr}
              className={[
                "calendar-day",
                hasWorkout ? "has-workout" : "",
                isSelected ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleDayClick(day)}
            >
              <span className="calendar-day-num">{day}</span>

              {/* Desktop: name for single workout, N× for multiple */}
              {hasWorkout && !multiple && (
                <span className="calendar-day-name">{recs[0].name}</span>
              )}
              {hasWorkout && multiple && (
                <span className="calendar-day-multi">{recs.length}×</span>
              )}

              {/* Mobile: count badge for multiple workouts */}
              {multiple && (
                <span className="calendar-day-badge">{recs.length}</span>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && selectedRecords.length > 0 && (
        <div className="calendar-detail">
          <div className="calendar-detail-date">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          {selectedRecords.map((rec, i) => (
            <div key={String(rec.id)}>
              {i > 0 && <div className="calendar-detail-divider" />}
              <div className="calendar-detail-name">{rec.name}</div>
              <RecordDetail record={rec} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/uli/Code/workout-tracker-spa && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/uli/Code/workout-tracker-spa
git add src/components/records/CalendarView.tsx src/index.css
git commit -m "feat: add CalendarView component and calendar CSS"
```

---

## Task 3: Add view toggle to `RecordsPage`

**Files:**
- Modify: `src/pages/RecordsPage.tsx`

- [ ] **Step 1: Replace file content**

Replace the entire `src/pages/RecordsPage.tsx` with:

```tsx
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { RecordList } from "../components/records/RecordList";
import { CalendarView } from "../components/records/CalendarView";

type View = "list" | "calendar";

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export function RecordsPage() {
  const { records } = useApp();
  const [view, setView] = useState<View>("list");

  const count = Object.keys(records.records).length;
  const lastSynced = records.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <span className="dot" />
        <span>{count} record{count !== 1 ? "s" : ""}</span>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
            title="List view"
          >
            <ListIcon />
          </button>
          <button
            className={`view-toggle-btn${view === "calendar" ? " active" : ""}`}
            onClick={() => setView("calendar")}
            title="Calendar view"
          >
            <CalendarIcon />
          </button>
        </div>
      </div>
      {view === "list" ? <RecordList /> : <CalendarView />}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript + lint**

```bash
cd /Users/uli/Code/workout-tracker-spa && npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual verification**

```bash
cd /Users/uli/Code/workout-tracker-spa && npm run dev
```

Check:
1. Records page shows two small icon buttons (list / calendar) at the right of the status bar
2. Toggle switches between RecordList and CalendarView
3. Calendar shows current month with correct weekday offset
4. Days with workouts appear gold-highlighted
5. Single-workout desktop tile shows workout name; multi-workout tile shows `N×`
6. Click a workout day → detail section appears below grid with date header + RecordDetail
7. Click same day again → detail collapses
8. Prev/next arrows navigate months; selection clears on month change
9. Resize to mobile (< 768px): tiles are square, only gold highlight + badge for multiples; no name in tile

- [ ] **Step 4: Commit**

```bash
cd /Users/uli/Code/workout-tracker-spa
git add src/pages/RecordsPage.tsx
git commit -m "feat: add list/calendar toggle to RecordsPage"
```
