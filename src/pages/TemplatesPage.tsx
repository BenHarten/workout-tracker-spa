import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { TemplateList } from "../components/templates/TemplateList";

export function TemplatesPage() {
  const { templates } = useApp();
  const navigate = useNavigate();
  const lastSynced = templates.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
        <button className="btn btn-primary" onClick={() => navigate("/templates/new")}>
          + New Template
        </button>
      </div>
      <TemplateList />
    </div>
  );
}
