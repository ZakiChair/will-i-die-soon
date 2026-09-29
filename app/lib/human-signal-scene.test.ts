import * as THREE from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { HumanAtlasSceneId } from "../data/human-atlas";

type DrawState = { name: string; kind: string; materialKind: string; opacity: number; transparent: boolean; blending: THREE.Blending; position: number[]; quaternion: number[]; scale: number[]; geometry: THREE.BufferGeometry };
type FrameState = { draws: DrawState[]; props: string[]; extent: number[]; camera: number[]; pivot: number; width: number; height: number };
const backend = vi.hoisted(() => ({
  instances: [] as Array<{
    canvas: HTMLCanvasElement; alpha: boolean; clearAlpha: number; pixelRatio: number;
    disposed: boolean; contextReleased: boolean; frames: FrameState[];
  }>,
  failRender: false,
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      canvas: HTMLCanvasElement;
      alpha: boolean;
      clearAlpha = 1;
      pixelRatio = 1;
      disposed = false;
      contextReleased = false;
      frames: FrameState[] = [];
      width = 0;
      height = 0;
      debug = { onShaderError: undefined };
      constructor({ canvas, alpha }: { canvas: HTMLCanvasElement; alpha: boolean }) {
        this.canvas = canvas;
        this.alpha = alpha;
        backend.instances.push(this);
      }
      setClearColor(_color: number, alpha: number) { this.clearAlpha = alpha; }
      setPixelRatio(value: number) { this.pixelRatio = value; }
      setSize(width: number, height: number) { this.width = width; this.height = height; }
      render(world: THREE.Scene, camera: THREE.PerspectiveCamera) {
        if (backend.failRender) throw new Error("GPU render failed");
        world.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        const draws: DrawState[] = [];
        const extent = [0, 0, 0];
        const point = new actual.Vector3();
        world.traverseVisible((object) => {
          if (!(object instanceof actual.Mesh || object instanceof actual.Points || object instanceof actual.LineSegments)) return;
          if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
          const bounds = object.geometry.boundingBox!;
          for (let index = 0; index < 8; index += 1) {
            point.set(index & 1 ? bounds.max.x : bounds.min.x, index & 2 ? bounds.max.y : bounds.min.y, index & 4 ? bounds.max.z : bounds.min.z)
              .applyMatrix4(object.matrixWorld).project(camera);
            extent[0] = Math.max(extent[0], Math.abs(point.x));
            extent[1] = Math.max(extent[1], Math.abs(point.y));
            extent[2] = Math.max(extent[2], Math.abs(point.z));
          }
          const material = Array.isArray(object.material) ? object.material[0] : object.material;
          draws.push({ name: object.name, kind: object.type, materialKind: material.type, opacity: material.opacity, transparent: material.transparent, blending: material.blending,
            position: object.getWorldPosition(point).toArray(),
            quaternion: object.quaternion.toArray(), scale: object.scale.toArray(), geometry: object.geometry });
        });
        const props = ["bed", "track", "barbell", "table"].filter((name) => world.getObjectByName(name)?.visible);
        this.frames.push({ draws, props, extent, camera: camera.position.toArray(), pivot: world.getObjectByName("human-activity")?.rotation.y ?? 0,
          width: this.width, height: this.height });
      }
      dispose() { this.disposed = true; }
      forceContextLoss() { this.contextReleased = true; }
    },
  };
});

import { HumanSignalScene } from "./human-signal-scene";

let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let observerCallback: ResizeObserverCallback;
let observerDisconnected = false;
let failObservation = false;
let host: HTMLDivElement;
const instances: HumanSignalScene[] = [];

function advance(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
}

function create(getState: () => { progress: number; scene: HumanAtlasSceneId } = () => ({ progress: 0, scene: "sleep" }), onFailure = vi.fn()) {
  const scene = new HumanSignalScene(host, getState, onFailure);
  instances.push(scene);
  return scene;
}

beforeEach(() => {
  backend.instances = [];
  backend.failRender = false;
  frames = new Map();
  nextFrame = 0;
  observerDisconnected = false;
  failObservation = false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { observerCallback = callback; }
    observe() { if (failObservation) throw new Error("Observer failed"); }
    disconnect() { observerDisconnected = true; }
  });
  vi.stubGlobal("devicePixelRatio", 3);
  vi.stubGlobal("innerWidth", 1200);
  host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: 580 },
    clientHeight: { configurable: true, value: 750 },
  });
  document.body.appendChild(host);
});

afterEach(() => {
  instances.splice(0).forEach((instance) => instance.dispose());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("ouvre sur une personne endormie et conserve le canvas décoratif sans capture de gestes", () => {
  const listen = vi.spyOn(window, "addEventListener");
  create();
  const renderer = backend.instances[0];
  expect(renderer.alpha).toBe(true);
  expect(renderer.clearAlpha).toBe(0);
  expect(renderer.canvas).toHaveAttribute("aria-hidden", "true");
  expect(renderer.canvas).toHaveAttribute("tabindex", "-1");
  expect(renderer.canvas.style.pointerEvents).toBe("none");
  expect(frames.size).toBe(0);
  expect(renderer.frames[0].props).toEqual(["bed"]);
  expect(renderer.frames[0].draws.some((draw) => draw.name === "head")).toBe(true);
  expect(renderer.frames[0].draws.find((draw) => draw.name === "head")!.position[1]).toBeLessThan(0);
  expect(renderer.frames[0].extent.every((bound) => Number.isFinite(bound) && bound < 1)).toBe(true);
  expect(listen.mock.calls.some(([name]) => ["scroll", "wheel", "pointermove", "touchmove"].includes(name))).toBe(false);
});

test("le scroll change réellement l’angle et la phase du geste dans une même activité", () => {
  create(() => ({ progress: 0, scene: "strength" }));
  const first = backend.instances.at(-1)!.frames[0];
  create(() => ({ progress: 1, scene: "strength" }));
  const last = backend.instances.at(-1)!.frames[0];
  expect(last.pivot - first.pivot).toBeGreaterThan(THREE.MathUtils.degToRad(10));
  expect(last.pivot - first.pivot).toBeLessThan(THREE.MathUtils.degToRad(15));
  const firstBar = first.draws.find((draw) => draw.name === "bar")!;
  const lastBar = last.draws.find((draw) => draw.name === "bar")!;
  expect(Math.abs(firstBar.position[1] - lastBar.position[1])).toBeGreaterThan(0.2);
  for (const frame of [first, last]) {
    const bar = frame.draws.find((draw) => draw.name === "bar")!;
    for (const name of ["left-hand", "right-hand"]) {
      const hand = frame.draws.find((draw) => draw.name === name)!;
      expect(hand.position[1]).toBeCloseTo(bar.position[1], 5);
      expect(Math.hypot(hand.position[0] - bar.position[0], hand.position[2] - bar.position[2])).toBeCloseTo(0.6, 5);
    }
    expect(frame.extent.every((bound) => bound < 1)).toBe(true);
  }
});

test("rend une silhouette translucide sans particules ni filaments", () => {
  create(() => ({ progress: 0.5, scene: "breath" }));
  const frame = backend.instances[0].frames[0];
  expect(frame.draws.length).toBeGreaterThan(10);
  expect(frame.draws.every((draw) => draw.kind === "Mesh")).toBe(true);
  const head = frame.draws.find((draw) => draw.name === "head")!;
  expect(head.materialKind).toBe("ShaderMaterial");
  expect(head.opacity).toBeGreaterThan(0);
  expect(head.opacity).toBeLessThan(1);
  expect(head.transparent).toBe(true);
  expect(head.blending).toBe(THREE.NormalBlending);
});

test("lisse les sauts de scroll, borne leur vitesse et fige aussi le pivot en arrêt automatique", () => {
  let progress = 0;
  const scene = create(() => ({ progress, scene: "breath" }));
  const renderer = backend.instances[0];
  const initial = renderer.frames[0];
  scene.setRunning(true);
  advance(0);
  progress = 1;
  advance(16);
  const step = renderer.frames.at(-1)!;
  expect(step.pivot - initial.pivot).toBeGreaterThan(0);
  expect(step.pivot - initial.pivot).toBeLessThan(0.01);
  for (let index = 2; index <= 200; index += 1) advance(index * 16);
  const moving = renderer.frames.at(-1)!;
  expect(moving.pivot - initial.pivot).toBeGreaterThan(THREE.MathUtils.degToRad(10));
  const count = renderer.frames.length;
  scene.setRunning(false);
  progress = 0;
  advance(100_000);
  expect(renderer.frames).toHaveLength(count);
  observerCallback([], {} as ResizeObserver);
  expect(renderer.frames.at(-1)!.pivot).toBe(moving.pivot);
  expect(renderer.frames.at(-1)!.draws).toEqual(moving.draws);
  scene.setRunning(true);
  advance(150_000);
  expect(renderer.frames.at(-1)!.draws).toEqual(moving.draws);
  advance(250_000);
  const resumed = renderer.frames.at(-1)!;
  expect(moving.pivot - resumed.pivot).toBeGreaterThan(0);
  expect(moving.pivot - resumed.pivot).toBeLessThan(0.01);
  const movingHand = moving.draws.find((draw) => draw.name === "left-hand")!.position;
  const resumedHand = resumed.draws.find((draw) => draw.name === "left-hand")!.position;
  const handTravel = Math.hypot(...resumedHand.map((value, axis) => value - movingHand[axis]));
  expect(handTravel).toBeGreaterThan(0);
  expect(handTravel).toBeLessThan(0.35);
  expect(renderer.frames.every((frame) => frame.extent.every((bound) => Number.isFinite(bound) && bound < 1))).toBe(true);
});

test("enchaîne sommeil, course, deadlift et repas avec les accessoires correspondants", () => {
  let action: HumanAtlasSceneId = "sleep";
  const scene = create(() => ({ progress: 0, scene: action }));
  const renderer = backend.instances[0];
  const head = renderer.frames[0].draws.find((draw) => draw.name === "head")!;
  scene.setRunning(true);
  scene.setRunning(true);
  advance(0);
  let time = 0;
  for (const [next, prop] of [["breath", "track"], ["strength", "barbell"], ["energy", "table"]] as const) {
    action = next;
    advance(time += 16);
    const first = renderer.frames.at(-1)!;
    if (next === "breath") expect(Math.abs(first.draws.find((draw) => draw.name === "head")!.position[1] - head.position[1])).toBeLessThan(0.1);
    for (let index = 0; index < 70; index += 1) advance(time += 16);
    expect(renderer.frames.at(-1)!.props).toEqual([prop]);
    expect(renderer.frames.at(-1)!.extent.every((bound) => bound < 1)).toBe(true);
    expect(frames.size).toBe(1);
  }
  expect(renderer.frames.every((frame) => frame.extent.every((bound) => Number.isFinite(bound) && bound < 1))).toBe(true);
  expect(renderer.frames.every((frame) => frame.draws.every((draw) => draw.kind === "Mesh"))).toBe(true);
});

const activityJumps = (["sleep", "breath", "strength", "energy"] as const).flatMap((from) =>
  (["sleep", "breath", "strength", "energy"] as const).filter((to) => to !== from).map((to) => [from, to] as const));

test.each(activityJumps)("garde les décors cadrés pendant le saut direct %s → %s sans recul permanent", (from, to) => {
  for (const [width, height] of [[413, 598], [240, 420]]) {
    Object.defineProperty(host, "clientWidth", { configurable: true, value: width });
    Object.defineProperty(host, "clientHeight", { configurable: true, value: height });
    let action: HumanAtlasSceneId = from;
    let progress = width === 240 ? 1 : 0;
    const scene = create(() => ({ progress, scene: action }));
    const renderer = backend.instances.at(-1)!;
    scene.setRunning(true);
    advance(0);
    action = to;
    progress = 1 - progress;
    for (let frame = 1; frame <= 75; frame += 1) advance(frame * 16);
    expect(renderer.frames.every((frame) => frame.extent.every((bound) => Number.isFinite(bound) && bound < 1)), `${width}×${height}`).toBe(true);
    const finalCamera = renderer.frames.at(-1)!.camera;
    scene.dispose();
    const direct = create(() => ({ progress: 0.5, scene: to }));
    expect(finalCamera).toEqual(backend.instances.at(-1)!.frames[0].camera);
    direct.dispose();
  }
});

test("anime les membres et la sueur sans recréer la géométrie, fige l’arrêt automatique et reprend sans saut", () => {
  let action: HumanAtlasSceneId = "breath";
  const scene = create(() => ({ progress: 0.4, scene: action }));
  const renderer = backend.instances[0];
  const initial = renderer.frames[0];
  scene.setRunning(true);
  advance(0);
  for (let index = 1; index <= 10; index += 1) advance(index * 25);
  const moving = renderer.frames.at(-1)!;
  expect(moving.draws.every((draw) => draw.kind === "Mesh")).toBe(true);
  expect(moving.draws.find((draw) => draw.name === "left-forearm")!.quaternion)
    .not.toEqual(initial.draws.find((draw) => draw.name === "left-forearm")!.quaternion);
  expect(moving.draws.find((draw) => draw.name === "sweat-drop-0")!.position)
    .not.toEqual(initial.draws.find((draw) => draw.name === "sweat-drop-0")!.position);
  expect(moving.draws.map((draw) => draw.geometry)).toEqual(initial.draws.map((draw) => draw.geometry));
  scene.setRunning(false);
  const count = renderer.frames.length;
  action = "energy";
  advance(100_000);
  expect(renderer.frames).toHaveLength(count);
  expect(frames.size).toBe(0);
  scene.setRunning(true);
  advance(180_000);
  expect(renderer.frames.at(-1)!.draws).toEqual(moving.draws);
  advance(180_016);
  expect(renderer.frames.at(-1)!.draws.find((draw) => draw.name === "head")!.position[1])
    .toBeCloseTo(moving.draws.find((draw) => draw.name === "head")!.position[1], 1);
});

test.each(["sleep", "breath", "strength", "energy"] as const)("cadre le corps et ses accessoires pendant %s sur ordinateur et mobile", (action) => {
  let progress = 0;
  const scene = create(() => ({ progress, scene: action }));
  const renderer = backend.instances[0];
  let time = 0;
  for (const [width, height] of [[730, 600], [390, 288], [240, 420]]) {
    Object.defineProperty(host, "clientWidth", { configurable: true, value: width });
    Object.defineProperty(host, "clientHeight", { configurable: true, value: height });
    observerCallback([], {} as ResizeObserver);
    scene.setRunning(true);
    for (let index = 0; index < 130; index += 1) {
      progress = index / 129;
      advance(time += 50);
    }
    scene.setRunning(false);
  }
  expect(renderer.frames.every((frame) => frame.extent.every((bound) => Number.isFinite(bound) && bound < 1))).toBe(true);
});

test("garde la résolution mobile plafonnée et accepte une progression non finie", () => {
  vi.stubGlobal("innerWidth", 390);
  let progress = Number.NaN;
  create(() => ({ progress, scene: "sleep" })).setRunning(true);
  advance(0);
  let time = 0;
  for (const value of [Infinity, -Infinity, Number.MAX_VALUE, -100, 0.5]) {
    progress = value;
    advance(time += 100_000);
  }
  const renderer = backend.instances[0];
  expect(renderer.pixelRatio).toBeLessThanOrEqual(1.5);
  expect(renderer.frames.every((frame) => [...frame.camera, ...frame.extent, frame.pivot].every(Number.isFinite)
    && Math.abs(frame.pivot) <= THREE.MathUtils.degToRad(7))).toBe(true);
});

test("ignore les callbacks périmés et la longue absence après une pause", () => {
  const scene = create();
  const renderer = backend.instances[0];
  scene.setRunning(true);
  const stale = [...frames.values()][0];
  scene.setRunning(false);
  stale(10_000);
  expect(frames.size).toBe(0);
  expect(renderer.frames).toHaveLength(1);
  scene.setRunning(true);
  stale(40_000);
  expect(renderer.frames).toHaveLength(1);
  advance(50_000);
  const resumed = renderer.frames.at(-1)!;
  advance(100_000);
  const current = renderer.frames.at(-1)!;
  const before = resumed.draws.find((draw) => draw.name === "head")!.position;
  const after = current.draws.find((draw) => draw.name === "head")!.position;
  expect(Math.hypot(...after.map((value, index) => value - before[index]))).toBeLessThan(0.1);
});

test("libère toutes les ressources et signale une seule perte de contexte", () => {
  const geometries = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
  const materials = vi.spyOn(THREE.Material.prototype, "dispose");
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  const renderer = backend.instances[0];
  scene.setRunning(true);
  renderer.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  renderer.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  scene.setRunning(true);
  expect(onFailure).toHaveBeenCalledOnce();
  expect(host.querySelector("canvas")).toBeNull();
  expect(frames.size).toBe(0);
  expect(observerDisconnected).toBe(true);
  expect(renderer.disposed).toBe(true);
  expect(renderer.contextReleased).toBe(true);
  expect(geometries).toHaveBeenCalled();
  expect(materials).toHaveBeenCalled();
  const count = geometries.mock.calls.length;
  scene.dispose();
  expect(geometries).toHaveBeenCalledTimes(count);
});

test("nettoie une initialisation partielle", () => {
  const geometryDisposed = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
  failObservation = true;
  const onFailure = vi.fn();
  create(undefined, onFailure);
  expect(onFailure).toHaveBeenCalledOnce();
  expect(host.querySelector("canvas")).toBeNull();
  expect(backend.instances[0].disposed).toBe(true);
  expect(geometryDisposed).toHaveBeenCalled();
});

test("une erreur de rendu provoque un fallback terminal", () => {
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  backend.failRender = true;
  scene.setRunning(true);
  expect(() => advance(100)).not.toThrow();
  expect(onFailure).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  expect(host.querySelector("canvas")).toBeNull();
});

test("la destruction normale est idempotente et ne déclenche pas le fallback", () => {
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  scene.setRunning(true);
  scene.dispose();
  scene.dispose();
  expect(backend.instances[0].contextReleased).toBe(true);
  expect(observerDisconnected).toBe(true);
  expect(frames.size).toBe(0);
  expect(host.querySelector("canvas")).toBeNull();
  expect(onFailure).not.toHaveBeenCalled();
});
