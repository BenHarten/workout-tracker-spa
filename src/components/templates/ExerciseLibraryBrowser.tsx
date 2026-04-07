import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import type { ExerciseGroup } from "../../types";

interface Props {
  onAdd: (exercise: ExerciseGroup) => void;
  onClose: () => void;
}

export function ExerciseLibraryBrowser({ onAdd, onClose }: Props) {
  const { exerciseLibrary } = useApp();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const tabs = exerciseLibrary?.tabs ?? [];
  const selectedTab = activeTab ?? tabs[0]?.id ?? null;

  const filtered = useMemo(() => {
    if (!exerciseLibrary) return [];
    let exercises = exerciseLibrary.exercises;
    if (selectedTab !== null) {
      exercises = exercises.filter((ex) => ex.category_id === selectedTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      exercises = exercises.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return exercises;
  }, [exerciseLibrary, selectedTab, search]);

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-panel" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <span className="library-title">Add Exercise</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <div className="library-search-row">
          <input
            className="form-input"
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {!exerciseLibrary ? (
          <div className="library-loading">
            <span className="spinner" /> Loading exercise library…
          </div>
        ) : (
          <>
            <div className="library-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`library-tab${selectedTab === tab.id ? " active" : ""}`}
                  onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            <div className="library-list">
              {filtered.length === 0 && (
                <p className="text-muted" style={{ padding: "var(--space-md)" }}>No exercises found.</p>
              )}
              {filtered.map((ex) => (
                <div key={ex.id} className="library-exercise-row">
                  <div className="library-exercise-info">
                    <span className="library-exercise-name">{ex.name}</span>
                    <span className="library-exercise-meta">{ex.category_name}</span>
                  </div>
                  <button
                    className="btn btn-ghost library-add-btn"
                    onClick={() => onAdd(ex)}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
