import type { HumanAtlasSceneId } from "../data/human-atlas";

export type HumanSignalPosition = readonly [number, number, number];
export type HumanSignalZone = { positions: Float32Array; linePositions: Float32Array };
export type HumanSignalGeometry = {
  bodyPositions: Float32Array;
  linePositions: Float32Array;
  zones: Record<HumanAtlasSceneId, HumanSignalZone>;
};

export const HUMAN_SIGNAL_BOUNDS = { minY: -2.8, maxY: 2.8, maxX: 1.4, maxZ: 0.45 } as const;
export const HUMAN_SIGNAL_CENTERS: Record<HumanAtlasSceneId, readonly HumanSignalPosition[]> = {
  breath: [[-0.06, 1.15, 0.18]],
  strength: [[-0.82, 1, 0], [0.82, 1, 0], [-0.29, -1.05, 0.04], [0.29, -1.05, 0.04]],
  sleep: [[0, 2.35, 0.06]],
  energy: [[0, 0.15, 0.18]],
};

// t, centre XYZ, rayon transversal, profondeur. Des profils continus évitent
// les articulations sphériques et les cylindres rigides d’un mannequin mécanique.
type SectionKnot = readonly [number, number, number, number, number, number];
type Surface = (t: number, angle: number) => HumanSignalPosition;

const TURN = Math.PI * 2;
const torso: readonly SectionKnot[] = [
  [0, 0, 1.9, 0, 0.16, 0.15],
  [0.045, 0, 1.79, 0, 0.41, 0.19],
  [0.105, 0, 1.64, 0, 0.58, 0.24],
  [0.21, 0, 1.38, 0, 0.55, 0.28],
  [0.385, 0, 0.95, 0.015, 0.49, 0.27],
  [0.575, 0, 0.48, 0.025, 0.4, 0.23],
  [0.735, 0, 0.08, 0.02, 0.44, 0.25],
  [0.845, 0, -0.2, 0, 0.49, 0.27],
  [0.94, 0, -0.43, 0, 0.29, 0.2],
  [1, 0, -0.57, 0, 0.045, 0.065],
];
const arm: readonly SectionKnot[] = [
  [0, 0.37, 1.74, 0, 0.045, 0.1],
  [0.09, 0.59, 1.56, 0, 0.17, 0.17],
  [0.17, 0.7, 1.34, 0, 0.175, 0.18],
  [0.4, 0.86, 0.84, 0, 0.135, 0.14],
  [0.5, 0.9, 0.64, 0.01, 0.13, 0.125],
  [0.66, 1, 0.31, 0.02, 0.105, 0.12],
  [0.81, 1.08, 0.01, 0.025, 0.072, 0.078],
  [0.86, 1.1, -0.12, 0.025, 0.067, 0.07],
  [0.91, 1.13, -0.26, 0.025, 0.092, 0.058],
  [1, 1.16, -0.55, 0.035, 0.015, 0.02],
];
const leg: readonly SectionKnot[] = [
  [0, 0.255, -0.26, 0, 0.245, 0.245],
  [0.12, 0.26, -0.53, 0, 0.235, 0.24],
  [0.34, 0.285, -1.05, 0.025, 0.185, 0.185],
  [0.5, 0.32, -1.44, 0.035, 0.135, 0.14],
  [0.65, 0.355, -1.8, 0, 0.16, 0.16],
  [0.83, 0.38, -2.21, -0.005, 0.1, 0.11],
  [1, 0.39, -2.6, 0.015, 0.075, 0.085],
];

function sectionAt(profile: readonly SectionKnot[], t: number): number[] {
  const bounded = Math.max(0, Math.min(1, t));
  let index = 0;
  while (index < profile.length - 2 && bounded > profile[index + 1][0]) index += 1;
  const before = profile[Math.max(0, index - 1)];
  const start = profile[index];
  const end = profile[index + 1];
  const after = profile[Math.min(profile.length - 1, index + 2)];
  const span = end[0] - start[0];
  const u = (bounded - start[0]) / span;
  const square = u * u;
  const cube = square * u;
  const result: number[] = [];
  for (let axis = 1; axis < 6; axis += 1) {
    const incoming = ((end[axis] - before[axis]) / (end[0] - before[0])) * span;
    const outgoing = ((after[axis] - start[axis]) / (after[0] - start[0])) * span;
    result.push(
      (2 * cube - 3 * square + 1) * start[axis]
      + (cube - 2 * square + u) * incoming
      + (-2 * cube + 3 * square) * end[axis]
      + (cube - square) * outgoing,
    );
  }
  return result;
}

function tube(profile: readonly SectionKnot[], side = 1): Surface {
  return (t, angle) => {
    const [x, y, z, width, depth] = sectionAt(profile, t);
    const before = sectionAt(profile, t - 0.002);
    const after = sectionAt(profile, t + 0.002);
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    const cross = Math.max(0.003, width) * Math.cos(angle);
    return [side * (x + (dy / length) * cross), y - (dx / length) * cross, z + Math.max(0.003, depth) * Math.sin(angle)];
  };
}

function ellipsoid(center: HumanSignalPosition, radii: HumanSignalPosition): Surface {
  return (t, angle) => {
    const latitude = (t - 0.5) * Math.PI;
    const ring = Math.cos(latitude);
    return [center[0] + radii[0] * ring * Math.cos(angle), center[1] + radii[1] * Math.sin(latitude), center[2] + radii[2] * ring * Math.sin(angle)];
  };
}

function addSurface(
  positions: number[], lines: number[], surface: Surface,
  rings: number, samples: number, crossSections: readonly number[],
): void {
  for (let ring = 0; ring < rings; ring += 1) {
    const t = (ring + 0.5) / rings;
    // Décalage régulier entre anneaux : surface douce, sans grille orthogonale rigide.
    const stagger = ((ring * 0.61803398875) % 1) * (TURN / samples);
    for (let sample = 0; sample < samples; sample += 1) positions.push(...surface(t, (sample / samples) * TURN + stagger));
    if (ring > 0) {
      for (let contour = 0; contour < 4; contour += 1) {
        const angle = (contour / 4) * TURN;
        lines.push(...surface((ring - 0.5) / rings, angle), ...surface(t, angle));
      }
    }
  }
  for (const t of crossSections) {
    for (let sample = 0; sample < samples; sample += 1) lines.push(...surface(t, (sample / samples) * TURN), ...surface(t, ((sample + 1) / samples) * TURN));
  }
}

function buildZone(centers: readonly HumanSignalPosition[], radii: HumanSignalPosition, count: number): HumanSignalZone {
  const positions: number[] = [];
  const lines: number[] = [];
  for (const center of centers) {
    for (let index = 0; index < count; index += 1) {
      const y = 1 - (2 * (index + 0.5)) / count;
      const angle = index * 2.399963229728653;
      const ring = Math.sqrt(1 - y * y);
      const radius = 0.35 + 0.65 * Math.cbrt(((index * 37) % count + 0.5) / count);
      positions.push(center[0] + radii[0] * ring * Math.cos(angle) * radius, center[1] + radii[1] * y * radius, center[2] + radii[2] * ring * Math.sin(angle) * radius);
    }
    for (let plane = 0; plane < 3; plane += 1) {
      for (let sample = 0; sample < 24; sample += 1) {
        for (const endpoint of [sample, sample + 1]) {
          const angle = (endpoint / 24) * TURN;
          const point = [...center];
          const axisA = plane;
          const axisB = (plane + 1) % 3;
          point[axisA] += Math.cos(angle) * radii[axisA];
          point[axisB] += Math.sin(angle) * radii[axisB];
          lines.push(...point);
        }
      }
    }
  }
  return { positions: new Float32Array(positions), linePositions: new Float32Array(lines) };
}

/** Silhouette stylisée de face ; repères narratifs, sans précision anatomique clinique. */
export function buildHumanSignalGeometry(): HumanSignalGeometry {
  const positions: number[] = [];
  const lines: number[] = [];
  const skull = ellipsoid([0, 2.37, 0.02], [0.3, 0.4, 0.29]);
  const head: Surface = (t, angle) => {
    const [x, y, z] = skull(t, angle);
    const jaw = 0.84 + 0.16 * Math.min(1, t * 2.5);
    const nose = 0.028 * Math.exp(-(((y - 2.36) / 0.12) ** 2)) * Math.max(0, Math.sin(angle)) ** 12;
    return [x * jaw, y, z + nose];
  };
  addSurface(positions, lines, head, 18, 20, [0.36, 0.67]);
  addSurface(positions, lines, tube([
    [0, 0, 2.075, 0, 0.125, 0.135],
    [0.5, 0, 1.975, -0.005, 0.12, 0.13],
    [1, 0, 1.86, 0, 0.17, 0.155],
  ]), 5, 16, [0.5]);
  addSurface(positions, lines, tube(torso), 28, 28, [0.3, 0.63, 0.84]);
  for (const side of [-1, 1]) {
    addSurface(positions, lines, tube(arm, side), 24, 12, [0.5, 0.86]);
    addSurface(positions, lines, tube(leg, side), 30, 16, [0.5, 0.87]);
    addSurface(positions, lines, ellipsoid([side * 0.39, -2.66, 0.13], [0.125, 0.09, 0.255]), 8, 12, [0.5]);
    addSurface(positions, lines, tube([
      [0, 1.075, -0.14, 0.035, 0.04, 0.04],
      [0.5, 1.035, -0.24, 0.07, 0.035, 0.035],
      [1, 1.025, -0.33, 0.075, 0.012, 0.018],
    ], side), 6, 8, [0.5]);
  }
  return {
    bodyPositions: new Float32Array(positions),
    linePositions: new Float32Array(lines),
    zones: {
      breath: buildZone(HUMAN_SIGNAL_CENTERS.breath, [0.29, 0.29, 0.1], 72),
      strength: buildZone(HUMAN_SIGNAL_CENTERS.strength, [0.085, 0.23, 0.085], 24),
      sleep: buildZone(HUMAN_SIGNAL_CENTERS.sleep, [0.23, 0.24, 0.18], 64),
      energy: buildZone(HUMAN_SIGNAL_CENTERS.energy, [0.23, 0.28, 0.11], 72),
    },
  };
}
