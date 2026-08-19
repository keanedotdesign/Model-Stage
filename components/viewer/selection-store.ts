"use client";

import { create } from "zustand";

export type SelectMode = "replace" | "toggle" | "range";

export function modeFromModifiers(
  shift: boolean,
  meta: boolean,
  ctrl: boolean,
): SelectMode {
  if (shift) return "range";
  if (meta || ctrl) return "toggle";
  return "replace";
}

interface SelectionStore {
  /** Selected part indices (into model.meshes). */
  selected: number[];
  hovered: number | null;
  /** Anchor index for shift-range selection. */
  anchor: number | null;
  select: (index: number, mode: SelectMode) => void;
  selectAll: (count: number) => void;
  clear: () => void;
  hover: (index: number | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selected: [],
  hovered: null,
  anchor: null,
  select: (index, mode) => {
    const { selected, anchor } = get();
    if (mode === "toggle") {
      const has = selected.includes(index);
      set({
        selected: has
          ? selected.filter((i) => i !== index)
          : [...selected, index],
        anchor: index,
      });
    } else if (mode === "range" && anchor !== null) {
      const lo = Math.min(anchor, index);
      const hi = Math.max(anchor, index);
      const range: number[] = [];
      for (let i = lo; i <= hi; i += 1) range.push(i);
      set({ selected: range });
    } else {
      set({ selected: [index], anchor: index });
    }
  },
  selectAll: (count) =>
    set({ selected: Array.from({ length: count }, (_, i) => i), anchor: 0 }),
  clear: () => set({ selected: [], anchor: null }),
  hover: (index) => set({ hovered: index }),
}));

/** Accent used to highlight the selected/hovered part. */
export const HIGHLIGHT_COLOR = "#38bdf8";
