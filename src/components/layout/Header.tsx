import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export function Header() {
  const { setActiveModal } = useApp();

  return (
    <header className="header">
      <NavLink to="/" className="header-logo">
        Lift<span>Log</span>
      </NavLink>
      <nav className="header-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Records
        </NavLink>
        <NavLink to="/templates" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Templates
        </NavLink>
        <div className="nav-divider" />
        <button className="icon-btn" onClick={() => setActiveModal("sync")} title="Sync">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
        <button className="icon-btn" onClick={() => setActiveModal("settings")} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
