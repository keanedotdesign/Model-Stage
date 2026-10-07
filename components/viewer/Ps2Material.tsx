"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * PS2 easter egg — a stylized material that renders the model like an
 * early-2000s console game, applied per-part (the scene stays full-res):
 *
 *  - Vertex snapping: clip-space positions are quantized to a coarse grid, so
 *    edges shimmer and "wobble" as the model turns — the signature PS1/PS2 look
 *    born from fixed-point vertex math.
 *  - Gouraud lighting: a fixed key/fill/ambient rig evaluated per-vertex and
 *    interpolated across the face, instead of per-pixel PBR.
 *  - Color banding: the lit color is posterized to a few levels to fake the
 *    limited color depth of the era.
 *
 * Raw ShaderMaterial output bypasses the renderer's color management, so the
 * final linear color is converted to sRGB by hand.
 */

const vertexShader = /* glsl */ `
  uniform float uSnap;
  varying float vLight;

  void main() {
    vec3 n = normalize(normalMatrix * normal);
    vec3 keyDir = normalize(vec3(0.4, 0.8, 0.6));
    vec3 fillDir = normalize(vec3(-0.5, 0.3, -0.4));
    float key = max(dot(n, keyDir), 0.0);
    float fill = max(dot(n, fillDir), 0.0) * 0.4;
    float ambient = 0.4;
    vLight = ambient + key + fill;

    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Quantize NDC to a coarse grid for the fixed-point vertex jitter.
    vec3 ndc = clip.xyz / clip.w;
    ndc.xy = floor(ndc.xy * uSnap) / uSnap;
    clip.xyz = ndc * clip.w;
    gl_Position = clip;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uLevels;
  varying float vLight;

  void main() {
    vec3 lit = uColor * vLight;
    lit = floor(lit * uLevels) / uLevels;      // posterize (low color depth)
    lit = pow(lit, vec3(0.4545));              // linear -> sRGB
    gl_FragColor = vec4(lit, uOpacity);
  }
`;

export function Ps2Material({
  color,
  opacity,
  wireframe,
}: {
  color: THREE.Color;
  opacity: number;
  wireframe: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: new THREE.Color() },
          uOpacity: { value: 1 },
          uLevels: { value: 6 },
          // Grid resolution: lower = wobblier. ~0.85x a 480-line frame.
          uSnap: { value: 100 },
        },
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  // Drive live values declaratively through R3F's pierced props so we never
  // mutate the memoized material by hand.
  return (
    <primitive
      object={material}
      attach="material"
      transparent={opacity < 1}
      wireframe={wireframe}
      uniforms-uColor-value={color}
      uniforms-uOpacity-value={opacity}
    />
  );
}
