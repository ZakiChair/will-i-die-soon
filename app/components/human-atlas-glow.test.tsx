import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { HumanAtlasGlow } from "./human-atlas-glow";

test("keeps all four non-interactive glow layers mounted while changing active state", () => {
  const { container, rerender } = render(
    <HumanAtlasGlow activeScene="breath" motionAllowed />,
  );
  const layers = container.querySelectorAll("svg[data-atlas-glow]");
  expect(layers).toHaveLength(4);
  expect([...layers].map((layer) => layer.getAttribute("data-atlas-glow"))).toEqual([
    "breath",
    "strength",
    "sleep",
    "energy",
  ]);
  expect(container.querySelectorAll("svg[aria-hidden='true'][focusable='false']")).toHaveLength(4);
  expect(container.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
  expect(container.querySelector("[data-atlas-glow='breath']")).toHaveAttribute(
    "data-active",
    "true",
  );

  rerender(<HumanAtlasGlow activeScene="sleep" motionAllowed={false} />);
  expect(container.querySelector("[data-atlas-glow='sleep']")).toHaveAttribute(
    "data-active",
    "true",
  );
  expect(container.firstElementChild).toHaveAttribute("data-motion", "paused");
  expect(container.querySelectorAll("svg[data-atlas-glow]")).toHaveLength(4);
});
