import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { DeltaChip } from "../components/dashboard/DeltaChip";
import { GoalRing } from "../components/dashboard/GoalRing";
import { PRBanner } from "../components/dashboard/PRBanner";
import { RecentSessions } from "../components/dashboard/RecentSessions";
import { StatTile } from "../components/dashboard/StatTile";
import { CalendarIcon, FlameIcon, HistoryIcon, WorkoutsIcon } from "../components/layout/NavIcons";
import { formatDuration, formatVolume, todayDate } from "../lib/format";
import { parseDateStr } from "../lib/calendar";
import {
  aggregate,
  allRecords,
  computeDelta,
  computeStreak,
  currentPeriodRange,
  previousRange,
  recentPRs,
  recentSessions,
  recordsInRange,
  weeklyGoalProgress,
} from "../lib/stats";
import { DEFAULT_WEEKLY_GOAL } from "../types";

/** "N of M sessions" when a metric is only partially covered. */
function coverageNote(coverage: number, sessions: number): string | undefined {
  if (sessions === 0 || coverage >= 1) return undefined;
  return `${Math.round(coverage * sessions)} of ${sessions} sessions`;
}

export function DashboardPage() {
  const { records, config, setActiveModal } = useApp();

  const today = todayDate();
  const goal = config.weekly_goal ?? DEFAULT_WEEKLY_GOAL;

  const data = useMemo(() => {
    const all = allRecords(records);
    const week = currentPeriodRange("week", today);
    const prev = previousRange(week);

    const thisWeek = aggregate(recordsInRange(all, week));
    const lastWeek = aggregate(recordsInRange(all, prev));

    return {
      total: all.length,
      thisWeek,
      lastWeek,
      streak: computeStreak(records, today),
      prs: recentPRs(records, 7, today),
      recent: recentSessions(records, 5),
      goalProgress: weeklyGoalProgress(records, goal, today),
      loggedToday: all.filter((r) => r.date === today),
    };
  }, [records, today, goal]);

  const longDate = parseDateStr(today).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (data.total === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{longDate}</p>
        <div className="empty-state">
          <div className="empty-state-icon">👋</div>
          <div className="empty-state-text">
            No workouts yet. Sync from Speediance or import a FitNote CSV to get started.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveModal("sync")}>
            Sync now
          </button>
        </div>
      </div>
    );
  }

  const { thisWeek, lastWeek, streak, goalProgress, loggedToday } = data;

  return (
    <div className="page">
      <h1 className="page-title">Your day at a glance</h1>
      <p className="page-subtitle">{longDate}</p>

      <PRBanner items={data.prs} />

      <div className="stat-tiles">
        <StatTile
          label="Streak"
          value={String(streak.current)}
          unit={streak.current === 1 ? "day" : "days"}
          icon={<FlameIcon />}
          tone={streak.current > 0 ? "success" : "accent"}
          footnote={streak.longest > 0 ? `best ${streak.longest}` : undefined}
        />
        <StatTile
          label="Sessions"
          value={String(thisWeek.sessions)}
          unit="this wk"
          icon={<CalendarIcon />}
          chip={<DeltaChip delta={computeDelta(thisWeek.sessions, lastWeek.sessions)} />}
        />
        <StatTile
          label="Volume"
          value={formatVolume(thisWeek.volumeKg)}
          icon={<WorkoutsIcon />}
          chip={<DeltaChip delta={computeDelta(thisWeek.volumeKg, lastWeek.volumeKg)} />}
        />
        <StatTile
          label="Time"
          value={thisWeek.durationSec > 0 ? formatDuration(thisWeek.durationSec) : "—"}
          icon={<HistoryIcon />}
          chip={<DeltaChip delta={computeDelta(thisWeek.durationSec, lastWeek.durationSec)} />}
          /* Imported sessions carry no duration; say so rather than show a
             quietly depressed total. */
          footnote={coverageNote(thisWeek.durationCoverage, thisWeek.sessions)}
        />
      </div>

      <div className="dashboard-split">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Today</h2>
          </div>
          {loggedToday.length > 0 ? (
            <>
              <p className="panel-lead">
                Logged today: <strong>{loggedToday.map((r) => r.name).join(", ")}</strong>
              </p>
              <p className="panel-sub tnum">
                {formatVolume(loggedToday.reduce((sum, r) => sum + r.capacity, 0))} total
              </p>
              <Link to="/history" className="btn btn-ghost">
                View in history
              </Link>
            </>
          ) : (
            <>
              {/* No scheduling model exists, so this reports rather than plans. */}
              <p className="panel-lead">Nothing logged yet today.</p>
              <div className="panel-actions">
                <Link to="/workouts" className="btn btn-primary">
                  Browse workouts
                </Link>
                <button className="btn btn-ghost" onClick={() => setActiveModal("sync")}>
                  Sync
                </button>
              </div>
            </>
          )}
        </section>

        <section className="panel panel-centre">
          <div className="panel-head">
            <h2 className="panel-title">Weekly goal</h2>
          </div>
          <GoalRing pct={goalProgress.pct} done={goalProgress.done} target={goalProgress.target} />
          <p className="panel-sub">
            {goalProgress.done >= goalProgress.target
              ? "Goal reached — nice work."
              : `${goalProgress.target - goalProgress.done} to go this week`}
          </p>
        </section>
      </div>

      <RecentSessions records={data.recent} />
    </div>
  );
}
