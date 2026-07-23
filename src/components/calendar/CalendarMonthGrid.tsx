import { WEEKDAY_LABELS, getMonthCells, toDateStr } from "../../lib/calendar";
import { typeClass } from "./workoutTypes";
import type { TrainingRecord } from "../../types";

interface Props {
  year: number;
  month: number;
  byDate: Record<string, TrainingRecord[]>;
  selectedDate: string | null;
  today: string;
  onSelect: (date: string) => void;
}

export function CalendarMonthGrid({ year, month, byDate, selectedDate, today, onSelect }: Props) {
  const cells = getMonthCells(year, month);

  return (
    <div className="calendar-grid" role="grid" aria-label="Month">
      {WEEKDAY_LABELS.map((d) => (
        <div key={d} className="calendar-weekday">
          {d}
        </div>
      ))}

      {cells.map((day, i) => {
        if (day === null) return <div key={`pad-${i}`} className="calendar-pad" />;

        const date = toDateStr(year, month, day);
        const recs = byDate[date] ?? [];
        const has = recs.length > 0;

        return (
          <button
            key={date}
            type="button"
            className={[
              "calendar-day",
              has ? "has-workout" : "",
              selectedDate === date ? "selected" : "",
              date === today ? "is-today" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => has && onSelect(date)}
            // Empty days are inert: there is nothing to expand.
            disabled={!has}
            aria-pressed={selectedDate === date}
          >
            <span className="calendar-day-num tnum">{day}</span>
            {has && (
              <span className="calendar-pills">
                {recs.slice(0, 2).map((r) => (
                  <span
                    key={String(r.id)}
                    className={`calendar-pill pill-${typeClass(r.type)}`}
                    title={r.name}
                  >
                    {r.name}
                  </span>
                ))}
                {recs.length > 2 && (
                  <span className="calendar-pill pill-more">+{recs.length - 2}</span>
                )}
              </span>
            )}
            {/* Narrow grids hide the pills; a count keeps the day legible. */}
            {recs.length > 1 && <span className="calendar-day-badge tnum">{recs.length}</span>}
          </button>
        );
      })}
    </div>
  );
}
