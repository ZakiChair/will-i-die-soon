import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { I18nProvider, useI18n } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { Intermission } from "./intermission";

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
  ["cardio-energy", "canopy-hero.webp"],
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

test("localizes the entering chapter without changing its position", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LocalizedIntermission />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByTestId("locale")).toHaveTextContent("fr");
  expect(screen.getByText("Chapitre 04 / 04")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "À suivre : Alimentation et santé métabolique" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuer l'analyse" })).toBeVisible();
});
