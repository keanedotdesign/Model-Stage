"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { useSelectionStore } from "./selection-store";

export function Viewer() {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      frameloop="always"
      gl={{
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        // Rolls highlights off gracefully and preserves material color instead
        // of clipping bright speculars to white (ACES).
        toneMapping: THREE.NeutralToneMapping,
      }}
      onPointerMissed={() => useSelectionStore.getState().clear()}
    >
      <Scene />
    </Canvas>
  );
}
