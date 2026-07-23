import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { RecordDetail } from "./RecordDetail";
import {
  WEEKDAY_LABELS,
  getMonthCells,
  groupRecordsByDate,
  longDateLabel,
  monthLabel as formatMonthLabel,
  toDateStr,
} from "../../lib/calendar";

export function CalendarView() {
  const { records } = useApp();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = groupRecordsByDate(Object.values(records.records));
  const cells = getMonthCells(year, month);

  const monthLabel = formatMonthLabel(year, month);

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
        {WEEKDAY_LABELS.map((d) => (
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
    </div>
  );
}
