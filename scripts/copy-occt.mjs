import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "node_modules", "occt-import-js", "dist");
const dest = join(process.cwd(), "public", "occt");
const files = ["occt-import-js.js", "occt-import-js.wasm"];

mkdirSync(dest, { recursive: true });
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file));
}

console.log(`[copy-occt] copied ${files.length} file(s) to public/occt`);
