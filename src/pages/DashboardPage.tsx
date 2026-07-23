import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatDate } from "../lib/format";

/**
 * Placeholder landing page.
 *
 * The real dashboard — streak, weekly stat tiles with deltas, PR feed,
 * readiness ring, recent sessions — needs the stats aggregation layer that
 * does not exist yet, so this deliberately shows only what is already known
 * rather than inventing numbers.
 */
export function DashboardPage() {
  const { records, setActiveModal } = useApp();

  const all = Object.values(records.records);
  const count = all.length;
  const latest = all.length
    ? all.reduce((a, b) => (a.date > b.date ? a : b))
    : null;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      {count === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👋</div>
          <div className="empty-state-text">
            No workouts yet. Sync from Speediance or import a FitNote CSV to get started.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setActiveModal("sync")}
          >
            Sync now
          </button>
        </div>
      ) : (
        <div className="card-list card-list-standalone">
          <div className="card" style={{ cursor: "default" }}>
            <div className="card-top">
              <div>
                <div className="card-name">Last workout</div>
                <div className="card-meta">
                  {latest ? `${latest.name} · ${formatDate(latest.date)}` : "—"}
                </div>
              </div>
              <div className="card-right">
                <Link to="/history" className="btn btn-ghost">
                  View history
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
