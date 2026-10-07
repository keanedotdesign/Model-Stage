/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ParsedModel } from "./types";
import type { PartEditMap } from "./export-model";
import { baseName, downloadBlob } from "./download";
import { getOcc, type OccModule } from "./occ-full";

/**
 * Exports the edited model as a real STEP file, preserving the original
 * parametric geometry (not the tessellated mesh). It re-reads the *original*
 * STEP bytes with the full OpenCascade engine, keeps only the solids that map
 * to still-visible parts, and writes them back out.
 *
 * Parts are matched between the viewer and OpenCascade by bounding-box center:
 * both the viewer meshes (from occt-import-js) and the solids here live in the
 * same model coordinates, and each part occupies a distinct location, so
 * nearest-center matching is exact. Names/colors are intentionally not written
 * — STEP has no concept of the PBR materials this app edits, and this build
 * only round-trips geometry.
 */

type Center = [number, number, number];

interface PartVis {
  index: number;
  center: Center;
  hidden: boolean;
}

/** Bounding-box center of a viewer part, from its raw vertex positions. */
function partCenters(model: ParsedModel, edits: PartEditMap): PartVis[] {
  return model.meshes.map((mesh, index) => {
    const p = mesh.position;
    let xmin = Infinity,
      ymin = Infinity,
      zmin = Infinity,
      xmax = -Infinity,
      ymax = -Infinity,
      zmax = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      xmin = Math.min(xmin, p[i]);
      xmax = Math.max(xmax, p[i]);
      ymin = Math.min(ymin, p[i + 1]);
      ymax = Math.max(ymax, p[i + 1]);
      zmin = Math.min(zmin, p[i + 2]);
      zmax = Math.max(zmax, p[i + 2]);
    }
    return {
      index,
      center: [(xmin + xmax) / 2, (ymin + ymax) / 2, (zmin + zmax) / 2],
      hidden: !!edits[index]?.hidden,
    };
  });
}

/** Bounding-box center of an OpenCascade shape. */
function shapeCenter(oc: OccModule, shape: any): Center {
  const box = new oc.Bnd_Box_1();
  oc.BRepBndLib.Add(shape, box, false);
  const lo = box.CornerMin();
  const hi = box.CornerMax();
  return [
    (lo.X() + hi.X()) / 2,
    (lo.Y() + hi.Y()) / 2,
    (lo.Z() + hi.Z()) / 2,
  ];
}

function nearestPart(parts: PartVis[], c: Center): PartVis | null {
  let best: PartVis | null = null;
  let bestDist = Infinity;
  for (const part of parts) {
    const dx = part.center[0] - c[0];
    const dy = part.center[1] - c[1];
    const dz = part.center[2] - c[2];
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = part;
    }
  }
  return best;
}

export async function exportStep(
  source: ArrayBuffer,
  model: ParsedModel,
  edits: PartEditMap,
  fileName: string | null,
): Promise<number> {
  const oc = await getOcc();
  const parts = partCenters(model, edits);

  // NOTE: OCCT's STEP reader is picky about the virtual filename — some names
  // (e.g. ones containing "model_in") make ReadFile fail. Stick to short,
  // plain names that are known to work.
  const IN = "src.step";
  const OUT = "out.step";
  oc.FS.createDataFile("/", IN, new Uint8Array(source), true, true, true);

  try {
    const reader = new oc.STEPControl_Reader_1();
    const status = reader.ReadFile(IN);
    // ReadFile returns an IFSelect_ReturnStatus enum object; compare by value.
    if (status.value !== oc.IFSelect_ReturnStatus.IFSelect_RetDone.value) {
      throw new Error("The original STEP file could not be re-read.");
    }
    reader.TransferRoots();
    const shape = reader.OneShape();

    const SOLID = oc.TopAbs_ShapeEnum.TopAbs_SOLID;
    const SHAPE = oc.TopAbs_ShapeEnum.TopAbs_SHAPE;
    const explorer = new oc.TopExp_Explorer_2(shape, SOLID, SHAPE);

    const builder = new oc.BRep_Builder();
    const compound = new oc.TopoDS_Compound();
    builder.MakeCompound(compound);

    let included = 0;
    for (; explorer.More(); explorer.Next()) {
      // Cast to a fresh TopoDS_Solid — Explorer.Current() hands back a shared
      // temporary that mutates on Next(), which would corrupt the compound.
      const solid = oc.TopoDS.Solid_1(explorer.Current());
      const match = nearestPart(parts, shapeCenter(oc, solid));
      if (match && !match.hidden) {
        builder.Add(compound, solid);
        included += 1;
      }
    }

    if (included === 0) {
      throw new Error(
        "No solid geometry matched the visible parts. STEP export currently supports solid models.",
      );
    }

    const writer = new oc.STEPControl_Writer_1();
    writer.Transfer(compound, oc.STEPControl_StepModelType.STEPControl_AsIs, true);
    writer.Write(OUT);

    const out: Uint8Array = oc.FS.readFile(OUT);
    // Copy into a standalone ArrayBuffer so the Blob doesn't hold a view into
    // the emscripten heap (which may be freed/resized later).
    const bytes = out.slice();
    downloadBlob(
      new Blob([bytes], { type: "application/step" }),
      `${baseName(fileName)}.step`,
    );
    return included;
  } finally {
    try {
      oc.FS.unlink(IN);
    } catch {
      /* ignore */
    }
    try {
      oc.FS.unlink(OUT);
    } catch {
      /* ignore */
    }
  }
}
