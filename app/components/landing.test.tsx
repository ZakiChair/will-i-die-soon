import { render as testingRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, expect, test, vi } from "vitest";

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

afterEach(() => vi.restoreAllMocks());

test("makes Express the primary adult route outside decorative content", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<Landing onStart={onStart} />);

  expect(screen.getByRole("heading", { name: "Your body is a system." })).toBeVisible();
  expect(screen.getByText(/9 questions.*adults 18\+.*under one minute/i)).toBeVisible();

  const expressButtons = screen.getAllByRole("button", { name: "Start Express" });
  expect(expressButtons).toHaveLength(2);
  await user.click(expressButtons[0]);
  await user.click(expressButtons[1]);
  expect(onStart).toHaveBeenNthCalledWith(1, "express");
  expect(onStart).toHaveBeenNthCalledWith(2, "express");

  expect(screen.queryByRole("heading", { name: "Express", level: 3 })).not.toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 3 }).slice(-3).map(({ textContent }) => textContent))
    .toEqual(["Quick", "Detailed", "Deep"]);
  expect(container.querySelector("video")).not.toBeInTheDocument();
  expect(container.querySelector("img")?.getAttribute("src")).toContain("human-atlas-hero.webp");
  expect(expressButtons.every((button) => !button.closest(".landing__atlas-decorative"))).toBe(true);
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

  expect(screen.getByRole("heading", { name: "Votre corps est un système." })).toBeVisible();
  expect(screen.getAllByRole("button", { name: "Commencer Express" })).toHaveLength(2);
  expect(screen.getAllByRole("heading", { level: 3 }).slice(0, 4).map(({ textContent }) => textContent))
    .toEqual([
      "Poumons et cœur, un même circuit.",
      "Le signal traverse tout le corps.",
      "Le cerveau donne le tempo.",
      "Le noyau digestif s'illumine.",
    ]);
  expect(screen.getByRole("heading", { name: "Rapide" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Détaillée" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Approfondie" })).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Your body is a system|Start Express|Other explorations/i);

  await user.click(screen.getByRole("button", { name: "Choisir l'analyse rapide" }));
  expect(onStart).toHaveBeenCalledWith("quick");
});
