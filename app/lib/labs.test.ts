import { afterEach, describe, expect, test, vi } from "vitest";

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

type PdfModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

const pdf = vi.hoisted(() => ({
  actualGetDocument: undefined as PdfModule["getDocument"] | undefined,
  getDocument: vi.fn(),
}));

vi.mock("tesseract.js", () => ({
  createWorker: ocr.createWorker,
  OEM: { LSTM_ONLY: 1 },
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", async (importOriginal) => {
  const actual = await importOriginal<PdfModule>();
  pdf.actualGetDocument = actual.getDocument;
  pdf.getDocument.mockImplementation(actual.getDocument);
  return { ...actual, getDocument: pdf.getDocument };
});

afterEach(() => {
  vi.restoreAllMocks();
  pdf.getDocument.mockReset();
  if (pdf.actualGetDocument) {
    pdf.getDocument.mockImplementation(pdf.actualGetDocument);
  }
});

function multiRowPdfFixture(): Uint8Array {
  const stream = [
    "BT",
    "/F1 12 Tf",
    "72 720 Td",
    "(Glucose 100 mg/dL \(70 - 99\)) Tj",
    "0 -24 Td",
    "(AST 48 U/L \(0 - 40\)) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function caughtError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

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
        rawLine: "LDL Chol Calc = 100 mg/dL (0 - 99) H",
        rawTestName: "LDL Chol Calc",
        valueText: "100",
        rawUnit: "mg/dL",
        rawRange: "(0 - 99)",
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

  test("keeps an exact delimited range and source line instead of reconstructing it", () => {
    const rawLine = "LDL Chol Calc = 100 mg/dL  [ 0  –  99 ] H";
    const [candidate] = parseLabCandidates(
      `Collection date: 2026-07-30\nFasting: 10 hours\n${rawLine}`,
    );

    expect(candidate).toEqual(
      expect.objectContaining({
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
      }),
    );
  });

  test.each([
    ["Fasting: yes", "fasting", undefined],
    ["Fasting status: fasting", "fasting", undefined],
    ["Fasting: no", "not_fasting", undefined],
    ["Fasting status: not fasting", "not_fasting", undefined],
    ["Fasting: 8 hours", "fasting", 8],
    ["Fasting: unknown", undefined, undefined],
    ["Fasting: not stated", undefined, undefined],
  ] as const)(
    "parses only an explicit fasting status from %s",
    (contextLine, fastingStatus, fastingHours) => {
      const [candidate] = parseLabCandidates(`${contextLine}\nAST 48 U/L`);

      expect(candidate.fastingStatus).toBe(fastingStatus);
      expect(candidate.fastingHours).toBe(fastingHours);
    },
  );

  test("does not capture an ISO date substring as a laboratory range", () => {
    const [candidate] = parseLabCandidates(
      "Collection date: 2026-07-30\nAST 48 U/L 2026-07-30 H",
    );

    expect(candidate.rawRange).toBeUndefined();
    expect(candidate.referenceLow).toBeUndefined();
    expect(candidate.referenceHigh).toBeUndefined();
    expect(candidate.collectionDate).toBe("2026-07-30");
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

  test("rejects a report over 20 MiB before reading bytes or loading a parser", async () => {
    const file = new File(["small fixture"], "labs.pdf", {
      type: "application/pdf",
    });
    const arrayBuffer = vi.fn();
    Object.defineProperties(file, {
      size: { value: 20 * 1024 * 1024 + 1 },
      arrayBuffer: { value: arrayBuffer },
    });

    expect(await caughtError(extractLabText(file))).toMatchObject({
      name: "LabProcessingLimitError",
      code: "file-too-large",
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  test("rejects plain-text extraction over 500,000 characters", async () => {
    const file = new File(["small fixture"], "labs.txt", {
      type: "text/plain",
    });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue("x".repeat(500_001)),
    });

    expect(await caughtError(extractLabText(file))).toMatchObject({
      name: "LabProcessingLimitError",
      code: "text-too-long",
    });
  });

  test("reconstructs genuine PDF rows before parsing separate markers", async () => {
    const canvas = await import("@napi-rs/canvas");
    Object.defineProperties(globalThis, {
      DOMMatrix: { configurable: true, value: canvas.DOMMatrix },
      ImageData: { configurable: true, value: canvas.ImageData },
      Path2D: { configurable: true, value: canvas.Path2D },
    });
    const bytes = multiRowPdfFixture();
    const file = new File([bytes.buffer as ArrayBuffer], "multi-row-labs.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      // Array-like avoids jsdom/Node cross-realm ArrayBuffer identity checks in PDF.js.
      value: vi.fn().mockResolvedValue(Array.from(bytes)),
    });

    const text = await extractLabText(file);

    expect(text).toContain("Glucose 100 mg/dL (70 - 99)\nAST 48 U/L (0 - 40)");
    expect(parseLabCandidates(text).map((candidate) => candidate.marker)).toEqual([
      "glucose",
      "ast",
    ]);
  });

  test("rejects a PDF over 50 pages before page extraction and destroys its loading task", async () => {
    const getPage = vi.fn();
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 51, getPage }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);
    const file = new File(["%PDF"], "too-many-pages.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    });

    expect(await caughtError(extractLabText(file))).toMatchObject({
      name: "LabProcessingLimitError",
      code: "pdf-too-many-pages",
    });
    expect(getPage).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("bounds accumulated PDF text and destroys its loading task", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [
              {
                str: "x".repeat(500_001),
                transform: [1, 0, 0, 1, 0, 100],
                hasEOL: true,
              },
            ],
          }),
        }),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);
    const file = new File(["%PDF"], "too-much-text.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    });

    expect(await caughtError(extractLabText(file))).toMatchObject({
      name: "LabProcessingLimitError",
      code: "text-too-long",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("uses only same-origin OCR assets and disables persistent language-data caching", async () => {
    ocr.createWorker.mockClear();
    ocr.recognize.mockClear();
    ocr.terminate.mockClear();
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

  test("bounds OCR output and still terminates the local worker", async () => {
    ocr.createWorker.mockClear();
    ocr.recognize.mockClear();
    ocr.terminate.mockClear();
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.recognize.mockResolvedValue({ data: { text: "x".repeat(500_001) } });
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockResolvedValue({
      recognize: ocr.recognize,
      terminate: ocr.terminate,
    });

    expect(await caughtError(extractLabText(file))).toMatchObject({
      name: "LabProcessingLimitError",
      code: "text-too-long",
    });
    expect(ocr.terminate).toHaveBeenCalledOnce();
  });

  test("destroys a PDF loading task when document loading fails", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error("malformed local PDF")),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>));
    const file = new File(["%PDF"], "malformed.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    });

    await expect(extractLabText(file)).rejects.toThrow("malformed local PDF");
    expect(destroy).toHaveBeenCalledOnce();
  });
});
