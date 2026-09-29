import * as THREE from "three";
import { expect, test, vi } from "vitest";

import { createHumanEnergyFilaments } from "./human-energy-filaments";

type Overlay = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
function fixture() {
  const body = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, 16, 12), capsule = new THREE.CapsuleGeometry(0.12, 1, 6, 16);
  const surface = new THREE.MeshBasicMaterial();
  const names = ["head", "torso-core", "pelvis", "chest-left", "chest-right"];
  for (const side of ["left", "right"]) names.push(...["upper-arm", "forearm", "thigh", "shin", "hand", "anatomical-foot"].map((part) => `${side}-${part}`));
  const targets = names.map((name) => {
    const mesh = new THREE.Mesh(/upper-arm|forearm|thigh|shin/.test(name) ? capsule : sphere, surface);
    mesh.name = name;
    body.add(mesh);
    return mesh;
  });
  for (const name of ["nose", "left-eye", "mouth", "forehead-symbol", "left-elbow", "bar", "spoon"]) {
    const mesh = new THREE.Mesh(sphere, surface); mesh.name = name; body.add(mesh);
  }
  return { body, targets, sphere, capsule, surface };
}
function overlays(body: THREE.Group): Overlay[] {
  const values: Overlay[] = [];
  body.traverse((object) => { if (object instanceof THREE.Points || object instanceof THREE.LineSegments) values.push(object as Overlay); });
  return values;
}

test("habille seulement les volumes humains et respecte le budget total", () => {
  const { body, targets } = fixture();
  const effect = createHumanEnergyFilaments(body), layer = overlays(body);
  expect(layer.filter((object) => object instanceof THREE.Points)).toHaveLength(targets.length);
  expect(layer.filter((object) => object instanceof THREE.LineSegments)).toHaveLength(targets.length);
  expect(layer.every((object) => targets.some((target) => target === object.parent))).toBe(true);
  const points = layer.filter((object) => object instanceof THREE.Points).reduce((sum, object) => sum + object.geometry.getAttribute("position").count, 0);
  const segments = layer.filter((object) => object instanceof THREE.LineSegments).reduce((sum, object) => sum + object.geometry.getAttribute("position").count / 2, 0);
  expect(points).toBeGreaterThan(1000);
  expect(points).toBeLessThanOrEqual(2000);
  expect(segments).toBeGreaterThan(600);
  expect(segments).toBeLessThanOrEqual(1500);
  effect.dispose();
});

test("épouse les sphères et les capsules réelles au lieu d’une enveloppe commune", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body);
  expect(overlays(body).length).toBeGreaterThan(0);
  for (const object of overlays(body)) {
    const capsule = (object.parent as THREE.Mesh).geometry.type === "CapsuleGeometry";
    const position = object.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index), y = position.getY(index), z = position.getZ(index);
      expect([x, y, z].every(Number.isFinite)).toBe(true);
      const radius = capsule ? Math.hypot(x, Math.max(0, Math.abs(y) - 0.5), z) : Math.hypot(x, y, z);
      expect(radius).toBeGreaterThanOrEqual(capsule ? 0.1199 : 0.9999);
      expect(radius).toBeLessThan(capsule ? 0.125 : 1.02);
    }
  }
  effect.dispose();
});

test("hérite directement des transformations articulées sans reconstruire les tampons", () => {
  const { body, targets } = fixture(), effect = createHumanEnergyFilaments(body);
  const layer = overlays(body), buffers = layer.map((object) => object.geometry.getAttribute("position").array);
  expect(layer.length).toBeGreaterThan(0);
  const parent = targets.find((object) => object.name === "left-forearm")!;
  const child = layer.find((object) => object.parent === parent)!;
  body.updateMatrixWorld(true);
  const before = child.matrixWorld.clone();
  parent.position.set(1, 2, 3); parent.rotation.set(0.7, -0.4, 0.2); parent.scale.set(1.4, 0.8, 1.2);
  effect.update(2.5); body.updateMatrixWorld(true);
  expect(child.matrixWorld.equals(parent.matrixWorld)).toBe(true);
  expect(child.matrixWorld.equals(before)).toBe(false);
  layer.forEach((object, index) => expect(object.geometry.getAttribute("position").array).toBe(buffers[index]));
  effect.dispose();
});

test("garde le milieu des filaments à la surface pour éviter leur disparition dans les caps", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body);
  for (const object of overlays(body)) {
    if (!(object instanceof THREE.LineSegments)) continue;
    const capsule = (object.parent as THREE.Mesh).geometry.type === "CapsuleGeometry";
    const positions = object.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 2) {
      const x = (positions.getX(index) + positions.getX(index + 1)) / 2;
      const y = (positions.getY(index) + positions.getY(index + 1)) / 2;
      const z = (positions.getZ(index) + positions.getZ(index + 1)) / 2;
      const radius = capsule ? Math.hypot(x, Math.max(0, Math.abs(y) - 0.5), z) : Math.hypot(x, y, z);
      expect(radius, object.parent!.name).toBeGreaterThanOrEqual(capsule ? 0.119 : 0.998);
    }
  }
  effect.dispose();
});

test("partage les géométries symétriques et les matériaux sans textures externes", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body), layer = overlays(body);
  expect(layer.length).toBeGreaterThan(0);
  const left = layer.find((object) => object instanceof THREE.Points && object.parent!.name === "left-forearm")!;
  const right = layer.find((object) => object instanceof THREE.Points && object.parent!.name === "right-forearm")!;
  expect(left.geometry).toBe(right.geometry);
  const materials = new Set(layer.map((object) => object.material));
  expect(materials.size).toBe(2);
  for (const material of materials) {
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.blending).toBe(THREE.NormalBlending);
    expect(material.depthWrite).toBe(false);
    expect(Object.values(material.uniforms).some((uniform) => uniform.value instanceof THREE.Texture)).toBe(false);
  }
  expect(left.material.uniforms.uPointSize.value).toBeLessThanOrEqual(3);
  effect.dispose();
});

test("anime uniquement les uniformes au temps fourni et garde les temps invalides finis", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body), layer = overlays(body);
  expect(layer.length).toBeGreaterThan(0);
  const material = layer[0].material, time = material.uniforms.uTime;
  effect.update(1.25); expect(time.value).toBeCloseTo(1.25);
  effect.update(1.25); expect(time.value).toBeCloseTo(1.25);
  effect.update(2.25); expect(time.value).toBeCloseTo(2.25);
  for (const value of [NaN, Infinity, -Infinity, 1e30, -1e30]) {
    effect.update(value);
    expect(Number.isFinite(time.value)).toBe(true);
    expect(Math.abs(time.value)).toBeLessThan(130);
  }
  effect.dispose();
  const stopped = time.value;
  effect.update(4); expect(time.value).toBe(stopped);
});

test("réduit les points sur petit écran sans recréer les uniformes ni les tampons", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body), layer = overlays(body);
  const points = layer.find((object) => object instanceof THREE.Points)!;
  const lines = layer.find((object) => object instanceof THREE.LineSegments)!;
  const size = points.material.uniforms.uPointSize, opacity = lines.material.uniforms.uOpacity;
  const buffers = layer.map((object) => object.geometry.getAttribute("position").array);
  effect.resize(600);
  expect(size.value).toBeCloseTo(2.35);
  expect(opacity.value).toBeCloseTo(0.82);
  effect.resize(500);
  const large = size.value;
  effect.resize(280);
  expect(size.value).toBeLessThan(large);
  expect(size.value).toBeCloseTo(2.35 * 280 / 600);
  expect(opacity.value).toBeLessThan(0.82);
  effect.resize(280, 2);
  expect(size.value).toBeCloseTo(2.35 * 280 / 600 * 2);
  expect(points.material.uniforms.uPointSize).toBe(size);
  expect(lines.material.uniforms.uOpacity).toBe(opacity);
  layer.forEach((object, index) => expect(object.geometry.getAttribute("position").array).toBe(buffers[index]));
  effect.dispose();
});

test("borne les tailles physiques et garde resize fini pour les dimensions ou DPR invalides", () => {
  const { body } = fixture(), effect = createHumanEnergyFilaments(body), layer = overlays(body);
  const size = layer.find((object) => object instanceof THREE.Points)!.material.uniforms.uPointSize;
  for (const height of [0, -100, NaN, Infinity, -Infinity, Number.MAX_VALUE, 280, 600]) {
    for (const ratio of [0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE, 0.01, 1, 3]) {
      effect.resize(height, ratio);
      expect(Number.isFinite(size.value)).toBe(true);
      expect(size.value).toBeGreaterThanOrEqual(0.5);
      expect(size.value).toBeLessThanOrEqual(3);
    }
  }
  effect.dispose();
  const stopped = size.value;
  effect.resize(280);
  expect(size.value).toBe(stopped);
});

test("libère seulement ses ressources une fois et laisse les meshes du corps intacts", () => {
  const { body, targets, sphere, capsule, surface } = fixture(), effect = createHumanEnergyFilaments(body), layer = overlays(body);
  expect(layer.length).toBeGreaterThan(0);
  const resources = new Set([...layer.map((object) => object.geometry), ...layer.map((object) => object.material)]);
  const releases = Array.from(resources, (resource) => vi.spyOn(resource, "dispose"));
  const original = [sphere, capsule, surface].map((resource) => vi.spyOn(resource, "dispose"));
  effect.dispose(); effect.dispose();
  expect(releases.every((release) => release.mock.calls.length === 1)).toBe(true);
  expect(original.every((release) => release.mock.calls.length === 0)).toBe(true);
  expect(overlays(body)).toHaveLength(0);
  expect(targets.every((mesh) => mesh.parent === body)).toBe(true);
});
