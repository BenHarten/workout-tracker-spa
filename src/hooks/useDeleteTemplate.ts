import { useState } from "react";
import { useApp } from "../context/AppContext";
import { AuthError, SpeedianceClient } from "../api/speediance";
import type { WorkoutTemplate } from "../types";

/**
 * Deleting a template, server then store.
 *
 * `deleteOne` is the primitive: it reports success rather than toasting, so a
 * bulk caller can delete several and summarise once. `deleteTemplate` is the
 * single-card path and keeps the per-delete toast.
 *
 * Store updates go through the functional form of `setTemplates` because a
 * bulk loop deletes sequentially and would otherwise write each removal on top
 * of the same stale snapshot, resurrecting everything but the last one.
 */
export function useDeleteTemplate() {
  const { config, setConfig, setTemplates, showToast } = useApp();
  const [deleting, setDeleting] = useState(false);

  const deleteOne = async (template: WorkoutTemplate): Promise<boolean> => {
    if (!template.id) return false;
    const client = new SpeedianceClient(config);
    await client.deleteTemplate(template.id);
    setTemplates((prev) => {
      const next = { ...prev.templates };
      delete next[template.code];
      return { ...prev, templates: next };
    });
    return true;
  };

  const handleError = (err: unknown) => {
    if (err instanceof AuthError) {
      setConfig({ ...config, token: "", user_id: "" });
      showToast("Session expired. Please log in again.", "error");
    } else {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  const deleteTemplate = async (template: WorkoutTemplate) => {
    setDeleting(true);
    try {
      if (await deleteOne(template)) {
        showToast(`Deleted "${template.name}".`, "success");
      }
    } catch (err) {
      handleError(err);
    } finally {
      setDeleting(false);
    }
  };

  return { deleteTemplate, deleteOne, handleError, deleting };
}
