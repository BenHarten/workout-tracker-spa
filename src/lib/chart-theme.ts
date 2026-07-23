import { useMemo } from "react";
import { useApp } from "../context/AppContext";

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
 * Snapshot the current theme's colours for Chart.js, which takes colours as JS
 * values and cannot read CSS custom properties itself. Reading the computed
 * properties here keeps tokens.css the single source of truth.
 */
export function readChartTheme(): ChartTheme {
  const s = getComputedStyle(document.documentElement);
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
  // readChartTheme() reads the DOM rather than any JS value, so resolvedTheme is
  // the cache key rather than a referenced dependency — the lint rule can't see that.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readChartTheme(), [resolvedTheme]);
}
