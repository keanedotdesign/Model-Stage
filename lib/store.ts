import { create } from "zustand";
import type { MeshQuality } from "./occt";
import type { ParsedModel, ViewDirection } from "./types";

/** A parsed STEP file's raw bytes, retained so we can re-tessellate it when the
 * mesh-quality setting changes. USDZ files aren't tessellated, so they don't
 * set this. */
export interface ModelSource {
  buffer: ArrayBuffer;
  name: string;
}

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
  /** Render with a transparent background + hidden grid/shadow. Forces a WebM
   * (VP8/VP9) container, the only MediaRecorder format that carries alpha. */
  transparent: boolean;
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

  /** Tessellation quality for STEP files. Changing it re-parses the source. */
  quality: MeshQuality;
  /** Retained STEP bytes for re-tessellation (null for USDZ / no model). */
  source: ModelSource | null;

  isRecording: boolean;
  recordProgress: number;

  handles: ViewerHandles | null;

  setLoading: (fileName: string) => void;
  setModel: (model: ParsedModel, fileName: string) => void;
  setError: (message: string) => void;
  setQuality: (quality: MeshQuality) => void;
  setSource: (source: ModelSource | null) => void;
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
  quality: "standard",
  source: null,

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
  setQuality: (quality) => set({ quality }),
  setSource: (source) => set({ source }),
  setRecording: (value) =>
    set({ isRecording: value, recordProgress: value ? 0 : 0 }),
  setProgress: (value) => set({ recordProgress: value }),
  setHandles: (handles) => set({ handles }),
  setModelRadius: (radius) => set({ modelRadius: radius }),
}));
