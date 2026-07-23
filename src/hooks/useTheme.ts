import { useEffect, useSyncExternalStore } from "react";
import type { ResolvedTheme, ThemePref } from "../types";

export const THEME_STORAGE_KEY = "wt_theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Server/prerender fallback; this app is client-only but the API requires it. */
function getSystemThemeServer(): ResolvedTheme {
  return "light";
}

/**
 * Resolves a theme preference to a concrete theme and applies it to
 * `<html data-theme>`.
 *
 * The OS setting is read through `useSyncExternalStore` so the resolved value
 * is derived during render rather than synced via state-in-effect. The
 * attribute is also set pre-paint by the inline bootstrap in index.html —
 * keep that script's storage key and logic in step with this hook.
 */
export function useTheme(pref: ThemePref): ResolvedTheme {
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getSystemThemeServer,
  );

  const resolved: ResolvedTheme = pref === "auto" ? systemTheme : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;

    // Keep the mobile browser chrome in step with the page background.
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg-base")
      .trim();
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    if (bg) meta.content = bg;
  }, [resolved]);

  return resolved;
}
