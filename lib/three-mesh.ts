import * as THREE from "three";
import type { ParsedMesh, ParsedModel } from "./types";

/**
 * Flattens a three.js Object3D hierarchy into the same per-part mesh shape the
 * STEP importer produces, so mesh-based formats (USDZ, FBX) flow through the
 * viewer/edit/export pipeline unchanged. World transforms are baked in so parts
 * keep their assembled positions.
 */
export function object3DToModel(
  root: THREE.Object3D,
  emptyMessage: string,
): ParsedModel {
  root.updateMatrixWorld(true);

  const meshes: ParsedMesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    // Bake the world transform so parts keep their assembled positions.
    const geometry = (mesh.geometry as THREE.BufferGeometry).clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    const positionAttr = geometry.getAttribute("position");
    if (!positionAttr) {
      geometry.dispose();
      return;
    }
    const position = new Float32Array(positionAttr.array as ArrayLike<number>);

    const normalAttr = geometry.getAttribute("normal");
    const normal = normalAttr
      ? new Float32Array(normalAttr.array as ArrayLike<number>)
      : undefined;

    let index: Uint32Array;
    if (geometry.index) {
      index = Uint32Array.from(geometry.index.array as ArrayLike<number>);
    } else {
      index = new Uint32Array(positionAttr.count);
      for (let i = 0; i < positionAttr.count; i += 1) index[i] = i;
    }

    let color: [number, number, number] | null = null;
    const material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    const materialColor = (material as THREE.MeshStandardMaterial | undefined)
      ?.color;
    if (materialColor) {
      color = [materialColor.r, materialColor.g, materialColor.b];
    }

    meshes.push({
      name: mesh.name || `Part ${meshes.length + 1}`,
      position,
      normal,
      index,
      color,
    });
    geometry.dispose();
  });

  if (meshes.length === 0) {
    throw new Error(emptyMessage);
  }

  return { meshes };
}
