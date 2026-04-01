import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Modal } from "../layout/Modal";
import { SpeedianceClient, AuthError, getTrainingType } from "../../api/speediance";
import { parseFitNoteCsv } from "../../lib/fitnote-parser";
import { defaultStartDate, todayDate } from "../../lib/format";
import type { TrainingRecord } from "../../types";

export function SyncModal() {
  const { config, setConfig, records, setRecords, templates, setTemplates, isLoggedIn, setActiveModal, showToast } = useApp();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAuthError = () => {
    setConfig({ ...config, token: "", user_id: "" });
    showToast("Session expired. Please log in again.", "error");
    setActiveModal("settings");
  };

  const handleSyncRecords = async () => {
    setSyncingRecords(true);
    setProgress("");
    try {
      const client = new SpeedianceClient(config);
      setProgress("Fetching records...");
      const rawRecords = await client.getTrainingRecords(startDate, endDate);

      const existingIds = new Set(Object.keys(records.records));
      const merged = { ...records.records };

      for (let i = 0; i < rawRecords.length; i++) {
        const rec = rawRecords[i] as Record<string, unknown>;
        const recId = String(rec.id ?? "");
        if (!recId) continue;

        const trainingId = rec.trainingId as number | undefined;
        const recType = (rec.type as number) ?? 0;
        const trainingType = getTrainingType(recType);

        setProgress(`Syncing record ${i + 1} of ${rawRecords.length}...`);

        let detail: Record<string, unknown> = {};
        let sessionInfo: Record<string, unknown> = {};
        if (trainingId && trainingType) {
          try {
            const [d, s] = await Promise.all([
              client.getTrainingDetail(trainingId, trainingType),
              client.getTrainingSessionInfo(trainingId, trainingType),
            ]);
            detail = d;
            sessionInfo = s;
          } catch (err) {
            if (err instanceof AuthError) throw err;
            // Skip detail on other errors
          }
        }

        const startTime = String(rec.startTime ?? "");
        const recordDate = startTime ? startTime.split(" ")[0] : "";

        merged[recId] = {
          id: Number(recId),
          training_id: trainingId ?? null,
          date: recordDate,
          name: String(rec.title ?? "Unknown"),
          duration: (rec.trainingTime as number) ?? 0,
          calories: (rec.calorie as number) ?? 0,
          capacity: (rec.totalCapacity as number) ?? 0,
          type: trainingType as TrainingRecord["type"],
          start_time: startTime,
          end_time: String(rec.endTime ?? ""),
          detail: detail as TrainingRecord["detail"],
          session_info: sessionInfo,
          raw: rec,
        };
      }

      const newCount = Object.keys(merged).length - existingIds.size;
      // Some records were updates to existing ones
      const totalFetched = rawRecords.length;
      const updatedCount = totalFetched - Math.max(0, newCount);

      setRecords({
        ...records,
        records: merged,
        last_synced: new Date().toISOString().slice(0, 19),
      });

      const parts: string[] = [];
      if (newCount > 0) parts.push(`${newCount} new`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      showToast(parts.length ? `Synced: ${parts.join(", ")}.` : "No new records found.", "success");
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      showToast(err instanceof Error ? err.message : "Sync failed", "error");
    } finally {
      setSyncingRecords(false);
      setProgress("");
    }
  };

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const client = new SpeedianceClient(config);
      const workouts = await client.getUserWorkouts();
      const merged = { ...templates.templates };

      for (let i = 0; i < workouts.length; i++) {
        const wkt = workouts[i] as Record<string, unknown>;
        const code = String(wkt.code ?? "");
        if (!code) continue;

        const detail = await client.getWorkoutDetail(code);
        if (!detail) continue;

        const exercises = (detail.customTrainingTemplateActionList ?? []) as Record<string, unknown>[];

        merged[code] = {
          code,
          id: (wkt.id as number) ?? undefined,
          name: String(wkt.name ?? "Unknown"),
          device_type: (wkt.deviceType as number) ?? 1,
          exercises: exercises.map((ex) => ({
            title: String(ex.title ?? ex.actionLibraryName ?? "Unknown"),
            setsAndReps: String(ex.setsAndReps ?? ""),
            weights: ex.weights as string | undefined,
            breakTime2: ex.breakTime2 as string | undefined,
            img: ex.img as string | undefined,
            isBarbell: ex.isBarbell as number | undefined,
            mainMuscleGroupName: ex.mainMuscleGroupName as string | undefined,
            context: ex.context as string | undefined,
          })),
          raw: wkt,
          detail: detail,
        };
      }

      setTemplates({
        templates: merged,
        last_synced: new Date().toISOString().slice(0, 19),
      });

      showToast(`Synced ${workouts.length} templates.`, "success");
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      showToast(err instanceof Error ? err.message : "Template sync failed", "error");
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleImportFitNote = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      showToast("Please select a CSV file.", "error");
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseFitNoteCsv(text);
      const count = Object.keys(parsed).length;

      setRecords((prev) => ({
        ...prev,
        records: { ...prev.records, ...parsed },
        last_fitnote_import: new Date().toISOString().slice(0, 19),
      }));

      showToast(`Imported ${count} FitNote session${count !== 1 ? "s" : ""}.`, "success");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal title="Sync" onClose={() => setActiveModal(null)}>
      {isLoggedIn ? (
        <>
          <div className="modal-section">
            <div className="modal-section-title">Training Records</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From</label>
                <input
                  className="form-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input
                  className="form-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleSyncRecords}
              disabled={syncingRecords}
            >
              {syncingRecords ? <span className="spinner" /> : "Sync Records"}
            </button>
            {progress && (
              <div className="sync-progress">
                <span className="spinner" />
                {progress}
              </div>
            )}
          </div>

          <div className="modal-section">
            <div className="modal-section-title">Workout Templates</div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleSyncTemplates}
              disabled={syncingTemplates}
            >
              {syncingTemplates ? <span className="spinner" /> : "Sync Templates"}
            </button>
          </div>
        </>
      ) : (
        <div className="modal-section">
          <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
            Log in via Settings to sync with Speediance.
          </p>
        </div>
      )}

      <div className="modal-section">
        <div className="modal-section-title">Import from FitNote</div>
        <div className="form-group">
          <input
            className="form-input"
            type="file"
            accept=".csv"
            ref={fileRef}
          />
        </div>
        <button
          className="btn btn-ghost btn-full"
          onClick={handleImportFitNote}
          disabled={importing}
        >
          {importing ? <span className="spinner" /> : "Import CSV"}
        </button>
      </div>
    </Modal>
  );
}
