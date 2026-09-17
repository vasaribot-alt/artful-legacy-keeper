import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveState = "clean" | "dirty" | "saving" | "saved";

/**
 * Warns the user when they try to leave the page with unsaved changes.
 * Covers page reload / tab close, plus in-app link clicks and browser back.
 */
export const useUnsavedChangesWarning = (dirty: boolean) => {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#") || anchor.target === "_blank") return;
      const ok = window.confirm(
        "You have unsaved changes on this page. Leave without saving?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty]);
};

interface StickySaveBarProps {
  state: SaveState;
  onSave: () => void;
  className?: string;
  label?: string;
}

/**
 * Save control pinned to the top right of the page, visible while scrolling.
 * Reads "Save •" when there is something to save and "Saved ✓" once stored.
 */
export const StickySaveBar = ({ state, onSave, className, label = "Save" }: StickySaveBarProps) => {
  useUnsavedChangesWarning(state === "dirty");

  const text =
    state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : `${label} •`;

  return (
    <div
      className={cn(
        "fixed top-3 right-4 z-50 md:top-4 md:right-6",
        className
      )}
    >
      <Button
        onClick={onSave}
        disabled={state === "saving" || state === "saved"}
        className="shadow-lg min-w-[7rem]"
      >
        {text}
      </Button>
    </div>
  );
};

export default StickySaveBar;
