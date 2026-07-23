import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  /** Trailing unit, kept visually lighter than the figure. */
  unit?: string;
  icon: ReactNode;
  /** Tint for the icon square, so the row of tiles is scannable. */
  tone?: "accent" | "success" | "danger";
  chip?: ReactNode;
  /**
   * Shown when the metric is only partially covered — e.g. time and calories
   * are absent from FitNote imports. Never leave a depressed total unqualified.
   */
  footnote?: string;
}

export function StatTile({ label, value, unit, icon, tone = "accent", chip, footnote }: Props) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-head">
        <span className="stat-tile-label">{label}</span>
        <span className={`stat-tile-icon stat-tile-icon-${tone}`}>{icon}</span>
      </div>
      <div className="stat-tile-value">
        {value}
        {unit && <span className="stat-tile-unit">{unit}</span>}
      </div>
      <div className="stat-tile-foot">
        {chip}
        {footnote && <span className="stat-tile-footnote">{footnote}</span>}
      </div>
    </div>
  );
}
