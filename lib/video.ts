export interface VideoMime {
  mimeType: string;
  extension: string;
}

const CANDIDATES: VideoMime[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

/** Picks the best MediaRecorder container this browser can actually produce. */
export function pickVideoMime(): VideoMime {
  if (typeof MediaRecorder !== "undefined") {
    for (const candidate of CANDIDATES) {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

export function isVideoExportSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

// Only WebM (VP8/VP9) preserves an alpha channel through MediaRecorder — MP4 /
// H.264 flattens it. Transparent exports must use one of these.
const ALPHA_CANDIDATES: VideoMime[] = [
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

/** Picks an alpha-capable WebM mime, or null if the browser can't produce one. */
export function pickAlphaVideoMime(): VideoMime | null {
  if (typeof MediaRecorder !== "undefined") {
    for (const candidate of ALPHA_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    }
  }
  return null;
}

export function isTransparentVideoSupported(): boolean {
  return isVideoExportSupported() && pickAlphaVideoMime() !== null;
}
