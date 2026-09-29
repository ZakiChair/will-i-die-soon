import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { I18nProvider } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { HealthAxisMap } from "./health-axis-map";

test("links each health topic to its explanatory chapter without displaying personal scores", async () => {
  const user = userEvent.setup();
  const { container } = render(<I18nProvider><LanguageSwitcher /><HealthAxisMap activeScene="sleep" /></I18nProvider>);
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(4);
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "#health-axis-sleep", "#health-axis-breath", "#health-axis-strength", "#health-axis-energy",
  ]);
  expect(screen.getByRole("link", { current: "step" })).toHaveTextContent("Sleep");
  expect(container.querySelector("output, meter")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("navigation", { name: "Les 4 axes du bilan" })).toBeInTheDocument();
  expect(screen.getByRole("link", { current: "step" })).toHaveTextContent("Sommeil");
});
