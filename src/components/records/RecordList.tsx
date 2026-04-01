import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { RecordDetail } from "./RecordDetail";
import { formatDuration, formatDate, formatVolume } from "../../lib/format";
import type { TrainingRecord } from "../../types";

const ChevronDown = () => (
  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function RecordCard({ record }: { record: TrainingRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className={`card${expanded ? " expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
        <div className="card-top">
          <span className="card-name">{record.name}</span>
          <div className="card-right">
            <span className="card-volume">{formatVolume(record.capacity)}</span>
            <ChevronDown />
          </div>
        </div>
        <div className="card-meta">
          <span>{formatDate(record.date)}</span>
          {record.duration > 0 && <span>{formatDuration(record.duration)}</span>}
          {record.calories > 0 && <span>{record.calories} cal</span>}
        </div>
      </div>
      {expanded && <RecordDetail record={record} />}
    </div>
  );
}

function RecordRow({ record }: { record: TrainingRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={expanded ? "expanded" : ""} onClick={() => setExpanded(!expanded)}>
        <td>{formatDate(record.date)}</td>
        <td className="col-name">{record.name}</td>
        <td>{formatDuration(record.duration)}</td>
        <td>{record.calories || "—"}</td>
        <td className="col-volume">{formatVolume(record.capacity)}</td>
        <td><ChevronDown /></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={6}><RecordDetail record={record} /></td>
        </tr>
      )}
    </>
  );
}

export function RecordList() {
  const { records } = useApp();
  const sorted = Object.values(records.records).sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#xe3af;</div>
        <p className="empty-state-text">
          No records yet. Sync your workouts using the sync button above.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Workout</th>
            <th>Duration</th>
            <th>Cal</th>
            <th>Volume</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((rec) => (
            <RecordRow key={String(rec.id)} record={rec} />
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="card-list">
        {sorted.map((rec) => (
          <RecordCard key={String(rec.id)} record={rec} />
        ))}
      </div>
    </>
  );
}
