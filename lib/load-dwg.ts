import type { ParsedMesh, ParsedModel } from "./types";

/**
 * Parses a DWG file into the viewer's per-part mesh shape.
 *
 * DWG is a closed binary format with no in-browser tessellator for its 3D
 * *solids* (those are ACIS blobs). What we CAN render is polygonal geometry —
 * polyface/polygon meshes, 3DFACEs, and SubD meshes. We read the DWG with
 * libredwg (WASM), dump it to DXF (the only view that reliably surfaces this
 * geometry), then pull the mesh entities out of the DXF.
 *
 * Files that are purely 2D, or whose 3D is stored as ACIS solids, will yield no
 * geometry — we surface a clear message pointing at STEP instead.
 */

const WASM_DIR = "/libredwg";

interface DxfVertex {
  x?: number;
  y?: number;
  z?: number;
  faceA?: number;
  faceB?: number;
  faceC?: number;
  faceD?: number;
}

interface DxfEntity {
  type: string;
  layer?: string;
  vertices?: DxfVertex[];
  // 3DFACE corners
  x?: number;
  y?: number;
  // MESH (SubD)
  points?: { x: number; y: number; z: number }[];
  faces?: number[][];
}

interface MeshBuilder {
  name: string;
  positions: number[];
  index: number[];
}

function newMesh(name: string): MeshBuilder {
  return { name, positions: [], index: [] };
}

function finish(builders: MeshBuilder[]): ParsedMesh[] {
  return builders
    .filter((b) => b.index.length > 0)
    .map((b) => ({
      name: b.name,
      position: Float32Array.from(b.positions),
      index: Uint32Array.from(b.index),
      normal: undefined,
      color: null,
    }));
}

/** Builds triangles from a POLYLINE polyface mesh (vertices + face records). */
function fromPolyface(entity: DxfEntity, name: string): MeshBuilder | null {
  const verts = entity.vertices ?? [];
  const geom = verts.filter((v) => v.faceA === undefined);
  const faces = verts.filter((v) => v.faceA !== undefined);
  if (geom.length === 0 || faces.length === 0) return null;

  const mesh = newMesh(name);
  for (const g of geom) mesh.positions.push(g.x ?? 0, g.y ?? 0, g.z ?? 0);

  // Face indices are 1-based; sign marks edge visibility (ignore it). A missing
  // or zero 4th index means the face is a triangle, otherwise a quad.
  const tri = (a: number, b: number, c: number) => {
    const A = Math.abs(a) - 1;
    const B = Math.abs(b) - 1;
    const C = Math.abs(c) - 1;
    const n = geom.length;
    if (A < 0 || B < 0 || C < 0 || A >= n || B >= n || C >= n) return;
    mesh.index.push(A, B, C);
  };
  for (const f of faces) {
    const a = f.faceA ?? 0;
    const b = f.faceB ?? 0;
    const c = f.faceC ?? 0;
    const d = f.faceD ?? 0;
    if (!a || !b || !c) continue;
    tri(a, b, c);
    if (Math.abs(d) > 0) tri(a, c, d);
  }
  return mesh.index.length > 0 ? mesh : null;
}

/** Builds triangles from a SubD MESH entity (explicit points + face lists). */
function fromMesh(entity: DxfEntity, name: string): MeshBuilder | null {
  const pts = entity.points ?? [];
  const faces = entity.faces ?? [];
  if (pts.length === 0 || faces.length === 0) return null;
  const mesh = newMesh(name);
  for (const p of pts) mesh.positions.push(p.x, p.y, p.z);
  for (const f of faces) {
    // Each face is a list of vertex indices (0-based); fan-triangulate.
    for (let i = 2; i < f.length; i += 1) {
      mesh.index.push(f[0], f[i - 1], f[i]);
    }
  }
  return mesh.index.length > 0 ? mesh : null;
}

export async function parseDwg(buffer: ArrayBuffer): Promise<ParsedModel> {
  const [libMod, parserMod] = await Promise.all([
    import("@mlightcad/libredwg-web"),
    import("dxf-parser"),
  ]);
  const { LibreDwg } = libMod;
  const DxfParser = parserMod.default;

  const lib = await LibreDwg.create(WASM_DIR);
  const dxfBytes = lib.dwg_write_dxf(buffer);
  if (!dxfBytes) {
    throw new Error("This file could not be read as a DWG.");
  }
  const dxfText = new TextDecoder("latin1").decode(dxfBytes);

  const parsed = new DxfParser().parseSync(dxfText) as {
    entities?: DxfEntity[];
  };
  const entities = parsed?.entities ?? [];

  const builders: MeshBuilder[] = [];
  const faceSink = newMesh("3D Faces");
  let partIndex = 0;

  for (const entity of entities) {
    const label = entity.layer || `Part ${partIndex + 1}`;
    if (entity.type === "POLYLINE") {
      const mesh = fromPolyface(entity, label);
      if (mesh) {
        builders.push(mesh);
        partIndex += 1;
      }
    } else if (entity.type === "MESH") {
      const mesh = fromMesh(entity, label);
      if (mesh) {
        builders.push(mesh);
        partIndex += 1;
      }
    } else if (entity.type === "3DFACE") {
      // 3DFACEs are individual quads/tris; collect them into one part.
      const base = faceSink.positions.length / 3;
      const c = entity as unknown as {
        x?: number;
        y?: number;
        z?: number;
        vertices?: { x: number; y: number; z: number }[];
      };
      const corners = c.vertices;
      if (corners && corners.length >= 3) {
        for (const p of corners) faceSink.positions.push(p.x, p.y, p.z);
        faceSink.index.push(base, base + 1, base + 2);
        if (corners.length >= 4) {
          faceSink.index.push(base, base + 2, base + 3);
        }
      }
    }
  }
  if (faceSink.index.length > 0) builders.push(faceSink);

  const meshes = finish(builders);
  if (meshes.length === 0) {
    throw new Error(
      "No displayable 3D mesh geometry was found in this DWG. DWG solids (ACIS) can't be tessellated in the browser — export the model to STEP or a mesh format instead.",
    );
  }
  return { meshes };
}
