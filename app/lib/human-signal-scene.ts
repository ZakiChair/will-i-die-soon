import * as THREE from "three";

import { humanAtlasSceneIds, type HumanAtlasSceneId } from "../data/human-atlas";
import { createHumanActivityPose, sampleHumanActivityPose, type HumanActivityPose } from "./human-activity-motion";
import { createHumanActivityRig } from "./human-activity-rig";

type AtlasState = { progress: number; scene: HumanAtlasSceneId };
type CameraFrame = { center: THREE.Vector3; halfWidth: number; halfHeight: number; depth: number };
const TRANSITION_SECONDS = 0.95;
const SCROLL_PIVOT = THREE.MathUtils.degToRad(6);
const SCROLL_PHASE_SECONDS = 3.5;
const SCROLL_RESPONSE = 9;
const SCROLL_MAX_SPEED = 0.45;
const MEASURED_PIVOTS = [-SCROLL_PIVOT, 0, SCROLL_PIVOT];
const VIEW_DIRECTION = new THREE.Vector3(8, 5, 10).normalize();
const VIEW_RIGHT = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), VIEW_DIRECTION).normalize();
const VIEW_UP = new THREE.Vector3().crossVectors(VIEW_DIRECTION, VIEW_RIGHT).normalize();
const PROP_KEYS = ["bed", "barbell", "table", "track"] as const;

function safeRelease(release: () => void): void {
  try { release(); } catch { /* Les autres ressources restent libérées indépendamment. */ }
}

function copyPose(target: HumanActivityPose, source: HumanActivityPose): void {
  target.joints.set(source.joints);
  for (let axis = 0; axis < 3; axis += 1) {
    target.bar[axis] = source.bar[axis];
    target.faceDirection[axis] = source.faceDirection[axis];
  }
  for (const key of PROP_KEYS) target.props[key] = source.props[key];
}

function blendPose(target: HumanActivityPose, from: HumanActivityPose, to: HumanActivityPose, amount: number, progress: number): void {
  for (let index = 0; index < target.joints.length; index += 1) target.joints[index] = THREE.MathUtils.lerp(from.joints[index], to.joints[index], amount);
  for (let axis = 0; axis < 3; axis += 1) {
    target.bar[axis] = THREE.MathUtils.lerp(from.bar[axis], to.bar[axis], amount);
    target.faceDirection[axis] = THREE.MathUtils.lerp(from.faceDirection[axis], to.faceDirection[axis], amount);
  }
  const length = Math.hypot(...target.faceDirection);
  for (let axis = 0; axis < 3; axis += 1) target.faceDirection[axis] = length > 0.001 ? target.faceDirection[axis] / length : to.faceDirection[axis];
  for (const key of PROP_KEYS) {
    // Les décors gardent leur taille : laisser la caméra les accueillir avant le fondu entrant.
    const fade = to.props[key] > from.props[key]
      ? THREE.MathUtils.smoothstep(progress, 0.6, 1)
      : THREE.MathUtils.smoothstep(progress, 0, 0.4);
    target.props[key] = THREE.MathUtils.lerp(from.props[key], to.props[key], fade);
  }
}

export class HumanSignalScene {
  private readonly world = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private readonly pose = createHumanActivityPose();
  private readonly targetPose = createHumanActivityPose();
  private readonly fromPose = createHumanActivityPose();
  private readonly cameraFrames = new Map<HumanAtlasSceneId, CameraFrame>();
  private readonly cameraCenter = new THREE.Vector3();
  private readonly cameraFromCenter = new THREE.Vector3();
  private rig?: ReturnType<typeof createHumanActivityRig>;
  private readonly canvas: HTMLCanvasElement;
  private renderer?: THREE.WebGLRenderer;
  private observer?: ResizeObserver;
  private fallbackResizeListener = false;
  private frame: number | null = null;
  private frameGeneration = 0;
  private previousTime: number | null = null;
  private elapsed = 0;
  private motionProgress: number | null = null;
  private action: HumanAtlasSceneId | null = null;
  private transitionElapsed = TRANSITION_SECONDS;
  private cameraDistance = 14;
  private cameraFromDistance = 14;
  private running = false;
  private disposed = false;
  private failureReported = false;

  constructor(private readonly host: HTMLDivElement, private readonly getState: () => AtlasState, private readonly onFailure: () => void) {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.tabIndex = -1;
    Object.assign(this.canvas.style, { display: "block", height: "100%", pointerEvents: "none", width: "100%" });
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: this.canvas, powerPreference: "low-power" });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.debug.onShaderError = () => { throw new Error("Human activity shader compilation failed"); };
      this.canvas.addEventListener("webglcontextlost", this.contextLost);
      this.host.appendChild(this.canvas);
      this.world.add(new THREE.HemisphereLight(0xf7f9ef, 0x6f8a7c, 2.2));
      const key = new THREE.DirectionalLight(0xfff3e0, 3.2);
      key.position.set(-4, 7, 8);
      this.world.add(key);
      const rim = new THREE.DirectionalLight(0xdaf0c0, 1.4);
      rim.position.set(4, 3, -5);
      this.world.add(rim);
      this.rig = createHumanActivityRig();
      this.world.add(this.rig.group);
      this.measureActions();
      if (typeof ResizeObserver === "function") {
        this.observer = new ResizeObserver(this.resize);
        this.observer.observe(host);
      } else {
        this.fallbackResizeListener = true;
        window.addEventListener("resize", this.resize, { passive: true });
      }
      this.resize();
    } catch { this.fail(); }
  }

  // Une enveloppe par action évite que la caméra zoome à chaque foulée.
  // La mesure couvre les phases et les angles du scroll, avec les décors visibles.
  private measureActions(): void {
    if (!this.rig) return;
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    const projected = new THREE.Vector3();
    for (const action of humanAtlasSceneIds) {
      box.makeEmpty();
      for (let frame = 0; frame < 48; frame += 1) {
        sampleHumanActivityPose(action, frame * 0.137, this.targetPose);
        this.rig.update(this.targetPose, frame * 0.137);
        for (const pivot of MEASURED_PIVOTS) {
          this.rig.group.rotation.y = pivot;
          this.world.updateMatrixWorld(true);
          this.rig.group.traverseVisible((object) => {
            if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments)) return;
            if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
            const bounds = object.geometry.boundingBox;
            if (!bounds) return;
            for (let cornerIndex = 0; cornerIndex < 8; cornerIndex += 1) {
              corner.set(cornerIndex & 1 ? bounds.max.x : bounds.min.x, cornerIndex & 2 ? bounds.max.y : bounds.min.y, cornerIndex & 4 ? bounds.max.z : bounds.min.z).applyMatrix4(object.matrixWorld);
              projected.set(corner.dot(VIEW_RIGHT), corner.dot(VIEW_UP), corner.dot(VIEW_DIRECTION));
              box.expandByPoint(projected);
            }
          });
        }
      }
      const viewCenter = box.getCenter(new THREE.Vector3());
      const center = new THREE.Vector3().addScaledVector(VIEW_RIGHT, viewCenter.x).addScaledVector(VIEW_UP, viewCenter.y).addScaledVector(VIEW_DIRECTION, viewCenter.z);
      this.cameraFrames.set(action, { center, halfWidth: (box.max.x - box.min.x) / 2 + 0.25,
        halfHeight: (box.max.y - box.min.y) / 2 + 0.25, depth: (box.max.z - box.min.z) / 2 });
    }
  }

  private frameDistance(frame: CameraFrame): number {
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.max(frame.halfHeight / tangent, frame.halfWidth / (tangent * this.camera.aspect)) * 1.06 + frame.depth + 0.4;
  }

  private update(delta: number): void {
    if (!this.rig) return;
    const state = this.getState();
    const action = this.cameraFrames.has(state.scene) ? state.scene : "sleep";
    this.elapsed += delta;
    const progress = Number.isFinite(state.progress) ? THREE.MathUtils.clamp(state.progress, 0, 1) : 0;
    if (this.motionProgress === null) {
      this.motionProgress = progress;
    } else if (delta > 0) {
      const step = (progress - this.motionProgress) * (1 - Math.exp(-SCROLL_RESPONSE * delta));
      // Un lien d’ancrage peut sauter un chapitre entier : borner aussi la vitesse du geste.
      this.motionProgress += THREE.MathUtils.clamp(step, -SCROLL_MAX_SPEED * delta, SCROLL_MAX_SPEED * delta);
    }
    const activityTime = this.elapsed + this.motionProgress * SCROLL_PHASE_SECONDS;
    sampleHumanActivityPose(action, activityTime, this.targetPose);
    const frame = this.cameraFrames.get(action)!;
    if (this.action === null) {
      this.action = action;
      copyPose(this.pose, this.targetPose);
      this.cameraCenter.copy(frame.center);
      this.cameraDistance = this.frameDistance(frame);
    } else if (delta > 0) {
      if (action !== this.action) {
        copyPose(this.fromPose, this.pose);
        this.cameraFromCenter.copy(this.cameraCenter);
        this.cameraFromDistance = this.cameraDistance;
        this.transitionElapsed = 0;
        this.action = action;
      }
      this.transitionElapsed = Math.min(TRANSITION_SECONDS, this.transitionElapsed + delta);
      const t = this.transitionElapsed / TRANSITION_SECONDS;
      const eased = t * t * (3 - 2 * t);
      if (t < 1) {
        blendPose(this.pose, this.fromPose, this.targetPose, eased, t);
        this.cameraCenter.lerpVectors(this.cameraFromCenter, frame.center, eased);
        this.cameraDistance = THREE.MathUtils.lerp(this.cameraFromDistance, this.frameDistance(frame), eased);
      } else {
        copyPose(this.pose, this.targetPose);
        this.cameraCenter.copy(frame.center);
        this.cameraDistance = this.frameDistance(frame);
      }
    }
    this.rig.group.rotation.y = (this.motionProgress * 2 - 1) * SCROLL_PIVOT;
    this.rig.update(this.pose, activityTime);
    this.camera.position.copy(this.cameraCenter).addScaledVector(VIEW_DIRECTION, this.cameraDistance);
    this.camera.lookAt(this.cameraCenter);
  }

  private resize = (): void => {
    if (this.disposed || !this.renderer) return;
    try {
      const width = Math.max(1, this.host.clientWidth);
      const height = Math.max(1, this.host.clientHeight);
      const cap = window.innerWidth <= 780 ? 1.5 : 2;
      const ratio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const pixelRatio = THREE.MathUtils.clamp(ratio, 1, cap);
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      const frame = this.action ? this.cameraFrames.get(this.action) : undefined;
      if (frame) {
        this.cameraDistance = this.frameDistance(frame);
        this.cameraFromDistance = this.cameraDistance;
      }
      this.update(0);
      this.renderer.render(this.world, this.camera);
    } catch { this.fail(); }
  };

  private schedule(): void {
    if (!this.running || this.disposed || this.frame !== null) return;
    const generation = this.frameGeneration;
    this.frame = requestAnimationFrame((time) => {
      // Un callback annulé ne reprend pas la main après une pause/reprise.
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
    safeRelease(() => this.rig?.dispose());
    this.world.clear();
    safeRelease(() => this.renderer?.dispose());
    safeRelease(() => this.renderer?.forceContextLoss());
    safeRelease(() => this.canvas.remove());
  }
}
