import { describe, expect, test } from "vitest";

import {
  extractLabText,
  normalizeLabValue,
  parseLabCandidates,
} from "./labs";

const ocr = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  terminate: vi.fn(),
}));

vi.mock("tesseract.js", () => ({
  createWorker: ocr.createWorker,
  OEM: { LSTM_ONLY: 1 },
}));

describe("parseLabCandidates", () => {
  test.each([
    ["Glucose 100 mg/dL (70 - 99)", "glucose", 100, "mg/dL"],
    ["Cholesterol, Total 200 mg/dL", "total_cholesterol", 200, "mg/dL"],
    ["HDL-C 40 mg/dL", "hdl_cholesterol", 40, "mg/dL"],
    ["LDL Chol Calc = 100 mg/dL", "ldl_cholesterol", 100, "mg/dL"],
    ["Triglycerides 150 mg/dL", "triglycerides", 150, "mg/dL"],
    ["HbA1c 5.7 % (4.0 - 5.6)", "hba1c", 5.7, "%"],
    ["ALT 60 U/L", "alt", 60, "U/L"],
    ["AST 48 U/L", "ast", 48, "U/L"],
    ["Creatinine, Serum 1.00 mg/dL", "creatinine_serum", 1, "mg/dL"],
    ["eGFR 90 mL/min/1.73m²", "egfr", 90, "mL/min/1.73m²"],
    ["TSH 2.0 μIU/mL", "tsh", 2, "µIU/mL"],
    ["CBC\nHgb 13.2 g/dL", "hemoglobin_blood", 13.2, "g/dL"],
    ["Serum Ferritin 30 ng/mL", "ferritin", 30, "ng/mL"],
    ["25-Hydroxyvitamin D 20 ng/mL", "vitamin_d_25oh", 20, "ng/mL"],
  ] as const)(
    "maps an approved alias and compatible unit from %s",
    (text, marker, value, unit) => {
      expect(parseLabCandidates(text)).toContainEqual(
        expect.objectContaining({ marker, value, unit }),
      );
    },
  );

  test("preserves the printed observation, interval, flag, date, fasting status, and method", () => {
    const [candidate] = parseLabCandidates(
      "Collection date: 2026-07-30\nFasting: 10 hours\nLDL Chol Calc = 100 mg/dL (0 - 99) H",
    );

    expect(candidate).toEqual(
      expect.objectContaining({
        rawTestName: "LDL Chol Calc",
        valueText: "100",
        rawUnit: "mg/dL",
        rawRange: "0 - 99",
        referenceLow: 0,
        referenceHigh: 99,
        printedFlag: "H",
        collectionDate: "2026-07-30",
        fastingStatus: "fasting",
        fastingHours: 10,
        method: "calculated",
      }),
    );
  });

  test.each([
    "Vitamin D = 20 ng/mL",
    "LDL = 100 mg/dL",
    "Creatinine, urine = 100 mg/dL",
    "Hgb 13.2 g/dL",
    "HbA1c 5..7 %",
    "AST/ALT ratio 1.2 U/L",
    "1,25-dihydroxyvitamin D 20 ng/mL",
  ])("leaves ambiguous or impossible input unmapped: %s", (text) => {
    expect(parseLabCandidates(text)).toEqual([]);
  });
});

describe("normalizeLabValue", () => {
  test.each([
    ["glucose", 100, "mg/dL", 5.551, "mmol/L", "5.55"],
    ["glucose", 5.551, "mmol/L", 100, "mg/dL", "100"],
    ["total_cholesterol", 200, "mg/dL", 5.172, "mmol/L", "5.172"],
    ["hdl_cholesterol", 40, "mg/dL", 1.0344, "mmol/L", "1.0344"],
    ["ldl_cholesterol", 100, "mg/dL", 2.586, "mmol/L", "2.586"],
    ["triglycerides", 150, "mg/dL", 1.6935, "mmol/L", "1.6935"],
    ["hba1c", 6.5, "%", 47.545, "mmol/mol", "48"],
    ["creatinine_serum", 1, "mg/dL", 88.4, "µmol/L", "88.4"],
    ["hemoglobin_blood", 13.2, "g/dL", 132, "g/L", "132"],
    ["ferritin", 30, "ng/mL", 30, "µg/L", "30"],
    ["vitamin_d_25oh", 20, "ng/mL", 49.92, "nmol/L", "49.92"],
    ["alt", 60, "U/L", 1, "µkat/L", "1"],
    ["ast", 48, "U/L", 0.8, "µkat/L", "0.8"],
    ["egfr", 90, "mL/min/1.73m²", 1.5, "mL/s/1.73m²", "1.5"],
    ["tsh", 2, "µIU/mL", 2, "mIU/L", "2"],
  ] as const)(
    "applies only the documented conversion for %s",
    (marker, value, unit, normalizedValue, normalizedUnit, displayValue) => {
      const normalized = normalizeLabValue({ marker, value, unit });

      expect(normalized.normalizedValue).toBeCloseTo(normalizedValue, 10);
      expect(normalized.normalizedUnit).toBe(normalizedUnit);
      expect(normalized.displayValue).toBe(displayValue);
      expect(normalized.value).toBe(value);
      expect(normalized.unit).toBe(unit);
      expect(normalized).not.toHaveProperty("classification");
      expect(normalized).not.toHaveProperty("diagnosis");
      expect(normalized).not.toHaveProperty("risk");
    },
  );
});

describe("extractLabText", () => {
  test("reads a plain-text report with File.text without a network request", async () => {
    const file = new File(["HbA1c 5.7 %"], "labs.txt", { type: "text/plain" });
    const text = vi.fn().mockResolvedValue("HbA1c 5.7 %");
    Object.defineProperty(file, "text", { value: text });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(extractLabText(file)).resolves.toBe("HbA1c 5.7 %");
    expect(text).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test("rejects unsupported files so callers can keep manual entry available", async () => {
    const file = new File(["data"], "labs.csv", { type: "text/csv" });

    await expect(extractLabText(file)).rejects.toThrow(/unsupported/i);
  });

  test("uses only same-origin OCR assets and disables persistent language-data caching", async () => {
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.recognize.mockResolvedValue({ data: { text: "AST 48 U/L" } });
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockResolvedValue({
      recognize: ocr.recognize,
      terminate: ocr.terminate,
    });

    await expect(extractLabText(file)).resolves.toBe("AST 48 U/L");
    expect(ocr.createWorker).toHaveBeenCalledWith("eng", 1, {
      workerPath: "/lab-assets/tesseract-worker.min.js",
      corePath: "/lab-assets/tesseract-core",
      langPath: "/lab-assets/tessdata",
      cacheMethod: "none",
    });
    expect(ocr.recognize).toHaveBeenCalledWith(file);
    expect(ocr.terminate).toHaveBeenCalledOnce();
  });
});
