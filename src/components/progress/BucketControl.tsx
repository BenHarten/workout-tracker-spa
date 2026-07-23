import type { Bucket, DateRange } from "../../lib/stats";

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

interface Props {
  bucket: Bucket;
  onBucket: (b: Bucket) => void;
  range: DateRange;
  onRange: (r: DateRange) => void;
}

export function BucketControl({ bucket, onBucket, range, onRange }: Props) {
  return (
    <div className="bucket-control">
      <div className="segmented" role="group" aria-label="Group by">
        {BUCKETS.map((b) => (
          <button
            key={b.value}
            className={`view-toggle-btn${bucket === b.value ? " active" : ""}`}
            onClick={() => onBucket(b.value)}
            aria-pressed={bucket === b.value}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="bucket-dates">
        <label className="bucket-date">
          <span>From</span>
          <input
            className="form-input"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && onRange({ ...range, from: e.target.value })}
          />
        </label>
        <label className="bucket-date">
          <span>To</span>
          <input
            className="form-input"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && onRange({ ...range, to: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
