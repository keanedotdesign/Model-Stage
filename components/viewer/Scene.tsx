"use client";

import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useFrame, useStore, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Grid,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { useViewerStore } from "@/lib/store";
import { Model } from "./Model";
import { SceneController } from "./SceneController";
import { useCameraStore } from "./camera-store";
import {
  useBackgroundSettings,
  useCameraSettings,
  useControlSettings,
  useHelperSettings,
  useLightSettings,
} from "./settings";

/** Builds a vertical gradient as a canvas-backed texture for scene.background. */
function makeGradientTexture(top: string, bottom: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Applies the solid/gradient background + environment intensity to the scene. */
function SceneBackground() {
  const { backgroundMode, background, gradientTop, gradientBottom, envIntensity } =
    useBackgroundSettings();
  const scene = useThree((s) => s.scene);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    textureRef.current?.dispose();
    textureRef.current = null;
    if (backgroundMode === "gradient") {
      const texture = makeGradientTexture(gradientTop, gradientBottom);
      textureRef.current = texture;
      scene.background = texture;
    } else {
      scene.background = new THREE.Color(background);
    }
  }, [scene, backgroundMode, background, gradientTop, gradientBottom]);

  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    scene.environmentIntensity = envIntensity;
  }, [scene, envIntensity]);

  return null;
}

function Lights() {
  const { ambient, keyLight } = useLightSettings();
  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight position={[6, 10, 8]} intensity={keyLight} />
      <directionalLight position={[-8, 5, -6]} intensity={keyLight * 0.35} />
    </>
  );
}

/**
 * Procedural studio environment. Memoized with no props so it renders its
 * lightformers into the cubemap exactly once and never rebuilds on control
 * changes — the main source of slider jitter.
 */
const StudioEnvironment = memo(function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer
        intensity={2.2}
        rotation-x={Math.PI / 2}
        position={[0, 6, -9]}
        scale={[12, 12, 1]}
      />
      <Lightformer
        intensity={1}
        rotation-y={Math.PI / 2}
        position={[-6, 2, 0]}
        scale={[12, 4, 1]}
        color="#c9d6ff"
      />
      <Lightformer
        intensity={1.1}
        rotation-y={-Math.PI / 2}
        position={[6, 4, 2]}
        scale={[12, 4, 1]}
        color="#fff4e6"
      />
      <Lightformer
        intensity={0.6}
        rotation-x={-Math.PI / 2}
        position={[0, -6, 0]}
        scale={[12, 12, 1]}
      />
    </Environment>
  );
});

function niceStep(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / pow;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * pow;
}

function Helpers({
  groupRef,
  modelSize,
}: {
  groupRef: RefObject<THREE.Group | null>;
  modelSize: THREE.Vector3 | null;
}) {
  const { grid, gridColor, shadow, shadowOpacity } = useHelperSettings();
  const maxDim = modelSize ? Math.max(modelSize.x, modelSize.y, modelSize.z) : 1;
  const groundY = modelSize ? -modelSize.y / 2 : 0;
  const cell = niceStep(maxDim / 12);

  return (
    <group ref={groupRef}>
      {grid && modelSize && (
        <Grid
          position={[0, groundY, 0]}
          args={[maxDim * 4, maxDim * 4]}
          cellSize={cell}
          cellThickness={0.6}
          cellColor={gridColor}
          sectionSize={cell * 5}
          sectionThickness={1}
          sectionColor={gridColor}
          fadeDistance={maxDim * 8}
          fadeStrength={1.5}
          infiniteGrid
          followCamera={false}
        />
      )}
      {shadow && modelSize && (
        <ContactShadows
          position={[0, groundY - maxDim * 0.001, 0]}
          scale={maxDim * 3}
          far={maxDim * 2}
          blur={2.6}
          opacity={shadowOpacity}
          resolution={1024}
          color="#000000"
        />
      )}
    </group>
  );
}

/**
 * Owns the default camera imperatively. drei's camera components re-apply their
 * static props on every re-render, which clobbers the imperative `frameCamera`
 * fit (leaving the model unframed and its projection matrix inconsistent, which
 * breaks orthographic raycasting). Managing the camera by hand keeps the fit
 * authoritative and the projection matrix fresh for picking.
 */
function Cameras({ modelSize }: { modelSize: THREE.Vector3 | null }) {
  const { projection, fov } = useCameraSettings();
  const handles = useViewerStore((s) => s.handles);
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);
  const cameraRef = useRef<
    THREE.OrthographicCamera | THREE.PerspectiveCamera | null
  >(null);

  // Create (or swap) the default camera when the projection changes.
  useLayoutEffect(() => {
    let camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
    if (projection === "orthographic") {
      camera = new THREE.OrthographicCamera(
        size.width / -2,
        size.width / 2,
        size.height / 2,
        size.height / -2,
        0.01,
        100000,
      );
      camera.zoom = 40;
    } else {
      camera = new THREE.PerspectiveCamera(
        fov,
        size.width / size.height,
        0.01,
        100000,
      );
    }
    camera.position.set(12, 10, 12);
    camera.updateProjectionMatrix();
    cameraRef.current = camera;
    set({ camera });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, set]);

  // Keep frustum/aspect synced to the viewport, preserving the fitted zoom.
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = size.width / -2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = size.height / -2;
    } else {
      camera.aspect = size.width / size.height;
    }
    camera.updateProjectionMatrix();
  }, [size]);

  // Field of view (perspective only).
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov]);

  // Frame a freshly loaded model from an isometric angle. Deferred to a frame
  // so the camera + controls are guaranteed ready before fitting.
  useEffect(() => {
    if (!modelSize || !handles) return;
    const id = requestAnimationFrame(() => handles.frameView("iso"));
    return () => cancelAnimationFrame(id);
  }, [modelSize, handles]);

  // Re-fit when switching projection or field of view (skip initial mount).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!modelSize || !handles) return;
    const id = requestAnimationFrame(() => handles.fitView());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, fov]);

  return null;
}

function Controls() {
  const { projection, autoRotate, autoRotateSpeed } = useControlSettings();
  return (
    <OrbitControls
      key={projection}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
    />
  );
}

/**
 * Two-way bridge between the camera-pose sliders and the live OrbitControls
 * camera: applies slider commands, and (throttled) reports the live pose back
 * so the sliders track manual orbiting.
 */
function CameraBridge() {
  const store = useStore();
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const { camera, controls } = store.getState();
    const orbit = controls as unknown as
      | { target: THREE.Vector3; update: () => void }
      | null;
    if (!orbit) return;
    const target = orbit.target;

    const pending = useCameraStore.getState().consume();
    if (pending) {
      // Angle: orbit around the vertical axis (keep radius + height).
      if (pending.angle !== undefined) {
        const hx = camera.position.x - target.x;
        const hz = camera.position.z - target.z;
        const radius = Math.hypot(hx, hz);
        const a = (pending.angle * Math.PI) / 180;
        camera.position.x = target.x + radius * Math.sin(a);
        camera.position.z = target.z + radius * Math.cos(a);
      }
      // Height: raise / lower the camera.
      if (pending.height !== undefined) {
        camera.position.y = target.y + pending.height;
      }
      // Distance: dolly along the line of sight (push / pull). Orthographic
      // cameras don't change size with distance, so scale the zoom to match.
      if (pending.distance !== undefined) {
        const offset = camera.position.clone().sub(target);
        const oldDistance = offset.length() || 1e-3;
        const newDistance = Math.max(pending.distance, 1e-3);
        const scale = newDistance / oldDistance;
        offset.multiplyScalar(scale);
        camera.position.copy(target).add(offset);
        const ortho = camera as THREE.OrthographicCamera;
        if (ortho.isOrthographicCamera) {
          ortho.zoom = ortho.zoom / scale;
          ortho.updateProjectionMatrix();
        }
      }
      orbit.update();
      return;
    }

    // Throttle live read-back to a few times per second.
    elapsed.current += delta;
    if (elapsed.current < 0.15) return;
    elapsed.current = 0;

    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    const distance = camera.position.distanceTo(target);
    const height = camera.position.y - target.y;
    const angle = (Math.atan2(dx, dz) * 180) / Math.PI;
    const s = useCameraStore.getState();
    if (
      Math.abs(distance - s.distance) > 1e-3 ||
      Math.abs(height - s.height) > 1e-3 ||
      Math.abs(angle - s.angle) > 1e-2
    ) {
      s.setLive({ distance, height, angle });
    }
  });

  return null;
}

export function Scene() {
  const spinRef = useRef<THREE.Group>(null);
  const helpersRef = useRef<THREE.Group>(null);
  const [modelSize, setModelSize] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (modelSize) {
      useViewerStore.getState().setModelRadius(modelSize.length() / 2);
    }
  }, [modelSize]);

  return (
    <>
      <Cameras modelSize={modelSize} />
      <SceneBackground />
      <Lights />
      <StudioEnvironment />

      <group ref={spinRef}>
        <Model onBounds={setModelSize} />
      </group>

      <Helpers groupRef={helpersRef} modelSize={modelSize} />
      <Controls />
      <CameraBridge />

      <SceneController
        spinRef={spinRef}
        helpersRef={helpersRef}
        modelSize={modelSize}
      />
    </>
  );
}
