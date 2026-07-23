import { useState } from "react";
import { RecordDetail } from "./RecordDetail";
import { typeClass } from "../calendar/workoutTypes";
import { formatDuration, formatDate, formatVolume } from "../../lib/format";
import type { TrainingRecord } from "../../types";

const ChevronDown = () => (
  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const TYPE_LABELS: Record<string, string> = {
  custom: "Custom",
  plan: "Program",
  course: "Course",
  fitnote: "Imported",
};

/** Origin badge, sharing the calendar's colour vocabulary. */
function TypeBadge({ record }: { record: TrainingRecord }) {
  const cls = typeClass(record.type);
  // A pill containing only a dash is noise; unlabelled sessions get plain text.
  if (!TYPE_LABELS[cls]) return <span className="text-muted">—</span>;
  return <span className={`type-badge pill-${cls}`}>{TYPE_LABELS[cls]}</span>;
}

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
          <TypeBadge record={record} />
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
        <td><TypeBadge record={record} /></td>
        {/* Imports carry no duration or calories; an em dash beats a zero. */}
        <td>{record.duration > 0 ? formatDuration(record.duration) : "—"}</td>
        <td>{record.calories || "—"}</td>
        <td className="col-volume">{formatVolume(record.capacity)}</td>
        <td><ChevronDown /></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={7}><RecordDetail record={record} /></td>
        </tr>
      )}
    </>
  );
}

export function RecordList({ records }: { records: TrainingRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#xe3af;</div>
        <p className="empty-state-text">
          No records in this range. Widen the dates, or sync your workouts.
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
            <th>When</th>
            <th>Workout</th>
            <th>Type</th>
            <th>Time</th>
            <th>Kcal</th>
            <th>Vol kg</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <RecordRow key={String(rec.id)} record={rec} />
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="card-list">
        {records.map((rec) => (
          <RecordCard key={String(rec.id)} record={rec} />
        ))}
      </div>
    </>
  );
}
