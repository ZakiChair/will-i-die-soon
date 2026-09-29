import * as THREE from "three";

export type HumanEnergyFilaments = {
  update(timeSeconds: number): void;
  resize(height: number, pixelRatio?: number): void;
  dispose(): void;
};

type Profile = { points: number; strands: number; steps: number };
type Shape = { kind: "sphere" | "capsule" | "cylinder"; radius: number; length: number; bottomRadius: number };
type GeometryPair = { points: THREE.BufferGeometry; lines: THREE.BufferGeometry };
const TAU = Math.PI * 2;
const TIME_PERIOD = Math.PI * 40;
const PROFILES = {
  torso: { points: 240, strands: 8, steps: 20 },
  head: { points: 200, strands: 8, steps: 16 },
  pelvis: { points: 120, strands: 6, steps: 14 },
  chest: { points: 80, strands: 4, steps: 10 },
  limb: { points: 96, strands: 6, steps: 14 },
  hand: { points: 48, strands: 4, steps: 12 },
  foot: { points: 64, strands: 4, steps: 12 },
} as const satisfies Record<string, Profile>;

function profileFor(name: string): Profile | null {
  if (name === "torso-core") return PROFILES.torso;
  if (name === "head") return PROFILES.head;
  if (name === "pelvis") return PROFILES.pelvis;
  if (name === "chest-left" || name === "chest-right") return PROFILES.chest;
  if (/^(left|right)-(upper-arm|forearm|thigh|shin)$/.test(name)) return PROFILES.limb;
  if (/^(left|right)-hand$/.test(name)) return PROFILES.hand;
  if (/^(left|right)-anatomical-foot$/.test(name)) return PROFILES.foot;
  return null;
}

function shapeFor(source: THREE.BufferGeometry): Shape | null {
  if (source instanceof THREE.SphereGeometry) {
    return { kind: "sphere", radius: source.parameters.radius, length: 0, bottomRadius: 0 };
  }
  if (source instanceof THREE.CapsuleGeometry) {
    return { kind: "capsule", radius: source.parameters.radius, length: source.parameters.height, bottomRadius: 0 };
  }
  if (source instanceof THREE.CylinderGeometry) {
    return { kind: "cylinder", radius: source.parameters.radiusTop, length: source.parameters.height, bottomRadius: source.parameters.radiusBottom };
  }
  return null;
}

/** Coordonnées locales de la surface réelle, avec une très fine marge évitant le z-fighting. */
function surfacePoint(shape: Shape, latitude: number, angle: number, target: Float32Array, offset: number): void {
  let y: number, radius: number, normalY: number;
  if (shape.kind === "sphere") {
    y = latitude * shape.radius;
    radius = Math.sqrt(Math.max(0, 1 - latitude * latitude)) * shape.radius;
    normalY = latitude;
  } else if (shape.kind === "capsule") {
    y = latitude * (shape.length / 2 + shape.radius);
    const cap = Math.max(0, Math.abs(y) - shape.length / 2);
    radius = Math.sqrt(Math.max(0, shape.radius ** 2 - cap ** 2));
    normalY = Math.sign(y) * cap / shape.radius;
  } else {
    y = latitude * shape.length / 2;
    radius = shape.bottomRadius + (shape.radius - shape.bottomRadius) * (latitude + 1) / 2;
    normalY = (shape.bottomRadius - shape.radius) / Math.hypot(shape.length, shape.bottomRadius - shape.radius);
  }
  const margin = shape.radius * (shape.kind === "capsule" ? 0.032 : 0.018);
  radius += margin * Math.sqrt(Math.max(0, 1 - normalY * normalY));
  target[offset] = Math.cos(angle) * radius;
  target[offset + 1] = y + normalY * margin;
  target[offset + 2] = Math.sin(angle) * radius;
}

function geometryFor(shape: Shape, profile: Profile, owned: Set<THREE.BufferGeometry>): GeometryPair {
  const points = new Float32Array(profile.points * 3), phases = new Float32Array(profile.points);
  for (let index = 0; index < profile.points; index++) {
    const latitude = ((index + 0.5) / profile.points * 2 - 1) * 0.985;
    const angle = index * 2.399963229728653 + 0.16 * Math.sin(index * 1.7);
    surfacePoint(shape, latitude, angle, points, index * 3);
    phases[index] = (index * 0.61803398875) % 1;
  }

  const segments = profile.strands * profile.steps;
  const lines = new Float32Array(segments * 6), linePhases = new Float32Array(segments * 2);
  for (let strand = 0; strand < profile.strands; strand++) {
    const phase = strand / profile.strands * TAU;
    for (let step = 0; step < profile.steps; step++) {
      for (let end = 0; end < 2; end++) {
        const fraction = (step + end) / profile.steps;
        let latitude = Math.sin((fraction * 2 - 1) * 1.35);
        if (shape.kind === "capsule") {
          // Un quart des sommets pour chaque cap : les chords restent hors de la peau.
          const halfHeight = shape.length / 2 + shape.radius;
          if (fraction < 0.25) {
            const angle = 0.2 + fraction * 4 * (Math.PI / 2 - 0.2);
            latitude = (-shape.length / 2 - shape.radius * Math.cos(angle)) / halfHeight;
          } else if (fraction > 0.75) {
            const angle = 0.2 + (1 - fraction) * 4 * (Math.PI / 2 - 0.2);
            latitude = (shape.length / 2 + shape.radius * Math.cos(angle)) / halfHeight;
          } else latitude = (fraction - 0.5) * 2 * shape.length / halfHeight;
        }
        const angle = phase + 0.34 * Math.sin(latitude * 2.4 + phase) + 0.22 * latitude;
        const vertex = (strand * profile.steps + step) * 2 + end;
        surfacePoint(shape, latitude, angle, lines, vertex * 3);
        linePhases[vertex] = fraction * 0.65 + strand / profile.strands;
      }
    }
  }
  const pointGeometry = new THREE.BufferGeometry();
  owned.add(pointGeometry);
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  pointGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  pointGeometry.computeBoundingSphere();
  const lineGeometry = new THREE.BufferGeometry();
  owned.add(lineGeometry);
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(lines, 3));
  lineGeometry.setAttribute("aPhase", new THREE.BufferAttribute(linePhases, 1));
  lineGeometry.computeBoundingSphere();
  return { points: pointGeometry, lines: lineGeometry };
}

function createMaterial(points: boolean, time: THREE.IUniform<number>, size: THREE.IUniform<number>, lineOpacity: THREE.IUniform<number>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: points ? "human-energy-points" : "human-energy-lines",
    uniforms: {
      uTime: time,
      uColor: { value: new THREE.Color(points ? "#cefbff" : "#9cecff") },
      uOpacity: points ? { value: 0.9 } : lineOpacity,
      uPointSize: size,
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPointSize;
      attribute float aPhase;
      varying float vGlow;
      void main() {
        float current = sin(aPhase * 6.28318530718 - uTime * 0.8);
        float breath = sin(uTime * 0.35 + aPhase * 3.14159265359);
        vGlow = 0.64 + current * 0.23 + breath * 0.09;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // Taille physique calculée au resize, toujours bornée à 3 px.
        gl_PointSize = min(3.0, uPointSize * (0.88 + 0.12 * vGlow));
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vGlow;
      void main() {
        float alpha = uOpacity * (0.8 + 0.2 * vGlow);
        ${points ? `
          float radius = length(gl_PointCoord * 2.0 - 1.0);
          if (radius > 1.0) discard;
          alpha *= 1.0 - smoothstep(0.1, 1.0, radius);
        ` : ""}
        vec3 color = mix(uColor, vec3(0.78, 0.96, 1.0), vGlow * vGlow * 0.35);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    linewidth: 1,
  });
}

function release(action: () => void): void {
  try { action(); } catch { /* Chaque ressource restante doit aussi être libérée. */ }
}

/** Filaments locaux : les articulations du rig portent l'effet, sans boucle RAF ni textures. */
export function createHumanEnergyFilaments(body: THREE.Group): HumanEnergyFilaments {
  const objects: (THREE.Points | THREE.LineSegments)[] = [];
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const cache = new Map<THREE.BufferGeometry, Map<Profile, GeometryPair>>();
  const time = { value: 0 };
  const size = { value: 2.35 }, lineOpacity = { value: 0.82 };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const object of objects) release(() => object.removeFromParent());
    for (const geometry of geometries) release(() => geometry.dispose());
    for (const material of materials) release(() => material.dispose());
    objects.length = 0; geometries.clear(); materials.clear(); cache.clear();
  };
  try {
    const pointMaterial = createMaterial(true, time, size, lineOpacity); materials.add(pointMaterial);
    const lineMaterial = createMaterial(false, time, size, lineOpacity); materials.add(lineMaterial);
    const targets: { mesh: THREE.Mesh; profile: Profile; shape: Shape }[] = [];
    let pointCount = 0, segmentCount = 0;
    // Recensement terminé avant ajout de children : le parcours du corps reste stable.
    body.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const profile = profileFor(object.name), shape = shapeFor(object.geometry);
      if (!profile || !shape || shape.radius <= 0 || !Number.isFinite(shape.radius + shape.length + shape.bottomRadius)) return;
      if (pointCount + profile.points > 2000 || segmentCount + profile.strands * profile.steps > 1500) return;
      targets.push({ mesh: object, profile, shape });
      pointCount += profile.points; segmentCount += profile.strands * profile.steps;
    });
    for (const { mesh, profile, shape } of targets) {
      let profiles = cache.get(mesh.geometry);
      if (!profiles) { profiles = new Map(); cache.set(mesh.geometry, profiles); }
      let geometry = profiles.get(profile);
      if (!geometry) { geometry = geometryFor(shape, profile, geometries); profiles.set(profile, geometry); }
      const points = new THREE.Points(geometry.points, pointMaterial);
      points.name = `${mesh.name}-energy-points`;
      const lines = new THREE.LineSegments(geometry.lines, lineMaterial);
      lines.name = `${mesh.name}-energy-lines`;
      points.renderOrder = lines.renderOrder = 2;
      objects.push(points, lines);
      mesh.add(points, lines);
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    resize(height, pixelRatio = 1) {
      if (disposed) return;
      const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 600;
      const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
      const relativeHeight = safeHeight / 600;
      size.value = Math.min(3, Math.max(0.5, 2.35 * Math.min(1, Math.max(0.35, relativeHeight)) * ratio));
      lineOpacity.value = 0.82 * Math.min(1, Math.max(0.88, relativeHeight));
    },
    update(timeSeconds) {
      if (disposed) return;
      time.value = Number.isFinite(timeSeconds) ? timeSeconds % TIME_PERIOD : 0;
    },
    dispose,
  };
}
