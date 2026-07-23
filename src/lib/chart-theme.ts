import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import type { ResolvedTheme } from "../types";

export interface ChartTheme {
  accent: string;
  accentFill: string;
  accentMuted: string;
  grid: string;
  tick: string;
  pointBorder: string;
  tooltipBg: string;
  tooltipTitle: string;
  tooltipBody: string;
  tooltipBorder: string;
  danger: string;
  success: string;
}

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

/**
 * Snapshot a theme's colours for Chart.js, which takes colours as JS values and
 * cannot read CSS custom properties itself. Reading the computed properties
 * keeps tokens.css the single source of truth.
 *
 * The values are read from a detached probe carrying the requested theme rather
 * than from `document.documentElement`. The root's `data-theme` is applied in an
 * effect, which runs *after* the render that consumes this — so reading the root
 * during a theme switch yields the outgoing theme and drew light grid lines on
 * the dark canvas. Probing is deterministic and needs no render-phase DOM write.
 */
export function readChartTheme(theme: ResolvedTheme): ChartTheme {
  const probe = document.createElement("div");
  probe.dataset.theme = theme;
  probe.style.display = "none";
  document.body.appendChild(probe);
  try {
    return readFrom(getComputedStyle(probe));
  } finally {
    probe.remove();
  }
}

function readFrom(s: CSSStyleDeclaration): ChartTheme {
  const accent = readVar(s, "--accent", "#2d7d6e");
  return {
    accent,
    accentFill: readVar(s, "--accent-glow", "rgba(45,125,110,0.12)"),
    accentMuted: readVar(s, "--accent-dim", "#4a9b8b"),
    grid: readVar(s, "--border-subtle", "#eeebe3"),
    tick: readVar(s, "--text-muted", "#75736c"),
    pointBorder: readVar(s, "--bg-card", "#ffffff"),
    tooltipBg: readVar(s, "--bg-elevated", "#ffffff"),
    tooltipTitle: readVar(s, "--text-primary", "#1a1a18"),
    tooltipBody: readVar(s, "--text-secondary", "#5c5a54"),
    tooltipBorder: readVar(s, "--border", "#e2ded4"),
    danger: readVar(s, "--danger", "#c0392b"),
    success: readVar(s, "--success", "#2e7d4f"),
  };
}

/**
 * Theme-reactive chart colours.
 *
 * Recomputed whenever the resolved theme changes. Note that Chart.js does not
 * reliably diff nested option colours across re-renders — pass
 * `key={resolvedTheme}` on the chart element to force a remount as well.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useApp();
  return useMemo(() => readChartTheme(resolvedTheme), [resolvedTheme]);
}
