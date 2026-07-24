import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SPLIT_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";

/**
 * Scrolls to the top on navigation — except when selecting an exercise inside
 * the Progress split-pane.
 *
 * At the split breakpoint the exercise detail renders beside the list, so
 * navigating `/progress` ↔ `/progress/exercise/:name` is an in-page selection;
 * resetting the scroll there throws away the reader's place in the list. Below
 * the breakpoint the detail is its own full page, so the reset is wanted.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const isSplit = useMediaQuery(SPLIT_QUERY);
  const prev = useRef(pathname);

  useEffect(() => {
    // isSplit is a dependency too, so gate on an actual path change — otherwise
    // a resize across the breakpoint would scroll the page to the top.
    const navigated = pathname !== prev.current;
    const withinProgress =
      pathname.startsWith("/progress") && prev.current.startsWith("/progress");
    prev.current = pathname;
    if (navigated && !(isSplit && withinProgress)) window.scrollTo(0, 0);
  }, [pathname, isSplit]);

  return null;
}
