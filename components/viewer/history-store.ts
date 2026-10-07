"use client";

import { create } from "zustand";
import { useSettingsStore, type ViewerSettings } from "./settings";
import { usePartsStore, type PartEdit } from "./parts-store";

/**
 * Undo/redo for the model's *editable* state: the visual settings and the
 * per-part overrides. Camera pose and selection are navigational, not edits, so
 * they're deliberately left out of history.
 *
 * Edits are coalesced: a burst of changes (e.g. dragging a slider, or a scene
 * preset that sets many keys at once) collapses into a single history step via
 * a short debounce. Applying an undo/redo is guarded so it never records itself
 * as a new edit.
 */

interface Snapshot {
  settings: ViewerSettings;
  edits: Record<number, PartEdit>;
}

const MAX_HISTORY = 100;
const COALESCE_MS = 350;

function cloneEdits(src: Record<number, PartEdit>): Record<number, PartEdit> {
  const edits: Record<number, PartEdit> = {};
  for (const [key, edit] of Object.entries(src)) edits[Number(key)] = { ...edit };
  return edits;
}

function capture(): Snapshot {
  return {
    settings: { ...useSettingsStore.getState().settings },
    edits: cloneEdits(usePartsStore.getState().edits),
  };
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return (
    JSON.stringify(a.settings) === JSON.stringify(b.settings) &&
    JSON.stringify(a.edits) === JSON.stringify(b.edits)
  );
}

/** True while we're writing a snapshot back into the stores, so the change
 * subscription doesn't treat the restore as a fresh user edit. */
let applying = false;
let pending: ReturnType<typeof setTimeout> | null = null;

function apply(snap: Snapshot) {
  applying = true;
  useSettingsStore.setState({ settings: { ...snap.settings } });
  usePartsStore.setState({ edits: cloneEdits(snap.edits) });
  applying = false;
}

interface HistoryStore {
  past: Snapshot[];
  future: Snapshot[];
  /** The last committed baseline — what "undo" steps back from. */
  present: Snapshot;
  canUndo: boolean;
  canRedo: boolean;
  /** Capture current live state as a new history step (used by the debounce). */
  commit: () => void;
  undo: () => void;
  redo: () => void;
  /** Re-baseline with the current state and drop all history (new model). */
  reset: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  present: capture(),
  canUndo: false,
  canRedo: false,

  commit: () =>
    set((s) => {
      const next = capture();
      if (sameSnapshot(next, s.present)) return {};
      const past = [...s.past, s.present].slice(-MAX_HISTORY);
      return { past, present: next, future: [], canUndo: true, canRedo: false };
    }),

  undo: () => {
    flushPending();
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      apply(previous);
      return {
        past,
        present: previous,
        future: [s.present, ...s.future],
        canUndo: past.length > 0,
        canRedo: true,
      };
    });
  },

  redo: () => {
    flushPending();
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      const future = s.future.slice(1);
      apply(next);
      return {
        past: [...s.past, s.present],
        present: next,
        future,
        canUndo: true,
        canRedo: future.length > 0,
      };
    });
  },

  reset: () => {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
    set({
      past: [],
      future: [],
      present: capture(),
      canUndo: false,
      canRedo: false,
    });
  },
}));

function flushPending() {
  if (!pending) return;
  clearTimeout(pending);
  pending = null;
  useHistoryStore.getState().commit();
}

function scheduleCommit() {
  if (applying) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    useHistoryStore.getState().commit();
  }, COALESCE_MS);
}

// Record edits to either store. Guarded against server-side execution.
if (typeof window !== "undefined") {
  useSettingsStore.subscribe(scheduleCommit);
  usePartsStore.subscribe(scheduleCommit);
}
