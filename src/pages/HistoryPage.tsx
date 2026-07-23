import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { RecordList } from "../components/records/RecordList";
import { StatTile } from "../components/dashboard/StatTile";
import { CalendarIcon, FlameIcon, HistoryIcon, WorkoutsIcon } from "../components/layout/NavIcons";
import { downloadWorkoutsCSV } from "../lib/export";
import { defaultStartDate, formatDuration, formatSyncTime, formatVolume, todayDate } from "../lib/format";
import { aggregate, allRecords, recordsInRange } from "../lib/stats";
import type { DateRange } from "../lib/stats";
import type { TrainingRecord } from "../types";

/** "N of M sessions" when a metric is only partially covered. */
function coverageNote(coverage: number, sessions: number): string | undefined {
  if (sessions === 0 || coverage >= 1) return undefined;
  return `${Math.round(coverage * sessions)} of ${sessions} sessions`;
}

export function HistoryPage() {
  const { records } = useApp();
  const [range, setRange] = useLocalStorage<DateRange>("wt_history_range", {
    from: defaultStartDate(),
    to: todayDate(),
  });

  const { rows, stats } = useMemo(() => {
    const inRange = recordsInRange(allRecords(records), range);
    return {
      // allRecords sorts ascending; history reads newest-first.
      rows: [...inRange].reverse(),
      stats: aggregate(inRange),
    };
  }, [records, range]);

  const total = Object.keys(records.records).length;
  const lastSynced = formatSyncTime(records.last_synced);

  /* Export what is on screen, not the whole store — the filter is visible, so
     an export ignoring it would be a surprise. */
  const exportFiltered = () => {
    const subset: Record<string, TrainingRecord> = {};
    for (const r of rows) subset[String(r.id)] = r;
    downloadWorkoutsCSV(subset);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">
            {total} record{total !== 1 ? "s" : ""} · last synced {lastSynced}
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={exportFiltered} disabled={rows.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="bucket-dates">
          <label className="bucket-date">
            <span>From</span>
            <input
              className="form-input"
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
            />
          </label>
          <label className="bucket-date">
            <span>To</span>
            <input
              className="form-input"
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
            />
          </label>
        </div>
        <span className="filter-bar-count">
          {rows.length} shown
        </span>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Sessions"
          value={String(stats.sessions)}
          icon={<CalendarIcon />}
        />
        <StatTile
          label="Volume"
          value={formatVolume(stats.volumeKg)}
          icon={<WorkoutsIcon />}
        />
        <StatTile
          label="Calories"
          value={stats.calories > 0 ? String(Math.round(stats.calories)) : "—"}
          unit={stats.calories > 0 ? "kcal" : undefined}
          icon={<FlameIcon />}
          /* Imported sessions carry neither calories nor duration. */
          footnote={coverageNote(stats.caloriesCoverage, stats.sessions)}
        />
        <StatTile
          label="Time"
          value={stats.durationSec > 0 ? formatDuration(stats.durationSec) : "—"}
          icon={<HistoryIcon />}
          footnote={coverageNote(stats.durationCoverage, stats.sessions)}
        />
      </div>

      <RecordList records={rows} />
    </div>
  );
}
