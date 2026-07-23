import { DeltaChip } from "../dashboard/DeltaChip";
import { Sparkline } from "./Sparkline";
import type { Delta } from "../../lib/stats";

interface Props {
  label: string;
  value: string;
  delta: Delta;
  values: number[];
  labels: string[];
  format: (v: number) => string;
  /** Rendered when the metric is only partly covered by the sessions in range. */
  footnote?: string;
  /** True when nothing in range carries this metric at all. */
  noData?: boolean;
}

export function TrendCard({ label, value, delta, values, labels, format, footnote, noData }: Props) {
  return (
    <section className="trend-card">
      <div className="trend-card-head">
        <span className="panel-title">{label}</span>
        {!noData && <DeltaChip delta={delta} suffix="vs previous period" />}
      </div>

      {noData ? (
        /*
         * Better an explicit "not recorded" than a flat line at zero, which
         * would read as "you did none of this" rather than "this was never
         * measured" — the distinction matters for imported sessions.
         */
        <p className="trend-card-nodata">Not recorded for these sessions.</p>
      ) : (
        <>
          <div className="trend-card-value tnum">{value}</div>
          <Sparkline values={values} labels={labels} format={format} height={130} />
          {footnote && <p className="trend-card-footnote">{footnote}</p>}
        </>
      )}
    </section>
  );
}
