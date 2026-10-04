import * as THREE from "three";

import { HUMAN_ACTIVITY_BAR, HUMAN_ACTIVITY_JOINTS as J, HUMAN_ACTIVITY_PROPS, type HumanActivityPose } from "./human-activity-motion";

import { createHumanTranslucentMaterial } from "./human-translucent-material";
import { createHumanActivityEffects } from "./human-activity-effects";

type JointName = keyof typeof J;
type Link = { mesh: THREE.Mesh; from: JointName; to: JointName; width: number; depth: number };
type Prop = { group: THREE.Group; materials: { material: THREE.MeshStandardMaterial; opacity: number }[] };

export type HumanActivityRig = {
  group: THREE.Group;
  bounds: THREE.Box3;
  update: (pose: HumanActivityPose, timeSeconds?: number) => void;
  dispose: () => void;
};

/** Un personnage et ses accessoires partagent leurs géométries ; aucune boucle d’animation propre. */
export function createHumanActivityRig(): HumanActivityRig {
  const group = new THREE.Group();
  group.name = "human-activity";
  const body = new THREE.Group();
  body.name = "body";
  group.add(body);
  const bounds = new THREE.Box3(new THREE.Vector3(-3.2, -2.76, -2.85), new THREE.Vector3(3.2, 2.5, 3.1));
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const own = <T extends THREE.BufferGeometry>(geometry: T): T => { geometries.add(geometry); return geometry; };
  const sphere = own(new THREE.SphereGeometry(1, 20, 14));
  const capsule = own(new THREE.CapsuleGeometry(0.12, 0.76, 6, 16));
  const cylinder = own(new THREE.CylinderGeometry(1, 0.88, 1, 16));
  const box = own(new THREE.BoxGeometry(1, 1, 1));
  const torsoProfile = new THREE.SplineCurve([
    new THREE.Vector2(0, -0.82), new THREE.Vector2(0.34, -0.66),
    new THREE.Vector2(0.38, -0.34), new THREE.Vector2(0.37, 0),
    new THREE.Vector2(0.49, 0.48), new THREE.Vector2(0.44, 0.69),
    new THREE.Vector2(0.15, 0.84), new THREE.Vector2(0, 0.84),
  ]);
  const torsoShape = own(new THREE.LatheGeometry(torsoProfile.getPoints(40), 24));
  const bowlShape = own(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
  const material = (color: string, prop?: Prop, metalness = 0, opacity = 1) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.42 : 0.78,
      metalness, blending: THREE.NormalBlending, transparent: !!prop, opacity });
    materials.add(value);
    if (prop) prop.materials.push({ material: value, opacity });
    return value;
  };
  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, surface: THREE.Material,
    x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const object = new THREE.Mesh(geometry, surface);
    object.name = name;
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const surface = createHumanTranslucentMaterial();
  materials.add(surface);
  const links: Link[] = [];
  const link = (name: string, from: JointName, to: JointName, width: number, depth: number) => {
    const object = mesh(body, name, capsule, surface);
    links.push({ mesh: object, from, to, width, depth });
    return object;
  };
  for (const side of ["left", "right"] as const) {
    link(`${side}-upper-arm`, `${side}Shoulder`, `${side}Elbow`, 0.175, 0.19);
    link(`${side}-forearm`, `${side}Elbow`, `${side}Wrist`, 0.125, 0.14);
    link(`${side}-thigh`, `${side}Hip`, `${side}Knee`, 0.215, 0.235);
    link(`${side}-shin`, `${side}Knee`, `${side}Ankle`, 0.14, 0.16);
  }

  const torso = new THREE.Group();
  torso.name = "torso";
  body.add(torso);
  const torsoCore = mesh(torso, "torso-core", torsoShape, surface, 0, 0, 0, 1, 1, 0.62);
  mesh(torso, "neck", sphere, surface, 0, 0.89, 0, 0.13, 0.14, 0.13);
  const pelvis = mesh(body, "pelvis", sphere, surface, 0, 0, 0, 0.40, 0.27, 0.265);
  const headFrame = new THREE.Group();
  headFrame.name = "head-frame";
  body.add(headFrame);
  // Les expressions décoratives viennent se poser sur cette silhouette neutre.
  mesh(headFrame, "head", sphere, surface, 0, 0, 0, 0.32, 0.435, 0.295);

  const joints: { mesh: THREE.Mesh; joint: JointName }[] = [];
  const feet: { group: THREE.Group; joint: JointName }[] = [];
  for (const side of ["left", "right"] as const) {
    joints.push({ mesh: mesh(body, `${side}-shoulder`, sphere, surface, 0, 0, 0, 0.205, 0.215, 0.215), joint: `${side}Shoulder` });
    joints.push({ mesh: mesh(body, `${side}-elbow`, sphere, surface, 0, 0, 0, 0.12, 0.13, 0.14), joint: `${side}Elbow` });
    joints.push({ mesh: mesh(body, `${side}-hand`, sphere, surface, 0, 0, 0, 0.105, 0.165, 0.09), joint: `${side}Wrist` });
    joints.push({ mesh: mesh(body, `${side}-knee`, sphere, surface, 0, 0, 0, 0.145, 0.16, 0.16), joint: `${side}Knee` });
    const foot = new THREE.Group();
    foot.name = `${side}-foot`;
    body.add(foot);
    mesh(foot, `${side}-anatomical-foot`, sphere, surface, 0, 0, 0.1, 0.155, 0.10, 0.29);
    mesh(foot, `${side}-heel`, sphere, surface, 0, -0.055, -0.08, 0.125, 0.045, 0.125);
    feet.push({ group: foot, joint: `${side}Ankle` });
  }

  const prop = (name: string): Prop => {
    const object = new THREE.Group();
    object.name = name;
    object.visible = false;
    group.add(object);
    return { group: object, materials: [] };
  };
  const bed = prop("bed");
  bed.group.position.fromArray(HUMAN_ACTIVITY_PROPS.bed.position);
  const bedding = material("#e2e5d8", bed);
  const frameMaterial = material("#756854", bed);
  mesh(bed.group, "bed-frame", box, frameMaterial, 0, -0.22, 0, 1.86, 0.14, 5.35);
  mesh(bed.group, "mattress", box, bedding, 0, 0, 0, ...HUMAN_ACTIVITY_PROPS.bed.size);
  mesh(bed.group, "pillow", sphere, material("#f4f5ee", bed), 0, 0.31, -2.08, 0.78, 0.14, 0.47);
  mesh(bed.group, "duvet", sphere, material("#86719a", bed), 0, 0.61, 0.92, 0.89, 0.33, 1.64);
  mesh(bed.group, "duvet-fold", sphere, material("#b4a6c4", bed), 0, 0.76, -0.56, 0.87, 0.11, 0.24);
  for (const x of [-0.72, 0.72]) for (const z of [-2.2, 2.2]) {
    mesh(bed.group, "bed-leg", cylinder, frameMaterial, x, -0.32, z, 0.075, 0.2, 0.075);
  }

  const track = prop("track");
  mesh(track.group, "running-track", box, material("#dde8c4", track, 0, 0.4), 0, -2.705, 0.12, 1.6, 0.015, 5.3);
  const lane = material("#9fb48f", track);
  for (const x of [-0.7, 0.7]) mesh(track.group, "track-edge", box, lane, x, -2.693, 0.12, 0.035, 0.009, 5.2);
  for (let index = 0; index < 4; index += 1) mesh(track.group, "track-mark", box, lane, 0, -2.692, -1.9 + index * 1.3, 0.035, 0.009, 0.5);

  const barbell = prop("barbell");
  const barCylinder = own(new THREE.CylinderGeometry(1, 1, 1, 48));
  const barFaceRing = own(new THREE.TorusGeometry(0.59, 0.011, 6, 48));
  const barGripRing = own(new THREE.TorusGeometry(0.041, 0.005, 5, 24));
  const steel = material("#c3d0d9", barbell, 0.82);
  steel.roughness = 0.22;
  const barSleeve = material("#aabac8", barbell, 0.72);
  barSleeve.roughness = 0.3;
  const barGroove = material("#4f6476", barbell, 0.48);
  const barLettering = material("#f5f8fc", barbell);
  mesh(barbell.group, "bar", barCylinder, steel, 0, 0, 0, 0.038, HUMAN_ACTIVITY_BAR.length, 0.038).rotation.z = Math.PI / 2;

  // Moletage en losanges fusionnés : un seul mesh, sans texture ni coût par image.
  const barKnurlPositions: number[] = [];
  for (const side of [-1, 1]) for (let row = 0; row < 16; row += 1) for (let column = 0; column < 10; column += 1) {
    const centerX = side * HUMAN_ACTIVITY_BAR.gripHalfWidth - 0.28 + row * 0.037;
    const centerAngle = column / 10 * Math.PI * 2;
    for (const slope of [-1, 1]) {
      const corners = [
        [centerX - 0.02, centerAngle - slope * 0.22 - 0.035],
        [centerX + 0.02, centerAngle + slope * 0.22 - 0.035],
        [centerX + 0.02, centerAngle + slope * 0.22 + 0.035],
        [centerX - 0.02, centerAngle - slope * 0.22 + 0.035],
      ];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const [x, angle] = corners[index];
        barKnurlPositions.push(x, Math.cos(angle) * 0.039, Math.sin(angle) * 0.039);
      }
    }
  }
  const barKnurlGeometry = own(new THREE.BufferGeometry());
  barKnurlGeometry.setAttribute("position", new THREE.Float32BufferAttribute(barKnurlPositions, 3));
  barKnurlGeometry.computeVertexNormals();
  barGroove.side = THREE.DoubleSide;
  mesh(barbell.group, "bar-knurl", barKnurlGeometry, barGroove);

  // Les chiffres sont des barres fusionnées, partagées par les disques des deux côtés.
  const barDigits: Record<string, readonly number[]> = { "0": [0, 1, 2, 4, 5, 6], "2": [0, 2, 3, 4, 6], "5": [0, 1, 3, 5, 6] };
  const barDigitSegments = [[0, 0.08, 0.062, 0.014], [-0.034, 0.04, 0.014, 0.066], [0.034, 0.04, 0.014, 0.066],
    [0, 0, 0.062, 0.014], [-0.034, -0.04, 0.014, 0.066], [0.034, -0.04, 0.014, 0.066], [0, -0.08, 0.062, 0.014]];
  const barNumberGeometry = (value: number) => {
    const positions: number[] = [];
    const source = box.getAttribute("position"), indices = box.getIndex()!;
    const digits = String(value);
    for (let digit = 0; digit < digits.length; digit += 1) for (const segment of barDigits[digits[digit]]) {
      const [x, y, width, height] = barDigitSegments[segment];
      for (let index = 0; index < indices.count; index += 1) {
        const vertex = indices.getX(index);
        positions.push(source.getX(vertex) * width + x + (digit - 0.5) * 0.105,
          source.getY(vertex) * height + y, source.getZ(vertex) * 0.008);
      }
    }
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  };
  for (const plate of HUMAN_ACTIVITY_BAR.plates) {
    const surface = material(plate.color, barbell, 0.08);
    surface.roughness = 0.58;
    const label = barNumberGeometry(plate.kilograms);
    for (const side of [-1, 1]) {
      const suffix = side < 0 ? "left" : "right";
      mesh(barbell.group, `bar-plate-${plate.kilograms}-${suffix}`, barCylinder, surface,
        side * plate.offset, 0, 0, HUMAN_ACTIVITY_BAR.plateRadius, plate.thickness, HUMAN_ACTIVITY_BAR.plateRadius).rotation.z = Math.PI / 2;
      const faceX = side * (plate.offset + plate.thickness / 2 + 0.007);
      mesh(barbell.group, `bar-plate-rim-${plate.kilograms}-${suffix}`, barFaceRing, surface, faceX, 0, 0).rotation.y = side * Math.PI / 2;
      mesh(barbell.group, `bar-mark-${plate.kilograms}-${suffix}`, label, barLettering, faceX + side * 0.008, 0.02, 0.43).rotation.y = side * Math.PI / 2;
      if (side < 0 && plate.kilograms === 20) {
        mesh(barbell.group, "bar-mark-20-left-inner", label, barLettering,
          -plate.offset + plate.thickness / 2 + 0.015, 0.02, 0.43).rotation.y = Math.PI / 2;
      }
      mesh(barbell.group, `bar-hub-${plate.kilograms}-${suffix}`, barCylinder, steel,
        side * plate.offset, 0, 0, 0.105, plate.thickness + 0.025, 0.105).rotation.z = Math.PI / 2;
    }
  }
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? "left" : "right";
    mesh(barbell.group, `bar-sleeve-${suffix}`, barCylinder, barSleeve, side * 2.505, 0, 0, 0.072, 1.05, 0.072).rotation.z = Math.PI / 2;
    mesh(barbell.group, `bar-stop-${suffix}`, barCylinder, steel, side * 1.985, 0, 0, 0.13, 0.06, 0.13).rotation.z = Math.PI / 2;
    mesh(barbell.group, `bar-collar-${suffix}`, barCylinder, barGroove, side * 2.77, 0, 0, 0.125, 0.09, 0.125).rotation.z = Math.PI / 2;
    mesh(barbell.group, `bar-end-${suffix}`, barCylinder, steel, side * 3.025, 0, 0, 0.076, 0.04, 0.076).rotation.z = Math.PI / 2;
    mesh(barbell.group, `bar-grip-ring-${suffix}`, barGripRing, barGroove, side * 1.08, 0, 0).rotation.y = Math.PI / 2;
  }

  const table = prop("table");
  const wood = material("#756854", table);
  const tableTop = material("#b9aa8f", table);
  mesh(table.group, "table-top", box, tableTop, ...HUMAN_ACTIVITY_PROPS.table.position, ...HUMAN_ACTIVITY_PROPS.table.size);
  for (const x of [-0.7, 0.7]) for (const z of [0.69, 1.47]) {
    mesh(table.group, "table-leg", cylinder, wood, x, -1.72, z, 0.055, 1.96, 0.055);
  }
  const chair = new THREE.Group();
  chair.name = "chair";
  chair.position.fromArray(HUMAN_ACTIVITY_PROPS.chair.position);
  table.group.add(chair);
  mesh(chair, "chair-seat", box, wood, 0, -0.18, 0, ...HUMAN_ACTIVITY_PROPS.chair.size);
  mesh(chair, "chair-back", box, wood, 0, 0.39, -0.47, 1.1, 1.15, 0.09);
  for (const x of [-0.45, 0.45]) for (const z of [-0.4, 0.4]) {
    mesh(chair, "chair-leg", cylinder, wood, x, -0.63, z, 0.05, 0.78, 0.05);
  }
  const meal = new THREE.Group();
  meal.name = "meal";
  meal.position.set(HUMAN_ACTIVITY_PROPS.plate.position[0], HUMAN_ACTIVITY_PROPS.plate.position[1] - 0.025,
    HUMAN_ACTIVITY_PROPS.plate.position[2] + 0.18);
  table.group.add(meal);
  const ceramic = material("#edf2fa", table);
  ceramic.side = THREE.DoubleSide;
  ceramic.roughness = 0.3;
  mesh(meal, "bowl", bowlShape, ceramic, 0, 0, 0, 0.68, 0.045, 0.43);
  const plateRim = own(new THREE.TorusGeometry(1, 0.045, 6, 48));
  mesh(meal, "plate-rim", plateRim, ceramic, 0, 0.006, 0, 0.65, 0.415, 0.35).rotation.x = -Math.PI / 2;

  // Les aliments restent sur l'assiette ; la cible de la cuillère demeure à sa place.
  const eggWhite = material("#fff8e7", table);
  const eggYolk = material("#f4b21b", table);
  eggYolk.roughness = 0.35;
  for (const [index, x, z, angle] of [[0, -0.22, -0.19, -0.25], [1, 0.035, -0.17, 0.4]]) {
    const egg = new THREE.Group();
    egg.name = `fried-egg-${index}`;
    egg.position.set(x, 0, z);
    egg.rotation.y = angle;
    meal.add(egg);
    mesh(egg, `egg-white-${index}`, sphere, eggWhite, 0, 0.032, 0, 0.155, 0.028, 0.105);
    mesh(egg, `egg-white-lobe-${index}`, sphere, eggWhite, -0.067, 0.026, 0.031, 0.092, 0.022, 0.071);
    mesh(egg, `egg-yolk-${index}`, sphere, eggYolk, 0.014, 0.067, -0.006, 0.059, 0.046, 0.056);
  }

  const broccoli = new THREE.Group();
  broccoli.name = "broccoli";
  broccoli.position.set(0.24, 0, 0.16);
  meal.add(broccoli);
  const broccoliStem = material("#7b9e45", table);
  const broccoliGreen = material("#2d713d", table);
  const broccoliTips = material("#4b8a42", table);
  for (const [index, x, z] of [[0, -0.075, -0.025], [1, 0.065, -0.015], [2, 0.006, 0.09]]) {
    mesh(broccoli, `broccoli-stem-${index}`, cylinder, broccoliStem, x, 0.055, z, 0.031, 0.09, 0.029);
    mesh(broccoli, `broccoli-crown-${index}`, sphere, broccoliGreen, x, 0.125, z, 0.087, 0.068, 0.074);
    for (const [bud, dx, dz] of [[0, -0.037, 0.008], [1, 0.026, -0.031], [2, 0.021, 0.033]]) {
      mesh(broccoli, `broccoli-bud-${index}-${bud}`, sphere, broccoliTips, x + dx, 0.162, z + dz, 0.041, 0.035, 0.038);
    }
  }

  const steak = new THREE.Group();
  steak.name = "grilled-steak";
  steak.position.set(-0.285, 0, 0.135);
  steak.rotation.y = -0.3;
  meal.add(steak);
  const steakCrust = material("#914833", table);
  const steakTop = material("#b5694e", table);
  const grillMarks = material("#633c2f", table);
  mesh(steak, "steak-crust", sphere, steakCrust, 0, 0.046, 0, 0.225, 0.049, 0.126);
  mesh(steak, "steak-top", sphere, steakTop, 0.012, 0.077, -0.006, 0.192, 0.028, 0.105);
  for (const [index, x] of [[0, -0.095], [1, 0], [2, 0.095]]) {
    mesh(steak, `steak-grill-${index}`, box, grillMarks, x, 0.102, -0.004, 0.014, 0.006, 0.145).rotation.y = 0.22;
  }

  const fruit = new THREE.Group();
  fruit.name = "fresh-fruit";
  fruit.position.set(0.375, 0, -0.09);
  meal.add(fruit);
  const appleRed = material("#d64c43", table);
  const fruitLeaf = material("#487d3d", table);
  const fruitStem = material("#6d5235", table);
  mesh(fruit, "apple-left", sphere, appleRed, -0.022, 0.072, 0, 0.068, 0.074, 0.069);
  mesh(fruit, "apple-right", sphere, appleRed, 0.025, 0.072, 0, 0.064, 0.071, 0.066);
  mesh(fruit, "apple-stem", cylinder, fruitStem, 0.003, 0.145, 0, 0.009, 0.05, 0.009).rotation.z = -0.2;
  mesh(fruit, "apple-leaf", sphere, fruitLeaf, 0.027, 0.156, 0.005, 0.038, 0.007, 0.018).rotation.z = 0.3;
  const orangePeel = material("#e98a26", table);
  mesh(fruit, "orange", sphere, orangePeel, 0.016, 0.06, 0.14, 0.076, 0.066, 0.073);
  mesh(fruit, "orange-stem", sphere, fruitLeaf, 0.015, 0.124, 0.14, 0.014, 0.004, 0.012);
  const grapes = material("#72508b", table);
  for (const [index, x, y, z] of [[0, -0.13, 0.035, -0.055], [1, -0.085, 0.032, -0.08], [2, -0.105, 0.064, -0.06], [3, -0.15, 0.035, -0.01]]) {
    mesh(fruit, `grape-${index}`, sphere, grapes, x, y, z, 0.031, 0.033, 0.032);
  }
  const spoon = new THREE.Group();
  spoon.name = "spoon";
  table.group.add(spoon);
  const cutlery = material("#abb7b8", table, 0.65);
  mesh(spoon, "spoon-handle", cylinder, cutlery, 0, 0.15, 0, 0.012, 0.3, 0.012);
  mesh(spoon, "spoon-tip", sphere, cutlery, 0, 0.34, 0, 0.06, 0.09, 0.019);

  const effects = createHumanActivityEffects({ head: headFrame, torso, chest: torsoCore,
    blanket: bed.group.getObjectByName("duvet") as THREE.Mesh });
  const props = [bed, track, barbell, table];
  const propNames = ["bed", "track", "barbell", "table"] as const;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const axisY = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  let disposed = false;
  const orient = (object: THREE.Object3D, vertical: THREE.Vector3, face: HumanActivityPose["faceDirection"]) => {
    up.copy(vertical).normalize();
    if (up.lengthSq() < 0.001) up.copy(axisY);
    forward.fromArray(face).normalize();
    right.crossVectors(up, forward).normalize();
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    forward.crossVectors(right, up).normalize();
    basis.makeBasis(right, up, forward);
    object.quaternion.setFromRotationMatrix(basis);
  };

  return {
    group,
    bounds,
    update(pose, timeSeconds = 0) {
      if (disposed) return;
      for (let index = 0; index < links.length; index += 1) {
        const part = links[index];
        a.fromArray(pose.joints, J[part.from] * 3);
        b.fromArray(pose.joints, J[part.to] * 3);
        direction.subVectors(b, a);
        const length = direction.length();
        part.mesh.position.copy(a).add(b).multiplyScalar(0.5);
        part.mesh.scale.set(part.width / 0.12, Math.max(0.001, length), part.depth / 0.12);
        part.mesh.quaternion.setFromUnitVectors(axisY, length > 0.001 ? direction.multiplyScalar(1 / length) : axisY);
      }
      a.fromArray(pose.joints, J.hips * 3);
      b.fromArray(pose.joints, J.chest * 3);
      direction.subVectors(b, a);
      const torsoLength = direction.length();
      torso.position.copy(a).add(b).multiplyScalar(0.5);
      orient(torso, direction, pose.faceDirection);
      torsoCore.scale.y = torsoLength / 1.22;
      pelvis.position.copy(a);
      pelvis.quaternion.copy(torso.quaternion);
      a.fromArray(pose.joints, J.neck * 3);
      headFrame.position.fromArray(pose.joints, J.head * 3);
      direction.subVectors(headFrame.position, a);
      orient(headFrame, direction, pose.faceDirection);
      const sleepWeight = Number.isFinite(pose.props.bed) ? Math.max(0, Math.min(1, pose.props.bed)) : 0;
      for (let index = 0; index < joints.length; index += 1) {
        joints[index].mesh.position.fromArray(pose.joints, J[joints[index].joint] * 3);
        joints[index].mesh.quaternion.copy(torso.quaternion);
      }
      for (let index = 0; index < feet.length; index += 1) {
        feet[index].group.visible = sleepWeight < 0.98;
        feet[index].group.position.fromArray(pose.joints, J[feet[index].joint] * 3);
        // Une flexion de hanche ne fait pas basculer les pieds dans le sol.
        direction.set(0, pose.faceDirection[2], -pose.faceDirection[1]);
        orient(feet[index].group, direction, pose.faceDirection);
      }
      barbell.group.position.fromArray(pose.bar);
      a.fromArray(pose.joints, J.rightElbow * 3);
      spoon.position.fromArray(pose.joints, J.rightWrist * 3);
      direction.subVectors(spoon.position, a).normalize();
      spoon.quaternion.setFromUnitVectors(axisY, direction.lengthSq() > 0.001 ? direction : axisY);
      for (let index = 0; index < props.length; index += 1) {
        const value = pose.props[propNames[index]];
        const opacity = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
        props[index].group.visible = opacity >= 0.01;
        const surfaces = props[index].materials;
        for (let surface = 0; surface < surfaces.length; surface += 1) {
          surfaces[surface].material.opacity = surfaces[surface].opacity * opacity;
          surfaces[surface].material.depthWrite = surfaces[surface].material.opacity >= 0.99;
        }
      }
      effects.update(pose, timeSeconds);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      effects.dispose();
      for (const geometry of geometries) { try { geometry.dispose(); } catch { /* Continuer la libération. */ } }
      for (const surface of materials) { try { surface.dispose(); } catch { /* Continuer la libération. */ } }
      geometries.clear();
      materials.clear();
      group.clear();
    },
  };
}
