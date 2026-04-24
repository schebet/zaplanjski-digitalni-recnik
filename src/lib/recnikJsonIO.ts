/**
 * JSON import / export for the dictionary.
 *
 * Two file shapes are supported on import:
 *
 * 1) FULL dictionary  — the same shape as src/data/recnik.json:
 *      { alphabet, stats, byLetter, categories?, categoryStats? }
 *    The current local edits are wiped and rebuilt so that the effective
 *    dictionary matches the imported file exactly. Originals from the bundled
 *    recnik are tombstoned/edited as needed and any extra entries are saved
 *    as additions. This is what most users will share with each other.
 *
 * 2) EDITS-ONLY snapshot — { overrides, customCategories?, deletedCategories? }
 *    Loaded as-is into localStorage. Useful for backing up just your changes.
 *
 * Export always writes the FULL effective dictionary plus the raw edits
 * payload, so a single file can be either re-imported as a full replacement
 * or inspected as a finished recnik.json.
 */

import { recnik, type Entry, type RecnikData } from "@/data/recnik";
import {
  buildEffectiveRecnik,
  loadEdits,
  originalEntryId,
  newEntryId,
  saveEdits,
  type EditsState,
  type Override,
} from "@/lib/recnikEdits";

export interface RecnikExportFile {
  /** Marker so we can detect our own files on import. */
  format: "zaplanjski-recnik";
  version: 1;
  exportedAt: string;
  /** The full, effective dictionary at the time of export. */
  recnik: RecnikData;
  /** Raw edit overrides — useful for round-tripping. */
  edits: EditsState;
}

/** Build the JSON blob that the user downloads. */
export function buildExportPayload(): RecnikExportFile {
  return {
    format: "zaplanjski-recnik",
    version: 1,
    exportedAt: new Date().toISOString(),
    recnik: buildEffectiveRecnik(),
    edits: loadEdits(),
  };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* -------------------------------------------------------------------------- */
/*                                  Import                                    */
/* -------------------------------------------------------------------------- */

export interface ImportSummary {
  mode: "full" | "edits";
  totalEntries: number;
  edits: number;
  adds: number;
  deletes: number;
}

function isEntry(x: unknown): x is Entry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.headword === "string" &&
    typeof e.definition === "string" &&
    typeof e.pos === "string" &&
    typeof e.letter === "string"
  );
}

function looksLikeFullRecnik(x: unknown): x is RecnikData {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    Array.isArray(r.alphabet) &&
    typeof r.byLetter === "object" &&
    r.byLetter !== null
  );
}

function looksLikeEditsState(x: unknown): x is EditsState {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return typeof s.overrides === "object" && s.overrides !== null;
}

/**
 * Diff a target dictionary against the bundled `recnik` and produce an
 * EditsState whose effective output equals the target.
 */
function buildEditsFromFullRecnik(target: RecnikData): EditsState {
  const overrides: Record<string, Override> = {};

  // Use the bundled alphabet as the canonical letter set; the imported file
  // may provide its own, but we still need to know which originals exist.
  const alphabet = recnik.alphabet;

  for (const letter of alphabet) {
    const originals = recnik.byLetter[letter] ?? [];
    const targets = (target.byLetter?.[letter] ?? []).filter(isEntry);

    // 1) Walk through the originals: keep / edit / delete.
    originals.forEach((orig, idx) => {
      const id = originalEntryId(letter, idx);
      // Try to find the same headword in the target list (first match wins
      // and is then "consumed" so duplicates downstream become additions).
      const matchIdx = targets.findIndex(
        (t) => t.headword === orig.headword && t.pos === orig.pos,
      );
      if (matchIdx === -1) {
        overrides[id] = { type: "delete" };
        return;
      }
      const match = targets.splice(matchIdx, 1)[0];
      const changed =
        match.headword !== orig.headword ||
        match.pos !== orig.pos ||
        match.definition !== orig.definition ||
        (match.category ?? undefined) !== (orig.category ?? undefined);
      if (changed) {
        overrides[id] = {
          type: "edit",
          data: { ...match, letter },
        };
      }
    });

    // 2) Anything left in `targets` is a brand-new entry under this letter.
    for (const extra of targets) {
      const id = newEntryId();
      overrides[id] = {
        type: "add",
        data: { ...extra, letter },
      };
    }
  }

  // Categories: anything in target.categories not in the bundled list is custom.
  const builtins = new Set(recnik.categories ?? []);
  const targetCats = new Set<string>();
  for (const c of target.categories ?? []) targetCats.add(c);
  // Also collect categories actually used by entries, in case the file omitted
  // the registry.
  for (const letter of alphabet) {
    for (const e of target.byLetter?.[letter] ?? []) {
      if (e.category) targetCats.add(e.category);
    }
  }
  const customCategories: string[] = [];
  for (const c of targetCats) {
    if (!builtins.has(c)) customCategories.push(c);
  }
  const deletedCategories: string[] = [];
  for (const c of builtins) {
    if (!targetCats.has(c)) deletedCategories.push(c);
  }

  return {
    overrides,
    customCategories,
    deletedCategories,
    updatedAt: Date.now(),
  };
}

function summarize(state: EditsState): { edits: number; adds: number; deletes: number } {
  let edits = 0,
    adds = 0,
    deletes = 0;
  for (const ov of Object.values(state.overrides)) {
    if (ov.type === "edit") edits++;
    else if (ov.type === "add") adds++;
    else if (ov.type === "delete") deletes++;
  }
  return { edits, adds, deletes };
}

/** Read a File and apply it. Throws on invalid input. */
export async function importJsonFile(file: File): Promise<ImportSummary> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Фајл није исправан JSON.");
  }
  return importJsonPayload(parsed);
}

export function importJsonPayload(parsed: unknown): ImportSummary {
  // Wrapper file produced by buildExportPayload — prefer the embedded edits.
  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as Record<string, unknown>).format === "zaplanjski-recnik"
  ) {
    const wrap = parsed as RecnikExportFile;
    if (wrap.edits && looksLikeEditsState(wrap.edits)) {
      saveEdits({
        overrides: wrap.edits.overrides,
        customCategories: wrap.edits.customCategories ?? [],
        deletedCategories: wrap.edits.deletedCategories ?? [],
        updatedAt: Date.now(),
      });
      const sum = summarize(wrap.edits);
      const total = Object.values(buildEffectiveRecnik().stats).reduce(
        (a, b) => a + b,
        0,
      );
      return { mode: "edits", totalEntries: total, ...sum };
    }
    if (wrap.recnik && looksLikeFullRecnik(wrap.recnik)) {
      const state = buildEditsFromFullRecnik(wrap.recnik);
      saveEdits(state);
      const sum = summarize(state);
      const total = Object.values(wrap.recnik.stats ?? {}).reduce(
        (a, b) => a + (b as number),
        0,
      );
      return { mode: "full", totalEntries: total, ...sum };
    }
  }

  // Plain edits-only snapshot.
  if (looksLikeEditsState(parsed)) {
    const state = parsed as EditsState;
    saveEdits({
      overrides: state.overrides,
      customCategories: state.customCategories ?? [],
      deletedCategories: state.deletedCategories ?? [],
      updatedAt: Date.now(),
    });
    const sum = summarize(state);
    const total = Object.values(buildEffectiveRecnik().stats).reduce(
      (a, b) => a + b,
      0,
    );
    return { mode: "edits", totalEntries: total, ...sum };
  }

  // Plain full recnik.json shape.
  if (looksLikeFullRecnik(parsed)) {
    const state = buildEditsFromFullRecnik(parsed);
    saveEdits(state);
    const sum = summarize(state);
    const total = Object.values(parsed.stats ?? {}).reduce(
      (a, b) => a + (b as number),
      0,
    );
    return { mode: "full", totalEntries: total, ...sum };
  }

  throw new Error(
    "Непознат формат JSON фајла. Очекујем речник или фајл са изменама.",
  );
}
