import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { HealthDomain } from "../lib/types";
import { Intermission } from "./intermission";

test.each([
  ["sleep", "sleep-intermission.webp"],
  ["diet", "metabolism-intermission.webp"],
  ["preventive-care", "recovery-intermission.webp"],
] as const)(
  "uses the %s milestone artwork without adding decorative noise to the accessibility tree",
  (completedDomain, expectedFile) => {
    const { container } = render(
      <Intermission
        completedDomain={completedDomain satisfies HealthDomain}
        completed={8}
        total={20}
        onContinue={vi.fn()}
      />,
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
