import { useState, useEffect, type ReactNode } from "react";
import { sha256 } from "../../lib/crypto";

const EXPECTED_HASH = "7916e4cdcc471ccf202d6656dd30c20a73afc1922ced51cab0e30c9d91af381e";
const SESSION_KEY = "wt_auth_session";

export function PasscodeGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAuthenticated(localStorage.getItem(SESSION_KEY) === EXPECTED_HASH);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await sha256(passcode);
    if (hash === EXPECTED_HASH) {
      localStorage.setItem(SESSION_KEY, EXPECTED_HASH);
      setAuthenticated(true);
    } else {
      setError(true);
      setPasscode("");
    }
    setChecking(false);
  };

  // Still checking localStorage
  if (authenticated === null) return null;

  if (authenticated) return <>{children}</>;

  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-title">
          Lift<span className="text-accent">Log</span>
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Passcode</label>
            <input
              className={`form-input${error ? " gate-input-error" : ""}`}
              type="password"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setError(false); }}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && <p className="gate-error">Wrong passcode</p>}
          <button className="btn btn-primary btn-full" type="submit" disabled={checking || !passcode}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
