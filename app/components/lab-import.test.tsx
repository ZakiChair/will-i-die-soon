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

const fullMarkerReport = [
  "Collection date: 2026-07-30",
  "Fasting: no",
  "CBC",
  "Glucose 100 mg/dL (70 - 99)",
  "Total Cholesterol 200 mg/dL (0 - 199)",
  "HDL-C 40 mg/dL (40 - 60)",
  "LDL Chol Calc 100 mg/dL (0 - 99)",
  "Triglycerides 150 mg/dL (0 - 149)",
  "HbA1c 5.7 % (4.0 - 5.6)",
  "Creatinine, Serum 1.00 mg/dL (0.5 - 1.2)",
  "eGFR 90 mL/min/1.73m² (60 - 120)",
  "ALT 60 U/L (0 - 40)",
  "AST 48 U/L (0 - 40)",
  "TSH 2.0 μIU/mL (0.4 - 4.0)",
  "Hgb 13.2 g/dL (12.0 - 16.0)",
  "Ferritin 30 ng/mL (15 - 150)",
  "25-Hydroxyvitamin D 20 ng/mL (20 - 50)",
].join("\n");

async function selectEveryParsedRow(user: ReturnType<typeof userEvent.setup>) {
  const checkboxes = await screen.findAllByRole("checkbox", { name: /include/i });
  for (const checkbox of checkboxes) await user.click(checkbox);
  await user.click(screen.getByRole("button", { name: /confirm selected results/i }));
}

async function completeFromCurrentQuestion(
  user: ReturnType<typeof userEvent.setup>,
  onComplete: ReturnType<typeof vi.fn>,
) {
  for (let step = 0; step < 220 && onComplete.mock.calls.length === 0; step += 1) {
    const intermission = screen.queryByRole("button", {
      name: /continue assessment/i,
    });
    if (intermission) await user.click(intermission);
    else await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }
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
  expect(screen.getByDisplayValue("(4.0 - 5.6)")).toBeVisible();
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
    {
      source: expect.objectContaining({
        marker: "hba1c",
        value: 5.7,
        unit: "%",
        rawRange: "(4.0 - 5.6)",
      }),
      reviewed: expect.objectContaining({
        marker: "hba1c",
        value: 5.7,
        unit: "%",
        collectionDate: "2026-07-30",
        fastingStatus: "not_stated",
        referenceRange: "(4.0 - 5.6)",
      }),
      normalized: {
        value: 38.801,
        unit: "mmol/mol",
        displayValue: "39",
      },
    },
  ]);
});

test("keeps immutable extracted source fields beside edited reviewed fields", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const rawLine = "LDL Chol Calc = 100 mg/dL  [ 0  –  99 ] H";
  render(<LabImport onConfirm={onConfirm} onCancel={vi.fn()} />);

  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile(
      `Collection date: 2026-07-30\nFasting: 10 hours\n${rawLine}`,
    ),
  );
  await screen.findByDisplayValue("100");
  await user.selectOptions(screen.getByLabelText(/marker/i), "ast");
  await user.clear(screen.getByLabelText(/reported value/i));
  await user.type(screen.getByLabelText(/reported value/i), "48");
  await user.clear(screen.getByLabelText(/reported unit/i));
  await user.type(screen.getByLabelText(/reported unit/i), "U/L");
  await user.clear(screen.getByLabelText(/laboratory reference range/i));
  await user.type(screen.getByLabelText(/laboratory reference range/i), "Not printed");
  await user.clear(screen.getByLabelText(/collection date/i));
  await user.type(screen.getByLabelText(/collection date/i), "2026-08-01");
  await user.selectOptions(screen.getByLabelText(/fasting status/i), "not_fasting");
  await user.click(screen.getByRole("checkbox", { name: /include ast/i }));
  await user.click(screen.getByRole("button", { name: /confirm selected results/i }));

  expect(onConfirm.mock.calls[0][0][0]).toEqual({
      source: {
        marker: "ldl_cholesterol",
        value: 100,
        unit: "mg/dL",
        rawLine,
        rawTestName: "LDL Chol Calc",
        valueText: "100",
        rawUnit: "mg/dL",
        rawRange: "[ 0  –  99 ]",
        referenceLow: 0,
        referenceHigh: 99,
        printedFlag: "H",
        method: "calculated",
        collectionDate: "2026-07-30",
        fastingStatus: "fasting",
        fastingHours: 10,
      },
      reviewed: {
        marker: "ast",
        valueText: "48",
        value: 48,
        unit: "U/L",
        referenceRange: "Not printed",
        collectionDate: "2026-08-01",
        fastingStatus: "not_fasting",
      },
      normalized: {
        value: 0.8,
        unit: "µkat/L",
        displayValue: "0.8",
      },
    });
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
  expect(
    screen.getByRole("heading", { name: /bring in results without sending them away/i }),
  ).toHaveFocus();

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
    {
      source: expect.objectContaining({ marker: "hba1c", value: 5.7, rawUnit: "%" }),
      reviewed: expect.objectContaining({ marker: "hba1c", value: 5.7, unit: "%" }),
      normalized: expect.objectContaining({ value: 38.801, unit: "mmol/mol" }),
    },
  ]);
  expect(storageSpy).not.toHaveBeenCalled();
  storageSpy.mockRestore();
});

test("a full-marker Quick import keeps 20 answers while handing off every structured observation", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(
    <Assessment
      depth="quick"
      profile={{ age: 35, countryCode: "CH" }}
      onComplete={onComplete}
    />,
  );

  await moveToRecentLabs(user);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.upload(screen.getByLabelText(/choose a lab report/i), localTextFile(fullMarkerReport));
  await selectEveryParsedRow(user);
  await completeFromCurrentQuestion(user, onComplete);

  expect(onComplete).toHaveBeenCalledOnce();
  const [answers, confirmedLabs] = onComplete.mock.calls[0];
  expect(Object.keys(answers)).toHaveLength(20);
  expect(Object.keys(answers).filter((id) => id.startsWith("lab_value_"))).toEqual([]);
  expect(confirmedLabs).toHaveLength(14);
  expect(
    new Set(
      confirmedLabs.map(
        (value: { reviewed: { marker: string } }) => value.reviewed.marker,
      ),
    ).size,
  ).toBe(14);
});

test("a subset re-import removes only stale imported mappings and preserves manual answers", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
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
  await user.upload(screen.getByLabelText(/choose a lab report/i), localTextFile(fullMarkerReport));
  await selectEveryParsedRow(user);
  const intermission = screen.queryByRole("button", { name: /continue assessment/i });
  if (intermission) await user.click(intermission);
  await user.click(screen.getByRole("button", { name: /back/i }));
  expect(
    screen.getByRole("heading", {
      name: /blood-test results from the past twelve months/i,
    }),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.upload(
    screen.getByLabelText(/choose a lab report/i),
    localTextFile(
      "Collection date: 2026-07-30\nFasting: no\nAST 48 U/L (0 - 40)",
    ),
  );
  await selectEveryParsedRow(user);
  await completeFromCurrentQuestion(user, onComplete);

  const [answers, confirmedLabs] = onComplete.mock.calls[0];
  expect(answers.sex_assigned_at_birth).toBeNull();
  expect(answers.lab_value_ast).toBe("48 U/L (0 - 40)");
  expect(answers.lab_value_glucose).toBeNull();
  expect(confirmedLabs).toEqual([
    expect.objectContaining({
      reviewed: expect.objectContaining({ marker: "ast", value: 48 }),
    }),
  ]);
});
