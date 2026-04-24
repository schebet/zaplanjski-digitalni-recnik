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
    return {
      overrides: parsed.overrides,
      customCategories: parsed.customCategories ?? [],
      deletedCategories: parsed.deletedCategories ?? [],
      updatedAt: parsed.updatedAt ?? 0,
    };
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
  const deleted = new Set(state.deletedCategories ?? []);
  const stripDeletedCat = (e: Entry): Entry =>
    e.category && deleted.has(e.category) ? { ...e, category: undefined } : e;

  const result: Record<string, RuntimeEntry[]> = {};
  for (const letter of recnik.alphabet) {
    const original = recnik.byLetter[letter] ?? [];
    const list: RuntimeEntry[] = [];
    original.forEach((entry, idx) => {
      const id = originalEntryId(letter, idx);
      const ov = state.overrides[id];
      if (ov?.type === "delete") return;
      if (ov?.type === "edit") {
        const e = stripDeletedCat(ov.data);
        list.push({ ...e, letter, __id: id, __isEdited: true });
      } else {
        const e = stripDeletedCat(entry);
        list.push({ ...e, __id: id });
      }
    });
    result[letter] = list;
  }
  // Append new entries
  for (const [id, ov] of Object.entries(state.overrides)) {
    if (ov.type !== "add") continue;
    const e = stripDeletedCat(ov.data);
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

/**
 * Effective category list & per-category counts.
 *
 * - Starts from built-in categories in recnik.json.
 * - Adds user-created categories.
 * - Removes user-deleted categories.
 * - Recounts based on the live (edited) entries.
 */
export function getEffectiveCategories(
  state: EditsState,
  byLetter: Record<string, RuntimeEntry[]>,
): { categories: string[]; stats: Record<string, number> } {
  const deleted = new Set(state.deletedCategories ?? []);
  const builtins = (recnik.categories ?? []).filter((c) => !deleted.has(c));
  const customs = (state.customCategories ?? []).filter((c) => !deleted.has(c));

  // Union, preserving order: built-ins first, then customs (de-duped).
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const c of [...builtins, ...customs]) {
    if (!seen.has(c)) {
      seen.add(c);
      categories.push(c);
    }
  }

  // Recount from live entries.
  const stats: Record<string, number> = {};
  for (const c of categories) stats[c] = 0;
  for (const letter of Object.keys(byLetter)) {
    for (const e of byLetter[letter]) {
      if (!e.category) continue;
      if (deleted.has(e.category)) continue;
      // Auto-include category that exists on entries even if not registered yet
      if (!(e.category in stats)) {
        stats[e.category] = 0;
        if (!seen.has(e.category)) {
          seen.add(e.category);
          categories.push(e.category);
        }
      }
      stats[e.category] += 1;
    }
  }

  return { categories, stats };
}

/** Build a full RecnikData snapshot with all edits applied (for export). */
export function buildEffectiveRecnik(state: EditsState = loadEdits()): RecnikData {
  const byLetter = getEffectiveByLetter(state);
  const { stats } = getEffectiveStats(byLetter);
  const { categories, stats: categoryStats } = getEffectiveCategories(state, byLetter);
  // Strip runtime-only fields when exporting
  const cleaned: Record<string, Entry[]> = {};
  for (const letter of recnik.alphabet) {
    cleaned[letter] = (byLetter[letter] ?? []).map(({ __id, __isNew, __isEdited, ...e }) => e);
  }
  return {
    alphabet: recnik.alphabet,
    stats,
    byLetter: cleaned,
    categories,
    categoryStats,
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

/* -------------------------------------------------------------------------- */
/*                              Category mutators                             */
/* -------------------------------------------------------------------------- */

/** Add a brand-new category. No-op if it already exists or is blank. */
export function addCategory(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const state = loadEdits();
  const builtins = new Set(recnik.categories ?? []);
  const customs = new Set(state.customCategories ?? []);
  // If it was previously deleted, just un-delete it.
  const deleted = new Set(state.deletedCategories ?? []);
  if (deleted.has(trimmed)) {
    state.deletedCategories = (state.deletedCategories ?? []).filter((c) => c !== trimmed);
    saveEdits(state);
    return true;
  }
  if (builtins.has(trimmed) || customs.has(trimmed)) return false;
  state.customCategories = [...(state.customCategories ?? []), trimmed];
  saveEdits(state);
  return true;
}

/**
 * Delete a category. Built-ins are tombstoned (added to deletedCategories so
 * they stop appearing). Custom categories are simply removed from the list.
 * Any entries currently using the category will have it stripped at read time.
 */
export function deleteCategory(name: string) {
  const state = loadEdits();
  const builtins = new Set(recnik.categories ?? []);
  if (builtins.has(name)) {
    const set = new Set(state.deletedCategories ?? []);
    set.add(name);
    state.deletedCategories = Array.from(set);
  }
  state.customCategories = (state.customCategories ?? []).filter((c) => c !== name);
  saveEdits(state);
}

/**
 * Rename a category everywhere it is used. Updates the registry (custom
 * categories) and patches every entry currently tagged with `from`.
 */
export function renameCategory(from: string, to: string) {
  const target = to.trim();
  if (!target || target === from) return;
  const state = loadEdits();

  // 1) Update the registry
  const builtins = new Set(recnik.categories ?? []);
  if (builtins.has(from)) {
    // Tombstone the old built-in name and add the new one as a custom category.
    const del = new Set(state.deletedCategories ?? []);
    del.add(from);
    state.deletedCategories = Array.from(del);
    if (!builtins.has(target) && !(state.customCategories ?? []).includes(target)) {
      state.customCategories = [...(state.customCategories ?? []), target];
    }
  } else {
    state.customCategories = (state.customCategories ?? []).map((c) =>
      c === from ? target : c,
    );
  }
  // If the new name was previously tombstoned, un-tombstone it.
  state.deletedCategories = (state.deletedCategories ?? []).filter((c) => c !== target);

  // 2) Patch every entry that uses the old category, including originals.
  const seenIds = new Set<string>();
  for (const [id, ov] of Object.entries(state.overrides)) {
    if (ov.type === "edit" || ov.type === "add") {
      if (ov.data.category === from) {
        state.overrides[id] = { ...ov, data: { ...ov.data, category: target } };
      }
    }
    seenIds.add(id);
  }
  for (const letter of recnik.alphabet) {
    const original = recnik.byLetter[letter] ?? [];
    original.forEach((entry, idx) => {
      if (entry.category !== from) return;
      const id = originalEntryId(letter, idx);
      if (seenIds.has(id)) return; // already handled (edited/deleted)
      state.overrides[id] = {
        type: "edit",
        data: { ...entry, category: target },
      };
    });
  }

  saveEdits(state);
}
