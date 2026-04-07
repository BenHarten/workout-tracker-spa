import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { SpeedianceClient } from "../../api/speediance";
import type { ExerciseGroup, ExerciseDetail } from "../../types";

type DetailState = ExerciseDetail | "loading" | "error";

interface Props {
  onAdd: (exercise: ExerciseGroup, detail: ExerciseDetail) => void;
  onClose: () => void;
}

export function ExerciseLibraryBrowser({ onAdd, onClose }: Props) {
  const { exerciseLibrary, config } = useApp();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [details, setDetails] = useState<Map<number, DetailState>>(new Map());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const tabs = exerciseLibrary?.tabs ?? [];
  const selectedTab = activeTab ?? tabs[0]?.id ?? null;

  const filtered = useMemo(() => {
    if (!exerciseLibrary) return [];
    let exercises = exerciseLibrary.exercises;
    if (selectedTab !== null && !search.trim()) {
      exercises = exercises.filter((ex) => ex.category_id === selectedTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      exercises = exercises.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return exercises;
  }, [exerciseLibrary, selectedTab, search]);

  const fetchDetail = async (ex: ExerciseGroup): Promise<ExerciseDetail | null> => {
    const cached = details.get(ex.id);
    if (cached && cached !== "loading" && cached !== "error") return cached;
    if (cached === "loading") return null;

    setDetails((prev) => new Map(prev).set(ex.id, "loading"));
    try {
      const client = new SpeedianceClient(config);
      const detail = await client.getExerciseDetail(ex.id);
      setDetails((prev) => new Map(prev).set(ex.id, detail));
      return detail;
    } catch {
      setDetails((prev) => new Map(prev).set(ex.id, "error"));
      return null;
    }
  };

  const handleExpand = async (ex: ExerciseGroup) => {
    if (expanded === ex.id) {
      setExpanded(null);
      return;
    }
    setExpanded(ex.id);
    await fetchDetail(ex);
  };

  const handleAdd = async (ex: ExerciseGroup) => {
    setAddingId(ex.id);
    try {
      let detail = details.get(ex.id);
      if (!detail || detail === "loading" || detail === "error") {
        const fetched = await fetchDetail(ex);
        if (!fetched) return;
        detail = fetched;
      }
      onAdd(ex, detail as ExerciseDetail);
    } finally {
      setAddingId(null);
    }
  };

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
              {filtered.map((ex) => {
                const detailState = details.get(ex.id);
                const isExpanded = expanded === ex.id;
                const isAdding = addingId === ex.id;

                return (
                  <div key={ex.id} className="library-exercise-item">
                    <div className="library-exercise-row">
                      <button
                        className="library-expand-btn"
                        onClick={() => void handleExpand(ex)}
                        title={isExpanded ? "Collapse" : "Show details"}
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                      <div className="library-exercise-info">
                        <span className="library-exercise-name">{ex.name}</span>
                        {ex.mainMuscleGroupName && (
                          <span className="library-exercise-meta">{ex.mainMuscleGroupName}</span>
                        )}
                      </div>
                      <button
                        className="btn btn-ghost library-add-btn"
                        onClick={() => void handleAdd(ex)}
                        disabled={isAdding}
                      >
                        {isAdding ? <span className="spinner" /> : "+ Add"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="library-exercise-detail">
                        {detailState === "loading" && (
                          <div className="library-loading" style={{ padding: "var(--space-sm)" }}>
                            <span className="spinner" /> Loading…
                          </div>
                        )}
                        {detailState === "error" && (
                          <p className="text-muted" style={{ padding: "var(--space-sm)", fontSize: "var(--text-xs)" }}>
                            Failed to load details.
                          </p>
                        )}
                        {detailState && detailState !== "loading" && detailState !== "error" && (
                          <ExerciseDetailPanel detail={detailState} isUnilateral={detailState.isUnilateral} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ExerciseDetailPanel({ detail, isUnilateral }: { detail: ExerciseDetail; isUnilateral: boolean }) {
  const [videoSide, setVideoSide] = useState<"main" | "left" | "right">("main");
  const variant = detail.actionLibraryList[0];

  const videoSrc = videoSide === "left"
    ? variant?.leftVideo
    : videoSide === "right"
    ? variant?.rightVideo
    : variant?.videoPath;

  return (
    <div>
      {isUnilateral && (
        <div className="library-video-tabs">
          {(["main", "left", "right"] as const).map((side) => (
            <button
              key={side}
              className={`library-tab${videoSide === side ? " active" : ""}`}
              onClick={() => setVideoSide(side)}
            >
              {side === "main" ? "Overview" : side === "left" ? "Left" : "Right"}
            </button>
          ))}
        </div>
      )}
      {videoSrc && (
        <video
          key={videoSrc}
          className="library-video"
          src={videoSrc}
          controls
          playsInline
          loop
        />
      )}
      {detail.showDetails.length > 0 && (
        <div className="library-steps">
          {detail.showDetails.map((step, i) => (
            <div key={i} className="library-step">
              {step.img && <img src={step.img} alt={`Step ${i + 1}`} />}
              {step.context && <p>{step.context}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
