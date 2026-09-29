import { describe, expect, it } from "vitest";

import { humanAtlasSceneIds } from "../data/human-atlas";
import {
  createHumanActivityPose, HUMAN_ACTIVITY_BOUNDS as B, HUMAN_ACTIVITY_JOINTS as J, HUMAN_ACTIVITY_MEASURES as M,
  HUMAN_ACTIVITY_PERIODS, sampleHumanActivityPose,
} from "./human-activity-motion";

type Pose = ReturnType<typeof createHumanActivityPose>;
const point = (pose: Pose, joint: keyof typeof J) => Array.from(pose.joints.slice(J[joint] * 3, J[joint] * 3 + 3));
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, i) => value - b[i]));
const poseAt = (scene: typeof humanAtlasSceneIds[number], time: number) => sampleHumanActivityPose(scene, time, createHumanActivityPose());
const spoonTip = (pose: Pose) => {
  const wrist = point(pose, "rightWrist"), elbow = point(pose, "rightElbow");
  return wrist.map((value, i) => value + (value - elbow[i]) * 0.34 / distance(wrist, elbow));
};

describe("human activity motion", () => {
  it("reuses every target buffer and keeps all four actions finite for malformed times", () => {
    const target = createHumanActivityPose();
    const { joints, bar, faceDirection, props } = target;
    for (const scene of humanAtlasSceneIds) for (const time of [0, 0.25, 1, 2.7, -1, 1e30, NaN, Infinity, -Infinity]) {
      expect(sampleHumanActivityPose(scene, time, target)).toBe(target);
      expect(target.joints).toBe(joints);
      expect(target.bar).toBe(bar);
      expect(target.faceDirection).toBe(faceDirection);
      expect(target.props).toBe(props);
      expect([...joints, ...bar, ...faceDirection, ...Object.values(props)].every(Number.isFinite)).toBe(true);
      expect(Object.values(props).every((value) => value >= 0 && value <= 1)).toBe(true);
      expect(Math.hypot(...faceDirection)).toBeCloseTo(1, 6);
    }
  });

  it("has deterministic continuous loops with the advertised action periods", () => {
    for (const scene of humanAtlasSceneIds) {
      const period = HUMAN_ACTIVITY_PERIODS[scene];
      expect(poseAt(scene, 0.23)).toEqual(poseAt(scene, 0.23));
      const start = poseAt(scene, 0), end = poseAt(scene, period);
      expect(start).toEqual(end);
      const before = poseAt(scene, period - 0.00001), after = poseAt(scene, 0.00001);
      expect(Math.max(...before.joints.map((value, i) => Math.abs(value - after.joints[i])))).toBeLessThan(0.001);
    }
  });

  it("preserves limb lengths through all actions", () => {
    for (const scene of humanAtlasSceneIds) for (let frame = 0; frame < 24; frame++) {
      const pose = poseAt(scene, frame * HUMAN_ACTIVITY_PERIODS[scene] / 24);
      for (const side of ["left", "right"] as const) {
        expect(distance(point(pose, `${side}Shoulder`), point(pose, `${side}Elbow`))).toBeCloseTo(M.upperArm, 4);
        expect(distance(point(pose, `${side}Elbow`), point(pose, `${side}Wrist`))).toBeCloseTo(M.forearm, 4);
        expect(distance(point(pose, `${side}Hip`), point(pose, `${side}Knee`))).toBeCloseTo(M.thigh, 4);
        expect(distance(point(pose, `${side}Knee`), point(pose, `${side}Ankle`))).toBeCloseTo(M.shin, 4);
      }
    }
  });

  it("sleeps horizontally on the bed with a small visible breath", () => {
    const pose = poseAt("sleep", 0);
    expect(pose.props.bed).toBe(1);
    expect(pose.faceDirection).toEqual([0, 1, 0]);
    expect(Math.abs(point(pose, "chest")[1] - point(pose, "hips")[1])).toBeLessThan(0.05);
    expect(point(pose, "head")[2]).toBeLessThan(-1.9);
    expect(point(pose, "leftAnkle")[2]).toBeGreaterThan(2);
    const rise = point(poseAt("sleep", HUMAN_ACTIVITY_PERIODS.sleep / 4), "chest")[1] - point(pose, "chest")[1];
    expect(rise).toBeGreaterThan(0.005);
    expect(rise).toBeLessThan(0.03);
  });

  it("runs with alternating lifted feet and opposing elbows", () => {
    const left = poseAt("breath", 0.25), right = poseAt("breath", 0.75);
    expect(left.props.track).toBe(1);
    expect(point(left, "leftAnkle")[1]).toBeGreaterThan(point(left, "rightAnkle")[1] + 0.8);
    expect(point(right, "rightAnkle")[1]).toBeGreaterThan(point(right, "leftAnkle")[1] + 0.8);
    expect(point(left, "leftElbow")[2]).toBeLessThan(point(left, "rightElbow")[2] - 0.8);
    expect(point(right, "rightElbow")[2]).toBeLessThan(point(right, "leftElbow")[2] - 0.8);
    expect(point(poseAt("breath", 0), "hips")[1]).not.toBe(point(left, "hips")[1]);
  });

  it("deadlifts from a hip hinge without sliding feet or releasing the bar", () => {
    const bottom = poseAt("strength", 0), top = poseAt("strength", 1.5);
    expect(bottom.props.barbell).toBe(1);
    expect(top.bar[1] - bottom.bar[1]).toBeGreaterThan(1.5);
    expect(bottom.bar[1] - 0.625).toBeCloseTo(-2.7, 5);
    expect(point(bottom, "chest")[2] - point(bottom, "hips")[2]).toBeGreaterThan(1);
    expect(Math.abs(point(top, "chest")[2] - point(top, "hips")[2])).toBeLessThan(0.01);
    for (let frame = 0; frame < 36; frame++) {
      const pose = poseAt("strength", frame / 12);
      expect(pose.bar[1] - 0.625).toBeGreaterThanOrEqual(-2.700001);
      for (const side of ["left", "right"] as const) {
        expect(point(pose, `${side}Ankle`)).toEqual(point(bottom, `${side}Ankle`));
        const wrist = point(pose, `${side}Wrist`);
        expect(wrist[0]).toBeCloseTo(side === "left" ? -0.6 : 0.6, 5);
        expect(wrist[1]).toBeCloseTo(pose.bar[1], 5);
        expect(wrist[2]).toBeCloseTo(pose.bar[2], 5);
      }
    }
  });

  it("eats seated with right hand moving from the plate toward the mouth", () => {
    const plate = poseAt("energy", 0), mouth = poseAt("energy", 2);
    expect(plate.props.table).toBe(1);
    expect(distance(spoonTip(plate), [0.1, -0.43, 0.87])).toBeLessThan(0.025);
    expect(point(mouth, "rightWrist")[1]).toBeGreaterThan(point(plate, "rightWrist")[1] + 0.5);
    expect(distance(point(mouth, "rightWrist"), point(mouth, "head"))).toBeLessThan(0.65);
    for (const side of ["left", "right"] as const) {
      const hip = point(plate, `${side}Hip`), knee = point(plate, `${side}Knee`), ankle = point(plate, `${side}Ankle`);
      const dot = hip.reduce((sum, value, i) => sum + (value - knee[i]) * (ankle[i] - knee[i]), 0);
      expect(dot).toBeCloseTo(0, 5);
      expect(point(mouth, `${side}Ankle`)).toEqual(ankle);
    }
  });

  it("brings the spoon tip to the mouth while keeping the hand outside the face", () => {
    const pose = poseAt("energy", 2);
    const head = point(pose, "head"), neck = point(pose, "neck");
    const wrist = point(pose, "rightWrist"), headLength = distance(head, neck);
    const upY = (head[1] - neck[1]) / headLength, upZ = (head[2] - neck[2]) / headLength;
    const mouth = [head[0], head[1] - 0.15 * upY - 0.291 * upZ, head[2] - 0.15 * upZ + 0.291 * upY];
    expect(distance(spoonTip(pose), mouth)).toBeLessThan(0.025);
    expect(distance(wrist, head)).toBeGreaterThan(0.35);
  });

  it("keeps every articulated joint inside the fixed scene bounds throughout each cycle", () => {
    const pose = createHumanActivityPose();
    for (const scene of humanAtlasSceneIds) for (let frame = 0; frame < 120; frame++) {
      sampleHumanActivityPose(scene, frame * HUMAN_ACTIVITY_PERIODS[scene] / 120, pose);
      for (let index = 0; index < pose.joints.length; index += 3) {
        expect(pose.joints[index]).toBeGreaterThanOrEqual(B.minX);
        expect(pose.joints[index]).toBeLessThanOrEqual(B.maxX);
        expect(pose.joints[index + 1]).toBeGreaterThanOrEqual(B.minY);
        expect(pose.joints[index + 1]).toBeLessThanOrEqual(B.maxY);
        expect(pose.joints[index + 2]).toBeGreaterThanOrEqual(B.minZ);
        expect(pose.joints[index + 2]).toBeLessThanOrEqual(B.maxZ);
      }
    }
  });
});
