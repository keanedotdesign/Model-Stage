"use client";

import { create } from "zustand";

export interface CameraPose {
  /** Horizontal distance from the target (radius in the ground plane). */
  distance: number;
  /** Vertical offset above the target. */
  height: number;
  /** Azimuth (horizontal orbit angle) in degrees. */
  angle: number;
}

interface CameraStore extends CameraPose {
  /** A slider-issued change waiting to be applied to the live camera. */
  pending: Partial<CameraPose> | null;
  /** Pushed from the scene each frame so the sliders track the live camera. */
  setLive: (pose: CameraPose) => void;
  /** Called by the sliders to move the camera. */
  command: (patch: Partial<CameraPose>) => void;
  /** Read + clear the pending command (called inside the render loop). */
  consume: () => Partial<CameraPose> | null;
}

export const useCameraStore = create<CameraStore>((set, get) => ({
  distance: 0,
  height: 0,
  angle: 0,
  pending: null,
  setLive: (pose) => set(pose),
  command: (patch) =>
    set((s) => ({ ...patch, pending: { ...(s.pending ?? {}), ...patch } })),
  consume: () => {
    const pending = get().pending;
    if (pending) set({ pending: null });
    return pending;
  },
}));
