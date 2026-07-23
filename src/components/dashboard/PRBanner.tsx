import { useMemo } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { formatDate } from "../../lib/format";
import type { PRFeedItem } from "../../lib/stats";

interface GroupedPR {
  key: string;
  displayName: string;
  date: string;
  weight?: number;
  e1rm?: number;
}

/**
 * Collapse the raw feed into one row per exercise.
 *
 * Two levels of duplication to remove. recentPRs emits weight and e1RM records
 * as separate items, so a single lift yields two entries; and an exercise
 * improved twice in the window appears on each of those days. The banner is a
 * highlight rather than a log, so only the most recent record per exercise is
 * shown — the full sequence is on the exercise's own progress page.
 */
function groupPRs(items: PRFeedItem[]): GroupedPR[] {
  // Input is already sorted newest-first, so the first date seen per exercise wins.
  const byExercise = new Map<string, GroupedPR>();
  for (const item of items) {
    let group = byExercise.get(item.exercise);
    if (!group) {
      group = { key: item.exercise, displayName: item.displayName, date: item.date };
      byExercise.set(item.exercise, group);
    } else if (item.date !== group.date) {
      continue; // an older PR for the same lift
    }
    if (item.kind === "weight") group.weight = Math.max(group.weight ?? 0, item.value);
    else group.e1rm = Math.max(group.e1rm ?? 0, item.value);
  }
  return [...byExercise.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function PRBanner({ items }: { items: PRFeedItem[] }) {
  const groups = useMemo(() => groupPRs(items), [items]);

  /*
   * Dismissal is keyed on a signature of the current PRs rather than a boolean,
   * so a genuinely new personal best brings the banner back instead of it
   * staying hidden forever.
   */
  const signature = groups.length ? `${groups[0].date}:${groups.length}` : "";
  const [dismissed, setDismissed] = useLocalStorage<string>("wt_dismissed_prs", "");

  if (groups.length === 0 || dismissed === signature) return null;

  return (
    <div className="pr-banner">
      <div className="pr-banner-head">
        <span className="pr-banner-title">
          New personal record{groups.length > 1 ? "s" : ""}
        </span>
        <button className="btn btn-ghost pr-banner-dismiss" onClick={() => setDismissed(signature)}>
          Got it
        </button>
      </div>
      <ul className="pr-banner-list">
        {groups.slice(0, 6).map((g) => (
          <li key={g.key} className="pr-banner-row">
            <span className="pr-banner-trophy" aria-hidden="true">🏆</span>
            {/* Name and detail share a column so a long name wraps without
                dropping its detail line out of alignment. */}
            <span className="pr-banner-body">
              <span className="pr-banner-name">{g.displayName}</span>
              <span className="pr-banner-detail">
                {[
                  g.weight !== undefined ? `${Math.round(g.weight * 10) / 10} kg` : null,
                  g.e1rm !== undefined ? `est. 1RM ${Math.round(g.e1rm)} kg` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {" · "}
                {formatDate(g.date)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
