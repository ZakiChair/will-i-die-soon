import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { I18nProvider, useI18n } from "../i18n/context";
import type { HealthDomain } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { Intermission } from "./intermission";

function LocalizedIntermission() {
  const { locale } = useI18n();
  return (
    <>
      <LanguageSwitcher />
      <output data-testid="locale">{locale}</output>
      <Intermission
        completedDomain="preventive-care"
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />
    </>
  );
}

test.each([
  ["sleep", "sleep-intermission.webp"],
  ["diet", "metabolism-intermission.webp"],
  ["preventive-care", "recovery-intermission.webp"],
] as const)(
  "uses the %s milestone artwork without adding decorative noise to the accessibility tree",
  (completedDomain, expectedFile) => {
    const { container } = render(
      <I18nProvider>
        <Intermission
          completedDomain={completedDomain satisfies HealthDomain}
          completed={8}
          total={20}
          onContinue={vi.fn()}
        />
      </I18nProvider>,
    );

    const image = container.querySelector<HTMLImageElement>(
      ".intermission__media img",
    );

    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toContain(expectedFile);
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("aria-hidden", "true");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("width", "1920");
    expect(image).toHaveAttribute("height", "1080");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue assessment/i }),
    ).toBeVisible();
  },
);

test("localizes a live intermission through its exact domain key without changing its milestone", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LocalizedIntermission />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByTestId("locale")).toHaveTextContent("fr");
  expect(screen.getByText(/8 sur 20/)).toBeVisible();
  expect(screen.getByText(/soins préventifs/i)).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuer l'analyse" })).toBeVisible();
  expect(screen.queryByText(/preventive care/i)).not.toBeInTheDocument();
});
