import { csvSplit } from "../../lib/template-payload";
import type { WorkoutTemplate } from "../../types";

/** Per-exercise set breakdown, shown when a workout card is expanded. */
export function TemplateDetail({ template }: { template: WorkoutTemplate }) {
  if (!template.exercises || template.exercises.length === 0) {
    return (
      <div className="detail-panel">
        <span className="text-muted">
          No detail data for this template. Re-sync to load exercise details.
        </span>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="ex-grid">
        {template.exercises.map((ex, i) => {
          const reps = csvSplit(ex.setsAndReps);
          const rawWeights = csvSplit(ex.weights);
          const hasWeights = rawWeights.length > 0;
          const weights = rawWeights.map((w) => Number(w));

          return (
            <div className="ex-card" key={i}>
              <div className="ex-card-name">{ex.title}</div>
              <table className="ex-card-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    {hasWeights && <th>Weight</th>}
                  </tr>
                </thead>
                <tbody>
                  {reps.map((rep, j) => (
                    <tr key={j}>
                      <td><span className="set-label">Set {j + 1}</span></td>
                      <td>{rep}</td>
                      {hasWeights && <td>{weights[j] ?? "—"} kg</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
