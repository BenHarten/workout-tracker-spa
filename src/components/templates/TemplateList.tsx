import { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { WorkoutTemplate } from "../../types";

const ChevronDown = () => (
  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function TemplateDetail({ template }: { template: WorkoutTemplate }) {
  if (!template.exercises || template.exercises.length === 0) {
    return (
      <div className="detail-panel">
        <span className="text-muted">No detail data for this template.</span>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      {template.exercises.map((ex, i) => (
        <div className="template-exercise" key={i}>
          <span className="template-exercise-name">{ex.title}</span>
          <span className="template-exercise-sets">{ex.setsAndReps}</span>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: WorkoutTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const device = template.device_type === 2 ? "Gym Pal" : "Gym Monster";

  return (
    <div>
      <div className={`card${expanded ? " expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
        <div className="card-top">
          <span className="card-name">{template.name}</span>
          <div className="card-right">
            <ChevronDown />
          </div>
        </div>
        <div className="card-meta">
          <span>{template.exercises?.length || 0} exercises</span>
          <span>{device}</span>
        </div>
      </div>
      {expanded && <TemplateDetail template={template} />}
    </div>
  );
}

function TemplateRow({ template }: { template: WorkoutTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const device = template.device_type === 2 ? "Gym Pal" : "Gym Monster";

  return (
    <>
      <tr className={expanded ? "expanded" : ""} onClick={() => setExpanded(!expanded)}>
        <td className="col-name">{template.name}</td>
        <td>{template.exercises?.length || 0}</td>
        <td>{device}</td>
        <td><ChevronDown /></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={4}><TemplateDetail template={template} /></td>
        </tr>
      )}
    </>
  );
}

export function TemplateList() {
  const { templates } = useApp();
  const sorted = Object.values(templates.templates).sort((a, b) => a.name.localeCompare(b.name));

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#xe3af;</div>
        <p className="empty-state-text">
          No templates yet. Sync your templates using the sync button above.
        </p>
      </div>
    );
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Exercises</th>
            <th>Device</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tpl) => (
            <TemplateRow key={tpl.code} template={tpl} />
          ))}
        </tbody>
      </table>

      <div className="card-list">
        {sorted.map((tpl) => (
          <TemplateCard key={tpl.code} template={tpl} />
        ))}
      </div>
    </>
  );
}
