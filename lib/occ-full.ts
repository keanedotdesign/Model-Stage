/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Loads the full OpenCascade (opencascade.js) WASM engine. Unlike the small
 * occt-import-js reader used for viewing, this build can *write* STEP, which we
 * use to export an edited model (visible parts only) while preserving the
 * original parametric B-rep geometry.
 *
 * It's a ~65MB wasm, so it's loaded lazily (only when the user exports STEP)
 * and via a <script> tag from /occt-full/ — keeping it out of the bundler, the
 * same way occt.ts loads the reader. The glue is fetched from /public and the
 * wasm is fetched by emscripten's own locateFile.
 */

const SCRIPT_SRC = "/occt-full/opencascade.js";
const WASM_URL = "/occt-full/opencascade.wasm.wasm";

/** The OpenCascade module is a huge auto-generated embind surface; we type it
 * loosely and rely on the specific calls in export-step.ts. */
export type OccModule = any;

type OccFactory = (opts?: {
  locateFile?: (path: string) => string;
}) => Promise<OccModule>;

declare global {
  interface Window {
    occFullFactory?: OccFactory;
  }
}

let scriptPromise: Promise<void> | null = null;
let modulePromise: Promise<OccModule> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("STEP export is only available in the browser."));
      return;
    }
    if (window.occFullFactory) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Failed to load the CAD engine."));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

export function getOcc(): Promise<OccModule> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
    await loadScript();
    const factory = window.occFullFactory;
    if (!factory) throw new Error("The CAD engine failed to initialize.");
    return factory({
      locateFile: (path) => (path.endsWith(".wasm") ? WASM_URL : path),
    });
  })();
  return modulePromise;
}
