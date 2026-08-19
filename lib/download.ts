export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Strips the extension so exports can be named after the source file. */
export function baseName(fileName: string | null): string {
  if (!fileName) return "model";
  return fileName.replace(/\.[^./\\]+$/, "") || "model";
}
