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
