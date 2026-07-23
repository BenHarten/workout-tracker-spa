import { useParams, useNavigate } from "react-router-dom";
import { ExerciseDetail } from "../components/progress/ExerciseDetail";

export function ExerciseDetailPage() {
  const { exerciseName } = useParams<{ exerciseName: string }>();
  const navigate = useNavigate();

  return (
    <main className="page">
      <ExerciseDetail exerciseName={exerciseName} onBack={() => navigate("/progress")} />
    </main>
  );
}
