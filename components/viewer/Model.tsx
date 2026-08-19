"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useViewerStore } from "@/lib/store";
import { useModelSettings, type ModelSettings } from "./settings";
import {
  HIGHLIGHT_COLOR,
  modeFromModifiers,
  useSelectionStore,
} from "./selection-store";
import { usePartsStore } from "./parts-store";

interface BuiltPart {
  geometry: THREE.BufferGeometry;
  color: [number, number, number] | null;
  /** Center of this part relative to the whole model's center. */
  offset: THREE.Vector3;
  /** Geometry centroid in mesh-local coords (for the emissive light). */
  localCenter: THREE.Vector3;
  name: string;
}

interface BuiltModel {
  parts: BuiltPart[];
  center: THREE.Vector3;
  size: THREE.Vector3;
}

const EXPLODE_STRENGTH = 1.4;
/** Opacity of non-selected parts while a part is selected. */
const DIM_OPACITY = 0.12;

function Part({
  part,
  index,
  settings,
}: {
  part: BuiltPart;
  index: number;
  settings: ModelSettings;
}) {
  const isSelected = useSelectionStore((s) => s.selected.includes(index));
  const isHovered = useSelectionStore((s) => s.hovered === index);
  const hasSelection = useSelectionStore((s) => s.selected.length > 0);
  const select = useSelectionStore((s) => s.select);
  const hover = useSelectionStore((s) => s.hover);
  const edit = usePartsStore((s) => s.edits[index]);
  const modelRadius = useViewerStore((s) => s.modelRadius) || 1;

  const position = useMemo(
    () => part.offset.clone().multiplyScalar(settings.explode * EXPLODE_STRENGTH),
    [part, settings.explode],
  );

  const color = useMemo(() => {
    if (edit?.color) return new THREE.Color(edit.color);
    if (settings.colorMode === "original" && part.color) {
      return new THREE.Color(part.color[0], part.color[1], part.color[2]);
    }
    return new THREE.Color(settings.color);
  }, [edit?.color, settings.colorMode, settings.color, part.color]);

  // Removed parts are hidden from the view (and excluded from export).
  if (edit?.hidden) return null;

  // Per-part material overrides fall back to the global settings.
  const metalness = edit?.metalness ?? settings.metalness;
  const roughness = edit?.roughness ?? settings.roughness;
  const baseOpacity = edit?.opacity ?? settings.opacity;
  const emissive = edit?.emissive ?? settings.emissive;
  const emissiveIntensity = edit?.emissiveIntensity ?? settings.emissiveIntensity;
  const castLight = edit?.castLight ?? settings.castLight;
  const lightStrength = edit?.lightStrength ?? settings.lightStrength;

  // When "highlight selection" is on, fade the other parts back so the selected
  // one reads cleanly. Off by default.
  const dimmed = settings.highlightSelection && hasSelection && !isSelected;
  const opacity = dimmed ? DIM_OPACITY : baseOpacity;
  const showHover = isHovered && !dimmed;

  return (
    <mesh
      geometry={part.geometry}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        const n = e.nativeEvent;
        select(index, modeFromModifiers(n.shiftKey, n.metaKey, n.ctrlKey));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(index);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        // Remount when flat shading toggles so three recompiles the material.
        key={settings.flatShading ? "flat" : "smooth"}
        color={color}
        metalness={metalness}
        roughness={roughness}
        transparent={dimmed || baseOpacity < 1}
        opacity={opacity}
        depthWrite={!dimmed}
        wireframe={settings.wireframe}
        flatShading={settings.flatShading}
        side={THREE.DoubleSide}
        envMapIntensity={1}
        emissive={showHover ? HIGHLIGHT_COLOR : emissive}
        emissiveIntensity={showHover ? 0.16 : emissiveIntensity}
      />
      {settings.edges && !settings.wireframe && (
        <Edges threshold={20} color={settings.edgeColor} />
      )}
      {castLight && (
        <pointLight
          position={[part.localCenter.x, part.localCenter.y, part.localCenter.z]}
          color={emissive}
          intensity={lightStrength * modelRadius * modelRadius}
          distance={modelRadius * 8}
          decay={2}
        />
      )}
    </mesh>
  );
}

export function Model({
  onBounds,
}: {
  onBounds: (size: THREE.Vector3) => void;
}) {
  const settings = useModelSettings();
  const model = useViewerStore((s) => s.model);

  const built = useMemo<BuiltModel | null>(() => {
    if (!model) return null;

    const box = new THREE.Box3();
    const parts: BuiltPart[] = model.meshes.map((mesh) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(mesh.position, 3),
      );
      if (mesh.normal) {
        geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normal, 3));
      }
      geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));
      if (!mesh.normal) geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const partCenter = new THREE.Vector3();
      geometry.boundingBox?.getCenter(partCenter);
      if (geometry.boundingBox) box.union(geometry.boundingBox);

      return {
        geometry,
        color: mesh.color,
        offset: partCenter,
        localCenter: partCenter.clone(),
        name: mesh.name,
      };
    });

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Re-express each part's center relative to the model center.
    parts.forEach((p) => p.offset.sub(center));

    return { parts, center, size };
  }, [model]);

  useEffect(() => {
    if (built) onBounds(built.size.clone());
  }, [built, onBounds]);

  useEffect(() => {
    return () => {
      built?.parts.forEach((p) => p.geometry.dispose());
    };
  }, [built]);

  // Clear selection + part edits when a new model loads.
  useEffect(() => {
    useSelectionStore.getState().clear();
    useSelectionStore.getState().hover(null);
    usePartsStore.getState().reset();
  }, [built]);

  if (!built) return null;

  return (
    <group
      position={[-built.center.x, -built.center.y, -built.center.z]}
    >
      {built.parts.map((part, i) => (
        <Part key={i} part={part} index={i} settings={settings} />
      ))}
    </group>
  );
}
