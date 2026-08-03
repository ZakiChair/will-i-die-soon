"use client";

import { useState } from "react";
import {
  extractLabText,
  LAB_MARKERS,
  normalizeLabValue,
  parseLabCandidates,
} from "../lib/labs";
import type {
  ConfirmedLabValue,
  FastingStatus,
  LabCandidate,
  LabMarker,
} from "../lib/labs";

export type LabImportProps = {
  onConfirm: (values: ConfirmedLabValue[]) => void;
  onCancel: () => void;
};

type EditableLabRow = {
  id: string;
  selected: boolean;
  marker: LabMarker | "";
  rawTestName: string;
  valueText: string;
  rawUnit: string;
  rawRange: string;
  collectionDate: string;
  fastingStatus: FastingStatus | "";
  printedFlag?: string;
  method?: "calculated" | "direct";
};

const MARKER_LABELS: Readonly<Record<LabMarker, string>> = {
  glucose: "Glucose",
  total_cholesterol: "Total cholesterol",
  hdl_cholesterol: "HDL cholesterol",
  ldl_cholesterol: "LDL cholesterol",
  triglycerides: "Triglycerides",
  hba1c: "HbA1c",
  creatinine_serum: "Serum/plasma creatinine",
  hemoglobin_blood: "Blood haemoglobin",
  ferritin: "Ferritin",
  vitamin_d_25oh: "Total 25-OH vitamin D",
  alt: "ALT",
  ast: "AST",
  egfr: "Laboratory-reported eGFR",
  tsh: "TSH",
};

function candidateRow(candidate: LabCandidate, index: number): EditableLabRow {
  return {
    id: `candidate-${index}`,
    selected: false,
    marker: candidate.marker,
    rawTestName: candidate.rawTestName ?? MARKER_LABELS[candidate.marker],
    valueText: candidate.valueText ?? String(candidate.value),
    rawUnit: candidate.rawUnit ?? candidate.unit,
    rawRange: candidate.rawRange ?? "",
    collectionDate: candidate.collectionDate ?? "",
    fastingStatus: candidate.fastingStatus ?? "",
    printedFlag: candidate.printedFlag,
    method: candidate.method,
  };
}

function emptyRow(index: number): EditableLabRow {
  return {
    id: `manual-${index}`,
    selected: false,
    marker: "",
    rawTestName: "",
    valueText: "",
    rawUnit: "",
    rawRange: "",
    collectionDate: "",
    fastingStatus: "",
  };
}

function numericValue(value: string): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isReady(row: EditableLabRow): boolean {
  return (
    row.selected &&
    row.marker !== "" &&
    numericValue(row.valueText) !== null &&
    row.rawUnit.trim() !== "" &&
    row.rawRange.trim() !== "" &&
    row.collectionDate !== "" &&
    row.fastingStatus !== ""
  );
}

export function LabImport({ onConfirm, onCancel }: LabImportProps) {
  const [rows, setRows] = useState<EditableLabRow[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<EditableLabRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function openManual(message?: string) {
    setManualMode(true);
    setRows([emptyRow(0)]);
    if (message) setError(message);
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = await extractLabText(file);
      const parsed = parseLabCandidates(text);
      if (parsed.length === 0) {
        openManual(
          "No unambiguous supported markers were found. Please use manual entry and review every field.",
        );
      } else {
        setManualMode(false);
        setRows(parsed.map(candidateRow));
      }
    } catch {
      openManual(
        "This report could not be extracted on this device. Manual entry is available below.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmRows() {
    const confirmed = rows.filter(isReady).map((row): ConfirmedLabValue => {
      const value = numericValue(row.valueText);
      if (row.marker === "" || value === null || row.fastingStatus === "") {
        throw new Error("Unreviewed laboratory row");
      }
      const candidate: LabCandidate = {
        marker: row.marker,
        value,
        unit: row.rawUnit.trim(),
        rawTestName: row.rawTestName.trim() || MARKER_LABELS[row.marker],
        valueText: row.valueText.trim(),
        rawUnit: row.rawUnit.trim(),
        rawRange: row.rawRange.trim(),
        collectionDate: row.collectionDate,
        fastingStatus: row.fastingStatus,
        printedFlag: row.printedFlag,
        method: row.method,
      };
      return normalizeLabValue(candidate) as ConfirmedLabValue;
    });
    if (confirmed.length > 0) onConfirm(confirmed);
  }

  const selectedRows = rows.filter((row) => row.selected);
  const canConfirm =
    selectedRows.length > 0 && selectedRows.every((row) => isReady(row));

  return (
    <section className="lab-import" aria-labelledby="lab-import-title">
      <p className="data-label">Optional report import</p>
      <h1 id="lab-import-title">Bring in results without sending them away.</h1>
      <p className="lab-import__privacy">
        <strong>Processed on this device.</strong> Your report and its contents are never
        uploaded. PDF and image tools load from this site only after you choose a file.
      </p>

      <div className="lab-import__source">
        <label htmlFor="lab-report-file">Choose a lab report</label>
        <input
          id="lab-report-file"
          type="file"
          accept=".txt,.text,.pdf,image/*"
          disabled={busy}
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <button type="button" onClick={() => openManual()} disabled={busy}>
          Enter results manually
        </button>
      </div>

      {busy ? <p role="status">Reading the report on this device…</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {rows.length > 0 ? (
        <form
          className="lab-review"
          onSubmit={(event) => {
            event.preventDefault();
            confirmRows();
          }}
        >
          <p>
            {manualMode
              ? "Copy what the laboratory printed and review every field."
              : "Extraction is a draft. Check only rows you want to use and review every field."}
          </p>
          {rows.map((row, index) => (
            <fieldset className="lab-review__row" key={row.id}>
              <legend>Reported result {index + 1}</legend>
              <label className="lab-review__include">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(event) =>
                    updateRow(row.id, { selected: event.target.checked })
                  }
                />
                Include {row.marker ? MARKER_LABELS[row.marker] : "this result"}
              </label>
              <label>
                Marker
                <select
                  value={row.marker}
                  onChange={(event) =>
                    updateRow(row.id, {
                      marker: event.target.value as LabMarker | "",
                    })
                  }
                >
                  <option value="">Select marker</option>
                  {LAB_MARKERS.map((marker) => (
                    <option value={marker} key={marker}>
                      {MARKER_LABELS[marker]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reported value
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={row.valueText}
                  onChange={(event) =>
                    updateRow(row.id, { valueText: event.target.value })
                  }
                />
              </label>
              <label>
                Reported unit
                <input
                  type="text"
                  value={row.rawUnit}
                  onChange={(event) => updateRow(row.id, { rawUnit: event.target.value })}
                />
              </label>
              <label>
                Laboratory reference range
                <input
                  type="text"
                  value={row.rawRange}
                  placeholder="Copy the range or write Not printed"
                  onChange={(event) => updateRow(row.id, { rawRange: event.target.value })}
                />
              </label>
              <label>
                Collection date
                <input
                  type="date"
                  value={row.collectionDate}
                  onChange={(event) =>
                    updateRow(row.id, { collectionDate: event.target.value })
                  }
                />
              </label>
              <label>
                Fasting status
                <select
                  value={row.fastingStatus}
                  onChange={(event) =>
                    updateRow(row.id, {
                      fastingStatus: event.target.value as FastingStatus | "",
                    })
                  }
                >
                  <option value="">Review fasting status</option>
                  <option value="fasting">Fasting</option>
                  <option value="not_fasting">Not fasting</option>
                  <option value="not_stated">Not stated or unsure</option>
                </select>
              </label>
              {row.printedFlag ? <p>Laboratory-printed flag: {row.printedFlag}</p> : null}
              {row.method ? <p>Laboratory method note: {row.method}</p> : null}
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => setRows((current) => [...current, emptyRow(current.length)])}
          >
            Add another result
          </button>
          <button type="submit" disabled={!canConfirm}>
            Confirm selected results
          </button>
        </form>
      ) : null}

      <button type="button" onClick={onCancel}>
        Continue without import
      </button>
    </section>
  );
}
