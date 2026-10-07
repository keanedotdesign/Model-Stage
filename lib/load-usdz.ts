import * as THREE from "three";
import type { ParsedModel } from "./types";
import { object3DToModel } from "./three-mesh";

/**
 * Parses a USDZ file into the same flat per-part mesh shape the STEP importer
 * produces, so it flows through the viewer/edit/export pipeline unchanged.
 * Uses three's (experimental) USDZ loader.
 */
export async function parseUsdz(buffer: ArrayBuffer): Promise<ParsedModel> {
  const { USDZLoader } = await import(
    "three/examples/jsm/loaders/USDZLoader.js"
  );

  const loader = new USDZLoader();
  const root = loader.parse(buffer) as THREE.Object3D;
  return object3DToModel(root, "No geometry was found in this USDZ file.");
}
