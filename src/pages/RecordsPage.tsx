import { useApp } from "../context/AppContext";
import { RecordList } from "../components/records/RecordList";

export function RecordsPage() {
  const { records } = useApp();
  const count = Object.keys(records.records).length;
  const lastSynced = records.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <span className="dot" />
        <span>{count} record{count !== 1 ? "s" : ""}</span>
      </div>
      <RecordList />
    </div>
  );
}
