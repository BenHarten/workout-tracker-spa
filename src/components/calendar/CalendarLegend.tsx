import { legendFor } from "./workoutTypes";

/**
 * Legends only the pill colours visible in the month on screen, so it never
 * explains a colour the user cannot see.
 */
export function CalendarLegend({ present }: { present: Set<string> }) {
  const items = legendFor(present);
  if (items.length === 0) return null;

  return (
    <div className="calendar-legend">
      {items.map(({ cls, label }) => (
        <span key={cls} className="calendar-legend-item">
          <span className={`calendar-legend-dot pill-${cls}`} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}
