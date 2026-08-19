import type { ViewerSettings } from "./settings";

export type SceneSettings = Pick<
  ViewerSettings,
  | "backgroundMode"
  | "background"
  | "gradientTop"
  | "gradientBottom"
  | "envIntensity"
  | "ambient"
  | "keyLight"
  | "grid"
  | "gridColor"
  | "shadow"
>;

export interface ScenePreset {
  name: string;
  settings: SceneSettings;
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    name: "Lab",
    settings: {
      backgroundMode: "gradient",
      background: "#0b0f16",
      gradientTop: "#000000",
      gradientBottom: "#191919",
      envIntensity: 1,
      ambient: 0.15,
      keyLight: 1.35,
      grid: true,
      gridColor: "#444444",
      shadow: true,
    },
  },
  {
    name: "Stage",
    settings: {
      backgroundMode: "solid",
      background: "#ffffff",
      gradientTop: "#000000",
      gradientBottom: "#191919",
      envIntensity: 1.7,
      ambient: 0.15,
      keyLight: 0.25,
      grid: false,
      gridColor: "#444444",
      shadow: false,
    },
  },
];

function sceneEqual(preset: SceneSettings, current: SceneSettings): boolean {
  if (preset.backgroundMode !== current.backgroundMode) return false;
  if (preset.backgroundMode === "solid") {
    if (preset.background.toLowerCase() !== current.background.toLowerCase()) {
      return false;
    }
  } else {
    if (
      preset.gradientTop.toLowerCase() !== current.gradientTop.toLowerCase() ||
      preset.gradientBottom.toLowerCase() !==
        current.gradientBottom.toLowerCase()
    ) {
      return false;
    }
  }
  return (
    preset.envIntensity === current.envIntensity &&
    preset.ambient === current.ambient &&
    preset.keyLight === current.keyLight &&
    preset.grid === current.grid &&
    preset.gridColor.toLowerCase() === current.gridColor.toLowerCase() &&
    preset.shadow === current.shadow
  );
}

export function matchScene(current: SceneSettings): ScenePreset | null {
  return SCENE_PRESETS.find((p) => sceneEqual(p.settings, current)) ?? null;
}
