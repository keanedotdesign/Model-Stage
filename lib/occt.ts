import type { ParsedMesh, ParsedModel } from "./types";

/**
 * Loads the occt-import-js emscripten module from /public and parses STEP
 * files into plain typed-array meshes. The glue script is injected via a
 * <script> tag (rather than bundled) so the bundler never has to process the
 * emscripten output, and the .wasm is fetched from the same /occt/ folder.
 */

const SCRIPT_SRC = "/occt/occt-import-js.js";
const WASM_DIR = "/occt/";

interface OcctFaceColor {
  first: number;
  last: number;
  color: [number, number, number] | null;
}

interface OcctResultMesh {
  name?: string;
  attributes: {
    position: { array: number[] };
    normal?: { array: number[] };
  };
  index: { array: number[] };
  color?: [number, number, number];
  brep_faces?: OcctFaceColor[];
}

interface OcctResult {
  success: boolean;
  meshes: OcctResultMesh[];
}

interface OcctModule {
  ReadStepFile: (buffer: Uint8Array, params: unknown) => OcctResult;
}

type OcctFactory = (opts?: {
  locateFile?: (path: string) => string;
}) => Promise<OcctModule>;

declare global {
  interface Window {
    occtimportjs?: OcctFactory;
  }
}

let scriptPromise: Promise<void> | null = null;
let modulePromise: Promise<OcctModule> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("STEP parsing is only available in the browser."));
      return;
    }
    if (window.occtimportjs) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Failed to load the STEP engine."));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

function getModule(): Promise<OcctModule> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
    await loadScript();
    const factory = window.occtimportjs;
    if (!factory) throw new Error("The STEP engine failed to initialize.");
    return factory({ locateFile: (path) => WASM_DIR + path });
  })();
  return modulePromise;
}

/** Fire-and-forget: start fetching the wasm early so the first load is fast. */
export function warmupOcct(): void {
  void getModule().catch(() => {
    /* surfaced on first real parse */
  });
}

function firstFaceColor(mesh: OcctResultMesh): [number, number, number] | null {
  return mesh.brep_faces?.find((f) => f.color)?.color ?? null;
}

export async function parseStep(buffer: ArrayBuffer): Promise<ParsedModel> {
  const occt = await getModule();
  const data = new Uint8Array(buffer);
  const result = occt.ReadStepFile(data, null);

  if (!result || !result.success) {
    throw new Error("This file could not be read as a STEP model.");
  }

  const meshes: ParsedMesh[] = result.meshes
    .filter((m) => m.attributes?.position?.array?.length)
    .map((m, i) => ({
      name: m.name?.trim() || `Part ${i + 1}`,
      position: Float32Array.from(m.attributes.position.array),
      normal: m.attributes.normal
        ? Float32Array.from(m.attributes.normal.array)
        : undefined,
      index: Uint32Array.from(m.index.array),
      color: m.color ?? firstFaceColor(m),
    }));

  if (meshes.length === 0) {
    throw new Error("No 3D geometry was found in this file.");
  }

  return { meshes };
}
