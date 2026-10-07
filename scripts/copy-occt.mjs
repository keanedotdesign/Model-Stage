import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();

// --- occt-import-js (STEP import / tessellation) --------------------------
const src = join(cwd, "node_modules", "occt-import-js", "dist");
const dest = join(cwd, "public", "occt");
const files = ["occt-import-js.js", "occt-import-js.wasm"];

mkdirSync(dest, { recursive: true });
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log(`[copy-occt] copied ${files.length} file(s) to public/occt`);

// --- opencascade.js (full OCCT, for STEP export) --------------------------
// The npm package ships the emscripten glue as an ES module (`export default`).
// We load it via a classic <script> tag (mirroring occt-import-js) to keep the
// 65MB wasm out of the bundler, so rewrite that one line into a global.
const ocSrc = join(cwd, "node_modules", "opencascade.js", "dist");
const ocDest = join(cwd, "public", "occt-full");
mkdirSync(ocDest, { recursive: true });

const glue = readFileSync(join(ocSrc, "opencascade.wasm.js"), "utf8").replace(
  /export default opencascade;\s*$/,
  "globalThis.occFullFactory = opencascade;\n",
);
writeFileSync(join(ocDest, "opencascade.js"), glue);
copyFileSync(
  join(ocSrc, "opencascade.wasm.wasm"),
  join(ocDest, "opencascade.wasm.wasm"),
);
console.log("[copy-occt] copied 2 file(s) to public/occt-full");

// --- libredwg-web (DWG import) --------------------------------------------
// LibreDwg.create(filepath) fetches the wasm from `${filepath}/libredwg-web.wasm`
// at runtime, so stage the wasm in /public where we point it (/libredwg).
const dwgSrc = join(cwd, "node_modules", "@mlightcad", "libredwg-web", "wasm");
const dwgDest = join(cwd, "public", "libredwg");
mkdirSync(dwgDest, { recursive: true });
copyFileSync(
  join(dwgSrc, "libredwg-web.wasm"),
  join(dwgDest, "libredwg-web.wasm"),
);
console.log("[copy-occt] copied 1 file(s) to public/libredwg");
