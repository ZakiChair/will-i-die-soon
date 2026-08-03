import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { Assessment } from "./assessment";
import { LabImport } from "./lab-import";

function localTextFile(contents: string) {
  const file = new File([contents], "report.txt", { type: "text/plain" });
  Object.defineProperty(file, "text", {
    value: vi.fn().mockResolvedValue(contents),
  });
  return file;
}

test("states local processing and keeps manual entry available before file selection", () => {
  render(<LabImport onConfirm={vi.fn()} onCancel={vi.fn()} />);

  expect(screen.getByText(/processed on this device/i)).toBeVisible();
  expect(screen.getByText(/never uploaded/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /enter results manually/i })).toBeVisible();
  expect(screen.getByLabelText(/choose a lab report/i)).toHaveAttribute(
    "accept",
    ".txt,.text,.pdf,image/*",
  );
});

test("parses a local text file without fetch and does not confirm extracted data implicitly", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<LabImport onConfirm={onConfirm} onCancel={vi.fn()} />);

  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile("HbA1c 5.7 % (4.0 - 5.6)"),
  );

  expect(await screen.findByDisplayValue("5.7")).toBeVisible();
  expect(screen.getByDisplayValue("4.0 - 5.6")).toBeVisible();
  expect(screen.getByRole("combobox", { name: /marker/i })).toHaveValue("hba1c");
  expect(onConfirm).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

test("requires an explicit row check plus marker, value, unit, date, fasting state, and range review", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(<LabImport onConfirm={onConfirm} onCancel={vi.fn()} />);

  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile("HbA1c 5.7 % (4.0 - 5.6)"),
  );
  await screen.findByDisplayValue("5.7");

  const confirm = screen.getByRole("button", { name: /confirm selected results/i });
  expect(confirm).toBeDisabled();

  await user.click(screen.getByRole("checkbox", { name: /include hba1c/i }));
  expect(confirm).toBeDisabled();
  await user.type(screen.getByLabelText(/collection date/i), "2026-07-30");
  await user.selectOptions(screen.getByLabelText(/fasting status/i), "not_stated");
  expect(confirm).toBeEnabled();

  await user.click(confirm);

  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onConfirm.mock.calls[0][0]).toEqual([
    expect.objectContaining({
      marker: "hba1c",
      value: 5.7,
      unit: "%",
      rawRange: "4.0 - 5.6",
      collectionDate: "2026-07-30",
      fastingStatus: "not_stated",
      normalizedValue: 38.801,
      normalizedUnit: "mmol/mol",
    }),
  ]);
});

test("opens the manual grid after unsupported or failed extraction", async () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<LabImport onConfirm={vi.fn()} onCancel={vi.fn()} />);
  const unsupported = new File(["marker,value"], "report.csv", {
    type: "text/csv",
  });

  await user.upload(screen.getByLabelText(/choose a lab report/i), unsupported);

  expect(await screen.findByRole("alert")).toHaveTextContent(/manual entry/i);
  expect(screen.getByRole("combobox", { name: /marker/i })).toHaveValue("");
  expect(screen.getByLabelText(/reported value/i)).toHaveValue(null);
});

test("manual entry never classifies or diagnoses the reported value", async () => {
  const user = userEvent.setup();
  render(<LabImport onConfirm={vi.fn()} onCancel={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: /enter results manually/i }));

  expect(screen.getByText(/copy what the laboratory printed/i)).toBeVisible();
  expect(document.body.textContent?.toLowerCase()).not.toMatch(
    /\b(normal|abnormal|diagnosis|deficient|disease)\b/,
  );
});

test("cancel remains available after parsing", async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<LabImport onConfirm={vi.fn()} onCancel={onCancel} />);

  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile("AST 48 U/L"),
  );
  await screen.findByDisplayValue("48");
  await user.click(screen.getByRole("button", { name: /continue without import/i }));

  await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
});

async function moveToRecentLabs(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 80; step += 1) {
    const intermission = screen.queryByRole("button", {
      name: /continue assessment/i,
    });
    if (intermission) {
      await user.click(intermission);
      continue;
    }
    if (
      /blood-test results from the past twelve months/i.test(
        screen.getByRole("heading", { level: 1 }).textContent ?? "",
      )
    ) {
      return;
    }
    await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }
  throw new Error("Recent-labs gate was not reached");
}

test("recent-labs yes reaches import and confirmed rows survive the in-memory completion handoff", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  const storageSpy = vi.spyOn(Storage.prototype, "setItem");
  render(
    <Assessment
      depth="detailed"
      profile={{ age: 35, countryCode: "CH" }}
      onComplete={onComplete}
    />,
  );

  await moveToRecentLabs(user);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    screen.getByRole("heading", { name: /bring in results without sending them away/i }),
  ).toBeVisible();

  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile("HbA1c 5.7 % (4.0 - 5.6)"),
  );
  await screen.findByDisplayValue("5.7");
  await user.click(screen.getByRole("checkbox", { name: /include hba1c/i }));
  await user.type(screen.getByLabelText(/collection date/i), "2026-07-30");
  await user.selectOptions(screen.getByLabelText(/fasting status/i), "not_stated");
  await user.click(screen.getByRole("button", { name: /confirm selected results/i }));

  for (let step = 0; step < 100 && onComplete.mock.calls.length === 0; step += 1) {
    const intermission = screen.queryByRole("button", {
      name: /continue assessment/i,
    });
    if (intermission) await user.click(intermission);
    else await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }

  expect(onComplete).toHaveBeenCalledOnce();
  expect(onComplete.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      has_recent_labs: true,
      lab_value_hba1c: "5.7 % (4.0 - 5.6)",
    }),
  );
  expect(onComplete.mock.calls[0][1]).toEqual([
    expect.objectContaining({
      marker: "hba1c",
      value: 5.7,
      rawUnit: "%",
      normalizedValue: 38.801,
      normalizedUnit: "mmol/mol",
    }),
  ]);
  expect(storageSpy).not.toHaveBeenCalled();
  storageSpy.mockRestore();
});
