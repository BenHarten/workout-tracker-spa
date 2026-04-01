import type { TrainingRecord, SpeedianceExercise, FinishedRep } from "../../types";
import { useNavigate } from "react-router-dom";

interface Props {
  record: TrainingRecord;
}

interface SetData {
  reps: string;
  weight: string;
}

function extractSets(ex: SpeedianceExercise): SetData[] {
  if (ex.setTrainingInfoList && ex.setTrainingInfoList.length > 0) {
    return ex.setTrainingInfoList.map((s) => ({
      reps: String(s.reps),
      weight: `${s.weight} kg`,
    }));
  }

  if (ex.finishedReps && ex.finishedReps.length > 0) {
    return ex.finishedReps.map((rep: FinishedRep) => {
      const hasWeight =
        rep.trainingInfoDetail?.weights && rep.trainingInfoDetail.weights.length > 0;
      const isTime = rep.finishedCount === 0 && !hasWeight;
      if (isTime) {
        return { reps: `${rep.time}s`, weight: "\u2014" };
      }
      return {
        reps: String(rep.finishedCount),
        weight: `${hasWeight ? rep.trainingInfoDetail!.weights![0] : 0} kg`,
      };
    });
  }

  return [];
}

function ExerciseCard({ ex }: { ex: SpeedianceExercise }) {
  const navigate = useNavigate();
  const name = ex.actionName || ex.actionLibraryName || "Unknown";
  const sets = extractSets(ex);

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/progress/${encodeURIComponent(name.toLowerCase())}`);
  };

  return (
    <div className="ex-card">
      <div className="ex-card-name ex-card-name-link" onClick={handleNameClick}>{name}</div>
      {sets.length > 0 ? (
        <table className="ex-card-table">
          <thead>
            <tr>
              <th></th>
              <th>Reps</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s, j) => (
              <tr key={j}>
                <td className="set-label">Set {j + 1}</td>
                <td>{s.reps}</td>
                <td>{s.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>&mdash;</span>
      )}
    </div>
  );
}

function ExerciseGrid({ exercises }: { exercises: SpeedianceExercise[] }) {
  return (
    <div className="detail-panel">
      <div className="ex-grid">
        {exercises.map((ex, i) => (
          <ExerciseCard key={i} ex={ex} />
        ))}
      </div>
    </div>
  );
}

export function RecordDetail({ record }: Props) {
  const detail = record.detail;

  if (!detail || (typeof detail === "object" && Object.keys(detail).length === 0)) {
    if (record.raw?.title) {
      return (
        <div className="detail-panel">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{String(record.raw.title)}</span>
            <span className="text-muted">{record.capacity} kg total</span>
          </div>
        </div>
      );
    }
    return (
      <div className="detail-panel">
        <span className="text-muted">No detail data for this record.</span>
      </div>
    );
  }

  if ("actionTrainingInfoList" in detail && detail.actionTrainingInfoList) {
    return <ExerciseGrid exercises={detail.actionTrainingInfoList as SpeedianceExercise[]} />;
  }

  if (Array.isArray(detail)) {
    return <ExerciseGrid exercises={detail} />;
  }

  return (
    <div className="detail-panel">
      <span className="text-muted">No exercise details available.</span>
    </div>
  );
}
