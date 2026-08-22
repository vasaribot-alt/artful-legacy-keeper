import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Remembers the vertical scroll position of a list page and restores it when the
 * user comes back (e.g. after opening a record and pressing Back).
 *
 * The position is kept in sessionStorage so it survives route changes but not
 * a new browser session. Restore retries while the page grows (images loading)
 * and aborts as soon as the user scrolls themselves.
 *
 * @param name  stable identifier for the list (e.g. "inventory")
 * @param ready true once the list data is rendered (usually `!loading`)
 */
export function useScrollRestoration(name: string, ready: boolean) {
  const location = useLocation();
  const activeRole =
    typeof window !== "undefined" ? localStorage.getItem("activeRole") || "artist" : "artist";
  const key = `scroll:${name}:${activeRole}:${location.pathname}`;

  const restoredRef = useRef(false);
  const targetRef = useRef<number | null>(null);

  // Read the saved position once per key
  useEffect(() => {
    restoredRef.current = false;
    const saved = sessionStorage.getItem(key);
    targetRef.current = saved ? parseInt(saved, 10) : null;
  }, [key]);

  // Persist the position while scrolling (only after any restore has finished)
  useEffect(() => {
    const getY = () =>
      Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );

    const onScroll = () => {
      if (!restoredRef.current) return;
      sessionStorage.setItem(key, String(getY()));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true } as any);
    };
  }, [key]);

  // Restore once the content is there, retrying while the page height grows
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    const target = targetRef.current;
    if (target == null || target <= 0) {
      restoredRef.current = true;
      return;
    }

    let cancelled = false;
    const start = Date.now();

    const cleanup = () => {
      window.removeEventListener("wheel", cancelOnUserAction);
      window.removeEventListener("touchstart", cancelOnUserAction);
      window.removeEventListener("keydown", cancelOnUserAction);
    };
    function cancelOnUserAction() {
      cancelled = true;
      restoredRef.current = true;
      cleanup();
    }
    window.addEventListener("wheel", cancelOnUserAction, { passive: true, once: true });
    window.addEventListener("touchstart", cancelOnUserAction, { passive: true, once: true });
    window.addEventListener("keydown", cancelOnUserAction, { once: true });

    const tryRestore = () => {
      if (cancelled) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, Math.max(maxScroll, 0)));
      const reached = Math.abs(window.scrollY - target) <= 4;
      const timedOut = Date.now() - start > 5000;
      if (!reached && !timedOut) {
        setTimeout(tryRestore, 60);
      } else {
        restoredRef.current = true;
        cleanup();
      }
    };
    requestAnimationFrame(tryRestore);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [ready, key]);

  /** Clear the remembered position (e.g. an explicit "back to top" action). */
  const clearSavedScroll = () => {
    sessionStorage.removeItem(key);
  };

  return { clearSavedScroll };
}
