interface Props {
  /** 0..1 */
  pct: number;
  done: number;
  target: number;
}

const SIZE = 108;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Weekly training-goal ring.
 *
 * Deliberately a goal ring rather than a "readiness" or "recovery" score. The
 * API exposes per-muscle intensity thresholds but no computed fatigue value,
 * so any readiness figure would be our own heuristic — presenting one as a
 * physiological measurement would be dishonest. Sessions against a target is
 * something the data actually supports.
 */
export function GoalRing({ pct, done, target }: Props) {
  const clamped = Math.max(0, Math.min(1, pct));
  const offset = CIRCUMFERENCE * (1 - clamped);
  const complete = done >= target;

  return (
    <div className="goal-ring">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${done} of ${target} sessions this week`}
      >
        {/* Rotated so the arc starts at 12 o'clock. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={complete ? "var(--success)" : "var(--accent)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="goal-ring-arc"
          />
        </g>
      </svg>
      <div className="goal-ring-centre">
        <div className="goal-ring-value">{done}</div>
        <div className="goal-ring-target">of {target}</div>
      </div>
    </div>
  );
}
