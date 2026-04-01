import { useApp } from "../context/AppContext";
import { TemplateList } from "../components/templates/TemplateList";

export function TemplatesPage() {
  const { templates } = useApp();
  const lastSynced = templates.last_synced || "Never";

  return (
    <div className="page">
      <div className="status-bar">
        <span>Last synced: {lastSynced}</span>
      </div>
      <TemplateList />
    </div>
  );
}
