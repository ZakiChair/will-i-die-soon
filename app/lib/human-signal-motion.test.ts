import { expect, test } from "vitest";
import {
  HUMAN_SIGNAL_FLOW_POSITION_COUNT,
  HUMAN_SIGNAL_FLOW_SEGMENTS,
  HUMAN_SIGNAL_FLOW_STRANDS,
  HUMAN_SIGNAL_MOTION_PERIOD,
  sampleHumanSignalMotion,
  writeHumanSignalFlow,
} from "./human-signal-motion";

function flow(progress: number, time: number): Float32Array {
  const result = new Float32Array(HUMAN_SIGNAL_FLOW_POSITION_COUNT).fill(Number.NaN);
  writeHumanSignalFlow(result, progress, time);
  return result;
}

function distance(first: Float32Array, second: Float32Array): number {
  let sum = 0;
  for (let offset = 0; offset < first.length; offset += 3) sum += Math.hypot(first[offset] - second[offset], first[offset + 1] - second[offset + 1], first[offset + 2] - second[offset + 2]);
  return sum / (first.length / 3);
}

test("fait un tour complet au scroll et balance le corps sans rotation perpétuelle au repos", () => {
  for (const time of [0, 2, 4, 6, 8, 10, 12, 1000]) {
    const start = sampleHumanSignalMotion(0, time);
    const end = sampleHumanSignalMotion(1, time);
    expect(end.rotation[1] - start.rotation[1]).toBeCloseTo(Math.PI * 2, 9);
    expect(Math.abs(start.rotation[1])).toBeLessThanOrEqual(Math.PI / 10);
    expect(Math.abs(start.rotation[0])).toBeLessThanOrEqual(0.08);
    expect(Math.abs(start.rotation[2])).toBeLessThanOrEqual(0.05);
  }
  expect(Math.abs(sampleHumanSignalMotion(0, 3).rotation[1])).toBeGreaterThan(0.15);
});

test("borne respiration, cadrage et ouverture pendant le parcours", () => {
  let maximumEnvelope = 0;
  for (const progress of [0, 0.1, 0.4, 0.7, 1]) {
    for (const time of [0, 1.5, 3, 6, 9, 12]) {
      const pose = sampleHumanSignalMotion(progress, time);
      expect(pose.scale).toBeGreaterThanOrEqual(0.98);
      expect(pose.scale).toBeLessThanOrEqual(1.03);
      expect(pose.cameraPush).toBeGreaterThanOrEqual(0);
      expect(pose.cameraPush).toBeLessThanOrEqual(0.12);
      expect(pose.envelope).toBeGreaterThanOrEqual(0);
      expect(pose.envelope).toBeLessThanOrEqual(1);
      maximumEnvelope = Math.max(maximumEnvelope, pose.envelope);
    }
  }
  expect(maximumEnvelope).toBeGreaterThan(0.5);
  expect(sampleHumanSignalMotion(0.5, 0).cameraPush).toBeGreaterThan(0.02);
});

test("réutilise aussi la cible de pose et son triplet de rotation quand ils sont fournis", () => {
  const target = { rotation: [0, 0, 0] as [number, number, number], scale: 1, cameraPush: 0, envelope: 0 };
  const rotation = target.rotation;
  const result = sampleHumanSignalMotion(0.5, 3, target);
  expect(result).toBe(target);
  expect(result.rotation).toBe(rotation);
  expect(result.rotation[1]).toBeGreaterThan(Math.PI);
  expect(result.envelope).toBeGreaterThan(0.5);
});

test("écrit 28 filaments continus sans réallouer ni toucher la marge du tampon", () => {
  const positions = new Float32Array(HUMAN_SIGNAL_FLOW_POSITION_COUNT + 3).fill(Number.NaN);
  const storage = positions.buffer;
  positions.set([17, 18, 19], HUMAN_SIGNAL_FLOW_POSITION_COUNT);
  expect(writeHumanSignalFlow(positions, 0.5, 4)).toBeUndefined();
  expect(positions.buffer).toBe(storage);
  expect(positions.length / 3).toBeLessThan(4000);
  expect(positions.subarray(0, HUMAN_SIGNAL_FLOW_POSITION_COUNT).every(Number.isFinite)).toBe(true);
  expect(Array.from(positions.subarray(HUMAN_SIGNAL_FLOW_POSITION_COUNT))).toEqual([17, 18, 19]);
  for (let strand = 0; strand < HUMAN_SIGNAL_FLOW_STRANDS; strand += 1) {
    for (let segment = 0; segment < HUMAN_SIGNAL_FLOW_SEGMENTS - 1; segment += 1) {
      const offset = (strand * HUMAN_SIGNAL_FLOW_SEGMENTS + segment) * 6;
      expect(positions.slice(offset + 3, offset + 6)).toEqual(positions.slice(offset + 6, offset + 9));
    }
  }
});

test("garde une enveloppe humaine verticale aux dimensions finies et bornées", () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    for (const time of [0, 1, 4, 7, 10, Number.MAX_VALUE]) {
      const positions = flow(progress, time);
      expect(positions.every(Number.isFinite)).toBe(true);
      const maxAbsolute = [0, 0, 0];
      for (let offset = 0; offset < positions.length; offset += 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          maxAbsolute[axis] = Math.max(maxAbsolute[axis], Math.abs(positions[offset + axis]));
        }
      }
      expect(maxAbsolute[0]).toBeLessThanOrEqual(1.6);
      expect(maxAbsolute[1]).toBeLessThanOrEqual(2.78);
      expect(maxAbsolute[2]).toBeLessThanOrEqual(0.65);
    }
  }
  const positions = flow(0, 0);
  const widthAt = (height: number) => {
    let width = 0;
    for (let offset = 0; offset < positions.length; offset += 3) {
      if (Math.abs(positions[offset + 1] - height) < 0.1) width = Math.max(width, Math.abs(positions[offset]));
    }
    return width;
  };
  expect(widthAt(2.35)).toBeLessThan(0.5);
  expect(widthAt(1.5)).toBeGreaterThan(widthAt(2.35) * 1.5);
  expect(widthAt(-1.4)).toBeLessThan(0.8);
});

test("anime réellement la circulation en quelques secondes et garde des changements continus", () => {
  const initial = flow(0.35, 0);
  expect(distance(initial, flow(0.35, 4))).toBeGreaterThan(0.05);
  expect(distance(initial, flow(0.85, 0))).toBeGreaterThan(0.05);
  const tinyStep = distance(initial, flow(0.351, 0.016));
  expect(tinyStep).toBeGreaterThan(0);
  expect(tinyStep).toBeLessThan(0.025);
});

test("sépare les quatorze filaments de chaque jambe en laissant l’entrejambe ouvert", () => {
  for (const progress of [0, 0.5, 1]) {
    for (const time of [0, 2, 4, 8]) {
      const positions = flow(progress, time);
      for (let strand = 0; strand < HUMAN_SIGNAL_FLOW_STRANDS; strand += 1) {
        const side = strand < 14 ? 1 : -1;
        let inspected = 0;
        for (let point = 0; point < HUMAN_SIGNAL_FLOW_SEGMENTS * 2; point += 1) {
          const offset = (strand * HUMAN_SIGNAL_FLOW_SEGMENTS * 2 + point) * 3;
          if (positions[offset + 1] < -1.1) {
            expect(positions[offset] * side).toBeGreaterThan(0.08);
            inspected += 1;
          }
        }
        expect(inspected).toBeGreaterThan(30);
      }
    }
  }
});

test("reste déterministe et périodique sans saut temporel", () => {
  const initial = flow(0.4, 2);
  expect(initial.every(Number.isFinite)).toBe(true);
  expect(flow(0.4, 2)).toEqual(initial);
  expect(distance(initial, flow(0.4, 2 + HUMAN_SIGNAL_MOTION_PERIOD))).toBeLessThan(1e-6);
  expect(sampleHumanSignalMotion(0.4, 2)).toEqual(sampleHumanSignalMotion(0.4, 2 + HUMAN_SIGNAL_MOTION_PERIOD));
  expect(distance(flow(0.4, HUMAN_SIGNAL_MOTION_PERIOD - 0.001), flow(0.4, HUMAN_SIGNAL_MOTION_PERIOD + 0.001))).toBeLessThan(0.01);
});

test("neutralise les entrées non finies et borne le scroll", () => {
  const reference = flow(0, 0);
  expect(reference.every(Number.isFinite)).toBe(true);
  for (const invalid of [Number.NaN, Infinity, -Infinity]) {
    expect(flow(invalid, invalid)).toEqual(reference);
    expect(sampleHumanSignalMotion(invalid, invalid)).toEqual(sampleHumanSignalMotion(0, 0));
  }
  expect(flow(-1, 0)).toEqual(reference);
  expect(flow(2, 0)).toEqual(flow(1, 0));
  expect(sampleHumanSignalMotion(-1, 0)).toEqual(sampleHumanSignalMotion(0, 0));
  expect(sampleHumanSignalMotion(2, 0)).toEqual(sampleHumanSignalMotion(1, 0));
});

test("refuse un tampon trop court avant toute écriture", () => {
  const positions = new Float32Array(HUMAN_SIGNAL_FLOW_POSITION_COUNT - 1).fill(7);
  expect(() => writeHumanSignalFlow(positions, 0, 0)).toThrow(RangeError);
  expect(positions.every((value) => value === 7)).toBe(true);
});
