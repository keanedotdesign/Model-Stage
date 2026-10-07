"use client";

import { create } from "zustand";

export interface PartEdit {
  hidden: boolean;
  /** Per-part overrides. null = fall back to the global material setting. */
  color: string | null;
  metalness: number | null;
  roughness: number | null;
  opacity: number | null;
  emissive: string | null;
  emissiveIntensity: number | null;
  castLight: boolean | null;
  lightStrength: number | null;
}

const DEFAULT_EDIT: PartEdit = {
  hidden: false,
  color: null,
  metalness: null,
  roughness: null,
  opacity: null,
  emissive: null,
  emissiveIntensity: null,
  castLight: null,
  lightStrength: null,
};

export type PartMaterialPatch = Partial<
  Pick<
    PartEdit,
    | "metalness"
    | "roughness"
    | "opacity"
    | "emissive"
    | "emissiveIntensity"
    | "castLight"
    | "lightStrength"
  >
>;

interface PartsStore {
  edits: Record<number, PartEdit>;
  setHidden: (index: number, hidden: boolean) => void;
  setColor: (index: number, color: string | null) => void;
  setMaterial: (index: number, patch: PartMaterialPatch) => void;
  /** Clear color + material overrides for a part (keeps its visibility). */
  resetPart: (index: number) => void;
  /** Show only this part, hiding every other part in the model. */
  isolate: (index: number, total: number) => void;
  showAll: () => void;
  /** Clear all edits (called when a new model loads). */
  reset: () => void;
}

export const usePartsStore = create<PartsStore>((set) => ({
  edits: {},
  setHidden: (index, hidden) =>
    set((s) => ({
      edits: {
        ...s.edits,
        [index]: { ...(s.edits[index] ?? DEFAULT_EDIT), hidden },
      },
    })),
  setColor: (index, color) =>
    set((s) => ({
      edits: {
        ...s.edits,
        [index]: { ...(s.edits[index] ?? DEFAULT_EDIT), color },
      },
    })),
  setMaterial: (index, patch) =>
    set((s) => ({
      edits: {
        ...s.edits,
        [index]: { ...(s.edits[index] ?? DEFAULT_EDIT), ...patch },
      },
    })),
  resetPart: (index) =>
    set((s) => ({
      edits: {
        ...s.edits,
        [index]: {
          ...(s.edits[index] ?? DEFAULT_EDIT),
          color: null,
          metalness: null,
          roughness: null,
          opacity: null,
          emissive: null,
          emissiveIntensity: null,
          castLight: null,
          lightStrength: null,
        },
      },
    })),
  isolate: (index, total) =>
    set((s) => {
      const edits: Record<number, PartEdit> = { ...s.edits };
      for (let i = 0; i < total; i++) {
        edits[i] = { ...(edits[i] ?? DEFAULT_EDIT), hidden: i !== index };
      }
      return { edits };
    }),
  showAll: () =>
    set((s) => {
      const edits: Record<number, PartEdit> = {};
      for (const [key, edit] of Object.entries(s.edits)) {
        edits[Number(key)] = { ...edit, hidden: false };
      }
      return { edits };
    }),
  reset: () => set({ edits: {} }),
}));
