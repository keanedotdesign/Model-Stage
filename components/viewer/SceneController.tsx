"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useStore } from "@react-three/fiber";
import {
  useViewerStore,
  type PngExportOptions,
  type VideoExportOptions,
  type ViewerHandles,
} from "@/lib/store";
import type { ViewDirection } from "@/lib/types";
import { directionFor, frameCamera } from "@/lib/camera";
import { baseName, downloadBlob, downloadUrl } from "@/lib/download";
import { pickVideoMime } from "@/lib/video";
import { useSettingsStore } from "./settings";

interface OrbitControlsLike {
  target: THREE.Vector3;
  update: () => void;
  enabled: boolean;
  autoRotate: boolean;
}

/**
 * Bridges the R3F scene out to the rest of the app. It registers the view and
 * export handles into the zustand store so UI outside the <Canvas> (toolbar,
 * export dialog) can drive the renderer imperatively.
 */
export function SceneController({
  spinRef,
  helpersRef,
  modelSize,
}: {
  spinRef: RefObject<THREE.Group | null>;
  helpersRef: RefObject<THREE.Group | null>;
  modelSize: THREE.Vector3 | null;
}) {
  const store = useStore();
  const setHandles = useViewerStore((s) => s.setHandles);
  const setRecording = useViewerStore((s) => s.setRecording);
  const setProgress = useViewerStore((s) => s.setProgress);

  const sizeRef = useRef(modelSize);
  sizeRef.current = modelSize;

  useEffect(() => {
    const applyView = (view?: ViewDirection) => {
      const { camera, controls, size } = store.getState();
      const modelBounds = sizeRef.current;
      const orbit = controls as unknown as OrbitControlsLike | null;
      if (!modelBounds || !orbit) return;

      const dir = view
        ? directionFor(view)
        : camera.position.clone().sub(orbit.target).normalize();

      frameCamera(
        camera as THREE.OrthographicCamera | THREE.PerspectiveCamera,
        orbit,
        modelBounds,
        { width: size.width, height: size.height },
        dir,
      );
    };

    const currentFileName = () =>
      baseName(useViewerStore.getState().fileName);

    const capturePng = async (options: PngExportOptions) => {
      const { gl, scene, camera } = store.getState();
      const helpers = helpersRef.current;

      const prevBackground = scene.background;
      const prevAlpha = gl.getClearAlpha();
      const prevRatio = gl.getPixelRatio();
      const prevHelpersVisible = helpers?.visible ?? true;

      if (options.transparent) {
        scene.background = null;
        gl.setClearAlpha(0);
        if (helpers) helpers.visible = false;
      }
      gl.setPixelRatio(Math.max(1, options.scale));
      gl.render(scene, camera);

      const url = gl.domElement.toDataURL("image/png");

      gl.setPixelRatio(prevRatio);
      scene.background = prevBackground;
      gl.setClearAlpha(prevAlpha);
      if (helpers) helpers.visible = prevHelpersVisible;
      gl.render(scene, camera);

      const suffix = options.transparent ? "-transparent" : "";
      downloadUrl(url, `${currentFileName()}${suffix}.png`);
    };

    const captureVideo = async (options: VideoExportOptions) => {
      const { gl, scene, camera, controls } = store.getState();
      const spin = spinRef.current;
      const orbit = controls as unknown as OrbitControlsLike | null;
      if (!spin) return;

      const prevAutoRotate = orbit?.autoRotate ?? false;
      const prevEnabled = orbit?.enabled ?? true;
      const prevRotation = spin.rotation.y;

      // Capture the current background (solid or gradient) and grid as-is. A
      // full rotation is exactly one turn over `duration`; otherwise match the
      // viewer's auto-rotate speed (≈ one orbit / 30s at speed 2).
      const autoRotateSpeed =
        useSettingsStore.getState().settings.autoRotateSpeed;
      const twoPi = Math.PI * 2;
      const totalAngle = options.fullRotation
        ? twoPi
        : twoPi * (autoRotateSpeed / 60) * options.duration;

      if (orbit) {
        orbit.autoRotate = false;
        orbit.enabled = false;
      }
      spin.rotation.y = 0;

      const { mimeType, extension } = pickVideoMime();
      const stream = gl.domElement.captureStream(options.fps);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 16_000_000,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      setRecording(true);
      recorder.start();

      const durationMs = options.duration * 1000;
      const startTime = performance.now();
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const t = Math.min((now - startTime) / durationMs, 1);
          spin.rotation.y = options.direction * totalAngle * t;
          gl.render(scene, camera);
          setProgress(t);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });

      recorder.stop();
      const blob = await finished;

      // Restore the interactive scene.
      spin.rotation.y = prevRotation;
      if (orbit) {
        orbit.autoRotate = prevAutoRotate;
        orbit.enabled = prevEnabled;
      }
      setRecording(false);
      setProgress(0);

      downloadBlob(blob, `${currentFileName()}-360.${extension}`);
    };

    const handles: ViewerHandles = {
      fitView: () => applyView(),
      frameView: (view) => applyView(view),
      resetView: () => applyView("iso"),
      capturePng,
      captureVideo,
    };
    setHandles(handles);
  }, [store, setHandles, setRecording, setProgress, spinRef, helpersRef]);

  return null;
}
