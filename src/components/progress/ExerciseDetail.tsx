import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import { Line } from "react-chartjs-2";
import { useApp } from "../../context/AppContext";
import { getExerciseData } from "../../lib/exercise-progress";
import { formatDate } from "../../lib/format";
import type { ExerciseSession } from "../../lib/exercise-progress";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type ChartMode = "weight" | "e1rm";

function PRBadge() {
  return <span className="progress-pr-badge">★ PR</span>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="progress-stat-card">
      <div className="progress-stat-label">{label}</div>
      <div className="progress-stat-value">{value}</div>
      <div className="progress-stat-sub">{sub}</div>
    </div>
  );
}

function ProgressChart({ sessions, mode }: { sessions: ExerciseSession[]; mode: ChartMode }) {
  const chartData = useMemo(() => {
    const labels = sessions.map((s) => {
      const d = new Date(s.date + "T00:00:00");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    });

    const values = sessions.map((s) => {
      if (mode === "weight") {
        return Math.max(...s.sets.map((set) => set.weight));
      }
      return Math.max(...s.sets.map((set) => set.e1rm));
    });

    const prPoints = sessions.map((s) => {
      if (mode === "weight") return s.sets.some((set) => set.isWeightPR);
      return s.sets.some((set) => set.is1rmPR);
    });

    return {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#d4a843",
          backgroundColor: "rgba(212, 168, 67, 0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: prPoints.map((pr) => (pr ? 6 : 3)),
          pointBackgroundColor: prPoints.map((pr) =>
            pr ? "#d4a843" : "rgba(212, 168, 67, 0.6)"
          ),
          pointBorderColor: prPoints.map((pr) => (pr ? "#0c0c0e" : "transparent")),
          pointBorderWidth: prPoints.map((pr) => (pr ? 2 : 0)),
        },
      ],
    };
  }, [sessions, mode]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: "#1e1e22",
          titleColor: "#f0efe8",
          bodyColor: "#b8b6aa",
          borderColor: "#2a2a30",
          borderWidth: 1,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const val = Math.round((ctx.parsed.y ?? 0) * 10) / 10;
              const isPR =
                mode === "weight"
                  ? sessions[ctx.dataIndex]?.sets.some((s) => s.isWeightPR)
                  : sessions[ctx.dataIndex]?.sets.some((s) => s.is1rmPR);
              return `${val} kg${isPR ? " ★ PR" : ""}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#6e6d65", font: { size: 11 } },
          grid: { color: "#1e1e24" },
        },
        y: {
          ticks: {
            color: "#6e6d65",
            font: { size: 11 },
            callback: (value: string | number) => `${value} kg`,
          },
          grid: { color: "#1e1e24" },
        },
      },
    }),
    [sessions, mode]
  );

  return (
    <div className="progress-chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
}

function SessionCard({ session }: { session: ExerciseSession }) {
  return (
    <div className="card" style={{ cursor: "default" }}>
      <div className="card-top">
        <div className="card-name">{formatDate(session.date)}</div>
        <div className="card-right">
          {session.isPR && <PRBadge />}
        </div>
      </div>
      <div className="progress-session-sets">
        {session.sets.map((set, j) => {
          const isPR = set.isWeightPR || set.is1rmPR;
          return (
            <span key={j} className={isPR ? "progress-set-pr" : ""}>
              <span className="progress-set-label">Set {j + 1}:</span>{" "}
              {set.reps} × {set.weight} kg
              {j < session.sets.length - 1 && <span className="progress-set-sep" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export interface ExerciseDetailProps {
  /** Raw (still URL-encoded) exercise name, as it arrives from the route param. */
  exerciseName: string | undefined;
  /** When provided, renders the back button. Omitted in the desktop split-pane. */
  onBack?: () => void;
}

/**
 * Per-exercise progress view. Rendered standalone by `ExerciseDetailPage` and,
 * from Phase 7, side-by-side with the exercise list on wide screens — hence the
 * page chrome (`<main class="page">`) lives in the caller, not here.
 */
export function ExerciseDetail({ exerciseName, onBack }: ExerciseDetailProps) {
  const { records } = useApp();
  const [chartMode, setChartMode] = useState<ChartMode>("weight");

  const data = useMemo(() => {
    if (!exerciseName) return null;
    return getExerciseData(records, decodeURIComponent(exerciseName));
  }, [records, exerciseName]);

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-text">Exercise not found.</div>
        {onBack && (
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={onBack}>
            Back to Progress
          </button>
        )}
      </div>
    );
  }

  const { displayName, sessions } = data;
  const reversedSessions = [...sessions].reverse();

  // Compute stats
  let bestWeight = 0;
  let bestWeightDate = "";
  let bestE1RM = 0;
  let bestE1RMDate = "";
  const firstDate = sessions[0]?.date ?? "";

  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.weight > bestWeight) {
        bestWeight = set.weight;
        bestWeightDate = session.date;
      }
      if (set.e1rm > bestE1RM) {
        bestE1RM = set.e1rm;
        bestE1RMDate = session.date;
      }
    }
  }

  return (
    <>
      <div className="progress-header">
        {onBack && (
          <button className="progress-back" onClick={onBack} title="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="page-title" style={{ marginBottom: 0 }}>{displayName}</h1>
      </div>

      <div className="progress-stat-cards">
        <StatCard
          label="Max Weight"
          value={`${Math.round(bestWeight)} kg`}
          sub={`★ ${formatDate(bestWeightDate)}`}
        />
        <StatCard
          label="Est. 1RM"
          value={`${Math.round(bestE1RM)} kg`}
          sub={`★ ${formatDate(bestE1RMDate)}`}
        />
        <StatCard
          label="Sessions"
          value={String(sessions.length)}
          sub={`Since ${formatDate(firstDate)}`}
        />
      </div>

      {sessions.length >= 2 && (
        <>
          <div className="progress-chart-toggle">
            <button
              className={`progress-chart-toggle-btn${chartMode === "weight" ? " active" : ""}`}
              onClick={() => setChartMode("weight")}
            >
              Max Weight
            </button>
            <button
              className={`progress-chart-toggle-btn${chartMode === "e1rm" ? " active" : ""}`}
              onClick={() => setChartMode("e1rm")}
            >
              Est. 1RM
            </button>
          </div>
          <ProgressChart sessions={sessions} mode={chartMode} />
        </>
      )}

      <div className="progress-section-title">Session History</div>

      <div className="card-list">
        {reversedSessions.map((session, i) => (
          <div
            key={session.recordId}
            style={
              i === 0
                ? { borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }
                : i === reversedSessions.length - 1
                  ? { borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }
                  : undefined
            }
          >
            <SessionCard session={session} />
          </div>
        ))}
      </div>
    </>
  );
}
