import { useApp } from "../context/AppContext";
import { RecordList } from "../components/records/RecordList";
import { downloadWorkoutsCSV } from "../lib/export";

/**
 * Training history. The calendar that used to live here behind a view toggle
 * is now its own route (/calendar).
 *
 * Date-range filtering and summary stat tiles arrive in a later phase.
 */
export function HistoryPage() {
  const { records } = useApp();

  const count = Object.keys(records.records).length;
  const lastSynced = records.last_synced || "Never";

  return (
    <div className="page">
      <h1 className="page-title">History</h1>
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <span className="dot" />
        <span>{count} record{count !== 1 ? "s" : ""}</span>
        <button
          className="export-csv-btn"
          onClick={() => downloadWorkoutsCSV(records.records)}
          disabled={count === 0}
          title={count === 0 ? "No records to export" : "Download all workouts as CSV"}
        >
          Export CSV
        </button>
      </div>
      <RecordList />
    </div>
  );
}
