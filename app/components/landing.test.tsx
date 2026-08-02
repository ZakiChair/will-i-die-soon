import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Landing } from "./landing";

test("starts the quick exploration from the landing action", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();

  render(<Landing onStart={onStart} />);

  expect(
    screen.getByRole("heading", { name: /your health is not a verdict/i }),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: /choose quick/i }));

  expect(onStart).toHaveBeenCalledWith("quick");
});
