import type { Delta } from "../../lib/stats";

/**
 * "+12% vs last week" pill.
 *
 * A null percentage means the previous period was zero — there is no baseline
 * to compare against, so it renders "—" rather than an invented infinity.
 */
export function DeltaChip({ delta, suffix = "vs last wk" }: { delta: Delta; suffix?: string }) {
  if (delta.pct === null) {
    return (
      <span className="delta-chip delta-none" title={`No data for the previous period (${suffix})`}>
        —
      </span>
    );
  }

  const rounded = Math.round(delta.pct);
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={`delta-chip delta-${delta.direction}`} title={`${sign}${rounded}% ${suffix}`}>
      {sign}
      {rounded}%
    </span>
  );
}
