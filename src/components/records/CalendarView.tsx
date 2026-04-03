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
