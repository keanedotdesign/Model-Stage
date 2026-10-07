import * as THREE from "three";
import type { ParsedModel } from "./types";
import { object3DToModel } from "./three-mesh";

/**
 * Parses an FBX file into the viewer's flat per-part mesh shape. three's
 * FBXLoader accepts an ArrayBuffer and handles both binary and ASCII FBX
 * internally. The empty path skips texture resolution (we only read geometry
 * and material colors).
 */
export async function parseFbx(buffer: ArrayBuffer): Promise<ParsedModel> {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

  const loader = new FBXLoader();
  const root = loader.parse(buffer, "") as THREE.Group;
  return object3DToModel(root, "No geometry was found in this FBX file.");
}
