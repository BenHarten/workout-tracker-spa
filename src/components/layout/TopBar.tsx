import { useApp } from "../../context/AppContext";
import { MenuIcon, SyncIcon } from "./NavIcons";

interface Props {
  onOpenMenu: () => void;
  menuOpen: boolean;
  menuRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Mobile-only top bar. Above 768px the sidebar carries branding and actions,
 * so CSS hides this entirely (matching the reference app, which has no desktop
 * top bar). Sticky so the menu is reachable without scrolling back up.
 */
export function TopBar({ onOpenMenu, menuOpen, menuRef }: Props) {
  const { setActiveModal } = useApp();

  return (
    <header className="topbar">
      <button
        ref={menuRef}
        className="icon-btn"
        onClick={onOpenMenu}
        title="Menu"
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
      >
        <MenuIcon />
      </button>
      <span className="topbar-logo">
        Lift<span>Log</span>
      </span>
      <button
        className="icon-btn"
        onClick={() => setActiveModal("sync")}
        title="Sync"
        aria-label="Sync"
      >
        <SyncIcon />
      </button>
    </header>
  );
}
