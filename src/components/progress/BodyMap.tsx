import type { MuscleVolume } from "../../lib/muscle-focus";

/**
 * Front/back muscle heat map.
 *
 * Deliberately a blocky, geometric figure rather than a traced anatomical
 * illustration — it matches the rest of the interface and stays legible at the
 * size it is actually shown.
 *
 * Fills are computed with `color-mix` against the accent, so both themes work
 * with no JS colour maths. A muscle can appear on both views (forearms, traps);
 * both instances take the same value.
 */

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

interface Region {
  muscle: string;
  shapes: Shape[];
}

// Front figure occupies x 8–92, back figure x 128–212. Both 0–200 tall.
const FRONT: Region[] = [
  { muscle: "Traps", shapes: [{ kind: "rect", x: 36, y: 36, w: 28, h: 7, r: 3 }] },
  { muscle: "Front Delts", shapes: [
    { kind: "ellipse", cx: 31, cy: 50, rx: 8, ry: 7 },
    { kind: "ellipse", cx: 69, cy: 50, rx: 8, ry: 7 },
  ] },
  { muscle: "Side Delts", shapes: [
    { kind: "ellipse", cx: 23, cy: 53, rx: 6, ry: 7 },
    { kind: "ellipse", cx: 77, cy: 53, rx: 6, ry: 7 },
  ] },
  { muscle: "Pecs", shapes: [
    { kind: "rect", x: 38, y: 45, w: 11, h: 15, r: 4 },
    { kind: "rect", x: 51, y: 45, w: 11, h: 15, r: 4 },
  ] },
  { muscle: "Abs", shapes: [{ kind: "rect", x: 41, y: 63, w: 18, h: 26, r: 5 }] },
  { muscle: "Biceps", shapes: [
    { kind: "rect", x: 20, y: 60, w: 9, h: 20, r: 4 },
    { kind: "rect", x: 71, y: 60, w: 9, h: 20, r: 4 },
  ] },
  { muscle: "Forearms", shapes: [
    { kind: "rect", x: 17, y: 82, w: 9, h: 22, r: 4 },
    { kind: "rect", x: 74, y: 82, w: 9, h: 22, r: 4 },
  ] },
  { muscle: "Quads", shapes: [
    { kind: "rect", x: 37, y: 100, w: 12, h: 36, r: 5 },
    { kind: "rect", x: 51, y: 100, w: 12, h: 36, r: 5 },
  ] },
  { muscle: "Adductors", shapes: [{ kind: "rect", x: 46, y: 100, w: 8, h: 24, r: 4 }] },
];

const BACK: Region[] = [
  { muscle: "Traps", shapes: [{ kind: "rect", x: 156, y: 36, w: 28, h: 14, r: 4 }] },
  { muscle: "Rear Delts", shapes: [
    { kind: "ellipse", cx: 151, cy: 52, rx: 8, ry: 7 },
    { kind: "ellipse", cx: 189, cy: 52, rx: 8, ry: 7 },
  ] },
  { muscle: "Lats", shapes: [
    { kind: "rect", x: 158, y: 52, w: 11, h: 22, r: 4 },
    { kind: "rect", x: 171, y: 52, w: 11, h: 22, r: 4 },
  ] },
  { muscle: "Back Extensors", shapes: [{ kind: "rect", x: 163, y: 76, w: 14, h: 16, r: 4 }] },
  { muscle: "Triceps", shapes: [
    { kind: "rect", x: 140, y: 60, w: 9, h: 20, r: 4 },
    { kind: "rect", x: 191, y: 60, w: 9, h: 20, r: 4 },
  ] },
  { muscle: "Forearms", shapes: [
    { kind: "rect", x: 137, y: 82, w: 9, h: 22, r: 4 },
    { kind: "rect", x: 194, y: 82, w: 9, h: 22, r: 4 },
  ] },
  { muscle: "Glutes", shapes: [{ kind: "rect", x: 157, y: 94, w: 26, h: 14, r: 5 }] },
  { muscle: "Hamstrings", shapes: [
    { kind: "rect", x: 157, y: 110, w: 12, h: 28, r: 5 },
    { kind: "rect", x: 171, y: 110, w: 12, h: 28, r: 5 },
  ] },
  { muscle: "Calves", shapes: [
    { kind: "rect", x: 158, y: 142, w: 10, h: 22, r: 4 },
    { kind: "rect", x: 172, y: 142, w: 10, h: 22, r: 4 },
  ] },
];

/** Head and torso outline, drawn beneath the muscles. */
const SILHOUETTE: Shape[] = [
  { kind: "ellipse", cx: 50, cy: 22, rx: 11, ry: 12 },
  { kind: "rect", x: 34, y: 36, w: 32, h: 58, r: 10 },
  { kind: "rect", x: 36, y: 94, w: 28, h: 72, r: 10 },
  { kind: "ellipse", cx: 170, cy: 22, rx: 11, ry: 12 },
  { kind: "rect", x: 154, y: 36, w: 32, h: 58, r: 10 },
  { kind: "rect", x: 156, y: 94, w: 28, h: 72, r: 10 },
];

function renderShape(s: Shape, key: string, props: Record<string, unknown>) {
  return s.kind === "rect" ? (
    <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 3} {...props} />
  ) : (
    <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props} />
  );
}

interface Props {
  muscles: MuscleVolume[];
  onSelect?: (muscle: string) => void;
  selected?: string | null;
}

export function BodyMap({ muscles, onSelect, selected }: Props) {
  const byName = new Map(muscles.map((m) => [m.name, m]));
  const max = Math.max(1, ...muscles.map((m) => m.volumeKg));

  const region = (r: Region, view: string) => {
    const m = byName.get(r.muscle);
    const value = m?.volumeKg ?? 0;
    // Square-root scaling: linear leaves everything but the top muscle invisible.
    const pct = value > 0 ? Math.round(Math.sqrt(value / max) * 100) : 0;
    const fill =
      pct > 0
        ? `color-mix(in oklab, var(--accent) ${pct}%, var(--muscle-empty))`
        : "var(--muscle-empty)";

    return (
      <g
        key={`${view}-${r.muscle}`}
        className={`body-region${selected === r.muscle ? " selected" : ""}`}
        onClick={() => onSelect?.(r.muscle)}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={(e) => {
          if (onSelect && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect(r.muscle);
          }
        }}
      >
        <title>{`${r.muscle}: ${Math.round(value).toLocaleString()} kg`}</title>
        {r.shapes.map((s, i) => renderShape(s, `${view}-${r.muscle}-${i}`, { style: { fill } }))}
      </g>
    );
  };

  return (
    <svg className="body-map" viewBox="0 0 220 200" role="img" aria-label="Muscle engagement map">
      <g className="body-silhouette" aria-hidden="true">
        {SILHOUETTE.map((s, i) => renderShape(s, `sil-${i}`, {}))}
      </g>
      {FRONT.map((r) => region(r, "front"))}
      {BACK.map((r) => region(r, "back"))}
      <text className="body-map-caption" x="50" y="182" textAnchor="middle">FRONT</text>
      <text className="body-map-caption" x="170" y="182" textAnchor="middle">BACK</text>
    </svg>
  );
}
