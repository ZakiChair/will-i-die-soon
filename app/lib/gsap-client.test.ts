import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { mockGsap, mockScrollTrigger, mockUseGSAP, registerPlugin } = vi.hoisted(() => {
  const registerPlugin = vi.fn();
  const mockGsap = { registerPlugin };
  const mockScrollTrigger = { name: "ScrollTrigger" };
  const mockUseGSAP = vi.fn();

  return { mockGsap, mockScrollTrigger, mockUseGSAP, registerPlugin };
});

vi.mock("@gsap/react", () => ({ useGSAP: mockUseGSAP }));
vi.mock("gsap", () => ({ gsap: mockGsap }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: mockScrollTrigger }));

beforeEach(() => {
  vi.resetModules();
  registerPlugin.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("exports useGSAP safely without registering ScrollTrigger when matchMedia is absent", async () => {
  vi.stubGlobal("matchMedia", undefined);

  const client = await import("./gsap-client");

  expect(client.gsap).toBe(mockGsap);
  expect(client.useGSAP).toBe(mockUseGSAP);
  expect(client.ScrollTrigger).toBe(mockScrollTrigger);
  expect(registerPlugin).toHaveBeenCalledOnce();
  expect(registerPlugin).toHaveBeenCalledWith(mockUseGSAP);
  expect(registerPlugin).not.toHaveBeenCalledWith(mockScrollTrigger);
});

test("registers useGSAP and ScrollTrigger when matchMedia is supported", async () => {
  vi.stubGlobal("matchMedia", vi.fn());

  await import("./gsap-client");

  expect(registerPlugin).toHaveBeenCalledTimes(2);
  expect(registerPlugin).toHaveBeenNthCalledWith(1, mockUseGSAP);
  expect(registerPlugin).toHaveBeenNthCalledWith(2, mockScrollTrigger);
});

test("does not register ScrollTrigger when matchMedia throws", async () => {
  const matchMedia = vi.fn(() => {
    throw new Error("matchMedia unavailable");
  });
  vi.stubGlobal("matchMedia", matchMedia);

  const client = await import("./gsap-client");

  expect(client.gsap).toBe(mockGsap);
  expect(client.useGSAP).toBe(mockUseGSAP);
  expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  expect(registerPlugin).toHaveBeenCalledOnce();
  expect(registerPlugin).toHaveBeenCalledWith(mockUseGSAP);
  expect(registerPlugin).not.toHaveBeenCalledWith(mockScrollTrigger);
});
