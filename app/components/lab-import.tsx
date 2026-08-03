"use client";

import { useEffect, useRef, useState } from "react";
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
  source?: LabCandidate;
  reviewedMarker: LabMarker | "";
  reviewedValueText: string;
  reviewedUnit: string;
  reviewedRange: string;
  reviewedCollectionDate: string;
  reviewedFastingStatus: FastingStatus | "";
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
    source: candidate,
    reviewedMarker: candidate.marker,
    reviewedValueText: candidate.valueText ?? String(candidate.value),
    reviewedUnit: candidate.rawUnit ?? candidate.unit,
    reviewedRange: candidate.rawRange ?? "",
    reviewedCollectionDate: candidate.collectionDate ?? "",
    reviewedFastingStatus: candidate.fastingStatus ?? "",
  };
}

function emptyRow(index: number): EditableLabRow {
  return {
    id: `manual-${index}`,
    selected: false,
    reviewedMarker: "",
    reviewedValueText: "",
    reviewedUnit: "",
    reviewedRange: "",
    reviewedCollectionDate: "",
    reviewedFastingStatus: "",
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
    row.reviewedMarker !== "" &&
    numericValue(row.reviewedValueText) !== null &&
    row.reviewedUnit.trim() !== "" &&
    row.reviewedRange.trim() !== "" &&
    row.reviewedCollectionDate !== "" &&
    row.reviewedFastingStatus !== ""
  );
}

export function LabImport({ onConfirm, onCancel }: LabImportProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [rows, setRows] = useState<EditableLabRow[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

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
      const value = numericValue(row.reviewedValueText);
      if (
        row.reviewedMarker === "" ||
        value === null ||
        row.reviewedFastingStatus === ""
      ) {
        throw new Error("Unreviewed laboratory row");
      }
      const source = row.source;
      const reviewed = {
        marker: row.reviewedMarker,
        valueText: row.reviewedValueText.trim(),
        value,
        unit: row.reviewedUnit.trim(),
        referenceRange: row.reviewedRange.trim(),
        collectionDate: row.reviewedCollectionDate,
        fastingStatus: row.reviewedFastingStatus,
      };
      const normalized = normalizeLabValue({
        marker: reviewed.marker,
        value: reviewed.value,
        unit: reviewed.unit,
      });
      return {
        source: source ?? null,
        reviewed,
        normalized: {
          value: normalized.normalizedValue,
          unit: normalized.normalizedUnit,
          displayValue: normalized.displayValue,
        },
      };
    });
    if (confirmed.length > 0) onConfirm(confirmed);
  }

  const selectedRows = rows.filter((row) => row.selected);
  const canConfirm =
    selectedRows.length > 0 && selectedRows.every((row) => isReady(row));

  return (
    <section className="lab-import" aria-labelledby="lab-import-title">
      <p className="data-label">Optional report import</p>
      <h1 id="lab-import-title" ref={heading} tabIndex={-1}>
        Bring in results without sending them away.
      </h1>
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
                Include {row.reviewedMarker ? MARKER_LABELS[row.reviewedMarker] : "this result"}
              </label>
              <label>
                Marker
                <select
                  value={row.reviewedMarker}
                  onChange={(event) =>
                    updateRow(row.id, {
                      reviewedMarker: event.target.value as LabMarker | "",
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
                  value={row.reviewedValueText}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedValueText: event.target.value })
                  }
                />
              </label>
              <label>
                Reported unit
                <input
                  type="text"
                  value={row.reviewedUnit}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedUnit: event.target.value })
                  }
                />
              </label>
              <label>
                Laboratory reference range
                <input
                  type="text"
                  value={row.reviewedRange}
                  placeholder="Copy the range or write Not printed"
                  onChange={(event) =>
                    updateRow(row.id, { reviewedRange: event.target.value })
                  }
                />
              </label>
              <label>
                Collection date
                <input
                  type="date"
                  value={row.reviewedCollectionDate}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedCollectionDate: event.target.value })
                  }
                />
              </label>
              <label>
                Fasting status
                <select
                  value={row.reviewedFastingStatus}
                  onChange={(event) =>
                    updateRow(row.id, {
                      reviewedFastingStatus: event.target.value as FastingStatus | "",
                    })
                  }
                >
                  <option value="">Review fasting status</option>
                  <option value="fasting">Fasting</option>
                  <option value="not_fasting">Not fasting</option>
                  <option value="not_stated">Not stated or unsure</option>
                </select>
              </label>
              {row.source?.printedFlag ? (
                <p>Laboratory-printed flag: {row.source.printedFlag}</p>
              ) : null}
              {row.source?.method ? (
                <p>Laboratory method note: {row.source.method}</p>
              ) : null}
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
