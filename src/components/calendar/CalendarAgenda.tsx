import { RecordDetail } from "../records/RecordDetail";
import { formatVolume } from "../../lib/format";
import { parseDateStr, toDateStr } from "../../lib/calendar";
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

/**
 * Vertical day list — the mobile calendar, and an optional desktop view.
 *
 * Only days with workouts are listed. A month of mostly-empty rows is noise,
 * and with no scheduling model there is nothing to add to an empty day.
 */
export function CalendarAgenda({ year, month, byDate, selectedDate, today, onSelect }: Props) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { date: string; recs: TrainingRecord[] }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = toDateStr(year, month, d);
    const recs = byDate[date];
    if (recs?.length) days.push({ date, recs });
  }

  if (days.length === 0) {
    return (
      <div className="calendar-agenda">
        <p className="calendar-empty">No workouts logged this month.</p>
      </div>
    );
  }

  return (
    <div className="calendar-agenda">
      {days.map(({ date, recs }) => {
        const d = parseDateStr(date);
        const selected = selectedDate === date;
        const volume = recs.reduce((sum, r) => sum + (r.capacity || 0), 0);

        return (
          <div key={date} className={`agenda-day${date === today ? " is-today" : ""}`}>
            <button
              type="button"
              className="agenda-row"
              onClick={() => onSelect(date)}
              aria-expanded={selected}
            >
              <span className="agenda-date">
                <span className="agenda-weekday">
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className="agenda-daynum tnum">{d.getDate()}</span>
              </span>
              <span className="agenda-pills">
                {recs.map((r) => (
                  <span key={String(r.id)} className={`calendar-pill pill-${typeClass(r.type)}`}>
                    {r.name}
                  </span>
                ))}
              </span>
              <span className="agenda-volume tnum">{formatVolume(volume)}</span>
            </button>

            {selected && (
              <div className="agenda-detail">
                {recs.map((rec, i) => (
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
      })}
    </div>
  );
}
