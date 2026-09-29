export const HUMAN_SIGNAL_FLOW_STRANDS = 28;
export const HUMAN_SIGNAL_FLOW_SEGMENTS = 64;
export const HUMAN_SIGNAL_FLOW_POSITION_COUNT = HUMAN_SIGNAL_FLOW_STRANDS * HUMAN_SIGNAL_FLOW_SEGMENTS * 2 * 3;
export const HUMAN_SIGNAL_MOTION_PERIOD = 12;
export const HUMAN_SIGNAL_FLOW_BOUNDS = { maxX: 1.6, maxZ: 0.65, minY: -2.78, maxY: 2.78 } as const;

export type HumanSignalMotion = {
  rotation: [number, number, number];
  scale: number;
  cameraPush: number;
  envelope: number;
};

const TURN = Math.PI * 2;
const FLOW_BOTTOM = -2.78;
const FLOW_TOP = 2.78;
// Hauteur, largeur, profondeur : deux jambes, bassin, épaules, cou puis crâne.
// Le flux enveloppe ces repères sans modifier les points du corps.
const PROFILE: readonly (readonly [number, number, number])[] = [
  [-2.78, 0.5, 0.24],
  [-2.55, 0.52, 0.24],
  [-2.2, 0.51, 0.22],
  [-1.8, 0.53, 0.24],
  [-1.35, 0.5, 0.23],
  [-0.85, 0.56, 0.29],
  [-0.2, 0.6, 0.31],
  [0.4, 0.57, 0.29],
  [1.1, 0.68, 0.34],
  [1.58, 0.8, 0.35],
  [1.82, 0.54, 0.26],
  [2.03, 0.23, 0.18],
  [2.35, 0.32, 0.31],
  [2.6, 0.28, 0.25],
  [2.78, 0.07, 0.08],
];
// Hauteur, rayon X, rayon Z, écart au centre : deux enveloppes distinctes sous le bassin.
const LEG_PROFILE: readonly (readonly [number, number, number, number])[] = [
  [-2.78, 0.1, 0.2, 0.39],
  [-2.45, 0.105, 0.11, 0.385],
  [-2.1, 0.135, 0.14, 0.37],
  [-1.75, 0.18, 0.18, 0.345],
  [-1.4, 0.155, 0.15, 0.32],
  [-1, 0.22, 0.22, 0.31],
  [-0.4, 0.24, 0.25, 0.26],
];

function boundedProgress(progress: number): number {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

function timePhase(timeSeconds: number): number {
  if (!Number.isFinite(timeSeconds)) return 0;
  return (((timeSeconds % HUMAN_SIGNAL_MOTION_PERIOD) + HUMAN_SIGNAL_MOTION_PERIOD) % HUMAN_SIGNAL_MOTION_PERIOD) / HUMAN_SIGNAL_MOTION_PERIOD * TURN;
}

function envelopeAt(progress: number, phase: number): number {
  const opening = Math.sin(progress * Math.PI);
  return 0.25 + 0.55 * opening * opening + 0.05 * (1 + Math.sin(phase * 2));
}

function radiusAt(y: number, axis: 1 | 2): number {
  let index = 0;
  while (index < PROFILE.length - 2 && y > PROFILE[index + 1][0]) index += 1;
  const start = PROFILE[index];
  const end = PROFILE[index + 1];
  const t = Math.max(0, Math.min(1, (y - start[0]) / (end[0] - start[0])));
  const smooth = t * t * (3 - 2 * t);
  return start[axis] + (end[axis] - start[axis]) * smooth;
}

function legAt(y: number, axis: 1 | 2 | 3): number {
  let index = 0;
  while (index < LEG_PROFILE.length - 2 && y > LEG_PROFILE[index + 1][0]) index += 1;
  const start = LEG_PROFILE[index];
  const end = LEG_PROFILE[index + 1];
  const t = Math.max(0, Math.min(1, (y - start[0]) / (end[0] - start[0])));
  const smooth = t * t * (3 - 2 * t);
  return start[axis] + (end[axis] - start[axis]) * smooth;
}

/** cameraPush est une fraction de la distance de cadrage ; envelope est normalisée. */
export function sampleHumanSignalMotion(progress: number, timeSeconds: number, target?: HumanSignalMotion): HumanSignalMotion {
  const p = boundedProgress(progress);
  const phase = timePhase(timeSeconds);
  const opening = Math.sin(p * Math.PI);
  const result = target ?? { rotation: [0, 0, 0], scale: 1, cameraPush: 0, envelope: 0 };
  result.rotation[0] = Math.sin(phase) * 0.045;
  result.rotation[1] = TURN * p + Math.sin(phase) * 0.24;
  result.rotation[2] = Math.sin(phase * 2) * 0.025;
  result.scale = 1 + Math.sin(phase * 2) * 0.014;
  result.cameraPush = opening * opening * (0.075 + 0.012 * (1 - Math.cos(phase * 2)));
  result.envelope = envelopeAt(p, phase);
  return result;
}

/**
 * Écriture en place de paires XYZ pour LineSegments, sans allocation par image.
 * Les ondes progressent vers le haut en six secondes et reviennent sans couture.
 * Les écarts latéraux animés restent inférieurs à 0,15 unité autour du profil.
 */
export function writeHumanSignalFlow(target: Float32Array, progress: number, timeSeconds: number): void {
  if (target.length < HUMAN_SIGNAL_FLOW_POSITION_COUNT) {
    throw new RangeError(`Le tampon doit contenir au moins ${HUMAN_SIGNAL_FLOW_POSITION_COUNT} valeurs.`);
  }
  const p = boundedProgress(progress);
  const phase = timePhase(timeSeconds);
  const envelope = envelopeAt(p, phase);
  for (let strand = 0; strand < HUMAN_SIGNAL_FLOW_STRANDS; strand += 1) {
    const longitude = strand / HUMAN_SIGNAL_FLOW_STRANDS * TURN;
    const start = strand * HUMAN_SIGNAL_FLOW_SEGMENTS * 6;
    for (let point = 0; point <= HUMAN_SIGNAL_FLOW_SEGMENTS; point += 1) {
      const t = point / HUMAN_SIGNAL_FLOW_SEGMENTS;
      const height = FLOW_BOTTOM + (FLOW_TOP - FLOW_BOTTOM) * t;
      const taper = Math.sin(t * Math.PI);
      const wave = Math.sin(height * 3.5 - phase * 2 + longitude);
      const angle = longitude + (height - FLOW_BOTTOM) * (0.28 + p * 0.16) + wave * 0.06;
      const expansion = envelope * taper;
      // Écart X maximal : 0,8 × 0,06 + 0,9 × 0,065 + 0,04 = 0,1465.
      let x = (radiusAt(height, 1) + expansion * 0.065) * Math.cos(angle) + wave * taper * 0.04;
      const y = height + Math.sin(height * 2.1 - phase * 2) * taper * 0.035;
      let z = (radiusAt(height, 2) + expansion * 0.06) * Math.sin(angle) + Math.cos(height * 2.6 - phase * 2 + longitude) * taper * 0.055;
      if (height < -0.4) {
        const side = strand < HUMAN_SIGNAL_FLOW_STRANDS / 2 ? 1 : -1;
        const localAngle = longitude * 2 + (height - FLOW_BOTTOM) * (0.28 + p * 0.16) + wave * 0.06;
        const legX = side * legAt(height, 3)
          + (legAt(height, 1) + expansion * 0.015) * Math.cos(localAngle) + wave * taper * 0.018;
        const legZ = (legAt(height, 2) + expansion * 0.015) * Math.sin(localAngle)
          + Math.cos(height * 2.6 - phase * 2 + longitude) * taper * 0.025;
        const blend = Math.max(0, Math.min(1, (-0.4 - height) / 0.6));
        const smooth = blend * blend * (3 - 2 * blend);
        x += (legX - x) * smooth;
        z += (legZ - z) * smooth;
      }
      if (point < HUMAN_SIGNAL_FLOW_SEGMENTS) {
        const offset = start + point * 6;
        target[offset] = x;
        target[offset + 1] = y;
        target[offset + 2] = z;
      }
      if (point > 0) {
        const offset = start + (point - 1) * 6 + 3;
        target[offset] = x;
        target[offset + 1] = y;
        target[offset + 2] = z;
      }
    }
  }
}
