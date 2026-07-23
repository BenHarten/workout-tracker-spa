import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { SPLIT_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { BucketControl } from "../components/progress/BucketControl";
import { ExerciseDetail } from "../components/progress/ExerciseDetail";
import { Sparkline } from "../components/progress/Sparkline";
import { TrendCard } from "../components/progress/TrendCard";
import { buildExerciseMap, getExerciseSummariesFromMap } from "../lib/exercise-progress";
import { useChartTheme } from "../lib/chart-theme";
import { defaultStartDate, formatDate, formatDuration, formatVolume, todayDate } from "../lib/format";
import {
  aggregate,
  allRecords,
  bucketRecords,
  computeDelta,
  previousRange,
  recordsInRange,
} from "../lib/stats";
import type { Bucket, DateRange } from "../lib/stats";

interface ViewPrefs {
  bucket: Bucket;
  range: DateRange;
}

function coverageNote(coverage: number, sessions: number): string | undefined {
  if (sessions === 0 || coverage >= 1) return undefined;
  return `${Math.round(coverage * sessions)} of ${sessions} sessions carry this`;
}

export function ProgressPage() {
  const { records } = useApp();
  const navigate = useNavigate();
  const { exerciseName } = useParams<{ exerciseName?: string }>();
  const isSplit = useMediaQuery(SPLIT_QUERY);
  const chart = useChartTheme();

  const [search, setSearch] = useState("");
  const [prefs, setPrefs] = useLocalStorage<ViewPrefs>("wt_progress_view", {
    bucket: "week",
    range: { from: defaultStartDate(), to: todayDate() },
  });

  /*
   * buildExerciseMap walks every record and exercise, so build it once and
   * derive the summaries from it rather than paying for a second traversal.
   */
  const summaries = useMemo(
    () => getExerciseSummariesFromMap(buildExerciseMap(records)),
    [records],
  );

  const trends = useMemo(() => {
    const all = allRecords(records);
    const inRange = recordsInRange(all, prefs.range);
    const current = aggregate(inRange);
    const prev = aggregate(recordsInRange(all, previousRange(prefs.range)));
    const points = bucketRecords(all, prefs.bucket, prefs.range);
    return { current, prev, points, labels: points.map((p) => p.label) };
  }, [records, prefs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [summaries, search]);

  // In split mode the selected exercise is state; otherwise it is a route.
  const selected = exerciseName ? decodeURIComponent(exerciseName) : filtered[0]?.name;

  function openExercise(name: string) {
    navigate(`/progress/exercise/${encodeURIComponent(name)}`);
  }

  const { current, prev, points, labels } = trends;

  return (
    <div className="page">
      <h1 className="page-title">Progress</h1>
      <p className="page-subtitle">Volume, calories and time · per-exercise trends</p>

      <BucketControl
        bucket={prefs.bucket}
        onBucket={(bucket) => setPrefs({ ...prefs, bucket })}
        range={prefs.range}
        onRange={(range) => setPrefs({ ...prefs, range })}
      />

      <div className="trend-cards">
        <TrendCard
          label="Volume"
          value={formatVolume(current.volumeKg)}
          delta={computeDelta(current.volumeKg, prev.volumeKg)}
          values={points.map((p) => p.stats.volumeKg)}
          labels={labels}
          format={(v) => formatVolume(v)}
        />
        <TrendCard
          label="Calories"
          value={String(Math.round(current.calories))}
          delta={computeDelta(current.calories, prev.calories)}
          values={points.map((p) => p.stats.calories)}
          labels={labels}
          format={(v) => `${Math.round(v)} kcal`}
          noData={current.caloriesCoverage === 0}
          footnote={coverageNote(current.caloriesCoverage, current.sessions)}
        />
        <TrendCard
          label="Time"
          value={current.durationSec > 0 ? formatDuration(current.durationSec) : "—"}
          delta={computeDelta(current.durationSec, prev.durationSec)}
          values={points.map((p) => p.stats.durationSec / 60)}
          labels={labels}
          format={(v) => `${Math.round(v)} min`}
          noData={current.durationCoverage === 0}
          footnote={coverageNote(current.durationCoverage, current.sessions)}
        />
      </div>

      <h2 className="progress-section-title">Per-exercise progress</h2>

      <div className="progress-split">
        <div className="progress-list-pane">
          <div className="progress-search-wrap">
            <svg className="progress-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="form-input progress-search-input"
              type="text"
              placeholder="Filter exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">
                {summaries.length === 0
                  ? "No exercise data yet. Sync your workouts or import from FitNote to see progress."
                  : "No exercises match your search."}
              </div>
            </div>
          ) : (
            <ul className="exercise-rows">
              {filtered.map((s) => {
                const up = (s.trendPct ?? 0) >= 0;
                return (
                  <li key={s.name}>
                    <button
                      className={`exercise-row${isSplit && selected === s.name ? " active" : ""}`}
                      onClick={() => openExercise(s.name)}
                    >
                      <span className="exercise-row-main">
                        <span className="exercise-row-name">{s.displayName}</span>
                        <span className="exercise-row-meta">
                          {s.sessionCount} session{s.sessionCount !== 1 ? "s" : ""} ·{" "}
                          {formatDate(s.lastPerformed)}
                          {/* Say so when the trend ignores sessions, rather than
                              quietly dropping them. */}
                          {s.lightCount > 0 && (
                            <span
                              className="exercise-row-light"
                              title={`${s.lightCount} lighter session${s.lightCount !== 1 ? "s" : ""} (warmup or deload) excluded from the trend`}
                            >
                              {" "}· {s.lightCount} light
                            </span>
                          )}
                        </span>
                      </span>

                      {s.recentTopSets.length > 1 && (
                        <span className="exercise-row-spark" aria-hidden="true">
                          <Sparkline
                            values={s.recentTopSets}
                            labels={s.recentTopSets.map(() => "")}
                            format={(v) => `${v} kg`}
                            colour={up ? chart.success : chart.danger}
                            bare
                            height={28}
                          />
                        </span>
                      )}

                      <span className="exercise-row-right">
                        {s.trendPct !== null && (
                          <span className={`delta-chip delta-${up ? "up" : "down"}`}>
                            {up ? "+" : ""}
                            {Math.round(s.trendPct)}%
                          </span>
                        )}
                        <span className="exercise-row-best tnum">{Math.round(s.bestWeight)} kg</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Wide screens show the detail beside the list; narrow ones navigate. */}
        {isSplit && selected && (
          <div className="progress-detail-pane">
            <ExerciseDetail exerciseName={selected} />
          </div>
        )}
      </div>
    </div>
  );
}
