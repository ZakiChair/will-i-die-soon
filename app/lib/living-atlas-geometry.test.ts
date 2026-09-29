import { describe, expect, test } from "vitest";

import {
  LIVING_ATLAS_POSITION_COUNT,
  LIVING_ATLAS_SAMPLES,
  LIVING_ATLAS_STRANDS,
  writeLivingAtlasFilaments,
} from "./living-atlas-geometry";

function geometry(progress: number, timeSeconds = 0) {
  const positions = new Float32Array(LIVING_ATLAS_POSITION_COUNT).fill(Number.NaN);
  writeLivingAtlasFilaments(positions, progress, timeSeconds);
  return positions;
}

function meanDistance(first: Float32Array, second: Float32Array) {
  let distance = 0;
  for (let index = 0; index < first.length; index += 3) {
    distance += Math.hypot(
      first[index] - second[index],
      first[index + 1] - second[index + 1],
      first[index + 2] - second[index + 2],
    );
  }
  return distance / (first.length / 3);
}

describe("Géométrie de l’atlas vivant", () => {
  test("remplit le tampon réutilisable sans modifier sa marge", () => {
    const positions = new Float32Array(LIVING_ATLAS_POSITION_COUNT + 3).fill(Number.NaN);
    positions.set([17, 18, 19], LIVING_ATLAS_POSITION_COUNT);

    expect(writeLivingAtlasFilaments(positions, 0.4, 10)).toBeUndefined();

    expect(positions.subarray(0, LIVING_ATLAS_POSITION_COUNT).every(Number.isFinite)).toBe(true);
    expect(Array.from(positions.subarray(LIVING_ATLAS_POSITION_COUNT))).toEqual([17, 18, 19]);
  });

  test("relie chaque segment au suivant et ferme chacun des filaments", () => {
    const positions = geometry(0.55, 23);
    const strandSize = LIVING_ATLAS_SAMPLES * 6;

    for (let strand = 0; strand < LIVING_ATLAS_STRANDS; strand += 1) {
      const start = strand * strandSize;
      expect(Number.isFinite(positions[start])).toBe(true);
      for (let sample = 0; sample < LIVING_ATLAS_SAMPLES; sample += 1) {
        const endpoint = start + sample * 6 + 3;
        const nextStart = start + ((sample + 1) % LIVING_ATLAS_SAMPLES) * 6;
        expect(positions.slice(endpoint, endpoint + 3)).toEqual(positions.slice(nextStart, nextStart + 3));
      }
    }
  });

  test("produit une sculpture centrée et bornée pendant toute la transition", () => {
    for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      for (const time of [0, 37, -200, Number.MAX_VALUE]) {
        const positions = geometry(progress, time);
        expect(positions.every(Number.isFinite)).toBe(true);
        let maxRadius = 0;
        const center = [0, 0, 0];
        for (let index = 0; index < positions.length; index += 3) {
          const radius = Math.hypot(positions[index], positions[index + 1], positions[index + 2]);
          maxRadius = Math.max(maxRadius, radius);
          for (let axis = 0; axis < 3; axis += 1) center[axis] += positions[index + axis];
        }

        expect(maxRadius).toBeGreaterThan(1.5);
        expect(maxRadius).toBeLessThanOrEqual(2.8);
        expect(Math.hypot(...center.map((value) => value / (positions.length / 3)))).toBeLessThan(0.15);
      }
    }
  });

  test("ouvre un véritable centre de tore au lieu de seulement agrandir la sphère", () => {
    const sphere = geometry(0);
    const torus = geometry(1);
    let sphereOpening = Infinity;
    let torusOpening = Infinity;
    let sphereDepth = 0;
    let torusDepth = 0;
    for (let index = 0; index < sphere.length; index += 3) {
      sphereOpening = Math.min(sphereOpening, Math.hypot(sphere[index], sphere[index + 1]));
      torusOpening = Math.min(torusOpening, Math.hypot(torus[index], torus[index + 1]));
      sphereDepth = Math.max(sphereDepth, Math.abs(sphere[index + 2]));
      torusDepth = Math.max(torusDepth, Math.abs(torus[index + 2]));
    }

    expect(sphereOpening).toBeLessThan(0.45);
    expect(torusOpening).toBeGreaterThan(0.75);
    expect(sphereDepth).toBeGreaterThan(1.5);
    expect(torusDepth).toBeLessThan(0.75);
    expect(meanDistance(sphere, torus)).toBeGreaterThan(0.75);
  });

  test("reste déterministe et évolue sans saut entre deux instants ou positions voisins", () => {
    const reference = geometry(0.4, 12);

    expect(reference.every(Number.isFinite)).toBe(true);
    expect(geometry(0.4, 12)).toEqual(reference);
    expect(meanDistance(reference, geometry(0.401, 12))).toBeGreaterThan(0);
    expect(meanDistance(reference, geometry(0.401, 12))).toBeLessThan(0.02);
    expect(meanDistance(reference, geometry(0.4, 12.016))).toBeGreaterThan(0);
    expect(meanDistance(reference, geometry(0.4, 12.016))).toBeLessThan(0.01);
    expect(meanDistance(reference, geometry(0.4, 42))).toBeGreaterThan(0.01);
  });

  test("borne la progression et neutralise les entrées non finies", () => {
    const start = geometry(0);
    expect(start.every(Number.isFinite)).toBe(true);

    expect(geometry(-20)).toEqual(start);
    expect(geometry(20)).toEqual(geometry(1));
    expect(geometry(Number.NaN)).toEqual(start);
    expect(geometry(Number.POSITIVE_INFINITY)).toEqual(geometry(1));
    expect(geometry(Number.NEGATIVE_INFINITY)).toEqual(start);
    for (const time of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(geometry(0.4, time)).toEqual(geometry(0.4, 0));
    }
  });

  test("refuse un tampon trop court avant de l’altérer", () => {
    const positions = new Float32Array(LIVING_ATLAS_POSITION_COUNT - 1).fill(7);

    expect(() => writeLivingAtlasFilaments(positions, 0, 0)).toThrow(RangeError);
    expect(positions.every((value) => value === 7)).toBe(true);
  });
});
