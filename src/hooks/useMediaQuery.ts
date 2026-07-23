import { useSyncExternalStore } from "react";

/**
 * Subscribe to a media query.
 *
 * Used where behaviour (not just styling) has to differ across the breakpoint —
 * e.g. the sidebar is an inert drawer on mobile but permanently visible on
 * desktop, so focus handling and `inert` must not apply above it.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True below the app's single 768px breakpoint. */
export const MOBILE_QUERY = "(max-width: 767px)";
