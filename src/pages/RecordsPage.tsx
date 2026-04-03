import { useState } from "react";
import { useApp } from "../context/AppContext";
import { RecordList } from "../components/records/RecordList";
import { CalendarView } from "../components/records/CalendarView";

type View = "list" | "calendar";

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export function RecordsPage() {
  const { records } = useApp();
  const [view, setView] = useState<View>("list");

  const count = Object.keys(records.records).length;
  const lastSynced = records.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <span className="dot" />
        <span>{count} record{count !== 1 ? "s" : ""}</span>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
            title="List view"
          >
            <ListIcon />
          </button>
          <button
            className={`view-toggle-btn${view === "calendar" ? " active" : ""}`}
            onClick={() => setView("calendar")}
            title="Calendar view"
          >
            <CalendarIcon />
          </button>
        </div>
      </div>
      {view === "list" ? <RecordList /> : <CalendarView />}
    </div>
  );
}
