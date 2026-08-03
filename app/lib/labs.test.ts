import { afterEach, describe, expect, test, vi } from "vitest";

import {
  extractLabText,
  isAbortError,
  LAB_PROCESSING_LIMITS,
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
  vi.unstubAllGlobals();
  ocr.createWorker.mockReset();
  ocr.recognize.mockReset();
  ocr.terminate.mockReset();
  pdf.getDocument.mockReset();
  if (pdf.actualGetDocument) {
    pdf.getDocument.mockImplementation(pdf.actualGetDocument);
  }
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

type PdfTextChunk = {
  readonly items: ReadonlyArray<{
    readonly str: string;
    readonly transform: [number, number, number, number, number, number];
    readonly hasEOL: boolean;
  }>;
  readonly styles: Readonly<Record<string, never>>;
  readonly lang: null;
};

function pdfTextChunk(
  ...items: Array<{ str: string; y?: number; hasEOL?: boolean }>
): PdfTextChunk {
  return {
    items: items.map(({ str, y = 100, hasEOL = false }) => ({
      str,
      transform: [1, 0, 0, 1, 0, y],
      hasEOL,
    })),
    styles: {},
    lang: null,
  };
}

function mockPdfTextStream(chunks: ReadonlyArray<PdfTextChunk>) {
  let index = 0;
  const cancel = vi.fn().mockResolvedValue(undefined);
  const releaseLock = vi.fn();
  const read = vi.fn().mockImplementation(async () => {
    const value = chunks[index];
    index += 1;
    return value === undefined
      ? ({ done: true, value: undefined } as const)
      : ({ done: false, value } as const);
  });
  const getReader = vi.fn(() => ({ cancel, read, releaseLock }));
  return { cancel, getReader, read, releaseLock };
}

function localPdfFile(name = "labs.pdf") {
  const file = new File(["%PDF"], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  });
  return file;
}

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

  test("rejects CSV even when the browser labels it as plain text", async () => {
    const file = new File(["marker,value"], "labs.csv", {
      type: "text/plain",
    });

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

  test("accepts a report exactly at the 20 MiB input boundary", async () => {
    const file = new File(["small fixture"], "labs.txt", {
      type: "text/plain",
    });
    const text = vi.fn().mockResolvedValue("AST 48 U/L");
    Object.defineProperties(file, {
      size: { value: LAB_PROCESSING_LIMITS.maximumFileBytes },
      text: { value: text },
    });

    await expect(extractLabText(file)).resolves.toBe("AST 48 U/L");
    expect(text).toHaveBeenCalledOnce();
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

  test("accepts plain-text extraction exactly at 500,000 characters", async () => {
    const boundaryText = "x".repeat(
      LAB_PROCESSING_LIMITS.maximumExtractedTextCharacters,
    );
    const file = new File(["small fixture"], "labs.text", {
      type: "text/plain",
    });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue(boundaryText),
    });

    await expect(extractLabText(file)).resolves.toBe(boundaryText);
  });

  test("rejects promptly with a standard AbortError while File.text is pending", async () => {
    const pendingText = deferred<string>();
    const file = new File(["small fixture"], "labs.txt", {
      type: "text/plain",
    });
    Object.defineProperty(file, "text", { value: vi.fn(() => pendingText.promise) });
    const controller = new AbortController();

    const extraction = extractLabText(file, controller.signal);
    controller.abort();
    const error = await caughtError(extraction);

    expect(isAbortError(error)).toBe(true);
    expect(error).toMatchObject({ name: "AbortError" });
    pendingText.resolve("late text");
  });

  test("reconstructs genuine PDF rows before parsing separate markers", async () => {
    const canvas = await import("@napi-rs/canvas");
    vi.stubGlobal("DOMMatrix", canvas.DOMMatrix);
    vi.stubGlobal("ImageData", canvas.ImageData);
    vi.stubGlobal("Path2D", canvas.Path2D);
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

  test("accepts exactly 50 PDF pages and releases every completed text stream", async () => {
    const streams = Array.from({ length: LAB_PROCESSING_LIMITS.maximumPdfPages }, () =>
      mockPdfTextStream([pdfTextChunk({ str: "AST 48 U/L", hasEOL: true })]),
    );
    const destroy = vi.fn().mockResolvedValue(undefined);
    const getPage = vi.fn().mockImplementation(async (pageNumber: number) => ({
      streamTextContent: () => streams[pageNumber - 1],
    }));
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: LAB_PROCESSING_LIMITS.maximumPdfPages,
        getPage,
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);

    const result = await extractLabText(localPdfFile("fifty-pages.pdf"));

    expect(result.split("\n")).toHaveLength(LAB_PROCESSING_LIMITS.maximumPdfPages);
    expect(getPage).toHaveBeenCalledTimes(LAB_PROCESSING_LIMITS.maximumPdfPages);
    for (const stream of streams) {
      expect(stream.releaseLock).toHaveBeenCalledOnce();
      expect(stream.cancel).not.toHaveBeenCalled();
    }
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("bounds cumulative chunked PDF text before materializing it and cleans the stream", async () => {
    const stream = mockPdfTextStream([
      pdfTextChunk({ str: "x".repeat(300_000) }),
      pdfTextChunk({ str: "y".repeat(200_000), hasEOL: true }),
    ]);
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          streamTextContent: vi.fn(() => stream),
        }),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);

    expect(await caughtError(extractLabText(localPdfFile("too-much-text.pdf"))))
      .toMatchObject({
      name: "LabProcessingLimitError",
      code: "text-too-long",
    });
    expect(stream.cancel).toHaveBeenCalledOnce();
    expect(stream.releaseLock).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("streams chunked PDF text successfully at the exact 500,000-character boundary", async () => {
    const stream = mockPdfTextStream([
      pdfTextChunk({ str: "x".repeat(250_000) }),
      pdfTextChunk({ str: "y".repeat(249_999), hasEOL: true }),
    ]);
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          streamTextContent: vi.fn(() => stream),
        }),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);

    const result = await extractLabText(localPdfFile("boundary-text.pdf"));

    expect(result).toHaveLength(LAB_PROCESSING_LIMITS.maximumExtractedTextCharacters);
    expect(stream.releaseLock).toHaveBeenCalledOnce();
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("aborts a pending PDF stream, cancels/releases its reader, and destroys once", async () => {
    const pendingRead = deferred<ReadableStreamReadResult<PdfTextChunk>>();
    const cancel = vi.fn().mockResolvedValue(undefined);
    const releaseLock = vi.fn();
    const stream = {
      getReader: vi.fn(() => ({
        cancel,
        read: vi.fn(() => pendingRead.promise),
        releaseLock,
      })),
    };
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          streamTextContent: vi.fn(() => stream),
        }),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);
    const controller = new AbortController();

    const extraction = extractLabText(localPdfFile("abort.pdf"), controller.signal);
    await vi.waitFor(() => expect(stream.getReader).toHaveBeenCalledOnce());
    controller.abort();
    const error = await caughtError(extraction);

    expect(isAbortError(error)).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(releaseLock).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    pendingRead.resolve({ done: true, value: undefined });
  });

  test("destroys the loading task when a PDF page rejects", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockRejectedValue(new Error("page failed")),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);

    await expect(extractLabText(localPdfFile("page-error.pdf"))).rejects.toThrow(
      "page failed",
    );
    expect(destroy).toHaveBeenCalledOnce();
  });

  test("cancels and releases a PDF text stream when reading rejects", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const releaseLock = vi.fn();
    const stream = {
      getReader: vi.fn(() => ({
        cancel,
        read: vi.fn().mockRejectedValue(new Error("stream failed")),
        releaseLock,
      })),
    };
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          streamTextContent: vi.fn(() => stream),
        }),
      }),
      destroy,
    } as unknown as ReturnType<PdfModule["getDocument"]>);

    await expect(extractLabText(localPdfFile("stream-error.pdf"))).rejects.toThrow(
      "stream failed",
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(releaseLock).toHaveBeenCalledOnce();
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

  test("accepts OCR output exactly at 500,000 characters and terminates the worker", async () => {
    const boundaryText = "x".repeat(
      LAB_PROCESSING_LIMITS.maximumExtractedTextCharacters,
    );
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.recognize.mockResolvedValue({ data: { text: boundaryText } });
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockResolvedValue({
      recognize: ocr.recognize,
      terminate: ocr.terminate,
    });

    await expect(extractLabText(file)).resolves.toBe(boundaryText);
    expect(ocr.terminate).toHaveBeenCalledOnce();
  });

  test("terminates an initialized OCR worker when recognition rejects", async () => {
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.recognize.mockRejectedValue(new Error("recognition failed"));
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockResolvedValue({
      recognize: ocr.recognize,
      terminate: ocr.terminate,
    });

    await expect(extractLabText(file)).rejects.toThrow("recognition failed");
    expect(ocr.terminate).toHaveBeenCalledOnce();
  });

  test("aborts pending OCR recognition promptly and terminates the initialized worker", async () => {
    const pendingRecognition = deferred<{ data: { text: string } }>();
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.recognize.mockReturnValue(pendingRecognition.promise);
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockResolvedValue({
      recognize: ocr.recognize,
      terminate: ocr.terminate,
    });
    const controller = new AbortController();

    const extraction = extractLabText(file, controller.signal);
    await vi.waitFor(() => expect(ocr.recognize).toHaveBeenCalledOnce());
    controller.abort();
    const error = await caughtError(extraction);

    expect(isAbortError(error)).toBe(true);
    expect(ocr.terminate).toHaveBeenCalledOnce();
    pendingRecognition.resolve({ data: { text: "late OCR" } });
  });

  test("aborts while OCR initialization is pending and terminates a late worker", async () => {
    const pendingWorker = deferred<{
      recognize: typeof ocr.recognize;
      terminate: typeof ocr.terminate;
    }>();
    const file = new File(["image bytes"], "labs.png", { type: "image/png" });
    ocr.terminate.mockResolvedValue(undefined);
    ocr.createWorker.mockReturnValue(pendingWorker.promise);
    const controller = new AbortController();

    const extraction = extractLabText(file, controller.signal);
    await vi.waitFor(() => expect(ocr.createWorker).toHaveBeenCalledOnce());
    controller.abort();
    const error = await caughtError(extraction);

    expect(isAbortError(error)).toBe(true);
    expect(ocr.terminate).not.toHaveBeenCalled();

    pendingWorker.resolve({ recognize: ocr.recognize, terminate: ocr.terminate });
    await vi.waitFor(() => expect(ocr.terminate).toHaveBeenCalledOnce());
    expect(ocr.recognize).not.toHaveBeenCalled();
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
