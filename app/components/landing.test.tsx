import { fireEvent, render as testingRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { name: "ScrollTrigger", register: vi.fn() },
}));

const { mockUseLandingTimeline } = vi.hoisted(() => ({
  mockUseLandingTimeline: vi.fn(() => "sleep"),
}));

vi.mock("../hooks/use-landing-timeline", () => ({
  useLandingTimeline: mockUseLandingTimeline,
}));

vi.mock("./living-atlas-visual", () => ({
  LivingAtlasVisual: ({ activeScene, motionStatus, onFailure }: {
    activeScene: string; motionStatus: string; onFailure: () => void;
  }) => (
    <div data-testid="living-visual" data-scene={activeScene} data-status={motionStatus}>
      <button type="button" onClick={onFailure}>Fail visual</button>
    </div>
  ),
}));

import { I18nProvider } from "../i18n/context";
import { DecorativeSectionBoundary } from "./decorative-section-boundary";
import { LanguageSwitcher } from "./language-switcher";
import { Landing } from "./landing";

function render(ui: ReactElement) {
  return testingRender(<I18nProvider>{ui}</I18nProvider>);
}

function BrokenDecoration(): never {
  throw new Error("decorative render failed");
}

function installReducedMotionPreference() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  mockUseLandingTimeline.mockClear();
  mockUseLandingTimeline.mockReturnValue("sleep");
  installReducedMotionPreference();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("makes Express the primary adult route outside decorative content", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<Landing onStart={onStart} />);

  expect(screen.getByRole("heading", { name: "How are you, really?" })).toBeVisible();
  expect(screen.getByText("12 questions")).toBeVisible();
  expect(screen.getByText("Ages 18+")).toBeVisible();

  const expressButtons = screen.getAllByRole("button", { name: "Start Express" });
  expect(expressButtons).toHaveLength(2);
  await user.click(expressButtons[0]);
  await user.click(expressButtons[1]);
  expect(onStart).toHaveBeenNthCalledWith(1, "express");
  expect(onStart).toHaveBeenNthCalledWith(2, "express");

  expect(screen.queryByRole("heading", { name: "Express", level: 3 })).not.toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 3 }).slice(0, 4).map(({ textContent }) => textContent))
    .toEqual([
      "Sleep. Recover.",
      "Run. Find your rhythm.",
      "Lift. Move with control.",
      "Eat. Make room for variety.",
    ]);
  expect(screen.getAllByRole("heading", { level: 3 }).slice(-3).map(({ textContent }) => textContent))
    .toEqual(["Quick", "Detailed", "Deep"]);
  const roots = [...container.querySelectorAll<HTMLElement>("[data-reveal]")];
  expect(roots.map((root) => root.dataset.reveal)).toEqual([
    "heading",
    "heading",
    "group",
    "heading",
    "group",
    "single",
  ]);
  expect(container.querySelector(".landing__footnote")).toHaveAttribute(
    "data-reveal-terminal",
  );
  for (const root of roots) expect(root.querySelector("[data-reveal]")).toBeNull();
  expect(container.querySelector('[data-reveal-item="rule"]')).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(container.querySelector("video, img")).not.toBeInTheDocument();
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-scene", "sleep");
  expect(expressButtons.every((button) => !button.closest(".landing__atlas-decorative"))).toBe(true);
});

test("separates hero entrance items from continuous handoff layers", () => {
  const { container } = render(<Landing onStart={vi.fn()} />);
  const hero = container.querySelector(".landing__atlas-hero");
  const items = [...hero!.querySelectorAll<HTMLElement>("[data-hero-item]")];
  const handoffs = [...hero!.querySelectorAll<HTMLElement>("[data-hero-handoff]")];
  const titleMask = hero!.querySelector<HTMLElement>("[data-hero-title-mask]");
  const title = hero!.querySelector<HTMLElement>("[data-hero-title]");

  expect(items).toHaveLength(4);
  expect(handoffs).toHaveLength(4);
  expect(hero!.querySelectorAll("[data-hero-item][data-hero-handoff]")).toHaveLength(0);
  expect(items.map((item) => item.tagName)).toEqual(["P", "H1", "P", "P"]);
  expect(items[1].parentElement).toBe(titleMask);
  expect(titleMask?.className).toBe("landing__hero-title-mask");
  expect(titleMask?.children).toHaveLength(1);
  expect(title).toBe(items[1].firstElementChild);
  expect(title).toHaveAttribute("data-hero-handoff");
  const actions = hero!.querySelector(".landing__hero-actions");
  expect(actions).toBeVisible();
  expect(actions).not.toHaveAttribute("data-hero-item");
  expect(actions!.querySelector("[data-hero-handoff]")).toBeNull();
  expect(actions!.querySelector("button")).toBeVisible();
  expect(actions!.querySelector("button")).not.toBeDisabled();
  expect(screen.getByRole("link", { name: "Choose my exploration" })).toHaveAttribute("href", "#depth-title");
  expect(handoffs.every((handoff) => handoff.tagName === "SPAN")).toBe(true);
});

test("propagates Atlas visual failure to the terminal landing timeline owner", async () => {
  render(<Landing onStart={vi.fn()} />);

  expect(mockUseLandingTimeline).toHaveBeenLastCalledWith(
    expect.any(Object), false, expect.objectContaining({ current: 0 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Fail visual" }));

  await waitFor(() => {
    expect(mockUseLandingTimeline).toHaveBeenLastCalledWith(
      expect.any(Object), true, expect.objectContaining({ current: 0 }),
    );
  });
  expect(screen.queryByTestId("living-visual")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Start Express" })).toHaveLength(2);
});

test("keeps both Express routes usable and marks the controlled Atlas paused without matchMedia", async () => {
  Reflect.deleteProperty(window, "matchMedia");
  const onStart = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<Landing onStart={onStart} />);

  await waitFor(() =>
    expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
      "data-motion",
      "paused",
    ),
  );
  expect(container.querySelectorAll(".human-atlas-scene")).toHaveLength(4);
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-status", "unsupported");

  const expressButtons = screen.getAllByRole("button", { name: "Start Express" });
  await user.click(expressButtons[0]);
  await user.click(expressButtons[1]);

  expect(onStart).toHaveBeenNthCalledWith(1, "express");
  expect(onStart).toHaveBeenNthCalledWith(2, "express");
});

test.each([
  ["Quick", "Choose Quick", "quick"],
  ["Detailed", "Choose Detailed", "detailed"],
  ["Deep", "Choose Deep", "deep"],
] as const)("keeps %s as a canonical secondary route", async (_label, action, depth) => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  render(<Landing onStart={onStart} />);

  await user.click(screen.getByRole("button", { name: action }));
  expect(onStart).toHaveBeenCalledWith(depth);
});

test("keeps Express available when the decorative boundary falls back", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  render(
    <>
      <button type="button" onClick={() => onStart("express")}>Start Express</button>
      <DecorativeSectionBoundary fallback={<p>Atlas fallback</p>}>
        <BrokenDecoration />
      </DecorativeSectionBoundary>
      <button type="button" onClick={() => onStart("express")}>Start Express</button>
    </>,
  );

  expect(screen.getByText("Atlas fallback")).toBeVisible();
  const buttons = screen.getAllByRole("button", { name: "Start Express" });
  await user.click(buttons[0]);
  await user.click(buttons[1]);
  expect(onStart).toHaveBeenNthCalledWith(1, "express");
  expect(onStart).toHaveBeenNthCalledWith(2, "express");
  expect(error).toHaveBeenCalled();
});

test("presents the complete Atlas and secondary routes in French", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <LanguageSwitcher />
      <Landing onStart={onStart} />
    </>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("heading", { name: /Comment allez[‑-]vous, vraiment\s\?/ })).toBeVisible();
  expect(screen.getByText("12 questions")).toBeVisible();
  expect(screen.getByText("Dès 18 ans")).toBeVisible();
  expect(screen.getAllByRole("button", { name: "Commencer Express" })).toHaveLength(2);
  expect(screen.getAllByRole("heading", { level: 3 }).slice(0, 4).map(({ textContent }) => textContent))
    .toEqual([
      "Dormir. Récupérer.",
      "Courir. Trouver son rythme.",
      "Soulever. Maîtriser le geste.",
      "Manger. Varier les plaisirs.",
    ]);
  expect(screen.getByRole("heading", { name: "Rapide" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Détaillée" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Approfondie" })).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Your fitness|Start Express|Go further/i);

  await user.click(screen.getByRole("button", { name: "Choisir l'analyse rapide" }));
  expect(onStart).toHaveBeenCalledWith("quick");
});
