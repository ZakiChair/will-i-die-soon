import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { I18nProvider, useI18n } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { Intermission } from "./intermission";

type MotionPreference = {
  setReduced: (reduced: boolean) => void;
};

function installMotionPreference(initiallyReduced = false): MotionPreference {
  const listeners = new Set<EventListener>();
  const media = {
    matches: initiallyReduced,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: EventListener) => {
      listeners.delete(listener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));

  return {
    setReduced(reduced) {
      Object.assign(media, { matches: reduced });
      listeners.forEach((listener) => listener(new Event("change")));
    },
  };
}

beforeEach(() => installMotionPreference(true));
afterEach(() => vi.unstubAllGlobals());

function LocalizedIntermission() {
  const { locale } = useI18n();
  return (
    <>
      <LanguageSwitcher />
      <output data-testid="locale">{locale}</output>
      <Intermission
        pillar="nutrition-metabolic"
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />
    </>
  );
}

test.each([
  ["cardio-energy", "cardio-intermission.webp"],
  ["strength-neural", "recovery-intermission.webp"],
  ["sleep-circadian", "sleep-intermission.webp"],
  ["nutrition-metabolic", "metabolism-intermission.webp"],
] as const)(
  "uses the %s chapter artwork without adding decorative noise to the accessibility tree",
  (pillar, expectedFile) => {
    const { container } = render(
      <I18nProvider>
        <Intermission pillar={pillar} completed={8} total={20} onContinue={vi.fn()} />
      </I18nProvider>,
    );

    const image = container.querySelector<HTMLImageElement>(".intermission__media img");
    expect(image?.getAttribute("src")).toContain(expectedFile);
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  },
);

test("moves focus to the entering chapter heading instead of its Continue button", () => {
  render(
    <I18nProvider>
      <Intermission
        pillar="cardio-energy"
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />
    </I18nProvider>,
  );

  const heading = screen.getByRole("heading", {
    name: "Next: Cardio, VO₂ max & cellular energy",
  });
  const continueButton = screen.getByRole("button", { name: "Continue assessment" });

  expect(heading).toHaveFocus();
  expect(continueButton).not.toHaveFocus();
  expect(heading).toHaveAttribute("tabindex", "-1");
});

test("remounts the chapter panel in a motion screen keyed by the pillar ID", () => {
  const { container, rerender } = render(
    <I18nProvider>
      <Intermission
        pillar="cardio-energy"
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />
    </I18nProvider>,
  );

  const cardioScreen = container.querySelector(
    '[data-motion-screen="intermission-cardio-energy"]',
  );
  expect(cardioScreen?.querySelector(".intermission__panel")).toBeInTheDocument();

  rerender(
    <I18nProvider>
      <Intermission
        pillar="sleep-circadian"
        completed={12}
        total={20}
        onContinue={vi.fn()}
      />
    </I18nProvider>,
  );

  const sleepScreen = container.querySelector(
    '[data-motion-screen="intermission-sleep-circadian"]',
  );
  expect(sleepScreen?.querySelector(".intermission__panel")).toBeInTheDocument();
  expect(sleepScreen).not.toBe(cardioScreen);
});

test("uses a local Cardio loop only after its poster can play", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  const { container } = render(
    <I18nProvider>
      <Intermission pillar="cardio-energy" completed={8} total={20} onContinue={vi.fn()} />
    </I18nProvider>,
  );

  const poster = container.querySelector<HTMLImageElement>(".intermission__poster");
  const video = container.querySelector<HTMLVideoElement>(".intermission__video");
  if (!video) throw new Error("Expected Cardio video");

  expect(poster?.getAttribute("src")).toContain("cardio-intermission.webp");
  expect(poster).not.toHaveClass("intermission__poster--covered");
  expect(video).toHaveAttribute("poster", "/media/cardio-intermission.webp");
  expect(video.querySelector("source")).toHaveAttribute("src", "/media/cardio-intermission.mp4");
  expect(video).toHaveAttribute("preload", "none");
  expect(video).toHaveAttribute("aria-hidden", "true");
  expect(video).not.toHaveAttribute("controls");
  expect(video.tabIndex).toBe(-1);
  expect(video.autoplay).toBe(true);
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.playsInline).toBe(true);

  fireEvent.canPlay(video);
  expect(poster).toHaveClass("intermission__poster--covered");
  expect(video).toHaveClass("intermission__video--ready");

  fireEvent.error(video);
  expect(poster).not.toHaveClass("intermission__poster--covered");
  expect(container.querySelector(".intermission__poster")).toBeInTheDocument();
  expect(container.querySelector(".intermission__media")).not.toHaveClass(
    "intermission__media--poster-failed",
  );
  expect(video).not.toHaveClass("intermission__video--ready");

  fireEvent.canPlay(video);
  expect(poster).not.toHaveClass("intermission__poster--covered");
  expect(video).not.toHaveClass("intermission__video--ready");
});

test("reveals the page surface when a static pillar poster fails to load", () => {
  const { container } = render(
    <I18nProvider>
      <Intermission
        pillar="sleep-circadian"
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />
    </I18nProvider>,
  );

  const media = container.querySelector(".intermission__media");
  const poster = container.querySelector<HTMLImageElement>(".intermission__poster");
  if (!poster) throw new Error("Expected static poster");

  fireEvent.error(poster);

  expect(media).toHaveClass("intermission__media--poster-failed");
  expect(container.querySelector(".intermission__poster")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  expect(screen.getByRole("button", { name: "Continue assessment" })).toBeVisible();
});

test("unmounts the Cardio loop when its poster fails while keeping the failure surface", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  const { container } = render(
    <I18nProvider>
      <Intermission pillar="cardio-energy" completed={8} total={20} onContinue={vi.fn()} />
    </I18nProvider>,
  );

  const poster = container.querySelector<HTMLImageElement>(".intermission__poster");
  expect(poster).toBeInTheDocument();
  expect(container.querySelector(".intermission__video")).toBeInTheDocument();

  fireEvent.error(poster!);

  expect(container.querySelector(".intermission__poster")).not.toBeInTheDocument();
  expect(container.querySelector(".intermission__video")).not.toBeInTheDocument();
  expect(container.querySelector(".intermission__media")).toHaveClass(
    "intermission__media--poster-failed",
  );
});

test("keeps the Cardio poster and removes its loop for reduced motion or a hidden page", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: false,
  });
  const { container } = render(
    <I18nProvider>
      <Intermission pillar="cardio-energy" completed={8} total={20} onContinue={vi.fn()} />
    </I18nProvider>,
  );

  expect(container.querySelector(".intermission__video")).toBeInTheDocument();
  act(() => motion.setReduced(true));
  expect(container.querySelector(".intermission__video")).not.toBeInTheDocument();
  expect(container.querySelector(".intermission__poster")).toBeInTheDocument();

  act(() => motion.setReduced(false));
  expect(container.querySelector(".intermission__video")).toBeInTheDocument();
  act(() => {
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(container.querySelector(".intermission__video")).not.toBeInTheDocument();
  expect(container.querySelector(".intermission__poster")).toBeInTheDocument();
});

test.each([
  ["strength-neural", "recovery-intermission.webp"],
  ["sleep-circadian", "sleep-intermission.webp"],
  ["nutrition-metabolic", "metabolism-intermission.webp"],
] as const)("keeps %s as a static local poster", (pillar, expectedFile) => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  const { container } = render(
    <I18nProvider>
      <Intermission pillar={pillar} completed={8} total={20} onContinue={vi.fn()} />
    </I18nProvider>,
  );

  const poster = container.querySelector<HTMLImageElement>(".intermission__poster");
  expect(poster?.getAttribute("src")).toContain(expectedFile);
  expect(container.querySelector("video")).not.toBeInTheDocument();
});

test("uses only local media URLs", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  const { container } = render(
    <I18nProvider>
      <Intermission pillar="cardio-energy" completed={8} total={20} onContinue={vi.fn()} />
    </I18nProvider>,
  );

  const mediaUrls = [...container.querySelectorAll("img, video, source")].flatMap((element) =>
    [element.getAttribute("src"), element.getAttribute("poster")].filter(
      (url): url is string => Boolean(url),
    ),
  );
  expect(mediaUrls).not.toEqual([]);
  expect(mediaUrls.every((url) => url.startsWith("/media/"))).toBe(true);
  expect(mediaUrls.some((url) => /^https?:/i.test(url))).toBe(false);
});

test("localizes the entering chapter without changing its position", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LocalizedIntermission />
    </I18nProvider>,
  );

  const french = screen.getByRole("button", { name: "Français" });
  await user.click(french);

  expect(french).toHaveFocus();
  expect(screen.getByTestId("locale")).toHaveTextContent("fr");
  expect(screen.getByText("Chapitre 04 / 04")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "À suivre : Alimentation et santé métabolique" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuer l'analyse" })).toBeVisible();
});
