import { Link } from "react-router-dom";
import { formatDate, formatDuration, formatVolume } from "../../lib/format";
import type { TrainingRecord } from "../../types";

export function RecentSessions({ records }: { records: TrainingRecord[] }) {
  if (records.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Recent sessions</h2>
        <Link to="/history" className="panel-link">
          All history
        </Link>
      </div>
      <ul className="session-list">
        {records.map((r) => (
          <li key={String(r.id)} className="session-row">
            <span className="session-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="session-name">{r.name}</span>
            <span className="session-meta tnum">
              {/* Duration is 0 for FitNote imports — omit rather than show "0m". */}
              {r.duration > 0 && <>{formatDuration(r.duration)} · </>}
              {formatVolume(r.capacity)}
            </span>
            <span className="session-date tnum">{formatDate(r.date)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
