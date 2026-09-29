import * as THREE from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const backend = vi.hoisted(() => ({
  instances: [] as Array<{
    domElement: HTMLCanvasElement;
    pixelRatio: number;
    disposed: boolean;
    contextReleased: boolean;
    frames: Array<{ positions: number[]; rotationY: number; opening: number; width: number; height: number }>;
  }>,
  failRender: false,
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement: HTMLCanvasElement;
      pixelRatio = 1;
      disposed = false;
      contextReleased = false;
      frames: Array<{ positions: number[]; rotationY: number; opening: number; width: number; height: number }> = [];
      width = 0;
      height = 0;
      debug = { onShaderError: undefined };
      constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.domElement = canvas;
        backend.instances.push(this);
      }
      setClearColor() {}
      setPixelRatio(value: number) { this.pixelRatio = value; }
      setSize(width: number, height: number) { this.width = width; this.height = height; }
      render(world: THREE.Scene) {
        if (backend.failRender) throw new Error("GPU render failed");
        let positions: number[] = [];
        let rotationY = 0;
        let opening = Infinity;
        world.traverse((object) => {
          if (object instanceof actual.LineSegments && positions.length === 0) {
            positions = Array.from(object.geometry.getAttribute("position").array);
            rotationY = object.parent?.rotation.y ?? 0;
            object.updateWorldMatrix(true, false);
            const point = new actual.Vector3();
            for (let offset = 0; offset < positions.length; offset += 3) {
              point.fromArray(positions, offset).applyMatrix4(object.matrixWorld);
              opening = Math.min(opening, Math.hypot(point.x, point.y));
            }
          }
        });
        this.frames.push({ positions, rotationY, opening, width: this.width, height: this.height });
      }
      dispose() { this.disposed = true; }
      forceContextLoss() { this.contextReleased = true; }
    },
  };
});

import { LivingAtlasScene } from "./living-atlas-scene";

let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let observerCallback: ResizeObserverCallback;
let observerDisconnected = false;
let failObservation = false;
let host: HTMLDivElement;
const instances: LivingAtlasScene[] = [];

function advance(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
}

function create(getState = () => ({ progress: 0, scene: "breath" as const }), onFailure = vi.fn()) {
  const scene = new LivingAtlasScene(host, getState, onFailure);
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
    clientWidth: { configurable: true, value: 640 },
    clientHeight: { configurable: true, value: 640 },
  });
  document.body.appendChild(host);
});

afterEach(() => {
  instances.splice(0).forEach((instance) => instance.dispose());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("présente une sculpture statique sans démarrer de boucle ni capter les gestes", () => {
  const listen = vi.spyOn(window, "addEventListener");
  create();
  const canvas = host.querySelector("canvas");
  expect(canvas).toHaveAttribute("aria-hidden", "true");
  expect(canvas).toHaveAttribute("tabindex", "-1");
  expect(canvas?.style.pointerEvents).toBe("none");
  expect(frames.size).toBe(0);
  expect(backend.instances[0].frames).toHaveLength(1);
  const positions = backend.instances[0].frames[0].positions;
  expect(positions.length).toBeGreaterThan(1000);
  expect(positions.every(Number.isFinite)).toBe(true);
  expect(positions.some((coordinate) => Math.abs(coordinate) > 1)).toBe(true);
  expect(listen.mock.calls.some(([name]) => ["scroll", "wheel", "pointermove", "touchmove"].includes(name))).toBe(false);
});

test("n’entretient qu’une boucle et reflète la progression courante", () => {
  let progress = 0;
  const scene = create(() => ({ progress, scene: "breath" }));
  const renderer = backend.instances[0];
  const initial = renderer.frames[0];
  scene.setRunning(true);
  scene.setRunning(true);
  expect(frames.size).toBe(1);
  advance(100);
  progress = 0.85;
  advance(116);
  expect(frames.size).toBe(1);
  const latest = renderer.frames.at(-1)!;
  expect(latest.positions).not.toEqual(initial.positions);
  expect(Math.abs(latest.rotationY - initial.rotationY)).toBeGreaterThan(1);
});

test("la pose finale garde l’ouverture du tore visible au centre", () => {
  create(() => ({ progress: 1, scene: "breath" }));
  expect(backend.instances[0].frames[0].opening).toBeGreaterThan(0.2);
});

test("annule les callbacks périmés en pause et borne le temps après une longue interruption", () => {
  const scene = create();
  const renderer = backend.instances[0];
  scene.setRunning(true);
  const stale = [...frames.values()][0];
  scene.setRunning(false);
  expect(frames.size).toBe(0);
  stale(10_000);
  expect(renderer.frames).toHaveLength(1);
  scene.setRunning(true);
  stale(40_000);
  expect(renderer.frames).toHaveLength(1);
  expect(frames.size).toBe(1);
  advance(50_000);
  const resumed = renderer.frames.at(-1)!;
  advance(100_000);
  const next = renderer.frames.at(-1)!;
  expect(Math.abs(next.rotationY - resumed.rotationY)).toBeLessThan(0.02);
});

test("borne le DPR mobile et redimensionne sans démarrer d’animation", () => {
  vi.stubGlobal("innerWidth", 390);
  create();
  const renderer = backend.instances[0];
  expect(renderer.pixelRatio).toBeLessThanOrEqual(1.5);
  Object.defineProperty(host, "clientWidth", { configurable: true, value: 390 });
  Object.defineProperty(host, "clientHeight", { configurable: true, value: 500 });
  observerCallback([], {} as ResizeObserver);
  expect(renderer.frames.at(-1)).toMatchObject({ width: 390, height: 500 });
  expect(frames.size).toBe(0);
});

test("libère toutes les ressources et reste inerte après une perte de contexte", () => {
  const geometryDisposed = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
  const materialDisposed = vi.spyOn(THREE.Material.prototype, "dispose");
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  const renderer = backend.instances[0];
  const canvas = renderer.domElement;
  scene.setRunning(true);
  canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  scene.setRunning(true);
  expect(onFailure).toHaveBeenCalledOnce();
  expect(host.querySelector("canvas")).toBeNull();
  expect(frames.size).toBe(0);
  expect(observerDisconnected).toBe(true);
  expect(geometryDisposed).toHaveBeenCalled();
  expect(materialDisposed).toHaveBeenCalled();
  expect(renderer.disposed).toBe(true);
  const count = geometryDisposed.mock.calls.length;
  scene.dispose();
  expect(geometryDisposed).toHaveBeenCalledTimes(count);
});

test("nettoie une initialisation partielle et signale un seul échec", () => {
  const geometryDisposed = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
  failObservation = true;
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  expect(onFailure).toHaveBeenCalledOnce();
  expect(host.querySelector("canvas")).toBeNull();
  expect(backend.instances[0].disposed).toBe(true);
  expect(geometryDisposed).toHaveBeenCalled();
  scene.dispose();
  expect(onFailure).toHaveBeenCalledOnce();
});

test("transforme une erreur de rendu en fallback terminal", () => {
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  backend.failRender = true;
  scene.setRunning(true);
  expect(() => advance(100)).not.toThrow();
  expect(onFailure).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  expect(host.querySelector("canvas")).toBeNull();
});

test("la destruction ordinaire relâche le contexte sans déclencher le fallback", () => {
  const onFailure = vi.fn();
  const scene = create(undefined, onFailure);
  scene.setRunning(true);
  scene.dispose();
  expect(backend.instances[0].contextReleased).toBe(true);
  expect(observerDisconnected).toBe(true);
  expect(frames.size).toBe(0);
  expect(host.querySelector("canvas")).toBeNull();
  expect(onFailure).not.toHaveBeenCalled();
});
