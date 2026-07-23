import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Modal } from "../layout/Modal";
import { ThemeToggle } from "../layout/ThemeToggle";
import { DEFAULT_WEEKLY_GOAL } from "../../types";
import { SpeedianceClient } from "../../api/speediance";

export function SettingsModal() {
  const { config, setConfig, setActiveModal, showToast, isLoggedIn } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<"EU" | "Global">(config.region);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const client = new SpeedianceClient(config);
      const result = await client.login(email, password, region);
      if (result.success && result.token && result.userId) {
        setConfig({
          ...config,
          token: result.token,
          user_id: result.userId,
          region,
        });
        showToast("Login successful", "success");
        setActiveModal(null);
      } else {
        showToast(result.message, "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const client = new SpeedianceClient(config);
      await client.logout();
    } catch {
      // Best-effort
    }
    setConfig({ ...config, token: "", user_id: "" });
    showToast("Logged out", "info");
    setLoading(false);
  };

  return (
    <Modal title="Settings" onClose={() => setActiveModal(null)}>
      {/* The theme toggle also lives in the sidebar footer; kept here so it is
          reachable from the modal too. */}
      <div className="modal-section">
        <div className="modal-section-title">Appearance</div>
        <ThemeToggle />
      </div>

      <div className="modal-section">
        <div className="modal-section-title">Training</div>
        <div className="settings-row">
          <label className="settings-label" htmlFor="weekly-goal">
            Weekly goal
          </label>
          <select
            id="weekly-goal"
            className="form-input settings-select"
            value={config.weekly_goal ?? DEFAULT_WEEKLY_GOAL}
            onChange={(e) => setConfig({ ...config, weekly_goal: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} session{n === 1 ? "" : "s"} / week
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoggedIn ? (
        <>
          <div className="modal-section">
            <div className="settings-row">
              <span className="settings-label">Account</span>
              <span className="settings-value">{config.user_id}</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Region</span>
              <span className="settings-value">{config.region}</span>
            </div>
          </div>
          <button
            className="btn btn-danger btn-full"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Logout"}
          </button>
          <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-sm)" }}>
            Logging out here does not affect the Speediance app.
          </p>
        </>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <select
              className="form-select"
              value={region}
              onChange={(e) => setRegion(e.target.value as "EU" | "Global")}
            >
              <option value="EU">EU</option>
              <option value="Global">Global</option>
            </select>
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Login"}
          </button>
          <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-sm)" }}>
            Logging in here will log you out of the Speediance phone app.
          </p>
        </form>
      )}
    </Modal>
  );
}
