import * as THREE from "three";
import { expect, test, vi } from "vitest";

import { humanAtlasSceneIds } from "../data/human-atlas";
import { createHumanActivityPose, HUMAN_ACTIVITY_JOINTS, sampleHumanActivityPose } from "./human-activity-motion";
import { createHumanActivityRig } from "./human-activity-rig";

test("construit une silhouette translucide neutre avec une surface partagée", () => {
  const rig = createHumanActivityRig();
  for (const name of ["head", "torso-core", "pelvis", "left-anatomical-foot", "right-anatomical-foot", "bed", "track", "barbell", "table", "chair", "bowl", "spoon"]) {
    expect(rig.group.getObjectByName(name), name).toBeDefined();
  }
  for (const name of ["forehead-mark", "forehead-center", "head-glow", "hair", "shirt", "left-eye", "right-eye", "mouth", "nose", "left-shoe", "left-sleeve"]) {
    expect(rig.group.getObjectByName(name), name).toBeUndefined();
  }
  const surfaces = new Set<THREE.Material>();
  rig.group.getObjectByName("body")!.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.activityEffect) return;
    const material = object.material as THREE.ShaderMaterial;
    surfaces.add(material);
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.name).toBe("human-frosted-surface");
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeGreaterThan(0);
    expect(material.opacity).toBeLessThan(1);
    expect(material.depthWrite).toBe(false);
    expect(material.blending).toBe(THREE.NormalBlending);
    expect(Object.values(material.uniforms).some((uniform) => uniform.value instanceof THREE.Texture)).toBe(false);
  });
  expect(surfaces.size).toBe(1);
  expect((rig.group.getObjectByName("left-forearm") as THREE.Mesh).geometry).toBeInstanceOf(THREE.CapsuleGeometry);
  rig.dispose();
});

test("relie réellement les membres aux joints et déplace la barre avec les mains", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  for (const time of [0, 0.8, 1.6]) {
    sampleHumanActivityPose("strength", time, pose);
    rig.update(pose);
    const head = rig.group.getObjectByName("head")!;
    expect(head.parent!.position.toArray()).toEqual(Array.from(pose.joints.slice(HUMAN_ACTIVITY_JOINTS.head * 3, HUMAN_ACTIVITY_JOINTS.head * 3 + 3)));
    const forearm = rig.group.getObjectByName("left-forearm")!;
    const elbow = new THREE.Vector3().fromArray(pose.joints, HUMAN_ACTIVITY_JOINTS.leftElbow * 3);
    const wrist = new THREE.Vector3().fromArray(pose.joints, HUMAN_ACTIVITY_JOINTS.leftWrist * 3);
    expect(forearm.position.distanceTo(elbow.clone().add(wrist).multiplyScalar(0.5))).toBeLessThan(1e-6);
    expect(forearm.scale.y).toBeCloseTo(elbow.distanceTo(wrist));
    expect(rig.group.getObjectByName("barbell")!.position.toArray()).toEqual(pose.bar);
    rig.group.updateMatrixWorld(true);
    for (const side of ["left", "right"]) {
      const sole = rig.group.getObjectByName(`${side}-heel`)!;
      const box = new THREE.Box3().setFromObject(sole);
      expect(box.min.y).toBeCloseTo(-2.7, 2);
    }
  }
  rig.dispose();
});

test("présente une barre longue avec manchons, disques calibrés symétriques et contact réel au sol", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  sampleHumanActivityPose("strength", 0, pose);
  rig.update(pose);
  rig.group.updateMatrixWorld(true);
  const barbell = rig.group.getObjectByName("barbell")!;
  const shaft = new THREE.Box3().setFromObject(barbell.getObjectByName("bar")!);
  expect(shaft.max.x - shaft.min.x).toBeCloseTo(6.1, 5);
  expect(barbell.getObjectByName("bar-knurl")).toBeDefined();
  for (const kilograms of [20, 25]) {
    const left = barbell.getObjectByName(`bar-plate-${kilograms}-left`) as THREE.Mesh;
    const right = barbell.getObjectByName(`bar-plate-${kilograms}-right`) as THREE.Mesh;
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(left.geometry).toBe(right.geometry);
    expect(left.material).toBe(right.material);
    expect(left.position.x).toBe(-right.position.x);
    for (const plate of [left, right]) {
      const bounds = new THREE.Box3().setFromObject(plate);
      expect(bounds.min.y).toBeCloseTo(-2.7, 5);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.25, 5);
    }
    for (const side of ["left", "right"]) {
      expect(barbell.getObjectByName(`bar-mark-${kilograms}-${side}`)).toBeDefined();
      expect(barbell.getObjectByName(`bar-sleeve-${side}`)).toBeDefined();
    }
  }
  const red = barbell.getObjectByName("bar-plate-25-right") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const blue = barbell.getObjectByName("bar-plate-20-right") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  expect(red.material.color.r).toBeGreaterThan(red.material.color.b);
  expect(blue.material.color.b).toBeGreaterThan(blue.material.color.r);
  rig.dispose();
});

test("montre seulement les accessoires de l’activité courante et applique leur fondu", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  const expected = { breath: "track", strength: "barbell", sleep: "bed", energy: "table" };
  for (const scene of humanAtlasSceneIds) {
    sampleHumanActivityPose(scene, 0.5, pose);
    rig.update(pose);
    for (const name of ["bed", "track", "barbell", "table"]) {
      expect(rig.group.getObjectByName(name)!.visible, `${scene}/${name}`).toBe(name === expected[scene]);
    }
  }
  pose.props.table = 0.5;
  rig.update(pose);
  const table = rig.group.getObjectByName("table")!;
  expect(table.visible).toBe(true);
  table.traverse((object) => {
    if (object instanceof THREE.Mesh) expect((object.material as THREE.Material).opacity).toBeLessThanOrEqual(0.5);
  });
  pose.props.table = 0.001;
  rig.update(pose);
  expect(table.visible).toBe(false);
  rig.dispose();
});

test("couvre les jambes pendant le sommeil en laissant la tête libre et retrouve les pieds debout", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  sampleHumanActivityPose("sleep", 1, pose);
  rig.update(pose);
  rig.group.updateMatrixWorld(true);
  const duvet = rig.group.getObjectByName("duvet");
  expect(duvet?.parent?.name).toBe("bed");
  const fabric = (duvet as THREE.Mesh).material as THREE.MeshStandardMaterial;
  expect(fabric.opacity).toBe(1);
  expect(fabric.depthWrite).toBe(true);
  const covering = new THREE.Box3().setFromObject(duvet!);
  const head = new THREE.Box3().setFromObject(rig.group.getObjectByName("head")!);
  expect(covering.min.z).toBeGreaterThan(head.max.z + 0.3);
  for (const side of ["left", "right"] as const) {
    const knee = new THREE.Vector3().fromArray(pose.joints, HUMAN_ACTIVITY_JOINTS[`${side}Knee`] * 3);
    expect(covering.containsPoint(knee)).toBe(true);
    expect(rig.group.getObjectByName(`${side}-foot`)!.visible).toBe(false);
  }
  sampleHumanActivityPose("strength", 1, pose);
  rig.update(pose);
  expect(rig.group.getObjectByName("left-foot")!.visible).toBe(true);
  expect(rig.group.getObjectByName("right-foot")!.visible).toBe(true);
  rig.dispose();
});

test("conserve les mêmes ressources et des transformations finies dans toutes les activités", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  const resources = new Map<THREE.Object3D, [THREE.BufferGeometry, THREE.Material | THREE.Material[]]>();
  rig.group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) resources.set(object, [object.geometry, object.material]);
  });
  for (const scene of humanAtlasSceneIds) {
    for (const time of [0, 0.5, 1.1, 2.5, 4, 7]) {
      sampleHumanActivityPose(scene, time, pose);
      rig.update(pose, time);
      rig.group.updateMatrixWorld(true);
      rig.group.traverseVisible((object) => {
        expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true);
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments)) return;
        expect(object.geometry).toBe(resources.get(object)![0]);
        expect(object.material).toBe(resources.get(object)![1]);
        object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
        expect(rig.bounds.containsBox(box), `${scene}: ${object.name}`).toBe(true);
      });
    }
  }
  rig.dispose();
});

test("libère chaque ressource possédée une seule fois, même après plusieurs destructions", () => {
  const rig = createHumanActivityRig();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  rig.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments)) return;
    geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
    else materials.add(object.material);
  });
  const releases = [...geometries, ...materials].map((resource) => vi.spyOn(resource, "dispose"));
  rig.dispose();
  rig.dispose();
  expect(releases.every((release) => release.mock.calls.length === 1)).toBe(true);
  expect(rig.group.children).toHaveLength(0);
});

test("associe les réactions à leur activité et à son fondu", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  const expressions = { breath: "running-expression", strength: "strength-expression", sleep: "sleep-expression", energy: "meal-expression" };
  for (const scene of humanAtlasSceneIds) {
    sampleHumanActivityPose(scene, 0.6, pose);
    rig.update(pose, 0.6);
    for (const name of Object.values(expressions)) {
      expect(rig.group.getObjectByName(name)!.visible, `${scene}/${name}`).toBe(name === expressions[scene]);
    }
    expect(rig.group.getObjectByName("strength-effort")!.visible).toBe(scene === "strength");
  }
  const smile = rig.group.getObjectByName("happy-smile") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  const fullOpacity = smile.material.opacity;
  pose.props.table = 0.5;
  rig.update(pose, 0.6);
  expect(smile.material.opacity).toBeCloseTo(fullOpacity / 2);
  pose.props.table = 0;
  rig.update(pose, 0.6);
  expect(smile.parent!.visible).toBe(false);
  rig.dispose();
});

test("fait tomber la sueur, sourire au repas et respirer sous la couette avec la même horloge", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  const drop = rig.group.getObjectByName("sweat-drop-0") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  sampleHumanActivityPose("breath", 0, pose);
  rig.update(pose, 0.15);
  const firstDrop = drop.position.clone();
  expect(drop.material.opacity).toBeGreaterThan(0);
  rig.update(pose, 0.7);
  expect(drop.position.y).toBeLessThan(firstDrop.y);
  expect(Math.abs(drop.position.x)).toBeGreaterThan(Math.abs(firstDrop.x));
  const moved = { position: drop.position.toArray(), scale: drop.scale.toArray(), opacity: drop.material.opacity };
  rig.update(pose, 0.7);
  expect({ position: drop.position.toArray(), scale: drop.scale.toArray(), opacity: drop.material.opacity }).toEqual(moved);
  rig.update(pose, 1.2);
  expect(drop.material.opacity).toBeCloseTo(0);

  sampleHumanActivityPose("energy", 0, pose);
  rig.update(pose, 0);
  const smile = rig.group.getObjectByName("happy-smile")!;
  const restingSmile = smile.scale.y;
  rig.update(pose, 2);
  expect(smile.scale.y).toBeGreaterThan(restingSmile);

  sampleHumanActivityPose("sleep", 0, pose);
  rig.update(pose, 0);
  const chest = rig.group.getObjectByName("torso-core")!;
  const blanket = rig.group.getObjectByName("duvet")!;
  const chestDepth = chest.scale.z, blanketHeight = blanket.scale.y;
  rig.update(pose, 1.125);
  expect(chest.scale.z).toBeGreaterThan(chestDepth);
  expect(blanket.scale.y).toBeGreaterThan(blanketHeight);
  sampleHumanActivityPose("strength", 0, pose);
  rig.update(pose, 1.125);
  expect(chest.scale.z).toBe(chestDepth);
  expect(blanket.scale.y).toBe(blanketHeight);
  rig.dispose();
});

test("borne le temps des réactions sans produire de transformation ou opacité invalide", () => {
  const rig = createHumanActivityRig();
  const pose = createHumanActivityPose();
  for (const scene of humanAtlasSceneIds) {
    sampleHumanActivityPose(scene, 0, pose);
    for (const time of [-100, Number.MAX_VALUE, NaN, Infinity]) {
      rig.update(pose, time);
      rig.group.updateMatrixWorld(true);
      rig.group.traverseVisible((object) => {
        expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true);
        if (object instanceof THREE.Mesh && object.userData.activityEffect) {
          expect(object.material.opacity).toBeGreaterThanOrEqual(0);
          expect(object.material.opacity).toBeLessThanOrEqual(1);
        }
      });
    }
  }
  rig.dispose();
});
