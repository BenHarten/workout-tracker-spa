import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { TemplateList } from "../components/templates/TemplateList";
import { downloadTemplatesCSV } from "../lib/export";

export function TemplatesPage() {
  const { templates } = useApp();
  const navigate = useNavigate();
  const lastSynced = templates.last_synced || "Never";
  const templateCount = Object.keys(templates.templates).length;

  function handleExport() {
    downloadTemplatesCSV(templates.templates);
  }

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <button
          className="export-csv-btn"
          onClick={handleExport}
          disabled={templateCount === 0}
          title={templateCount === 0 ? "No templates to export" : "Download all templates as CSV"}
        >
          Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/templates/new")}>
          + New Template
        </button>
      </div>
      <TemplateList />
    </div>
  );
}
