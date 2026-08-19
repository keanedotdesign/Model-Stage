import * as THREE from "three";
import type { ViewDirection } from "./types";

const DIRECTIONS: Record<ViewDirection, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
  bottom: new THREE.Vector3(0, -1, 0),
  iso: new THREE.Vector3(1, 0.8, 1).normalize(),
};

export function directionFor(view: ViewDirection): THREE.Vector3 {
  return DIRECTIONS[view].clone();
}

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

/**
 * Positions and zooms an orthographic or perspective camera so a model of the
 * given size (centered at the origin) fits the viewport from `dir`. Works by
 * projecting the model's bounding box onto the camera's screen axes.
 */
export function frameCamera(
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
  controls: ControlsLike,
  size: THREE.Vector3,
  viewport: { width: number; height: number },
  dir: THREE.Vector3,
  margin = 1.2,
): void {
  const radius = size.length() / 2 || 1;
  const distance = radius * 4 + 1;
  const normalizedDir = dir.clone().normalize();

  const isVertical = Math.abs(normalizedDir.y) > 0.99;
  const up = isVertical
    ? new THREE.Vector3(0, 0, normalizedDir.y > 0 ? -1 : 1)
    : new THREE.Vector3(0, 1, 0);

  camera.up.copy(up);
  camera.position.copy(normalizedDir.clone().multiplyScalar(distance));
  controls.target.set(0, 0, 0);

  // Screen-space basis for the current viewing direction.
  const zAxis = camera.position.clone().normalize();
  const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

  const half = size.clone().multiplyScalar(0.5);
  let maxX = 1e-4;
  let maxY = 1e-4;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner = new THREE.Vector3(
          sx * half.x,
          sy * half.y,
          sz * half.z,
        );
        maxX = Math.max(maxX, Math.abs(corner.dot(xAxis)));
        maxY = Math.max(maxY, Math.abs(corner.dot(yAxis)));
      }
    }
  }
  const worldWidth = maxX * 2;
  const worldHeight = maxY * 2;

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera;
    // drei's OrthographicCamera frustum is sized in CSS pixels, so the visible
    // world span along an axis equals viewportPx / zoom.
    const zoomX = viewport.width / (worldWidth * margin);
    const zoomY = viewport.height / (worldHeight * margin);
    ortho.zoom = Math.min(zoomX, zoomY);
    ortho.near = 0.01;
    ortho.far = distance + radius * 6;
  } else {
    const persp = camera as THREE.PerspectiveCamera;
    const vFov = (persp.fov * Math.PI) / 180;
    const distForHeight = worldHeight / 2 / Math.tan(vFov / 2);
    const distForWidth = worldWidth / 2 / Math.tan(vFov / 2) / persp.aspect;
    const needed = Math.max(distForHeight, distForWidth) * margin + radius;
    persp.position.copy(normalizedDir.clone().multiplyScalar(needed));
    persp.near = Math.max(needed * 0.01, 0.01);
    persp.far = needed + radius * 8;
  }

  camera.updateProjectionMatrix();
  controls.update();
}
