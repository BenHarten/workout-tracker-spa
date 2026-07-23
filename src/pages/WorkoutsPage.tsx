import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { TemplateList } from "../components/templates/TemplateList";
import { downloadTemplatesCSV } from "../lib/export";

/**
 * Workout templates. Gradient cards, search/filter and multi-select arrive in
 * a later phase; this is the existing list under the new route and heading.
 */
export function WorkoutsPage() {
  const { templates } = useApp();
  const navigate = useNavigate();
  const lastSynced = templates.last_synced || "Never";
  const templateCount = Object.keys(templates.templates).length;

  return (
    <div className="page">
      <h1 className="page-title">Workouts</h1>
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <button
          className="export-csv-btn"
          onClick={() => downloadTemplatesCSV(templates.templates)}
          disabled={templateCount === 0}
          title={templateCount === 0 ? "No templates to export" : "Download all templates as CSV"}
        >
          Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/workouts/new")}>
          + New Workout
        </button>
      </div>
      <TemplateList />
    </div>
  );
}
