"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export interface ViewerSettings {
  // material
  colorMode: "custom" | "original";
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  castLight: boolean;
  lightStrength: number;
  wireframe: boolean;
  flatShading: boolean;
  edges: boolean;
  edgeColor: string;
  highlightSelection: boolean;
  // scene
  background: string;
  backgroundMode: "solid" | "gradient";
  gradientTop: string;
  gradientBottom: string;
  envIntensity: number;
  ambient: number;
  keyLight: number;
  grid: boolean;
  gridColor: string;
  shadow: boolean;
  shadowOpacity: number;
  // view
  projection: "orthographic" | "perspective";
  fov: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  explode: number;
}

export const DEFAULT_SETTINGS: ViewerSettings = {
  colorMode: "custom",
  color: "#ff8f21",
  metalness: 0,
  roughness: 0.19,
  opacity: 1,
  emissive: "#ffffff",
  emissiveIntensity: 0,
  castLight: false,
  lightStrength: 1,
  wireframe: false,
  flatShading: false,
  edges: false,
  edgeColor: "#05070a",
  highlightSelection: false,
  background: "#0b0f16",
  backgroundMode: "gradient",
  gradientTop: "#000000",
  gradientBottom: "#191919",
  envIntensity: 1,
  ambient: 0.15,
  keyLight: 1.35,
  grid: true,
  gridColor: "#444444",
  shadow: true,
  shadowOpacity: 0.55,
  projection: "orthographic",
  fov: 45,
  autoRotate: true,
  autoRotateSpeed: 1.2,
  explode: 0,
};

interface SettingsStore {
  settings: ViewerSettings;
  update: (patch: Partial<ViewerSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  reset: () => set({ settings: DEFAULT_SETTINGS }),
}));

export function useViewerSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  return { settings, update, reset };
}

/**
 * Fine-grained selectors so a change to one control only re-renders the scene
 * components that actually depend on it (keeps slider drags smooth).
 */

export type ModelSettings = Pick<
  ViewerSettings,
  | "colorMode"
  | "color"
  | "metalness"
  | "roughness"
  | "opacity"
  | "emissive"
  | "emissiveIntensity"
  | "castLight"
  | "lightStrength"
  | "wireframe"
  | "flatShading"
  | "edges"
  | "edgeColor"
  | "explode"
  | "highlightSelection"
>;

export const useUpdate = () => useSettingsStore((s) => s.update);

export const useModelSettings = (): ModelSettings =>
  useSettingsStore(
    useShallow((s) => ({
      colorMode: s.settings.colorMode,
      color: s.settings.color,
      metalness: s.settings.metalness,
      roughness: s.settings.roughness,
      opacity: s.settings.opacity,
      emissive: s.settings.emissive,
      emissiveIntensity: s.settings.emissiveIntensity,
      castLight: s.settings.castLight,
      lightStrength: s.settings.lightStrength,
      wireframe: s.settings.wireframe,
      flatShading: s.settings.flatShading,
      edges: s.settings.edges,
      edgeColor: s.settings.edgeColor,
      explode: s.settings.explode,
      highlightSelection: s.settings.highlightSelection,
    })),
  );

export const useBackgroundSettings = () =>
  useSettingsStore(
    useShallow((s) => ({
      backgroundMode: s.settings.backgroundMode,
      background: s.settings.background,
      gradientTop: s.settings.gradientTop,
      gradientBottom: s.settings.gradientBottom,
      envIntensity: s.settings.envIntensity,
    })),
  );

export const useLightSettings = () =>
  useSettingsStore(
    useShallow((s) => ({
      ambient: s.settings.ambient,
      keyLight: s.settings.keyLight,
    })),
  );

export const useHelperSettings = () =>
  useSettingsStore(
    useShallow((s) => ({
      grid: s.settings.grid,
      gridColor: s.settings.gridColor,
      shadow: s.settings.shadow,
      shadowOpacity: s.settings.shadowOpacity,
    })),
  );

export const useCameraSettings = () =>
  useSettingsStore(
    useShallow((s) => ({
      projection: s.settings.projection,
      fov: s.settings.fov,
    })),
  );

export const useControlSettings = () =>
  useSettingsStore(
    useShallow((s) => ({
      projection: s.settings.projection,
      autoRotate: s.settings.autoRotate,
      autoRotateSpeed: s.settings.autoRotateSpeed,
    })),
  );
