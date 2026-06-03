import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDimensions, type DimensionUnit } from "@/lib/formatDimensions";

const STORAGE_KEY = "unitPreference";
const EVENT = "unit-preference-changed";

const readCached = (): DimensionUnit => {
  if (typeof window === "undefined") return "cm";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "in" ? "in" : "cm";
};

/**
 * Per-user preference for displaying artwork dimensions.
 * Values are stored in cm in the database; this hook only affects display order.
 */
export function useUnitPreference() {
  const [unit, setUnitState] = useState<DimensionUnit>(readCached);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("unit_preference")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const pref = (data as any)?.unit_preference === "in" ? "in" : "cm";
      if (cancelled) return;
      window.localStorage.setItem(STORAGE_KEY, pref);
      setUnitState(pref);
    };
    sync();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DimensionUnit>).detail;
      if (detail === "cm" || detail === "in") setUnitState(detail);
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const setUnit = useCallback(async (next: DimensionUnit) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    setUnitState(next);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("profiles")
        .update({ unit_preference: next } as any)
        .eq("user_id", session.user.id);
    }
  }, []);

  const formatDims = useCallback(
    (h: number | null, w: number | null, d: number | null) =>
      formatDimensions(h, w, d, unit),
    [unit]
  );

  return { unit, setUnit, formatDims };
}
