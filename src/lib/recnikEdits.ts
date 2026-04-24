/**
 * Local edit layer over the bundled dictionary.
 * All changes are stored in localStorage and applied at read time.
 *
 * Override types:
 *   - "edit":   replaces an existing entry by stable key (letter + originalIndex)
 *   - "delete": removes an existing entry
 *   - "add":    appends a brand-new entry under a letter
 */

import { recnik, type Entry, type RecnikData } from "@/data/recnik";

const STORAGE_KEY = "recnik.edits.v1";

export type EditId = string; // "<LETTER>:<index>" for original entries, "new:<uuid>" for added ones

export interface EditOverride {
  type: "edit";
  data: Entry;
}
export interface DeleteOverride {
  type: "delete";
}
export interface AddOverride {
  type: "add";
  data: Entry;
}

export type Override = EditOverride | DeleteOverride | AddOverride;

export interface EditsState {
  // keyed by EditId
  overrides: Record<EditId, Override>;
  /** User-added categories (in addition to the built-in ones from recnik.json). */
  customCategories?: string[];
  /** Categories the user marked as deleted (hidden everywhere, removed from entries). */
  deletedCategories?: string[];
  updatedAt: number;
}

const emptyState = (): EditsState => ({
  overrides: {},
  customCategories: [],
  deletedCategories: [],
  updatedAt: 0,
});

export function loadEdits(): EditsState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as EditsState;
    if (!parsed || typeof parsed !== "object" || !parsed.overrides) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveEdits(state: EditsState) {
  if (typeof window === "undefined") return;
  state.updatedAt = Date.now();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Notify other components/tabs.
  window.dispatchEvent(new CustomEvent("recnik:edits-changed"));
}

export function clearAllEdits() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("recnik:edits-changed"));
}

export function originalEntryId(letter: string, originalIndex: number): EditId {
  return `${letter}:${originalIndex}`;
}

export function newEntryId(): EditId {
  // Cheap unique id that doesn't need crypto polyfills
  return `new:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Internal entry with a stable id and a flag if it's an addition. */
export interface RuntimeEntry extends Entry {
  __id: EditId;
  __isNew?: boolean;
  __isEdited?: boolean;
}

/** Build the effective per-letter list, applying overrides. */
export function getEffectiveByLetter(state: EditsState): Record<string, RuntimeEntry[]> {
  const result: Record<string, RuntimeEntry[]> = {};
  for (const letter of recnik.alphabet) {
    const original = recnik.byLetter[letter] ?? [];
    const list: RuntimeEntry[] = [];
    original.forEach((entry, idx) => {
      const id = originalEntryId(letter, idx);
      const ov = state.overrides[id];
      if (ov?.type === "delete") return;
      if (ov?.type === "edit") {
        list.push({ ...ov.data, letter, __id: id, __isEdited: true });
      } else {
        list.push({ ...entry, __id: id });
      }
    });
    result[letter] = list;
  }
  // Append new entries
  for (const [id, ov] of Object.entries(state.overrides)) {
    if (ov.type !== "add") continue;
    const e = ov.data;
    const letter = (e.letter || "").toUpperCase();
    if (!result[letter]) result[letter] = [];
    result[letter].push({ ...e, letter, __id: id, __isNew: true });
  }
  return result;
}

/** Recompute totals/per-letter stats based on overrides. */
export function getEffectiveStats(byLetter: Record<string, RuntimeEntry[]>): {
  stats: Record<string, number>;
  total: number;
} {
  const stats: Record<string, number> = {};
  let total = 0;
  for (const letter of recnik.alphabet) {
    const n = byLetter[letter]?.length ?? 0;
    stats[letter] = n;
    total += n;
  }
  return { stats, total };
}

/** Build a full RecnikData snapshot with all edits applied (for export). */
export function buildEffectiveRecnik(state: EditsState = loadEdits()): RecnikData {
  const byLetter = getEffectiveByLetter(state);
  const { stats } = getEffectiveStats(byLetter);
  // Strip runtime-only fields when exporting
  const cleaned: Record<string, Entry[]> = {};
  for (const letter of recnik.alphabet) {
    cleaned[letter] = (byLetter[letter] ?? []).map(({ __id, __isNew, __isEdited, ...e }) => e);
  }
  return {
    alphabet: recnik.alphabet,
    stats,
    byLetter: cleaned,
    categories: recnik.categories,
    categoryStats: recnik.categoryStats,
  };
}

/** Mutators */
export function upsertEdit(id: EditId, data: Entry) {
  const state = loadEdits();
  if (id.startsWith("new:")) {
    state.overrides[id] = { type: "add", data };
  } else {
    state.overrides[id] = { type: "edit", data };
  }
  saveEdits(state);
}

export function deleteEntry(id: EditId) {
  const state = loadEdits();
  if (id.startsWith("new:")) {
    delete state.overrides[id];
  } else {
    state.overrides[id] = { type: "delete" };
  }
  saveEdits(state);
}

export function addEntry(letter: string, data: Omit<Entry, "letter">): EditId {
  const id = newEntryId();
  const state = loadEdits();
  state.overrides[id] = { type: "add", data: { ...data, letter } };
  saveEdits(state);
  return id;
}

export function revertEntry(id: EditId) {
  const state = loadEdits();
  delete state.overrides[id];
  saveEdits(state);
}

/** Count how many overrides of each type exist (used for UI badges). */
export function summarizeEdits(state: EditsState = loadEdits()) {
  let edits = 0,
    deletes = 0,
    adds = 0;
  for (const ov of Object.values(state.overrides)) {
    if (ov.type === "edit") edits++;
    else if (ov.type === "delete") deletes++;
    else if (ov.type === "add") adds++;
  }
  return { edits, deletes, adds, total: edits + deletes + adds };
}
