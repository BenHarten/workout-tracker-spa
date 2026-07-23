import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * App chrome: sidebar (a drawer below 768px, pinned beside the content above),
 * mobile top bar, and the main content region.
 *
 * Drawer state is local rather than in AppContext — it is ephemeral UI that
 * nothing outside this subtree needs to read.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setNavOpen(false), []);

  /*
   * Dismiss the drawer whenever the route changes, including via back/forward
   * where no nav item was clicked.
   *
   * This is React's documented "adjust state during render" pattern rather than
   * an effect: it re-renders immediately without painting the stale open state,
   * where an effect would paint the drawer over the new page for a frame first.
   */
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setNavOpen(false);
  }

  // Escape closes, matching the modal convention already used in the app.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // Stop the page scrolling behind the open drawer.
  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen && isMobile);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen, isMobile]);

  /*
   * Move focus into the drawer on open and back to the trigger on close, so
   * keyboard and screen-reader users are not stranded behind the overlay.
   * Only on mobile — above the breakpoint the sidebar is always visible and
   * stealing focus would be disruptive.
   */
  useEffect(() => {
    if (!isMobile) return;
    if (navOpen) closeButtonRef.current?.focus();
    else menuButtonRef.current?.focus();
  }, [navOpen, isMobile]);

  const drawerHidden = isMobile && !navOpen;

  return (
    <div className="app-shell">
      <TopBar onOpenMenu={() => setNavOpen(true)} menuOpen={navOpen} menuRef={menuButtonRef} />
      <Sidebar
        open={navOpen}
        onClose={close}
        closeRef={closeButtonRef}
        /* Only inert while it is an off-screen drawer; never on desktop, where
           the sidebar is a permanent, reachable landmark. */
        hidden={drawerHidden}
      />
      {navOpen && isMobile && (
        <div className="sidebar-backdrop" onClick={close} aria-hidden="true" />
      )}
      <main className="app-main">{children}</main>
    </div>
  );
}
