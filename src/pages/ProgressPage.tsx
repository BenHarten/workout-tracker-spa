import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getExerciseSummaries } from "../lib/exercise-progress";
import { formatDate } from "../lib/format";

export function ProgressPage() {
  const { records } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const summaries = useMemo(() => getExerciseSummaries(records), [records]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [summaries, search]);

  return (
    <main className="page">
      <h1 className="page-title">Progress</h1>

      <div className="progress-search-wrap">
        <svg className="progress-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="form-input progress-search-input"
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">
            {summaries.length === 0
              ? "No exercise data yet. Sync your workouts or import from FitNote to see progress."
              : "No exercises match your search."}
          </div>
        </div>
      ) : (
        <div className="card-list">
          {filtered.map((s, i) => (
            <div
              key={s.name}
              className="card"
              onClick={() => navigate(`/progress/${encodeURIComponent(s.name)}`)}
              style={
                i === 0
                  ? { borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }
                  : i === filtered.length - 1
                    ? { borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }
                    : undefined
              }
            >
              <div className="card-top">
                <div>
                  <div className="card-name">{s.displayName}</div>
                  <div className="card-meta">
                    <span>{formatDate(s.lastPerformed)}</span>
                    <span className="dot" />
                    <span>{s.sessionCount} session{s.sessionCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="card-right">
                  <div className="card-volume">{Math.round(s.bestWeight)} KG</div>
                  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
