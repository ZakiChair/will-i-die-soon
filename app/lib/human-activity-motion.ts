import type { HumanAtlasSceneId } from "../data/human-atlas";

export const HUMAN_ACTIVITY_JOINTS = {
  hips: 0, spine: 1, chest: 2, neck: 3, head: 4,
  leftShoulder: 5, leftElbow: 6, leftWrist: 7,
  rightShoulder: 8, rightElbow: 9, rightWrist: 10,
  leftHip: 11, leftKnee: 12, leftAnkle: 13,
  rightHip: 14, rightKnee: 15, rightAnkle: 16,
} as const;

export const HUMAN_ACTIVITY_MEASURES = {
  upperArm: 0.82, forearm: 0.76, thigh: 1.15, shin: 1.1,
  hipsToShoulders: 1.38, hipsToNeck: 1.6, neckToHead: 0.38,
  shoulderHalfWidth: 0.52, hipHalfWidth: 0.25,
} as const;

export const HUMAN_ACTIVITY_FLOOR_Y = -2.7;
export const HUMAN_ACTIVITY_BAR = {
  length: 6.1, plateRadius: 0.625, gripHalfWidth: 0.6,
  plates: [
    { kilograms: 20, offset: 2.22, thickness: 0.12, color: "#2664c5" },
    { kilograms: 25, offset: 2.51, thickness: 0.16, color: "#d53649" },
  ],
} as const;
export const HUMAN_ACTIVITY_PERIODS = { sleep: 4.5, breath: 1, strength: 3, energy: 4 } as const;
export const HUMAN_ACTIVITY_BOUNDS = {
  minX: -3.2, maxX: 3.2, minY: -2.8, maxY: 2.35, minZ: -2.75, maxZ: 3,
} as const;
export const HUMAN_ACTIVITY_PROPS = {
  bed: { position: [0, -2.28, 0.12], size: [1.8, 0.5, 5.3] },
  table: { position: [0, -0.68, 1.08], size: [1.7, 0.12, 1] },
  chair: { position: [0, -1.68, -0.25], size: [1.1, 0.18, 1] },
  plate: { position: [0, -0.54, 0.87] },
} as const;

export type HumanActivityPose = {
  joints: Float32Array;
  bar: [number, number, number];
  faceDirection: [number, number, number];
  props: { bed: number; barbell: number; table: number; track: number };
};

const J = HUMAN_ACTIVITY_JOINTS;
const M = HUMAN_ACTIVITY_MEASURES;
const TAU = Math.PI * 2;
const ANKLE_Y = -2.6;
const ARM_LENGTH = M.upperArm + M.forearm;
const BAR_Z = 0.33;
const BAR_BOTTOM_Y = HUMAN_ACTIVITY_FLOOR_Y + HUMAN_ACTIVITY_BAR.plateRadius;
const BAR_BOTTOM_HINGE = 1.35;
const STANDING_HIP_Y = ANKLE_Y + M.thigh + M.shin;
const ARM_DROP = Math.sqrt(ARM_LENGTH ** 2 - (HUMAN_ACTIVITY_BAR.gripHalfWidth - M.shoulderHalfWidth) ** 2 - (BAR_Z - 0.09) ** 2);
const BOTTOM_HIP_Y = BAR_BOTTOM_Y + ARM_DROP - M.hipsToShoulders * Math.cos(BAR_BOTTOM_HINGE);

/** Coordonnées stylisées en unités de scène ; les poses ne constituent pas un guide d'exercice. */
export function createHumanActivityPose(): HumanActivityPose {
  const pose: HumanActivityPose = {
    joints: new Float32Array(17 * 3), bar: [0, BAR_BOTTOM_Y, BAR_Z], faceDirection: [0, 0, 1],
    props: { bed: 0, barbell: 0, table: 0, track: 0 },
  };
  return sampleHumanActivityPose("sleep", 0, pose);
}

function put(joints: Float32Array, joint: number, x: number, y: number, z: number): void {
  const index = joint * 3;
  joints[index] = x;
  joints[index + 1] = y;
  joints[index + 2] = z;
}

/** Résout le coude ou le genou dans le plan indiqué, sans allouer de vecteur. */
function bend(joints: Float32Array, root: number, middle: number, end: number,
  firstLength: number, secondLength: number, hintX: number, hintY: number, hintZ: number): void {
  const rootIndex = root * 3, endIndex = end * 3;
  const rootX = joints[rootIndex], rootY = joints[rootIndex + 1], rootZ = joints[rootIndex + 2];
  let dx = joints[endIndex] - rootX, dy = joints[endIndex + 1] - rootY, dz = joints[endIndex + 2] - rootZ;
  const distance = Math.max(0.000001, Math.hypot(dx, dy, dz));
  dx /= distance; dy /= distance; dz /= distance;
  const along = (firstLength ** 2 - secondLength ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, firstLength ** 2 - along ** 2));
  const dot = hintX * dx + hintY * dy + hintZ * dz;
  let bx = hintX - dot * dx, by = hintY - dot * dy, bz = hintZ - dot * dz;
  let perpendicular = Math.hypot(bx, by, bz);
  if (perpendicular < 0.000001) {
    bx = dy; by = -dx; bz = 0;
    perpendicular = Math.hypot(bx, by);
    if (perpendicular < 0.000001) { bx = 1; by = 0; perpendicular = 1; }
  }
  put(joints, middle, rootX + along * dx + height * bx / perpendicular,
    rootY + along * dy + height * by / perpendicular, rootZ + along * dz + height * bz / perpendicular);
}

function torso(joints: Float32Array, x: number, y: number, z: number, lean: number, headLean = lean): void {
  const c = Math.cos(lean), s = Math.sin(lean);
  put(joints, J.hips, x, y, z);
  put(joints, J.leftHip, x - M.hipHalfWidth, y, z);
  put(joints, J.rightHip, x + M.hipHalfWidth, y, z);
  put(joints, J.spine, x, y + 0.58 * c, z + 0.58 * s);
  put(joints, J.chest, x, y + 1.22 * c, z + 1.22 * s);
  put(joints, J.leftShoulder, x - M.shoulderHalfWidth, y + M.hipsToShoulders * c, z + M.hipsToShoulders * s);
  put(joints, J.rightShoulder, x + M.shoulderHalfWidth, y + M.hipsToShoulders * c, z + M.hipsToShoulders * s);
  const neckY = y + M.hipsToNeck * c, neckZ = z + M.hipsToNeck * s;
  put(joints, J.neck, x, neckY, neckZ);
  put(joints, J.head, x, neckY + M.neckToHead * Math.cos(headLean), neckZ + M.neckToHead * Math.sin(headLean));
}

function sleep(pose: HumanActivityPose, phase: number): void {
  const joints = pose.joints, breath = Math.sin(phase), y = -1.76;
  put(joints, J.hips, 0, y, 0);
  put(joints, J.spine, 0, y + 0.006 * breath, -0.58);
  put(joints, J.chest, 0, y + 0.014 * breath, -1.22);
  put(joints, J.neck, 0, y + 0.005 * breath, -1.6);
  put(joints, J.head, 0, y + 0.12 + 0.005 * breath, -1.6 - Math.sqrt(M.neckToHead ** 2 - 0.12 ** 2));
  for (let side = -1; side <= 1; side += 2) {
    const left = side < 0;
    const hip = left ? J.leftHip : J.rightHip, knee = left ? J.leftKnee : J.rightKnee, ankle = left ? J.leftAnkle : J.rightAnkle;
    const shoulder = left ? J.leftShoulder : J.rightShoulder, elbow = left ? J.leftElbow : J.rightElbow, wrist = left ? J.leftWrist : J.rightWrist;
    put(joints, hip, side * M.hipHalfWidth, y, 0);
    const kneeY = y + M.thigh * Math.sin(0.1), kneeZ = M.thigh * Math.cos(0.1);
    put(joints, knee, side * M.hipHalfWidth, kneeY, kneeZ);
    put(joints, ankle, side * M.hipHalfWidth, kneeY - M.shin * Math.sin(0.06), kneeZ + M.shin * Math.cos(0.06));
    put(joints, shoulder, side * M.shoulderHalfWidth, y + 0.01 * breath, -1.38);
    put(joints, wrist, side * 0.59, y + 0.08, 0.16);
    bend(joints, shoulder, elbow, wrist, M.upperArm, M.forearm, side, 0.2, 0);
  }
  pose.faceDirection[1] = 1;
  pose.faceDirection[2] = 0;
  pose.props.bed = 1;
}

function run(pose: HumanActivityPose, phase: number): void {
  const joints = pose.joints, x = 0.03 * Math.sin(phase);
  torso(joints, x, -0.6 + 0.08 * Math.cos(phase * 2), 0, 0.18);
  for (let side = -1; side <= 1; side += 2) {
    const left = side < 0, legPhase = phase + (left ? 0 : Math.PI);
    const hip = left ? J.leftHip : J.rightHip, knee = left ? J.leftKnee : J.rightKnee, ankle = left ? J.leftAnkle : J.rightAnkle;
    const shoulder = left ? J.leftShoulder : J.rightShoulder, elbow = left ? J.leftElbow : J.rightElbow, wrist = left ? J.leftWrist : J.rightWrist;
    put(joints, ankle, x + side * M.hipHalfWidth, ANKLE_Y + 0.95 * Math.max(0, Math.sin(legPhase)) ** 2, -0.7 * Math.cos(legPhase));
    bend(joints, hip, knee, ankle, M.thigh, M.shin, 0, 0, 1);
    const armAngle = side * 0.75 * Math.sin(phase), index = shoulder * 3;
    const elbowY = joints[index + 1] - M.upperArm * Math.cos(armAngle), elbowZ = joints[index + 2] + M.upperArm * Math.sin(armAngle);
    put(joints, elbow, joints[index], elbowY, elbowZ);
    put(joints, wrist, joints[index], elbowY - M.forearm * Math.cos(armAngle + 1.65), elbowZ + M.forearm * Math.sin(armAngle + 1.65));
  }
  pose.props.track = 1;
}

function deadlift(pose: HumanActivityPose, phase: number): void {
  const joints = pose.joints, lift = (1 - Math.cos(phase)) / 2, lean = BAR_BOTTOM_HINGE * (1 - lift);
  const hipY = BOTTOM_HIP_Y + (STANDING_HIP_Y - BOTTOM_HIP_Y) * lift;
  torso(joints, 0, hipY, 0.09 - M.hipsToShoulders * Math.sin(lean), lean, lean - 0.08 * (1 - lift));
  const barY = hipY + M.hipsToShoulders * Math.cos(lean) - ARM_DROP;
  pose.bar[1] = barY;
  for (let side = -1; side <= 1; side += 2) {
    const left = side < 0;
    const hip = left ? J.leftHip : J.rightHip, knee = left ? J.leftKnee : J.rightKnee, ankle = left ? J.leftAnkle : J.rightAnkle;
    const shoulder = left ? J.leftShoulder : J.rightShoulder, elbow = left ? J.leftElbow : J.rightElbow, wrist = left ? J.leftWrist : J.rightWrist;
    put(joints, ankle, side * M.hipHalfWidth, ANKLE_Y, 0.09);
    bend(joints, hip, knee, ankle, M.thigh, M.shin, 0, 0, 1);
    put(joints, wrist, side * HUMAN_ACTIVITY_BAR.gripHalfWidth, barY, BAR_Z);
    const index = shoulder * 3, fraction = M.upperArm / ARM_LENGTH;
    put(joints, elbow, joints[index] + (side * HUMAN_ACTIVITY_BAR.gripHalfWidth - joints[index]) * fraction,
      joints[index + 1] + (barY - joints[index + 1]) * fraction, joints[index + 2] + (BAR_Z - joints[index + 2]) * fraction);
  }
  pose.props.barbell = 1;
}

function eat(pose: HumanActivityPose, phase: number): void {
  const joints = pose.joints, lift = (1 - Math.cos(phase)) / 2;
  const headLean = 0.08 + 0.03 * lift;
  torso(joints, 0, -1.5, -0.25, 0.08, headLean);
  for (let side = -1; side <= 1; side += 2) {
    const left = side < 0;
    put(joints, left ? J.leftKnee : J.rightKnee, side * M.hipHalfWidth, -1.5, 0.9);
    put(joints, left ? J.leftAnkle : J.rightAnkle, side * M.hipHalfWidth, ANKLE_Y, 0.9);
  }
  put(joints, J.leftWrist, -0.34, -0.5, 0.8);
  const head = J.head * 3;
  const mouthY = joints[head + 1] - 0.15 * Math.cos(headLean) - 0.291 * Math.sin(headLean);
  const mouthZ = joints[head + 2] - 0.15 * Math.sin(headLean) + 0.291 * Math.cos(headLean);
  // La cible temporaire est la pointe de cuillère ; la main recule ensuite de sa longueur.
  put(joints, J.rightWrist, 0.1 * (1 - lift),
    -0.43 + (mouthY + 0.43) * lift + 0.1 * Math.sin(Math.PI * lift), 0.87 + (mouthZ - 0.87) * lift);
  bend(joints, J.leftShoulder, J.leftElbow, J.leftWrist, M.upperArm, M.forearm, -1, -1, 0.2);
  bend(joints, J.rightShoulder, J.rightElbow, J.rightWrist, M.upperArm, M.forearm + 0.34, 1, -1, 0.2);
  const wrist = J.rightWrist * 3, elbow = J.rightElbow * 3, fraction = M.forearm / (M.forearm + 0.34);
  for (let axis = 0; axis < 3; axis++) {
    joints[wrist + axis] = joints[elbow + axis] + (joints[wrist + axis] - joints[elbow + axis]) * fraction;
  }
  pose.props.table = 1;
}

/** Écrit une boucle déterministe dans la cible ; aucun tableau ni objet créé par image. */
export function sampleHumanActivityPose(scene: HumanAtlasSceneId, timeSeconds: number, target: HumanActivityPose): HumanActivityPose {
  const action = scene === "sleep" || scene === "strength" || scene === "energy" ? scene : "breath";
  const period = HUMAN_ACTIVITY_PERIODS[action];
  const time = Number.isFinite(timeSeconds) ? timeSeconds % period : 0;
  const phase = ((time + period) % period) / period * TAU;
  target.bar[0] = 0; target.bar[1] = BAR_BOTTOM_Y; target.bar[2] = BAR_Z;
  target.faceDirection[0] = 0; target.faceDirection[1] = 0; target.faceDirection[2] = 1;
  target.props.bed = 0; target.props.barbell = 0; target.props.table = 0; target.props.track = 0;
  if (action === "sleep") sleep(target, phase);
  else if (action === "strength") deadlift(target, phase);
  else if (action === "energy") eat(target, phase);
  else run(target, phase);
  return target;
}
