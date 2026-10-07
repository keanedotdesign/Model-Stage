export interface MaterialProps {
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  castLight: boolean;
  lightStrength: number;
}

export interface MaterialPreset {
  name: string;
  /** Optional sub-folder the preset lives under (e.g. "Painted"). */
  group?: string;
  /** Swatch color shown in the menu (defaults to the material color). */
  swatch?: string;
  material: MaterialProps;
}

/** The finish shared by the painted-color presets. */
const PAINTED_BASE = {
  metalness: 0.07,
  roughness: 0.6,
  opacity: 1,
  emissive: "#ffffff",
  emissiveIntensity: 0,
  castLight: false,
  lightStrength: 1,
};

const PAINTED_COLORS: { name: string; hex: string }[] = [
  { name: "Carbon", hex: "#2e2f31" },
  { name: "Walnut", hex: "#63513d" },
  { name: "Smoke", hex: "#83786f" },
  { name: "Mist", hex: "#c1c6c8" },
  { name: "Sand", hex: "#dfd5be" },
  { name: "Stone", hex: "#e1dbd6" },
  { name: "Snow", hex: "#f1f1f1" },
  { name: "Midnight", hex: "#254167" },
  { name: "Cobalt", hex: "#003aa5" },
  { name: "Lilac", hex: "#cddbfc" },
  { name: "Spruce", hex: "#02453e" },
  { name: "Olive", hex: "#5e6738" },
  { name: "Sage", hex: "#6e9870" },
  { name: "Meadow", hex: "#c4cdba" },
  { name: "Mustard", hex: "#d19000" },
  { name: "Sunrise", hex: "#f1bd56" },
  { name: "Lichen", hex: "#e3f983" },
  { name: "Sedona", hex: "#89431f" },
  { name: "Persimmon", hex: "#f27d3b" },
  { name: "Peach", hex: "#f3cfb3" },
  { name: "Manzanita", hex: "#5f2728" },
  { name: "Canyon", hex: "#a12928" },
  { name: "Poppy", hex: "#e10600" },
  { name: "Blossom", hex: "#cb8c7b" },
  { name: "Magnolia", hex: "#f9cadc" },
];

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    name: "Orange Clay",
    material: {
      color: "#ff8f21",
      metalness: 0,
      roughness: 0.19,
      opacity: 1,
      emissive: "#ffffff",
      emissiveIntensity: 0,
      castLight: false,
      lightStrength: 1,
    },
  },
  {
    name: "Translucent",
    material: {
      color: "#fff7e9",
      metalness: 0.8,
      roughness: 0.8,
      opacity: 1,
      emissive: "#fff2d6",
      emissiveIntensity: 0.25,
      castLight: true,
      lightStrength: 1,
    },
  },
  {
    name: "Chrome",
    material: {
      color: "#ffffff",
      metalness: 1,
      roughness: 0.25,
      opacity: 1,
      emissive: "#ffffff",
      emissiveIntensity: 0,
      castLight: false,
      lightStrength: 1,
    },
  },
  {
    name: "Rubber",
    material: {
      color: "#bfbfbf",
      metalness: 0,
      roughness: 0.14,
      opacity: 1,
      emissive: "#ffffff",
      emissiveIntensity: 0,
      castLight: false,
      lightStrength: 1,
    },
  },
  ...PAINTED_COLORS.map((c) => ({
    name: c.name,
    group: "Painted",
    swatch: c.hex,
    material: { color: c.hex, ...PAINTED_BASE },
  })),
];

function materialsEqual(a: MaterialProps, b: MaterialProps): boolean {
  return (
    a.color.toLowerCase() === b.color.toLowerCase() &&
    a.metalness === b.metalness &&
    a.roughness === b.roughness &&
    a.opacity === b.opacity &&
    a.emissive.toLowerCase() === b.emissive.toLowerCase() &&
    a.emissiveIntensity === b.emissiveIntensity &&
    a.castLight === b.castLight &&
    a.lightStrength === b.lightStrength
  );
}

/** Returns the preset matching these exact material properties, if any. */
export function matchMaterial(props: MaterialProps): MaterialPreset | null {
  return MATERIAL_PRESETS.find((p) => materialsEqual(p.material, props)) ?? null;
}
