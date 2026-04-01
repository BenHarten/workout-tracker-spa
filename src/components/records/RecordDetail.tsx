import type { TrainingRecord, SpeedianceExercise, FinishedRep } from "../../types";

interface Props {
  record: TrainingRecord;
}

function renderSet(rep: FinishedRep, index: number) {
  const hasWeight =
    rep.trainingInfoDetail?.weights && rep.trainingInfoDetail.weights.length > 0;
  const isTime = rep.finishedCount === 0 && !hasWeight;

  return (
    <tr className="set-row" key={index}>
      <td className="set-label">Set {index + 1}</td>
      {isTime ? (
        <>
          <td>{rep.time}s</td>
          <td>&mdash;</td>
        </>
      ) : (
        <>
          <td>{rep.finishedCount}</td>
          <td>{hasWeight ? rep.trainingInfoDetail!.weights![0] : 0} kg</td>
        </>
      )}
    </tr>
  );
}

function renderExercisesFromList(exercises: SpeedianceExercise[]) {
  return exercises.map((ex, i) => {
    const name = ex.actionName || ex.actionLibraryName || "Unknown";

    if (ex.setTrainingInfoList && ex.setTrainingInfoList.length > 0) {
      return (
        <tbody key={i}>
          <tr className="ex-header">
            <td className="ex-name" colSpan={3}>{name}</td>
          </tr>
          {ex.setTrainingInfoList.map((s, j) => (
            <tr className="set-row" key={j}>
              <td className="set-label">Set {j + 1}</td>
              <td>{s.reps}</td>
              <td>{s.weight} kg</td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (ex.finishedReps && ex.finishedReps.length > 0) {
      return (
        <tbody key={i}>
          <tr className="ex-header">
            <td className="ex-name" colSpan={3}>{name}</td>
          </tr>
          {ex.finishedReps.map((rep, j) => renderSet(rep, j))}
        </tbody>
      );
    }

    return (
      <tbody key={i}>
        <tr className="ex-header">
          <td className="ex-name" colSpan={3}>{name}</td>
        </tr>
        <tr className="set-row">
          <td className="set-label" colSpan={3}>&mdash;</td>
        </tr>
      </tbody>
    );
  });
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

  // Case 1: detail has actionTrainingInfoList (FitNote or some API records)
  if ("actionTrainingInfoList" in detail && detail.actionTrainingInfoList) {
    return (
      <div className="detail-panel">
        <table className="exercise-table">
          <thead>
            <tr>
              <th></th>
              <th>Reps</th>
              <th>Weight</th>
            </tr>
          </thead>
          {renderExercisesFromList(detail.actionTrainingInfoList as SpeedianceExercise[])}
        </table>
      </div>
    );
  }

  // Case 2: detail is an array (Speediance custom/plan records)
  if (Array.isArray(detail)) {
    return (
      <div className="detail-panel">
        <table className="exercise-table">
          <thead>
            <tr>
              <th></th>
              <th>Reps</th>
              <th>Weight</th>
            </tr>
          </thead>
          {renderExercisesFromList(detail)}
        </table>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <span className="text-muted">No exercise details available.</span>
    </div>
  );
}
