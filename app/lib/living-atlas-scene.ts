import * as THREE from "three";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import {
  LIVING_ATLAS_POSITION_COUNT,
  writeLivingAtlasFilaments,
} from "./living-atlas-geometry";

type AtlasState = { progress: number; scene: HumanAtlasSceneId };

const AXIS_COLORS: Record<HumanAtlasSceneId, string> = {
  breath: "#88dbff",
  strength: "#ffd08c",
  sleep: "#bcb0ff",
  energy: "#98ebcb",
};
const THREAD_MOTES = 416;
const HALO_MOTES = 96;
const MOTE_COUNT = THREAD_MOTES + HALO_MOTES;

const pointVertex = `
  attribute float aSize;
  attribute float aOpacity;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vOpacity;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * uPixelRatio * 8.0 / max(1.0, -viewPosition.z), 1.0, 12.0);
    vOpacity = aOpacity * (0.82 + 0.18 * sin(uTime * 0.65 + aSize * 3.0));
  }
`;
const pointFragment = `
  uniform vec3 uColor;
  varying float vOpacity;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float alpha = (1.0 - smoothstep(0.1, 0.5, radius)) * vOpacity;
    if (alpha < 0.01) discard;
    vec3 color = mix(uColor, vec3(1.0), 0.55 * (1.0 - smoothstep(0.0, 0.25, radius)));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function safeRelease(release: () => void): void {
  try {
    release();
  } catch {
    // Chaque ressource doit pouvoir être libérée même si une autre échoue.
  }
}

export class LivingAtlasScene {
  private readonly world = new THREE.Scene();
  private readonly sculpture = new THREE.Group();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly positions = new Float32Array(LIVING_ATLAS_POSITION_COUNT);
  private readonly motePositions = new Float32Array(MOTE_COUNT * 3);
  private readonly color = new THREE.Color(AXIS_COLORS.breath);
  private readonly targetColor = new THREE.Color(AXIS_COLORS.breath);
  private readonly pointUniforms = {
    uColor: { value: this.color },
    uPixelRatio: { value: 1 },
    uTime: { value: 0 },
  };
  private readonly canvas: HTMLCanvasElement;
  private renderer?: THREE.WebGLRenderer;
  private observer?: ResizeObserver;
  private filamentGeometry?: THREE.BufferGeometry;
  private moteGeometry?: THREE.BufferGeometry;
  private filamentMaterial?: THREE.LineBasicMaterial;
  private fallbackResizeListener = false;
  private frame: number | null = null;
  private frameGeneration = 0;
  private previousTime: number | null = null;
  private elapsed = 0;
  private running = false;
  private disposed = false;
  private failureReported = false;

  constructor(
    private readonly host: HTMLDivElement,
    private readonly getState: () => AtlasState,
    private readonly onFailure: () => void,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.tabIndex = -1;
    Object.assign(this.canvas.style, {
      display: "block",
      height: "100%",
      pointerEvents: "none",
      width: "100%",
    });

    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: this.canvas,
        powerPreference: "low-power",
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.debug.onShaderError = () => {
        throw new Error("Living atlas shader compilation failed");
      };
      this.canvas.addEventListener("webglcontextlost", this.contextLost);
      this.host.appendChild(this.canvas);
      this.world.add(this.sculpture);
      this.buildSculpture();

      if (typeof ResizeObserver === "function") {
        this.observer = new ResizeObserver(this.resize);
        this.observer.observe(host);
      } else {
        this.fallbackResizeListener = true;
        window.addEventListener("resize", this.resize, { passive: true });
      }
      this.resize();
    } catch {
      this.fail();
    }
  }

  private buildSculpture(): void {
    const geometry = new THREE.BufferGeometry();
    this.geometries.add(geometry);
    this.filamentGeometry = geometry;
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);

    const shades = new Float32Array(this.positions.length);
    for (let vertex = 0; vertex < shades.length / 3; vertex += 1) {
      // Une variation stable dessine les entrelacements sans scintillement aléatoire.
      const shade = 0.48 + 0.52 * (0.5 + 0.5 * Math.sin(vertex * 0.027));
      shades.set([shade, shade, shade], vertex * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
    const material = new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: this.color,
      depthWrite: false,
      opacity: 0.44,
      transparent: true,
      vertexColors: true,
    });
    this.materials.add(material);
    this.filamentMaterial = material;
    this.sculpture.add(new THREE.LineSegments(geometry, material));

    const moteGeometry = new THREE.BufferGeometry();
    this.geometries.add(moteGeometry);
    this.moteGeometry = moteGeometry;
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(this.motePositions, 3).setUsage(THREE.DynamicDrawUsage));
    moteGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
    const sizes = new Float32Array(MOTE_COUNT);
    const opacity = new Float32Array(MOTE_COUNT);
    for (let index = 0; index < MOTE_COUNT; index += 1) {
      const isHalo = index >= THREAD_MOTES;
      sizes[index] = isHalo ? 1.2 + (index % 4) * 0.3 : 2.4 + (index % 7) * 0.52;
      opacity[index] = isHalo ? 0.2 : 0.64 + (index % 5) * 0.08;
      if (isHalo) {
        const seed = index - THREAD_MOTES;
        const y = 1 - (2 * (seed + 0.5)) / HALO_MOTES;
        const angle = seed * 2.399963229728653;
        const radius = 2.4 + 0.35 * Math.sin(seed * 1.73);
        const belt = Math.sqrt(1 - y * y) * radius;
        this.motePositions.set([Math.cos(angle) * belt, y * radius, Math.sin(angle) * belt], index * 3);
      }
    }
    moteGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    moteGeometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacity, 1));
    const moteMaterial = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fragmentShader: pointFragment,
      transparent: true,
      uniforms: this.pointUniforms,
      vertexShader: pointVertex,
    });
    this.materials.add(moteMaterial);
    this.sculpture.add(new THREE.Points(moteGeometry, moteMaterial));
  }

  private update(delta: number): void {
    const state = this.getState();
    const progress = Number.isFinite(state.progress) ? THREE.MathUtils.clamp(state.progress, 0, 1) : 0;
    this.elapsed += delta;
    this.targetColor.set(AXIS_COLORS[state.scene] ?? AXIS_COLORS.breath);
    if (delta === 0) this.color.copy(this.targetColor);
    else this.color.lerp(this.targetColor, 1 - Math.exp(-delta * 3.2));
    this.filamentMaterial?.color.copy(this.color);
    this.pointUniforms.uTime.value = this.elapsed;

    writeLivingAtlasFilaments(this.positions, progress, this.elapsed);
    if (this.filamentGeometry) this.filamentGeometry.getAttribute("position").needsUpdate = true;
    const vertices = this.positions.length / 3;
    for (let index = 0; index < THREAD_MOTES; index += 1) {
      const source = Math.floor((index * vertices) / THREAD_MOTES) * 3;
      const destination = index * 3;
      this.motePositions[destination] = this.positions[source];
      this.motePositions[destination + 1] = this.positions[source + 1];
      this.motePositions[destination + 2] = this.positions[source + 2];
    }
    if (this.moteGeometry) this.moteGeometry.getAttribute("position").needsUpdate = true;
    this.sculpture.rotation.set(
      0.22 + progress * 0.46 + Math.sin(this.elapsed * 0.19) * 0.035,
      -0.35 + progress * Math.PI * 2 + Math.sin(this.elapsed * 0.16) * 0.18,
      -0.2 + progress * 0.5,
    );
    this.sculpture.scale.setScalar(1 + Math.sin(this.elapsed * 0.68) * 0.012);
  }

  private resize = (): void => {
    if (this.disposed || !this.renderer) return;
    try {
      const width = Math.max(1, this.host.clientWidth);
      const height = Math.max(1, this.host.clientHeight);
      const cap = window.innerWidth <= 780 ? 1.5 : 2;
      const ratio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
      this.pointUniforms.uPixelRatio.value = THREE.MathUtils.clamp(ratio, 1, cap);
      this.renderer.setPixelRatio(this.pointUniforms.uPixelRatio.value);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      const halfVertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * this.camera.aspect);
      const distance = 2.72 / Math.sin(Math.min(halfVertical, halfHorizontal));
      this.camera.position.set(0, 0, distance);
      this.camera.far = Math.max(60, distance + 10);
      this.camera.updateProjectionMatrix();
      this.update(0);
      this.renderer.render(this.world, this.camera);
    } catch {
      this.fail();
    }
  };

  private schedule(): void {
    if (!this.running || this.disposed || this.frame !== null) return;
    const generation = this.frameGeneration;
    this.frame = requestAnimationFrame((time) => {
      // Un ancien callback ne doit pas reprendre la main après une pause/reprise.
      if (this.disposed || !this.running || generation !== this.frameGeneration) return;
      this.frame = null;
      try {
        const delta = this.previousTime === null ? 0 : THREE.MathUtils.clamp((time - this.previousTime) / 1000, 0, 0.05);
        this.previousTime = time;
        this.update(delta);
        this.renderer?.render(this.world, this.camera);
        this.schedule();
      } catch {
        this.fail();
      }
    });
  }

  setRunning(running: boolean): void {
    if (this.disposed || this.running === running) return;
    this.running = running;
    this.previousTime = null;
    this.frameGeneration += 1;
    if (running) {
      try {
        this.schedule();
      } catch {
        this.fail();
      }
    } else if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  private contextLost = (event: Event): void => {
    event.preventDefault();
    this.fail();
  };

  private fail(): void {
    if (this.failureReported || this.disposed) return;
    this.failureReported = true;
    this.dispose();
    safeRelease(this.onFailure);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    this.frameGeneration += 1;
    if (this.frame !== null) safeRelease(() => cancelAnimationFrame(this.frame!));
    this.frame = null;
    safeRelease(() => this.observer?.disconnect());
    if (this.fallbackResizeListener) safeRelease(() => window.removeEventListener("resize", this.resize));
    safeRelease(() => this.canvas.removeEventListener("webglcontextlost", this.contextLost));
    for (const geometry of this.geometries) safeRelease(() => geometry.dispose());
    for (const material of this.materials) safeRelease(() => material.dispose());
    this.geometries.clear();
    this.materials.clear();
    this.world.clear();
    this.sculpture.clear();
    safeRelease(() => this.renderer?.dispose());
    safeRelease(() => this.renderer?.forceContextLoss());
    safeRelease(() => this.canvas.remove());
  }
}
