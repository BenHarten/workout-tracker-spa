import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import { Line } from "react-chartjs-2";
import { useApp } from "../../context/AppContext";
import { useChartTheme } from "../../lib/chart-theme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface Props {
  values: number[];
  labels: string[];
  /** Formats the tooltip value. */
  format: (v: number) => string;
  /** Overrides the accent — used for the red/green per-exercise trend lines. */
  colour?: string;
  /** Hides axes entirely, for the inline exercise-row variant. */
  bare?: boolean;
  height?: number;
}

/**
 * Filled area line chart.
 *
 * Wraps Chart.js with a minimal option set shared by every trend on the page.
 * Colours come from useChartTheme (which samples the CSS custom properties),
 * and the chart is keyed on the resolved theme because react-chartjs-2 does not
 * reliably diff nested option colours on re-render.
 */
export function Sparkline({ values, labels, format, colour, bare = false, height = 140 }: Props) {
  const { resolvedTheme } = useApp();
  const t = useChartTheme();
  const stroke = colour ?? t.accent;

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          borderColor: stroke,
          backgroundColor: colour ? "transparent" : t.accentFill,
          borderWidth: 2,
          fill: !colour,
          // Straight segments between measured points — no interpolation.
          tension: 0,
          // Show the points on the full-size trend cards; keep the tiny inline
          // exercise-row variant (bare) dot-free.
          pointRadius: bare ? 0 : 2.5,
          pointBackgroundColor: stroke,
          pointHoverRadius: bare ? 0 : 4,
          pointHoverBackgroundColor: stroke,
        },
      ],
    }),
    [values, labels, stroke, colour, t, bare],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      plugins: {
        tooltip: {
          enabled: !bare,
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipTitle,
          bodyColor: t.tooltipBody,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => format(ctx.parsed.y ?? 0),
          },
        },
      },
      scales: {
        x: {
          display: !bare,
          ticks: {
            color: t.tick,
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: { display: false },
        },
        y: {
          display: !bare,
          ticks: { color: t.tick, font: { size: 10 }, maxTicksLimit: 4 },
          grid: { color: t.grid },
          beginAtZero: true,
        },
      },
    }),
    [t, bare, format],
  );

  return (
    <div className="sparkline" style={{ height }}>
      <Line key={resolvedTheme} data={data} options={options} />
    </div>
  );
}
