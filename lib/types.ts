export interface ParsedMesh {
  name: string;
  position: Float32Array;
  normal?: Float32Array;
  index: Uint32Array;
  /** Linear RGB in 0..1, taken from the CAD data when present. */
  color: [number, number, number] | null;
}

export interface ParsedModel {
  meshes: ParsedMesh[];
}

export type ViewDirection =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "iso";
