import Decimal from "decimal.js";

export const LAB_MARKERS = [
  "glucose",
  "total_cholesterol",
  "hdl_cholesterol",
  "ldl_cholesterol",
  "triglycerides",
  "hba1c",
  "creatinine_serum",
  "hemoglobin_blood",
  "ferritin",
  "vitamin_d_25oh",
  "alt",
  "ast",
  "egfr",
  "tsh",
] as const;

export type LabMarker = (typeof LAB_MARKERS)[number];
export type FastingStatus = "fasting" | "not_fasting" | "not_stated";

export type LabCandidate = {
  marker: LabMarker;
  value: number;
  unit: string;
  rawLine?: string;
  rawTestName?: string;
  valueText?: string;
  rawUnit?: string;
  rawRange?: string;
  referenceLow?: number;
  referenceHigh?: number;
  printedFlag?: string;
  collectionDate?: string;
  fastingStatus?: FastingStatus;
  fastingHours?: number;
  method?: "calculated" | "direct";
};

export type NormalizedLabValue = LabCandidate & {
  normalizedValue: number;
  normalizedUnit: string;
  displayValue: string;
};

export type ReviewedLabObservation = {
  readonly marker: LabMarker;
  readonly valueText: string;
  readonly value: number;
  readonly unit: string;
  readonly referenceRange: string;
  readonly collectionDate: string;
  readonly fastingStatus: FastingStatus;
};

export type ConfirmedLabValue = {
  readonly source: Readonly<LabCandidate> | null;
  readonly reviewed: ReviewedLabObservation;
  readonly normalized: {
    readonly value: number;
    readonly unit: string;
    readonly displayValue: string;
  };
};

type MarkerSpec = {
  marker: LabMarker;
  name: RegExp;
  units: ReadonlySet<string>;
  needsCbc?: boolean;
};

const MASS_UNITS = new Set(["mg/dL", "mmol/L"]);
const MARKER_SPECS: ReadonlyArray<MarkerSpec> = [
  {
    marker: "vitamin_d_25oh",
    name: /^(?:25-hydroxyvitamin d|25\(oh\)d|25-oh d|calcidiol|25-hydroxy d total|vitamin d 25-hydroxy)$/i,
    units: new Set(["ng/mL", "nmol/L"]),
  },
  {
    marker: "hba1c",
    name: /^(?:hba1c|hgb a1c|hemoglobin a1c|a1c|glycated hemoglobin|glycohemoglobin)$/i,
    units: new Set(["%", "mmol/mol"]),
  },
  {
    marker: "total_cholesterol",
    name: /^(?:total cholesterol|cholesterol total|tc|chol)$/i,
    units: MASS_UNITS,
  },
  {
    marker: "hdl_cholesterol",
    name: /^(?:hdl|hdl-c|high density lipoprotein cholesterol)$/i,
    units: MASS_UNITS,
  },
  {
    marker: "ldl_cholesterol",
    name: /^(?:ldl-c|low density lipoprotein cholesterol|ldl chol calc|direct ldl)$/i,
    units: MASS_UNITS,
  },
  {
    marker: "triglycerides",
    name: /^(?:triglycerides|tg|trig|trigs|triglyceride)$/i,
    units: MASS_UNITS,
  },
  {
    marker: "glucose",
    name: /^(?:(?:blood|serum|plasma) glucose|glucose|glu|fasting glucose|fpg|fasting plasma glucose)$/i,
    units: MASS_UNITS,
  },
  {
    marker: "creatinine_serum",
    name: /^(?:creatinine|creat|creatinine serum(?:\/plasma)?|scr)$/i,
    units: new Set(["mg/dL", "mmol/L", "µmol/L"]),
  },
  {
    marker: "hemoglobin_blood",
    name: /^(?:hemoglobin|haemoglobin|hgb|hb|h&h)$/i,
    units: new Set(["g/dL", "g/L"]),
  },
  {
    marker: "ferritin",
    name: /^(?:ferritin|serum ferritin|ferritin s)$/i,
    units: new Set(["ng/mL", "µg/L"]),
  },
  {
    marker: "alt",
    name: /^(?:alt|alanine aminotransferase|alanine transaminase|sgpt|gpt)$/i,
    units: new Set(["U/L", "µkat/L"]),
  },
  {
    marker: "ast",
    name: /^(?:ast|aspartate aminotransferase|aspartate transaminase|sgot|got)$/i,
    units: new Set(["U/L", "µkat/L"]),
  },
  {
    marker: "egfr",
    name: /^(?:egfr|estimated gfr|egfrcr|egfr creatinine|gfr estimated)$/i,
    units: new Set(["mL/min/1.73m²", "mL/s/1.73m²"]),
  },
  {
    marker: "tsh",
    name: /^(?:tsh|thyroid stimulating hormone|thyrotropin|thyrotropic hormone)$/i,
    units: new Set(["mIU/L", "µIU/mL"]),
  },
];

const NUMBER_TEXT = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const OBSERVATION = new RegExp(
  `^\\s*(.+?)\\s*(?:=|:|\\s)\\s*(${NUMBER_TEXT})\\s+([^\\s()\\[\\]]+)\\s*(.*)$`,
);
const DELIMITED_RANGE = new RegExp(
  `(\\(\\s*(${NUMBER_TEXT})\\s*[-–—]\\s*(${NUMBER_TEXT})\\s*\\)|\\[\\s*(${NUMBER_TEXT})\\s*[-–—]\\s*(${NUMBER_TEXT})\\s*\\])`,
);
const BARE_RANGE = new RegExp(
  `(?<![\\d-])(${NUMBER_TEXT})\\s*[-–—]\\s*(${NUMBER_TEXT})(?![\\d-])`,
);

function canonicalName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[,:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalUnit(value: string): string {
  const compact = value
    .normalize("NFKC")
    .replace(/[uμ]/g, "µ")
    .replace(/\s+/g, "")
    .replace(/\^?2$/, "²");
  const units: Readonly<Record<string, string>> = {
    "mg/dl": "mg/dL",
    "mmol/l": "mmol/L",
    "ng/ml": "ng/mL",
    "nmol/l": "nmol/L",
    "µmol/l": "µmol/L",
    "g/dl": "g/dL",
    "g/l": "g/L",
    "µg/l": "µg/L",
    "u/l": "U/L",
    "µkat/l": "µkat/L",
    "miu/l": "mIU/L",
    "µiu/ml": "µIU/mL",
    "ml/min/1.73m²": "mL/min/1.73m²",
    "ml/s/1.73m²": "mL/s/1.73m²",
    "%": "%",
  };
  return units[compact.toLowerCase()] ?? compact;
}

function reportContext(text: string) {
  const date = text.match(
    /\b(?:collection|collected|specimen)(?:\s+date)?\s*[:=]\s*(\d{4}-\d{2}-\d{2})\b/i,
  )?.[1];
  const fastingHoursText = text.match(
    /(?:^|\n)\s*fasting(?:\s+duration)?\s*[:=]\s*(\d+(?:\.\d+)?)\s*hours?\s*(?:\n|$)/i,
  )?.[1];
  const fastingStatusText = text.match(
    /(?:^|\n)\s*fasting(?:\s+status)?\s*[:=]\s*(yes|no|fasting|not[ -]?fasting|non[ -]?fasting|unknown|not stated)\s*(?:\n|$)/i,
  )?.[1]?.toLowerCase();
  const fastingStatus = fastingHoursText
    ? ("fasting" as const)
    : fastingStatusText === "yes" || fastingStatusText === "fasting"
      ? ("fasting" as const)
      : fastingStatusText === "no" || /^(?:not|non)[ -]?fasting$/.test(fastingStatusText ?? "")
        ? ("not_fasting" as const)
        : undefined;

  return {
    collectionDate: date,
    fastingStatus,
    fastingHours: fastingHoursText === undefined ? undefined : Number(fastingHoursText),
  };
}

function parseRange(value: string) {
  const delimited = value.match(DELIMITED_RANGE);
  if (delimited) {
    return {
      rawRange: delimited[1],
      referenceLow: Number(delimited[2] ?? delimited[4]),
      referenceHigh: Number(delimited[3] ?? delimited[5]),
    };
  }
  const bare = value.match(BARE_RANGE);
  if (!bare) return {};
  return {
    rawRange: bare[0],
    referenceLow: Number(bare[1]),
    referenceHigh: Number(bare[2]),
  };
}

export function parseLabCandidates(text: string): LabCandidate[] {
  const context = reportContext(text);
  const hasCbcContext = /(?:^|\n)\s*(?:cbc|complete blood count)\b/im.test(text);
  const candidates: LabCandidate[] = [];

  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.trim();
    const observation = line.match(OBSERVATION);
    if (!observation) continue;

    const [, rawName, valueText, rawUnit, remainder] = observation;
    const name = canonicalName(rawName);
    const unit = canonicalUnit(rawUnit);
    const spec = MARKER_SPECS.find(
      (candidate) => candidate.name.test(name) && candidate.units.has(unit),
    );
    if (!spec) continue;
    if (
      spec.marker === "hemoglobin_blood" &&
      /^(?:hgb|hb|h&h)$/i.test(name) &&
      !hasCbcContext
    ) {
      continue;
    }

    const value = Number(valueText);
    if (!Number.isFinite(value)) continue;
    const range = parseRange(remainder);
    const printedFlag = remainder.match(/(?:^|\s)([HL])(?:\s|$)/i)?.[1]?.toUpperCase();
    const method = /\bcalc(?:ulated)?\b/i.test(rawName)
      ? ("calculated" as const)
      : /\bdirect\b/i.test(rawName)
        ? ("direct" as const)
        : undefined;

    candidates.push({
      marker: spec.marker,
      rawLine: sourceLine,
      rawTestName: rawName.trim(),
      valueText,
      value,
      rawUnit,
      unit,
      ...range,
      printedFlag,
      method,
      ...context,
    });
  }

  return candidates;
}

function converted(
  candidate: LabCandidate,
  normalizedDecimal: Decimal,
  normalizedUnit: string,
  digits: number,
): NormalizedLabValue {
  const normalizedValue = normalizedDecimal.toNumber();
  return {
    ...candidate,
    normalizedValue,
    normalizedUnit,
    displayValue: String(Number(normalizedValue.toFixed(digits))),
  };
}

export function normalizeLabValue(candidate: LabCandidate): NormalizedLabValue {
  const unit = canonicalUnit(candidate.unit);
  const original = candidate;
  const { marker, value } = original;
  const decimal = new Decimal(value);

  if (marker === "glucose") {
    if (unit === "mg/dL") return converted(original, decimal.times("0.05551"), "mmol/L", 2);
    if (unit === "mmol/L") return converted(original, decimal.div("0.05551"), "mg/dL", 0);
  }
  if (
    marker === "total_cholesterol" ||
    marker === "hdl_cholesterol" ||
    marker === "ldl_cholesterol"
  ) {
    if (unit === "mg/dL") return converted(original, decimal.times("0.02586"), "mmol/L", 4);
    if (unit === "mmol/L") return converted(original, decimal.div("0.02586"), "mg/dL", 0);
  }
  if (marker === "triglycerides") {
    if (unit === "mg/dL") return converted(original, decimal.times("0.01129"), "mmol/L", 4);
    if (unit === "mmol/L") return converted(original, decimal.div("0.01129"), "mg/dL", 0);
  }
  if (marker === "hba1c") {
    if (unit === "%") {
      return converted(original, decimal.times("10.93").minus("23.50"), "mmol/mol", 0);
    }
    if (unit === "mmol/mol") {
      return converted(original, decimal.times("0.09148").plus("2.152"), "%", 1);
    }
  }
  if (marker === "creatinine_serum") {
    if (unit === "mg/dL") return converted(original, decimal.times("88.4"), "µmol/L", 2);
    if (unit === "µmol/L") return converted(original, decimal.div("88.4"), "mg/dL", 3);
    if (unit === "mmol/L") return converted(original, decimal.div("0.0884"), "mg/dL", 3);
  }
  if (marker === "hemoglobin_blood") {
    if (unit === "g/dL") return converted(original, decimal.times(10), "g/L", 2);
    if (unit === "g/L") return converted(original, decimal.div(10), "g/dL", 2);
  }
  if (marker === "ferritin") {
    if (unit === "ng/mL") return converted(original, decimal, "µg/L", 2);
    if (unit === "µg/L") return converted(original, decimal, "ng/mL", 2);
  }
  if (marker === "vitamin_d_25oh") {
    if (unit === "ng/mL") return converted(original, decimal.times("2.496"), "nmol/L", 2);
    if (unit === "nmol/L") return converted(original, decimal.div("2.496"), "ng/mL", 2);
  }
  if (marker === "alt" || marker === "ast") {
    if (unit === "U/L") return converted(original, decimal.div(60), "µkat/L", 3);
    if (unit === "µkat/L") return converted(original, decimal.times(60), "U/L", 2);
  }
  if (marker === "egfr") {
    if (unit === "mL/min/1.73m²") {
      return converted(original, decimal.div(60), "mL/s/1.73m²", 3);
    }
    if (unit === "mL/s/1.73m²") {
      return converted(original, decimal.times(60), "mL/min/1.73m²", 2);
    }
  }
  if (marker === "tsh") {
    if (unit === "µIU/mL") return converted(original, decimal, "mIU/L", 2);
    if (unit === "mIU/L") return converted(original, decimal, "µIU/mL", 2);
  }

  return converted(original, decimal, unit, 6);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs =
    typeof Worker === "undefined"
      ? await import("pdfjs-dist/legacy/build/pdf.mjs")
      : await import("pdfjs-dist");
  if (typeof Worker !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/lab-assets/pdf.worker.min.mjs";
  }
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let line: string[] = [];
      let previousY: number | undefined;
      const flushLine = () => {
        const text = line.join(" ").replace(/\s+/g, " ").trim();
        if (text) lines.push(text);
        line = [];
      };
      for (const item of content.items) {
        if (!("str" in item) || item.str === "") continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 1) flushLine();
        line.push(item.str);
        previousY = y;
        if (item.hasEOL) {
          flushLine();
          previousY = undefined;
        }
      }
      flushLine();
      pages.push(lines.join("\n"));
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.join("\n");
}

async function extractImageText(file: File): Promise<string> {
  const { createWorker, OEM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: "/lab-assets/tesseract-worker.min.js",
    corePath: "/lab-assets/tesseract-core",
    langPath: "/lab-assets/tessdata",
    cacheMethod: "none",
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractLabText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  if (file.type.startsWith("text/plain") || /\.(?:txt|text)$/.test(fileName)) {
    return file.text();
  }
  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractPdfText(file);
  }
  if (file.type.startsWith("image/")) {
    return extractImageText(file);
  }
  throw new Error("Unsupported lab report file type");
}
