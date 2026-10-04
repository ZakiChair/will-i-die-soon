import * as THREE from "three";

import type { HumanActivityPose } from "./human-activity-motion";

type Attachments = {
  head: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Mesh;
  blanket: THREE.Mesh;
};

/** Réactions décoratives du personnage ; le rig reste propriétaire de l’horloge. */
export function createHumanActivityEffects({ head, torso, chest, blanket }: Attachments) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.MeshBasicMaterial>();
  const groups: THREE.Group[] = [];
  const own = <T extends THREE.BufferGeometry>(geometry: T) => { geometries.add(geometry); return geometry; };
  const paint = (color: string, opacity = 1) => {
    const value = new THREE.MeshBasicMaterial({ color, opacity, transparent: true,
      depthWrite: false, toneMapped: false, blending: THREE.NormalBlending });
    materials.add(value);
    return value;
  };
  const group = (name: string, parent: THREE.Object3D) => {
    const value = new THREE.Group();
    value.name = name;
    parent.add(value);
    groups.push(value);
    return value;
  };
  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: THREE.MeshBasicMaterial) => {
    const value = new THREE.Mesh(geometry, material);
    value.name = name;
    value.userData.activityEffect = true;
    parent.add(value);
    return value;
  };
  const tube = (points: THREE.Vector3[], radius = 0.013) => own(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points), 20, radius, 5, false,
  ));
  // Les traits épousent la surface elliptique de la tête, y compris de trois quarts.
  const facePoint = (x: number, y: number) => new THREE.Vector3(x, y,
    0.295 * Math.sqrt(Math.max(0.02, 1 - (x / 0.32) ** 2 - (y / 0.435) ** 2)) + 0.018);
  const faceStroke = (parent: THREE.Group, name: string, surface: THREE.MeshBasicMaterial,
    point: (t: number) => THREE.Vector3, radius = 0.013) =>
    mesh(parent, name, tube(Array.from({ length: 17 }, (_, i) => point(i / 16)), radius), surface);
  const sphere = own(new THREE.SphereGeometry(1, 12, 8));
  const faceColor = "#0a6b5e";

  const happy = group("meal-expression", head);
  const happyInk = paint(faceColor);
  const smile = faceStroke(happy, "happy-smile", happyInk,
    (t) => facePoint((t - 0.5) * 0.33, -0.075 - 0.115 * Math.sin(Math.PI * t)), 0.017);
  for (const side of [-1, 1]) faceStroke(happy, `happy-eye-${side}`, happyInk,
    (t) => facePoint(side * 0.12 + (t - 0.5) * 0.095, 0.07 + 0.038 * Math.sin(Math.PI * t)));
  const cheekInk = paint("#b77885", 0.3);
  for (const side of [-1, 1]) {
    const cheek = mesh(happy, `happy-cheek-${side}`, sphere, cheekInk);
    cheek.position.copy(facePoint(side * 0.205, -0.025));
    cheek.scale.set(0.048, 0.026, 0.008);
  }

  const sleeping = group("sleep-expression", head);
  const sleepInk = paint(faceColor);
  for (const side of [-1, 1]) faceStroke(sleeping, `closed-eye-${side}`, sleepInk,
    (t) => facePoint(side * 0.115 + (t - 0.5) * 0.10, 0.055 - 0.025 * Math.sin(Math.PI * t)));
  faceStroke(sleeping, "resting-mouth", sleepInk,
    (t) => facePoint((t - 0.5) * 0.095, -0.135 - 0.008 * Math.sin(Math.PI * t)), 0.009);
  const dreamGeometry = tube([
    new THREE.Vector3(-0.06, 0.07, 0), new THREE.Vector3(0.06, 0.07, 0),
    new THREE.Vector3(-0.06, -0.07, 0), new THREE.Vector3(0.06, -0.07, 0),
  ], 0.010);
  const dreams = Array.from({ length: 3 }, (_, index) => {
    const value = mesh(sleeping, `sleep-drift-${index}`, dreamGeometry, paint("#6a4c84"));
    return value;
  });

  const running = group("running-expression", head);
  const runInk = paint(faceColor);
  for (const side of [-1, 1]) {
    const eye = mesh(running, `running-eye-${side}`, sphere, runInk);
    eye.position.copy(facePoint(side * 0.105, 0.075));
    eye.scale.set(0.016, 0.025, 0.009);
  }
  const breathingMouth = faceStroke(running, "running-breath", runInk,
    (t) => facePoint(Math.cos(t * Math.PI * 2) * 0.04, -0.13 + Math.sin(t * Math.PI * 2) * 0.05), 0.011);
  const dropGeometry = own(new THREE.LatheGeometry([
    new THREE.Vector2(0, -1), new THREE.Vector2(0.52, -0.83),
    new THREE.Vector2(0.66, -0.42), new THREE.Vector2(0.48, 0.12),
    new THREE.Vector2(0.18, 0.67), new THREE.Vector2(0, 1),
  ], 12));
  const drops = Array.from({ length: 8 }, (_, index) =>
    mesh(running, `sweat-drop-${index}`, dropGeometry, paint("#286c82")));

  const focused = group("strength-expression", head);
  const effortInk = paint(faceColor);
  for (const side of [-1, 1]) faceStroke(focused, `focused-eye-${side}`, effortInk,
    (t) => facePoint(side * 0.105 + (t - 0.5) * 0.09, 0.07 + side * (t - 0.5) * 0.035));
  faceStroke(focused, "effort-mouth", effortInk,
    (t) => facePoint((t - 0.5) * 0.10, -0.13 + Math.sin(t * Math.PI) * 0.017), 0.012);
  const effort = group("strength-effort", torso);
  const effortPulse = paint("#0a6b5e");
  for (const side of [-1, 1]) for (let index = 0; index < 2; index += 1) {
    mesh(effort, `effort-mark-${side}-${index}`, tube(Array.from({ length: 9 }, (_, step) => {
      const t = step / 8;
      return new THREE.Vector3(side * (0.66 + index * 0.10 + Math.sin(t * Math.PI) * 0.04), 0.32 + t * 0.32, 0.12);
    }), 0.010), effortPulse);
  }

  const weight = (value: number) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
  let disposed = false;
  return {
    update(pose: HumanActivityPose, timeSeconds = 0) {
      if (disposed) return;
      // 36 s est un multiple des cycles de course, repas, effort et sommeil.
      const time = Number.isFinite(timeSeconds) ? ((timeSeconds % 36) + 36) % 36 : 0;
      const mealWeight = weight(pose.props.table), runWeight = weight(pose.props.track);
      const sleepWeight = weight(pose.props.bed), forceWeight = weight(pose.props.barbell);
      const joy = (1 - Math.cos(time / 4 * Math.PI * 2)) / 2;
      happy.visible = mealWeight > 0.01;
      happyInk.opacity = mealWeight * 0.9;
      cheekInk.opacity = mealWeight * (0.18 + joy * 0.16);
      smile.scale.y = 0.88 + joy * 0.18;

      sleeping.visible = sleepWeight > 0.01;
      sleepInk.opacity = sleepWeight * 0.8;
      const breath = Math.sin(time / 4.5 * Math.PI * 2);
      chest.scale.z = 0.62 * (1 + sleepWeight * breath * 0.045);
      blanket.scale.y = 0.33 * (1 + sleepWeight * breath * 0.035);
      for (let index = 0; index < dreams.length; index += 1) {
        const phase = (time / 4.5 + index / dreams.length) % 1;
        dreams[index].position.set(0.29 + phase * 0.43, 0.08 + phase * 0.18, 0.40 + phase * 0.52);
        dreams[index].scale.setScalar(0.75 + phase * 0.5);
        dreams[index].material.opacity = sleepWeight * Math.sin(Math.PI * phase) * 0.7;
      }

      running.visible = runWeight > 0.01;
      runInk.opacity = runWeight * 0.85;
      breathingMouth.scale.y = 0.85 + Math.sin(time * Math.PI * 2) * 0.15;
      for (let index = 0; index < drops.length; index += 1) {
        const phase = (time / 1.2 + index / drops.length) % 1;
        const side = index % 2 === 0 ? -1 : 1;
        drops[index].position.set(side * (0.30 + phase * (0.40 + index % 3 * 0.08)),
          0.24 - phase * 0.96, 0.10 + phase * 0.13);
        const size = Math.sin(Math.PI * phase) ** 0.45;
        drops[index].scale.set(0.085 * size, 0.105 * size, 0.065 * size);
        drops[index].rotation.z = side * (0.18 + phase * 0.28);
        drops[index].material.opacity = runWeight * Math.sin(Math.PI * phase) * 0.9;
      }

      focused.visible = effort.visible = forceWeight > 0.01;
      effortInk.opacity = forceWeight * 0.86;
      effortPulse.opacity = forceWeight * (0.28 + Math.abs(Math.sin(time * Math.PI * 6)) * 0.4);
      effort.scale.x = 1 + Math.sin(time * Math.PI * 12) * 0.02;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const value of groups) { value.removeFromParent(); value.clear(); }
      for (const geometry of geometries) { try { geometry.dispose(); } catch { /* Libérer les autres ressources. */ } }
      for (const material of materials) { try { material.dispose(); } catch { /* Libérer les autres ressources. */ } }
      geometries.clear();
      materials.clear();
    },
  };
}
