import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { CalendarAgenda } from "../components/calendar/CalendarAgenda";
import { CalendarLegend } from "../components/calendar/CalendarLegend";
import { CalendarMonthGrid } from "../components/calendar/CalendarMonthGrid";
import { RecordDetail } from "../components/records/RecordDetail";
import { groupRecordsByDate, longDateLabel, monthLabel } from "../lib/calendar";
import { todayDate } from "../lib/format";
import { typeClass } from "../components/calendar/workoutTypes";

type View = "month" | "agenda";

export function CalendarPage() {
  const { records } = useApp();
  const today = todayDate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");

  const byDate = useMemo(
    () => groupRecordsByDate(Object.values(records.records)),
    [records],
  );

  /* Scoped to the month on screen — legending a colour that is not visible is
     worse than no legend. */
  const presentTypes = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const set = new Set<string>();
    for (const r of Object.values(records.records)) {
      if (r.date.startsWith(prefix)) set.add(typeClass(r.type));
    }
    return set;
  }, [records, year, month]);

  function step(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(null);
  }

  const toggle = (date: string) =>
    setSelectedDate((prev) => (prev === date ? null : date));

  const selectedRecords = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <div className="page">
      <h1 className="page-title">Calendar</h1>
      <p className="page-subtitle">Your training month at a glance</p>

      <div className={`calendar calendar--${view}`}>
        <div className="calendar-header">
          <button className="icon-btn calendar-nav" onClick={() => step(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className="calendar-month">{monthLabel(year, month)}</span>
          <button className="icon-btn calendar-nav" onClick={() => step(1)} aria-label="Next month">
            ›
          </button>

          {/*
            Hidden below the breakpoint: mobile is always the agenda, because a
            seven-column grid cannot show workout names at that width.
          */}
          <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
            <button
              className={`view-toggle-btn${view === "month" ? " active" : ""}`}
              onClick={() => setView("month")}
              aria-pressed={view === "month"}
            >
              Month
            </button>
            <button
              className={`view-toggle-btn${view === "agenda" ? " active" : ""}`}
              onClick={() => setView("agenda")}
              aria-pressed={view === "agenda"}
            >
              Agenda
            </button>
          </div>
        </div>

        {/*
          Both views always render; CSS decides which is visible. Same
          dual-markup idiom the record lists use — no JS width checks.
        */}
        <CalendarMonthGrid
          year={year}
          month={month}
          byDate={byDate}
          selectedDate={selectedDate}
          today={today}
          onSelect={toggle}
        />

        {/* The grid has no room for detail inline, so it expands beneath. */}
        {selectedDate && selectedRecords.length > 0 && (
          <div className="calendar-detail">
            <div className="calendar-detail-date">{longDateLabel(selectedDate)}</div>
            {selectedRecords.map((rec, i) => (
              <div key={String(rec.id)}>
                {i > 0 && <div className="calendar-detail-divider" />}
                <div className="calendar-detail-name">{rec.name}</div>
                <RecordDetail record={rec} />
              </div>
            ))}
          </div>
        )}

        <CalendarAgenda
          year={year}
          month={month}
          byDate={byDate}
          selectedDate={selectedDate}
          today={today}
          onSelect={toggle}
        />

        <CalendarLegend present={presentTypes} />
      </div>
    </div>
  );
}
