import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EditsState,
  getEffectiveByLetter,
  getEffectiveStats,
  loadEdits,
  summarizeEdits,
} from "@/lib/recnikEdits";

/**
 * Subscribes to the local edits and exposes the effective dictionary.
 * Re-renders whenever edits change in this tab or any other tab.
 */
export function useRecnikEdits() {
  const [state, setState] = useState<EditsState>(() => loadEdits());

  useEffect(() => {
    const refresh = () => setState(loadEdits());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "recnik.edits.v1") refresh();
    };
    window.addEventListener("recnik:edits-changed", refresh as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("recnik:edits-changed", refresh as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const byLetter = useMemo(() => getEffectiveByLetter(state), [state]);
  const stats = useMemo(() => getEffectiveStats(byLetter), [byLetter]);
  const summary = useMemo(() => summarizeEdits(state), [state]);

  const refresh = useCallback(() => setState(loadEdits()), []);

  return { state, byLetter, stats: stats.stats, total: stats.total, summary, refresh };
}
