import { create } from "zustand";
import type { ParsedModel, ViewDirection } from "./types";

export interface PngExportOptions {
  transparent: boolean;
  /** Supersampling multiplier applied to the canvas resolution. */
  scale: number;
}

export interface VideoExportOptions {
  duration: number;
  fps: number;
  /** 1 = counter-clockwise, -1 = clockwise. */
  direction: 1 | -1;
  /** When true, exactly one full turn over `duration`; otherwise spin at the
   * viewer's auto-rotate speed. */
  fullRotation: boolean;
}

export interface ViewerHandles {
  fitView: () => void;
  frameView: (direction: ViewDirection) => void;
  resetView: () => void;
  capturePng: (options: PngExportOptions) => Promise<void>;
  captureVideo: (options: VideoExportOptions) => Promise<void>;
}

export type ViewerStatus = "idle" | "loading" | "ready" | "error";

interface ViewerStore {
  model: ParsedModel | null;
  fileName: string | null;
  partCount: number;
  status: ViewerStatus;
  error: string | null;
  /** Half the model's bounding-box diagonal; scales camera slider ranges. */
  modelRadius: number;

  isRecording: boolean;
  recordProgress: number;

  handles: ViewerHandles | null;

  setLoading: (fileName: string) => void;
  setModel: (model: ParsedModel, fileName: string) => void;
  setError: (message: string) => void;
  setRecording: (value: boolean) => void;
  setProgress: (value: number) => void;
  setHandles: (handles: ViewerHandles) => void;
  setModelRadius: (radius: number) => void;
}

export const useViewerStore = create<ViewerStore>((set) => ({
  model: null,
  fileName: null,
  partCount: 0,
  status: "idle",
  error: null,
  modelRadius: 0,

  isRecording: false,
  recordProgress: 0,

  handles: null,

  setLoading: (fileName) => set({ status: "loading", fileName, error: null }),
  setModel: (model, fileName) =>
    set({
      model,
      fileName,
      partCount: model.meshes.length,
      status: "ready",
      error: null,
    }),
  setError: (message) => set({ status: "error", error: message }),
  setRecording: (value) =>
    set({ isRecording: value, recordProgress: value ? 0 : 0 }),
  setProgress: (value) => set({ recordProgress: value }),
  setHandles: (handles) => set({ handles }),
  setModelRadius: (radius) => set({ modelRadius: radius }),
}));
