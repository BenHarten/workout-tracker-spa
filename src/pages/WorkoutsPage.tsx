import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { WorkoutCard } from "../components/templates/WorkoutCard";
import { useDeleteTemplate } from "../hooks/useDeleteTemplate";
import { downloadTemplatesCSV } from "../lib/export";
import { formatSyncTime } from "../lib/format";
import type { WorkoutTemplate } from "../types";

type DeviceFilter = "all" | "1" | "2";

const DEVICES: { value: DeviceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1", label: "Gym Monster" },
  { value: "2", label: "Gym Pal" },
];

export function WorkoutsPage() {
  const { templates, showToast } = useApp();
  const navigate = useNavigate();
  const { deleteOne, handleError } = useDeleteTemplate();

  const [search, setSearch] = useState("");
  const [device, setDevice] = useState<DeviceFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const all = useMemo(
    () => Object.values(templates.templates).sort((a, b) => a.name.localeCompare(b.name)),
    [templates],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (device !== "all" && String(t.device_type) !== device) return false;
      if (!q) return true;
      if (t.name.toLowerCase().includes(q)) return true;
      // Searching exercise names is the only way to find "the workout with
      // the hip thrust in it", which is how people actually look for these.
      return (t.exercises ?? []).some((ex) => ex.title?.toLowerCase().includes(q));
    });
  }, [all, search, device]);

  /* Selecting a workout then filtering it away would otherwise leave it in a
     bulk action the user can no longer see. */
  const visibleSelected = useMemo(
    () => filtered.filter((t) => selected.has(t.code)),
    [filtered, selected],
  );

  const toggleSelect = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setConfirmBulk(false);
  };

  const exportSelected = () => {
    const subset: Record<string, WorkoutTemplate> = {};
    for (const t of visibleSelected) subset[t.code] = t;
    downloadTemplatesCSV(subset);
  };

  const showResult = (done: number, err: unknown) => {
    if (err) {
      handleError(err);
      if (done > 0) showToast(`Deleted ${done} before the error.`, "error");
      return;
    }
    showToast(`Deleted ${done} workout${done !== 1 ? "s" : ""}.`, "success");
  };

  /*
   * Deletes run sequentially. The API is unproven under concurrent writes and
   * a partial failure mid-loop should stop rather than fire the rest anyway.
   */
  const deleteSelected = async () => {
    setBulkBusy(true);
    let done = 0;
    try {
      for (const t of visibleSelected) {
        await deleteOne(t);
        done++;
      }
      showResult(done, null);
    } catch (err) {
      showResult(done, err);
    } finally {
      setBulkBusy(false);
      clearSelection();
    }
  };

  const lastSynced = formatSyncTime(templates.last_synced);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Workouts</h1>
          <p className="page-subtitle">
            {all.length} workout{all.length !== 1 ? "s" : ""} · last synced {lastSynced}
          </p>
        </div>
        <div className="page-head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => downloadTemplatesCSV(templates.templates)}
            disabled={all.length === 0}
            title={all.length === 0 ? "No workouts to export" : "Download all workouts as CSV"}
          >
            Export all
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/workouts/new")}>
            + New workout
          </button>
        </div>
      </div>

      {all.length > 0 && (
        <div className="filter-bar">
          <div className="progress-search-wrap">
            <svg className="progress-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="form-input progress-search-input"
              type="text"
              placeholder="Search workouts or exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="segmented" role="group" aria-label="Filter by device">
            {DEVICES.map((d) => (
              <button
                key={d.value}
                className={`view-toggle-btn${device === d.value ? " active" : ""}`}
                onClick={() => setDevice(d.value)}
                aria-pressed={device === d.value}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏋️</div>
          <p className="empty-state-text">
            {all.length === 0
              ? "No workouts yet. Sync your templates to see them here."
              : "No workouts match your search."}
          </p>
        </div>
      ) : (
        <div className="workout-grid">
          {filtered.map((t) => (
            <WorkoutCard
              key={t.code}
              template={t}
              selected={selected.has(t.code)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {visibleSelected.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <span className="bulk-bar-count">{visibleSelected.length} selected</span>
          {confirmBulk ? (
            <>
              <span className="bulk-bar-confirm">
                Delete {visibleSelected.length} workout
                {visibleSelected.length !== 1 ? "s" : ""}? This cannot be undone.
              </span>
              <button className="btn btn-danger btn-tiny" onClick={() => void deleteSelected()} disabled={bulkBusy}>
                {bulkBusy ? <span className="spinner" /> : "Delete"}
              </button>
              <button className="btn btn-ghost btn-tiny" onClick={() => setConfirmBulk(false)} disabled={bulkBusy}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-tiny" onClick={exportSelected}>
                Export selected
              </button>
              <button className="btn btn-ghost btn-tiny tpl-action-danger" onClick={() => setConfirmBulk(true)}>
                Delete selected
              </button>
              <button className="btn btn-ghost btn-tiny" onClick={clearSelection}>
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
