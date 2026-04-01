import { useApp } from "../../context/AppContext";

export function Toast() {
  const { toast } = useApp();
  if (!toast.visible && !toast.message) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.type}${toast.visible ? "" : " toast-hide"}`}>
        {toast.message}
      </div>
    </div>
  );
}
