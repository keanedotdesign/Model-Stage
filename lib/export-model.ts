import * as THREE from "three";
import type { ParsedMesh, ParsedModel } from "./types";
import { baseName, downloadBlob } from "./download";

export interface ExportMaterialSettings {
  colorMode: "custom" | "original";
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
}

export type PartEditMap = Record<
  number,
  | {
      hidden: boolean;
      color: string | null;
      metalness: number | null;
      roughness: number | null;
      opacity: number | null;
      emissive: string | null;
      emissiveIntensity: number | null;
    }
  | undefined
>;

function resolveColor(
  mesh: ParsedMesh,
  edit: PartEditMap[number],
  settings: ExportMaterialSettings,
): THREE.Color {
  if (edit?.color) return new THREE.Color(edit.color);
  if (settings.colorMode === "original" && mesh.color) {
    return new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]);
  }
  return new THREE.Color(settings.color);
}

/** Builds a scene from the visible parts, baking per-part color + material. */
function buildExportGroup(
  model: ParsedModel,
  edits: PartEditMap,
  settings: ExportMaterialSettings,
  fileName: string | null,
): { group: THREE.Group; included: number } {
  const group = new THREE.Group();
  group.name = baseName(fileName);
  let included = 0;

  model.meshes.forEach((mesh, i) => {
    const edit = edits[i];
    if (edit?.hidden) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(mesh.position, 3),
    );
    geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));
    if (mesh.normal) {
      geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normal, 3));
    } else {
      geometry.computeVertexNormals();
    }

    const opacity = edit?.opacity ?? settings.opacity;
    const material = new THREE.MeshStandardMaterial({
      color: resolveColor(mesh, edit, settings),
      metalness: edit?.metalness ?? settings.metalness,
      roughness: edit?.roughness ?? settings.roughness,
      emissive: new THREE.Color(edit?.emissive ?? settings.emissive),
      emissiveIntensity: edit?.emissiveIntensity ?? settings.emissiveIntensity,
      transparent: opacity < 1,
      opacity,
      side: THREE.DoubleSide,
    });

    const threeMesh = new THREE.Mesh(geometry, material);
    threeMesh.name = mesh.name;
    group.add(threeMesh);
    included += 1;
  });

  group.updateMatrixWorld(true);
  return { group, included };
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material;
    if (mat) {
      (Array.isArray(mat) ? mat : [mat]).forEach((entry) => entry.dispose());
    }
  });
}

/** Exports the edited model as a binary glTF (.glb). Returns parts included. */
export async function exportGlb(
  model: ParsedModel,
  edits: PartEditMap,
  settings: ExportMaterialSettings,
  fileName: string | null,
): Promise<number> {
  const { GLTFExporter } = await import(
    "three/examples/jsm/exporters/GLTFExporter.js"
  );
  const { group, included } = buildExportGroup(model, edits, settings, fileName);
  const result = (await new GLTFExporter().parseAsync(group, {
    binary: true,
  })) as ArrayBuffer;
  disposeGroup(group);
  downloadBlob(
    new Blob([result], { type: "model/gltf-binary" }),
    `${baseName(fileName)}.glb`,
  );
  return included;
}

/** Exports the edited model as USDZ (.usdz) for AR Quick Look. */
export async function exportUsdz(
  model: ParsedModel,
  edits: PartEditMap,
  settings: ExportMaterialSettings,
  fileName: string | null,
): Promise<number> {
  const { USDZExporter } = await import(
    "three/examples/jsm/exporters/USDZExporter.js"
  );
  const { group, included } = buildExportGroup(model, edits, settings, fileName);
  const result = (await new USDZExporter().parseAsync(group)) as Uint8Array;
  disposeGroup(group);
  downloadBlob(
    new Blob([result as BlobPart], { type: "model/vnd.usdz+zip" }),
    `${baseName(fileName)}.usdz`,
  );
  return included;
}
