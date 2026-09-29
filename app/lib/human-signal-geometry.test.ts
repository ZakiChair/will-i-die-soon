import { expect, test } from "vitest";
import { buildHumanSignalGeometry, HUMAN_SIGNAL_CENTERS } from "./human-signal-geometry";

function points(buffer: Float32Array): number[][] {
  const result: number[][] = [];
  for (let index = 0; index < buffer.length; index += 3) result.push(Array.from(buffer.subarray(index, index + 3)));
  return result;
}

test("reste dans le budget de points et produit des positions GPU finies", () => {
  const geometry = buildHumanSignalGeometry();
  const zones = Object.values(geometry.zones);
  const pointCount = (geometry.bodyPositions.length + zones.reduce((sum, zone) => sum + zone.positions.length, 0)) / 3;
  expect(geometry.bodyPositions.length / 3).toBeGreaterThan(2000);
  expect(pointCount).toBeLessThanOrEqual(3500);
  for (const buffer of [geometry.bodyPositions, geometry.linePositions, ...zones.flatMap((zone) => [zone.positions, zone.linePositions])]) {
    expect(buffer).toBeInstanceOf(Float32Array);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.length % 3).toBe(0);
    expect(buffer.every(Number.isFinite)).toBe(true);
  }
});

test("cadre le corps entier en volume, centré et sans points isolés hors silhouette", () => {
  const body = points(buildHumanSignalGeometry().bodyPositions);
  expect(body.length).toBeGreaterThan(0);
  const xs = body.map(([x]) => x);
  const ys = body.map(([, y]) => y);
  const zs = body.map(([, , z]) => z);
  expect(Math.max(...ys)).toBeGreaterThan(2.65);
  expect(Math.min(...ys)).toBeLessThan(-2.65);
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(-2.8);
  expect(Math.max(...ys)).toBeLessThanOrEqual(2.8);
  expect(Math.max(...xs)).toBeGreaterThan(1.15);
  expect(Math.min(...xs)).toBeLessThan(-1.15);
  expect(Math.max(...xs.map(Math.abs))).toBeLessThan(1.4);
  expect(Math.max(...zs.map(Math.abs))).toBeGreaterThan(0.25);
  expect(Math.max(...zs.map(Math.abs))).toBeLessThan(0.45);
  expect(Math.abs(xs.reduce((sum, x) => sum + x, 0) / xs.length)).toBeLessThan(0.015);
});

test("rend lisibles tête, cou, épaules, mains, jambes séparées et pieds", () => {
  const body = points(buildHumanSignalGeometry().bodyPositions);
  const band = (height: number, halfHeight: number, width = 2) => body.filter(([x, y]) => Math.abs(y - height) < halfHeight && Math.abs(x) < width);
  const width = (selection: number[][]) => Math.max(...selection.map(([x]) => x)) - Math.min(...selection.map(([x]) => x));
  expect(width(band(2.35, 0.1))).toBeGreaterThan(0.45);
  expect(width(band(2.35, 0.1))).toBeLessThan(0.7);
  expect(width(band(1.98, 0.04))).toBeLessThan(0.4);
  expect(width(band(1.6, 0.07))).toBeGreaterThan(1.25);
  expect(width(band(0.35, 0.1, 0.65))).toBeLessThan(1);
  expect(body.filter(([x, y]) => Math.abs(x) > 1.1 && y < -0.25 && y > -0.55).length).toBeGreaterThan(10);
  const legs = band(-1.8, 0.07);
  expect(legs.length).toBeGreaterThan(20);
  expect(legs.every(([x]) => Math.abs(x) > 0.12)).toBe(true);
  expect(legs.some(([x]) => x < -0.3)).toBe(true);
  expect(legs.some(([x]) => x > 0.3)).toBe(true);
  expect(body.some(([, y, z]) => y < -2.58 && z > 0.28)).toBe(true);
});

test("raccorde les membres au tronc et la tête au cou sans morceaux flottants", () => {
  const body = points(buildHumanSignalGeometry().bodyPositions);
  expect(body.length).toBeGreaterThan(2000);
  const parents = body.map((_, index) => index);
  function root(index: number): number {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  }
  for (let index = 0; index < body.length; index += 1) {
    for (let next = index + 1; next < body.length; next += 1) {
      const dx = body[index][0] - body[next][0];
      const dy = body[index][1] - body[next][1];
      const dz = body[index][2] - body[next][2];
      if (dx * dx + dy * dy + dz * dz < 0.04) parents[root(next)] = root(index);
    }
  }
  expect(new Set(parents.map((_, index) => root(index))).size).toBe(1);
});

test("relie uniquement des points voisins dans les filaments", () => {
  const { linePositions, zones } = buildHumanSignalGeometry();
  expect(linePositions.length).toBeGreaterThan(600);
  expect(linePositions.length / 6).toBeLessThan(1500);
  for (const lines of [linePositions, ...Object.values(zones).map((zone) => zone.linePositions)]) {
    expect(lines.length % 6).toBe(0);
    for (let offset = 0; offset < lines.length; offset += 6) {
      const length = Math.hypot(lines[offset] - lines[offset + 3], lines[offset + 1] - lines[offset + 4], lines[offset + 2] - lines[offset + 5]);
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThan(0.3);
    }
  }
});

test("place les quatre foyers dans la silhouette et ordonne tête, thorax, abdomen", () => {
  const { bodyPositions, zones } = buildHumanSignalGeometry();
  const body = points(bodyPositions);
  expect(Object.keys(zones).sort()).toEqual(["breath", "energy", "sleep", "strength"]);
  expect(HUMAN_SIGNAL_CENTERS.sleep[0][1]).toBeGreaterThan(2);
  expect(HUMAN_SIGNAL_CENTERS.breath[0][1]).toBeGreaterThan(0.8);
  expect(HUMAN_SIGNAL_CENTERS.energy[0][1]).toBeLessThan(0.4);
  expect(HUMAN_SIGNAL_CENTERS.strength).toHaveLength(4);
  for (const center of Object.values(HUMAN_SIGNAL_CENTERS).flat()) {
    const nearest = Math.min(...body.map(([x, y, z]) => Math.hypot(x - center[0], y - center[1], z - center[2])));
    expect(nearest).toBeLessThan(0.28);
  }
  for (const zone of Object.values(zones)) {
    expect(zone.positions.length).toBeGreaterThan(60);
    expect(zone.positions.every(Number.isFinite)).toBe(true);
  }
});

test("produit la même silhouette sans partager de tampons mutables entre instances", () => {
  const first = buildHumanSignalGeometry();
  const second = buildHumanSignalGeometry();
  expect(first.bodyPositions.length).toBeGreaterThan(0);
  expect(first).toEqual(second);
  expect(first.bodyPositions).not.toBe(second.bodyPositions);
  first.bodyPositions[0] = 99;
  first.zones.sleep.positions[0] = 99;
  expect(second.bodyPositions[0]).not.toBe(99);
  expect(second.zones.sleep.positions[0]).not.toBe(99);
});
