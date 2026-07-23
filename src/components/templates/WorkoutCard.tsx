import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { TemplateDetail } from "./TemplateDetail";
import { useDeleteTemplate } from "../../hooks/useDeleteTemplate";
import { estimateTemplateMinutes } from "../../lib/template-payload";
import type { WorkoutTemplate } from "../../types";

/*
 * Header hue is derived from the workout's code rather than its position, so a
 * workout keeps the same colour across sorts, filters and reloads. Lightness
 * comes from theme tokens so the band works on both backgrounds.
 */
function hueFor(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) % 360;
  }
  return h;
}

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

/** Distinct primary muscle groups, in the order the exercises appear. */
function muscleGroups(template: WorkoutTemplate): string[] {
  const seen: string[] = [];
  for (const ex of template.exercises ?? []) {
    const name = ex.mainMuscleGroupName?.trim();
    if (name && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

interface Props {
  template: WorkoutTemplate;
  selected: boolean;
  onToggleSelect: (code: string) => void;
}

export function WorkoutCard({ template, selected, onToggleSelect }: Props) {
  const navigate = useNavigate();
  const { deleteTemplate, deleting } = useDeleteTemplate();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const device = template.device_type === 2 ? "Gym Pal" : "Gym Monster";
  const count = template.exercises?.length ?? 0;
  const minutes = estimateTemplateMinutes(template);
  const groups = muscleGroups(template);

  const bandStyle = {
    "--wc-h1": hueFor(template.code),
    "--wc-h2": (hueFor(template.code) + 28) % 360,
  } as CSSProperties;

  return (
    <article className={`workout-card${selected ? " selected" : ""}`}>
      <div className="workout-card-band" style={bandStyle}>
        <label className="workout-card-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(template.code)}
            aria-label={`Select ${template.name}`}
          />
        </label>
        <h3 className="workout-card-name">{template.name}</h3>
        <p className="workout-card-meta">
          {count} exercise{count !== 1 ? "s" : ""}
          {/* Templates carry no duration; the tilde marks this as derived. */}
          {minutes > 0 && <> · ~{minutes} min</>}
          {" · "}
          {device}
        </p>
      </div>

      <div className="workout-card-body">
        {groups.length > 0 && (
          <div className="workout-card-groups">
            {groups.slice(0, 4).map((g) => (
              <span key={g} className="muscle-chip">{g}</span>
            ))}
            {groups.length > 4 && <span className="muscle-chip">+{groups.length - 4}</span>}
          </div>
        )}

        {confirmDelete ? (
          <div className="tpl-confirm-delete">
            <span className="tpl-confirm-text">Delete "{template.name}"?</span>
            <button
              className="btn btn-danger btn-tiny"
              onClick={() => void deleteTemplate(template)}
              disabled={deleting}
            >
              {deleting ? <span className="spinner" /> : "Delete"}
            </button>
            <button className="btn btn-ghost btn-tiny" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="workout-card-actions">
            <button
              className="btn btn-ghost btn-tiny"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {expanded ? "Hide" : "View"}
              <ChevronDown />
            </button>
            <button
              className="btn btn-ghost tpl-action-btn"
              onClick={() => navigate(`/workouts/edit/${template.code}`)}
              title="Edit workout"
            >
              <EditIcon />
            </button>
            {template.id && (
              <button
                className="btn btn-ghost tpl-action-btn tpl-action-danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete workout"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && <TemplateDetail template={template} />}
    </article>
  );
}
