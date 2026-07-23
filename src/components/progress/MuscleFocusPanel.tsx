import { useState } from "react";
import { BodyMap } from "./BodyMap";
import { formatVolume } from "../../lib/format";
import type { MuscleFocus } from "../../lib/muscle-focus";

function SplitBar({
  label,
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  left: number;
  right: number;
}) {
  const total = left + right;
  const leftPct = total > 0 ? (left / total) * 100 : 50;

  return (
    <div className="split-bar">
      <div className="split-bar-label">{label}</div>
      <div className="split-bar-track" role="img" aria-label={`${leftLabel} ${Math.round(leftPct)}%`}>
        <span className="split-bar-left" style={{ width: `${leftPct}%` }} />
        <span className="split-bar-right" style={{ width: `${100 - leftPct}%` }} />
      </div>
      <div className="split-bar-legend">
        <span>{leftLabel} {Math.round(leftPct)}%</span>
        <span>{rightLabel} {Math.round(100 - leftPct)}%</span>
      </div>
    </div>
  );
}

export function MuscleFocusPanel({
  focus,
  hasData,
  onSync,
}: {
  focus: MuscleFocus;
  hasData: boolean;
  onSync: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!hasData) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Muscle focus</h2>
        </div>
        <p className="panel-lead">Muscle data hasn't been fetched yet.</p>
        <p className="panel-sub">
          It comes from Speediance's exercise library, so it needs a sync before it can be shown.
        </p>
        <button className="btn btn-primary" onClick={onSync}>
          Sync now
        </button>
      </section>
    );
  }

  const max = Math.max(1, ...focus.muscles.map((m) => m.volumeKg));
  const trained = focus.muscles.filter((m) => m.days > 0);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">
          Muscle focus · {focus.trained}/{focus.total} trained in the last {focus.windowDays} days
        </h2>
      </div>

      <div className="muscle-focus">
        <div className="muscle-focus-figure">
          <BodyMap muscles={focus.muscles} onSelect={setSelected} selected={selected} />
          <div className="muscle-scale" aria-hidden="true">
            <span>Low</span>
            <span className="muscle-scale-bar" />
            <span>High</span>
          </div>
        </div>

        <div className="muscle-focus-detail">
          <SplitBar label="Push : Pull" leftLabel="Push" rightLabel="Pull"
            left={focus.pushPull.push} right={focus.pushPull.pull} />
          <SplitBar label="Upper : Lower" leftLabel="Upper" rightLabel="Lower"
            left={focus.upperLower.upper} right={focus.upperLower.lower} />

          <ul className="muscle-rank">
            {trained.map((m) => (
              <li
                key={m.name}
                className={`muscle-rank-row${selected === m.name ? " selected" : ""}`}
                onClick={() => setSelected(selected === m.name ? null : m.name)}
              >
                <span className="muscle-rank-name">{m.name}</span>
                <span className="muscle-rank-bar">
                  <span
                    className="muscle-rank-fill"
                    style={{ width: `${Math.round((m.volumeKg / max) * 100)}%` }}
                  />
                </span>
                <span className="muscle-rank-value tnum">{formatVolume(m.volumeKg)}</span>
              </li>
            ))}
          </ul>

          {focus.untrained.length > 0 && (
            <div className="muscle-untrained">
              <span className="muscle-untrained-label">
                Not trained in {focus.windowDays} days:
              </span>
              {focus.untrained.map((name) => (
                <span key={name} className="muscle-chip">{name}</span>
              ))}
            </div>
          )}

          {/*
            Volume is credited in full to every muscle an exercise engages, so
            these sum to more than the session total. Say so rather than let the
            numbers look wrong.
          */}
          <p className="muscle-note">
            Each exercise counts its full volume toward every muscle it engages, so these
            totals overlap.
            {focus.unresolvedEntries > 0 &&
              ` ${focus.unresolvedEntries} exercise ${focus.unresolvedEntries === 1 ? "entry" : "entries"} could not be matched to a muscle.`}
          </p>
        </div>
      </div>
    </section>
  );
}
