import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { SpeedianceClient, AuthError } from "../../api/speediance";
import { csvSplit } from "../../lib/template-payload";
import type { WorkoutTemplate } from "../../types";

const ChevronDown = () => (
  <svg className="card-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

function useDeleteTemplate() {
  const { config, setConfig, templates, setTemplates, showToast } = useApp();
  const [deleting, setDeleting] = useState(false);

  const deleteTemplate = async (template: WorkoutTemplate) => {
    if (!template.id) return;
    setDeleting(true);
    try {
      const client = new SpeedianceClient(config);
      await client.deleteTemplate(template.id);
      const next = { ...templates.templates };
      delete next[template.code];
      setTemplates({ ...templates, templates: next });
      showToast(`Deleted "${template.name}".`, "success");
    } catch (err) {
      if (err instanceof AuthError) {
        setConfig({ ...config, token: "", user_id: "" });
        showToast("Session expired. Please log in again.", "error");
      } else {
        showToast(err instanceof Error ? err.message : "Delete failed", "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  return { deleteTemplate, deleting };
}

function TemplateDetail({ template }: { template: WorkoutTemplate }) {
  if (!template.exercises || template.exercises.length === 0) {
    return (
      <div className="detail-panel">
        <span className="text-muted">No detail data for this template. Re-sync to load exercise details.</span>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="ex-grid">
        {template.exercises.map((ex, i) => {
          const reps = csvSplit(ex.setsAndReps);
          const rawWeights = csvSplit(ex.weights);
          const hasWeights = rawWeights.length > 0;
          const weights = rawWeights.map((w) => Number(w));

          return (
            <div className="ex-card" key={i}>
              <div className="ex-card-name">{ex.title}</div>
              <table className="ex-card-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    {hasWeights && <th>Weight</th>}
                  </tr>
                </thead>
                <tbody>
                  {reps.map((rep, j) => (
                    <tr key={j}>
                      <td><span className="set-label">Set {j + 1}</span></td>
                      <td>{rep}</td>
                      {hasWeights && <td>{weights[j] ?? "—"} kg</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplateActions({ template }: { template: WorkoutTemplate }) {
  const navigate = useNavigate();
  const { deleteTemplate, deleting } = useDeleteTemplate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div className="tpl-confirm-delete">
        <span className="tpl-confirm-text">Delete "{template.name}"?</span>
        <button
          className="btn btn-danger"
          style={{ padding: "2px 10px", fontSize: "var(--text-xs)" }}
          onClick={(e) => { e.stopPropagation(); void deleteTemplate(template); }}
          disabled={deleting}
        >
          {deleting ? <span className="spinner" /> : "Delete"}
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: "2px 10px", fontSize: "var(--text-xs)" }}
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="tpl-actions">
      <button
        className="btn btn-ghost tpl-action-btn"
        onClick={(e) => { e.stopPropagation(); navigate(`/templates/edit/${template.code}`); }}
        title="Edit template"
      >
        <EditIcon />
      </button>
      {template.id && (
        <button
          className="btn btn-ghost tpl-action-btn"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          title="Delete template"
        >
          <TrashIcon />
        </button>
      )}
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
            <TemplateActions template={template} />
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
        <td onClick={(e) => e.stopPropagation()}>
          <TemplateActions template={template} />
        </td>
        <td><ChevronDown /></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={5}><TemplateDetail template={template} /></td>
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
