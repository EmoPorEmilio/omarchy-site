import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  Quaternion,
  StaticDrawUsage,
  Vector3,
} from "three/webgpu";

import { OMARCHY_LOGO_CELLS, OMARCHY_LOGO_GRID } from "../generated/omarchy-logo-voxels";
import { PORTAL_CENTER } from "./world-layout";
import { BRAND_COLORS } from "./world-materials";

export type PortalEffectState =
  | "dormant"
  | "loading"
  | "active"
  | "ready"
  | "connected"
  | "entering"
  | "landing"
  | "settling";

export interface PortalEffects {
  group: Group;
  setIdle(now: number): void;
  setState(state: PortalEffectState, energy?: number): void;
  dispose(): void;
}

function hash(index: number, salt: number) {
  const value = Math.sin(index * 91.733 + salt * 47.11) * 43758.5453;
  return value - Math.floor(value);
}

export function createPortalEffects(): PortalEffects {
  const group = new Group();
  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();

  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = 128;
  haloCanvas.height = 128;
  const haloContext = haloCanvas.getContext("2d");
  if (haloContext) {
    const haloGradient = haloContext.createRadialGradient(64, 64, 6, 64, 64, 62);
    haloGradient.addColorStop(0, "rgba(255,255,255,0.9)");
    haloGradient.addColorStop(0.42, "rgba(255,255,255,0.34)");
    haloGradient.addColorStop(1, "rgba(255,255,255,0)");
    haloContext.fillStyle = haloGradient;
    haloContext.fillRect(0, 0, 128, 128);
  }
  const haloTexture = new CanvasTexture(haloCanvas);
  const haloGeometry = new PlaneGeometry(5.2, 5.35);
  const haloMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.green),
    depthWrite: false,
    map: haloTexture,
    opacity: 0,
    side: DoubleSide,
    transparent: true,
  });
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.position.set(PORTAL_CENTER.x, PORTAL_CENTER.y - 0.02, PORTAL_CENTER.z - 0.48);
  group.add(halo);

  const traceGeometry = new BoxGeometry(1, 1, 1);
  const traceMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.green),
    depthWrite: false,
    opacity: 0.42,
    transparent: true,
  });
  const occupied = new Set<string>();
  for (let index = 0; index < OMARCHY_LOGO_CELLS.length; index += 2) {
    occupied.add(`${OMARCHY_LOGO_CELLS[index]},${OMARCHY_LOGO_CELLS[index + 1]}`);
  }
  const traceSegments: Array<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  }> = [];
  const spacing = 0.3;
  const xOrigin = PORTAL_CENTER.x - ((OMARCHY_LOGO_GRID.columns - 1) * spacing) / 2;
  const yOrigin = PORTAL_CENTER.y + ((OMARCHY_LOGO_GRID.rows - 1) * spacing) / 2;

  for (let index = 0; index < OMARCHY_LOGO_CELLS.length; index += 2) {
    const column = OMARCHY_LOGO_CELLS[index];
    const row = OMARCHY_LOGO_CELLS[index + 1];
    const x = xOrigin + column * spacing;
    const y = yOrigin - row * spacing;
    if (!occupied.has(`${column},${row - 1}`)) {
      traceSegments.push({
        x,
        y: y + spacing / 2,
        scaleX: spacing,
        scaleY: 0.025,
      });
    }
    if (!occupied.has(`${column},${row + 1}`)) {
      traceSegments.push({
        x,
        y: y - spacing / 2,
        scaleX: spacing,
        scaleY: 0.025,
      });
    }
    if (!occupied.has(`${column - 1},${row}`)) {
      traceSegments.push({
        x: x - spacing / 2,
        y,
        scaleX: 0.025,
        scaleY: spacing,
      });
    }
    if (!occupied.has(`${column + 1},${row}`)) {
      traceSegments.push({
        x: x + spacing / 2,
        y,
        scaleX: 0.025,
        scaleY: spacing,
      });
    }
  }

  const traces = new InstancedMesh(traceGeometry, traceMaterial, traceSegments.length);
  const traceMatrix = new Matrix4();
  for (let index = 0; index < traceSegments.length; index += 1) {
    const segment = traceSegments[index];
    position.set(segment.x, segment.y, PORTAL_CENTER.z + 0.43);
    scale.set(segment.scaleX, segment.scaleY, 0.028);
    traceMatrix.compose(position, rotation, scale);
    traces.setMatrixAt(index, traceMatrix);
  }
  traces.instanceMatrix.setUsage(StaticDrawUsage);
  traces.instanceMatrix.needsUpdate = true;
  group.add(traces);

  const veilGeometry = new PlaneGeometry(2.68, 2.78);
  const veilMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.green),
    depthWrite: false,
    opacity: 0,
    side: DoubleSide,
    transparent: true,
  });
  const veil = new Mesh(veilGeometry, veilMaterial);
  veil.position.set(PORTAL_CENTER.x, PORTAL_CENTER.y - 0.04, PORTAL_CENTER.z);
  group.add(veil);

  const depthGeometry = new PlaneGeometry(2.72, 2.82);
  const depthMaterial = new MeshBasicNodeMaterial({
    color: new Color(BRAND_COLORS.black),
    depthWrite: false,
    opacity: 0,
    side: DoubleSide,
    transparent: true,
  });
  const depth = new Mesh(depthGeometry, depthMaterial);
  depth.position.set(PORTAL_CENTER.x, PORTAL_CENTER.y - 0.04, PORTAL_CENTER.z - 0.22);
  group.add(depth);

  const streakCount = 48;
  const streakGeometry = new BoxGeometry(0.022, 0.2, 0.022);
  const streakMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.green),
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const streaks = new InstancedMesh(streakGeometry, streakMaterial, streakCount);
  for (let index = 0; index < streakCount; index += 1) {
    position.set(
      PORTAL_CENTER.x - 1.12 + hash(index, 1) * 2.24,
      PORTAL_CENTER.y - 1.23 + hash(index, 2) * 2.46,
      PORTAL_CENTER.z + (hash(index, 3) - 0.5) * 0.22,
    );
    scale.set(0.7 + hash(index, 4) * 0.7, 0.35 + hash(index, 5) * 2.2, 1);
    matrix.compose(position, rotation, scale);
    streaks.setMatrixAt(index, matrix);
  }

  streaks.instanceMatrix.setUsage(StaticDrawUsage);
  streaks.instanceMatrix.needsUpdate = true;
  group.add(streaks);

  const columnCount = 72;
  const columnGeometry = new BoxGeometry(0.024, 0.24, 0.024);
  const columnMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.blue),
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const column = new InstancedMesh(columnGeometry, columnMaterial, columnCount);
  for (let index = 0; index < columnCount; index += 1) {
    position.set(
      PORTAL_CENTER.x - 0.72 + hash(index, 8) * 1.44,
      -1.78 + hash(index, 9) * 6.9,
      PORTAL_CENTER.z + (hash(index, 10) - 0.5) * 0.38,
    );
    scale.set(0.7 + hash(index, 11), 0.55 + hash(index, 12) * 5.4, 1);
    matrix.compose(position, rotation, scale);
    column.setMatrixAt(index, matrix);
  }
  column.instanceMatrix.setUsage(StaticDrawUsage);
  column.instanceMatrix.needsUpdate = true;
  group.add(column);

  const chargeCount = 58;
  const chargeGeometry = new BoxGeometry(0.055, 0.055, 0.055);
  const chargeMaterial = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.green),
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const charge = new InstancedMesh(chargeGeometry, chargeMaterial, chargeCount);
  for (let index = 0; index < chargeCount; index += 1) {
    const edgeBias = hash(index, 21) > 0.48 ? 1 : 0.56;
    position.set(
      PORTAL_CENTER.x + (hash(index, 22) - 0.5) * 4.9 * edgeBias,
      PORTAL_CENTER.y + (hash(index, 23) - 0.5) * 5.05,
      PORTAL_CENTER.z + 0.24 + (hash(index, 24) - 0.5) * 0.76,
    );
    const particleScale = 0.5 + hash(index, 25) * 1.8;
    scale.set(particleScale, particleScale, particleScale);
    matrix.compose(position, rotation, scale);
    charge.setMatrixAt(index, matrix);
  }
  charge.instanceMatrix.setUsage(StaticDrawUsage);
  charge.instanceMatrix.needsUpdate = true;
  group.add(charge);

  const setState = (state: PortalEffectState, energy = 1) => {
    traces.visible = true;
    const blueState = state === "loading";
    traceMaterial.color.set(blueState ? BRAND_COLORS.blue : BRAND_COLORS.green);
    haloMaterial.color.set(blueState ? BRAND_COLORS.blue : BRAND_COLORS.green);
    columnMaterial.opacity = 0;
    chargeMaterial.opacity = 0;

    if (state === "dormant") {
      veilMaterial.opacity = 0;
      depthMaterial.opacity = 0;
      streakMaterial.opacity = 0;
      traceMaterial.opacity = 0.07;
      haloMaterial.opacity = 0;
      return;
    }

    if (state === "landing") {
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.opacity = 0.018;
      depthMaterial.opacity = 0.62;
      streakMaterial.opacity = 0.045;
      traceMaterial.opacity = 0.56;
      haloMaterial.opacity = 0.018;
      return;
    }

    if (state === "settling") {
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.green);
      traceMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.opacity = 0.12 * (1 - energy) + 0.018 * energy;
      depthMaterial.opacity = 0.5 * (1 - energy) + 0.62 * energy;
      streakMaterial.opacity = 0.62 * (1 - energy) + 0.045 * energy;
      traceMaterial.opacity = 0.94 * (1 - energy) + 0.56 * energy;
      haloMaterial.opacity = 0.09 * (1 - energy) + 0.018;
      return;
    }

    if (state === "loading") {
      veilMaterial.color.set(BRAND_COLORS.blue);
      streakMaterial.color.set(BRAND_COLORS.blue);
      veilMaterial.opacity = 0.008 + energy * 0.014;
      depthMaterial.opacity = 0.035;
      streakMaterial.opacity = 0.055 + energy * 0.11;
      traceMaterial.opacity = 0;
      columnMaterial.opacity = 0.12 + energy * 0.2;
      haloMaterial.opacity = 0.018;
    } else if (state === "active") {
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.turquoise);
      veilMaterial.opacity = 0.085;
      depthMaterial.opacity = 0.46;
      streakMaterial.opacity = 0.46;
      traceMaterial.opacity = 0.7;
      columnMaterial.color.set(BRAND_COLORS.green);
      columnMaterial.opacity = 0.035;
      chargeMaterial.color.set(BRAND_COLORS.green);
      chargeMaterial.opacity = 0.34;
      haloMaterial.opacity = 0.27;
    } else if (state === "ready") {
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.opacity = 0.075;
      depthMaterial.opacity = 0.58;
      streakMaterial.opacity = 0.44;
      traceMaterial.opacity = 0.88;
      chargeMaterial.color.set(BRAND_COLORS.green);
      chargeMaterial.opacity = 0.055;
      haloMaterial.opacity = 0.17;
    } else if (state === "connected") {
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.green);
      traceMaterial.color.set(BRAND_COLORS.green);
      haloMaterial.color.set(BRAND_COLORS.green);
      chargeMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.opacity = 0.012;
      depthMaterial.opacity = 0.12;
      streakMaterial.opacity = 0.085;
      traceMaterial.opacity = 0.24;
      chargeMaterial.opacity = 0.065;
      haloMaterial.opacity = 0.045;
    } else if (state === "entering") {
      traceMaterial.color.set(BRAND_COLORS.green);
      haloMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.color.set(BRAND_COLORS.green);
      streakMaterial.color.set(BRAND_COLORS.green);
      chargeMaterial.color.set(BRAND_COLORS.green);
      veilMaterial.opacity = 0.012 + energy * 0.09;
      depthMaterial.opacity = 0.12 + energy * 0.32;
      streakMaterial.opacity = 0.085 + energy * 0.42;
      traceMaterial.opacity = 0.24 + energy * 0.7;
      chargeMaterial.opacity = 0.065 * (1 - energy * 0.45);
      haloMaterial.opacity = 0.045 + energy * 0.18;
    } else {
      veilMaterial.color.set(BRAND_COLORS.blue);
      streakMaterial.color.set(BRAND_COLORS.blue);
      veilMaterial.opacity = 0.025;
      depthMaterial.opacity = 0.18;
      streakMaterial.opacity = 0.2;
      traceMaterial.opacity = 0.6;
      chargeMaterial.color.set(BRAND_COLORS.blue);
      chargeMaterial.opacity = 0.075;
      haloMaterial.opacity = 0.07;
    }
  };

  return {
    group,
    setIdle(now: number) {
      if (!group.visible) return;
      streakMaterial.opacity = 0.045 + Math.sin(now * 0.00058) * 0.008;
    },
    setState,
    dispose() {
      group.removeFromParent();
      streaks.dispose();
      traces.dispose();
      column.dispose();
      charge.dispose();
      traceGeometry.dispose();
      traceMaterial.dispose();
      columnGeometry.dispose();
      columnMaterial.dispose();
      chargeGeometry.dispose();
      chargeMaterial.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
      veilGeometry.dispose();
      veilMaterial.dispose();
      depthGeometry.dispose();
      depthMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      haloTexture.dispose();
    },
  };
}
