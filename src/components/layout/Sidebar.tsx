import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ThemeToggle } from "./ThemeToggle";
import {
  CalendarIcon,
  CloseIcon,
  DashboardIcon,
  HistoryIcon,
  LogoutIcon,
  ProgressIcon,
  SettingsIcon,
  SyncIcon,
  UserIcon,
  WorkoutsIcon,
} from "./NavIcons";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** `end` so "/" does not stay active on every child route. */
  end?: boolean;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Train",
    items: [
      { to: "/", label: "Dashboard", icon: <DashboardIcon />, end: true },
      { to: "/calendar", label: "Calendar", icon: <CalendarIcon /> },
      { to: "/workouts", label: "Workouts", icon: <WorkoutsIcon /> },
    ],
  },
  {
    title: "Insights",
    items: [
      { to: "/progress", label: "Progress", icon: <ProgressIcon /> },
      { to: "/history", label: "History", icon: <HistoryIcon /> },
    ],
  },
];

interface Props {
  /** Only meaningful below the desktop breakpoint, where this is a drawer. */
  open: boolean;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  /** True only while off-screen as a drawer — never on desktop. */
  hidden: boolean;
}

export function Sidebar({ open, onClose, closeRef, hidden }: Props) {
  const { config, setConfig, setActiveModal, isLoggedIn } = useApp();

  const handleLogout = () => {
    setConfig((prev) => ({ ...prev, token: "", user_id: "" }));
    onClose();
  };

  return (
    <aside
      id="app-sidebar"
      className={`sidebar${open ? " open" : ""}`}
      // `inert` also removes it from the tab order, which aria-hidden alone does not.
      inert={hidden}
    >
      <div className="sidebar-top">
        <NavLink to="/" className="sidebar-logo" onClick={onClose}>
          Lift<span>Log</span>
        </NavLink>
        <button
          ref={closeRef}
          className="icon-btn sidebar-close"
          onClick={onClose}
          title="Close menu"
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {SECTIONS.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Account</div>
          {/* Modals, not routes — same treatment, no active state. */}
          <button
            className="nav-item"
            onClick={() => {
              setActiveModal("sync");
              onClose();
            }}
          >
            <SyncIcon />
            <span>Sync</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setActiveModal("settings");
              onClose();
            }}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        {isLoggedIn && (
          <div className="sidebar-user">
            {/* The account id is numeric, so an initial would be a meaningless
                digit — a generic glyph reads better. */}
            <div className="sidebar-avatar" aria-hidden="true">
              <UserIcon />
            </div>
            <div className="sidebar-user-meta">
              {/* This app never captures an email; user_id is all we hold. */}
              <div className="sidebar-user-id" title={config.user_id}>
                {config.user_id}
              </div>
              <div className="sidebar-user-region">{config.region}</div>
            </div>
            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
