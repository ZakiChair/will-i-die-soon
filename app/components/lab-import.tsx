"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/context";
import { uiCopyKeys, type UiCopyKey } from "../i18n/ui-copy";
import type { MessageVariables } from "../i18n/types";
import {
  extractLabText,
  isAbortError,
  LAB_MARKERS,
  LabProcessingLimitError,
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
  /** 1 on the assessment screen; 3 when the import completes estimates inside the results. */
  headingLevel?: 1 | 3;
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

type LabError = {
  readonly key: Extract<
    UiCopyKey,
    | "lab.error.noMarkers"
    | "lab.error.extraction"
    | "lab.error.fileTooLarge"
    | "lab.error.tooManyPages"
    | "lab.error.tooMuchText"
  >;
  readonly variables: MessageVariables;
};

const PROCESSING_LIMIT_ERROR_KEYS = {
  "file-too-large": "lab.error.fileTooLarge",
  "pdf-too-many-pages": "lab.error.tooManyPages",
  "text-too-long": "lab.error.tooMuchText",
} as const satisfies Readonly<
  Record<LabProcessingLimitError["code"], LabError["key"]>
>;

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

export function LabImport({ onConfirm, onCancel, headingLevel = 1 }: LabImportProps) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeExtraction = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [rows, setRows] = useState<EditableLabRow[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LabError | null>(null);

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => {
      mounted.current = false;
      const controller = activeExtraction.current;
      activeExtraction.current = null;
      controller?.abort();
    };
  }, []);

  function updateRow(id: string, patch: Partial<EditableLabRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function openManual(nextError?: LabError) {
    setManualMode(true);
    setRows([emptyRow(0)]);
    if (nextError) {
      setError(nextError);
      // Browsers fire no change event when the same file is chosen again, so a
      // retry after a failed extraction needs the selection cleared.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    activeExtraction.current?.abort();
    const controller = new AbortController();
    activeExtraction.current = controller;
    setBusy(true);
    setError(null);
    try {
      const text = await extractLabText(file, controller.signal);
      if (
        !mounted.current ||
        controller.signal.aborted ||
        activeExtraction.current !== controller
      ) {
        return;
      }
      const parsed = parseLabCandidates(text);
      if (
        !mounted.current ||
        controller.signal.aborted ||
        activeExtraction.current !== controller
      ) {
        return;
      }
      if (parsed.length === 0) {
        openManual({
          key: "lab.error.noMarkers",
          variables: { filename: file.name },
        });
      } else {
        setManualMode(false);
        setRows(parsed.map(candidateRow));
      }
    } catch (extractionError) {
      if (
        !mounted.current ||
        controller.signal.aborted ||
        activeExtraction.current !== controller ||
        isAbortError(extractionError)
      ) {
        return;
      }
      openManual({
        key:
          extractionError instanceof LabProcessingLimitError
            ? PROCESSING_LIMIT_ERROR_KEYS[extractionError.code]
            : "lab.error.extraction",
        variables: { filename: file.name },
      });
    } finally {
      if (mounted.current && activeExtraction.current === controller) {
        activeExtraction.current = null;
        setBusy(false);
      }
    }
  }

  function cancelImport() {
    const controller = activeExtraction.current;
    activeExtraction.current = null;
    controller?.abort();
    if (mounted.current) setBusy(false);
    onCancel();
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

  const Heading = headingLevel === 3 ? "h3" : "h1";

  return (
    <section className="lab-import" aria-labelledby="lab-import-title">
      <p className="data-label">{t("lab.eyebrow")}</p>
      <Heading id="lab-import-title" ref={heading} tabIndex={-1}>
        {t("lab.title")}
      </Heading>
      <p className="lab-import__privacy">
        <strong>{t("lab.privacy.strong")}</strong> {t("lab.privacy.body")}
      </p>

      <div className="lab-import__source">
        <label htmlFor="lab-report-file">{t("lab.file.label")}</label>
        <input
          ref={fileInput}
          id="lab-report-file"
          type="file"
          accept=".txt,.text,.pdf,image/*"
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <button type="button" onClick={() => openManual()} disabled={busy}>
          {t("lab.manual")}
        </button>
      </div>

      {busy ? <p role="status">{t("lab.busy")}</p> : null}
      {error ? <p role="alert">{t(error.key, error.variables)}</p> : null}

      {rows.length > 0 ? (
        <form
          className="lab-review"
          onSubmit={(event) => {
            event.preventDefault();
            confirmRows();
          }}
        >
          <p>
            {manualMode ? t("lab.review.manual") : t("lab.review.extracted")}
          </p>
          {rows.map((row, index) => (
            <fieldset className="lab-review__row" key={row.id}>
              <legend>{t("lab.row.legend", { number: index + 1 })}</legend>
              <label className="lab-review__include">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(event) =>
                    updateRow(row.id, { selected: event.target.checked })
                  }
                />
                {t("lab.row.include", {
                  marker: row.reviewedMarker
                    ? t(uiCopyKeys.labMarker[row.reviewedMarker])
                    : t("lab.row.thisResult"),
                })}
              </label>
              <label>
                {t("lab.row.marker")}
                <select
                  value={row.reviewedMarker}
                  onChange={(event) =>
                    updateRow(row.id, {
                      reviewedMarker: event.target.value as LabMarker | "",
                    })
                  }
                >
                  <option value="">{t("lab.row.selectMarker")}</option>
                  {LAB_MARKERS.map((marker) => (
                    <option value={marker} key={marker}>
                      {t(uiCopyKeys.labMarker[marker])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("lab.row.value")}
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={row.reviewedValueText}
                  placeholder={t("lab.row.placeholder.value")}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedValueText: event.target.value })
                  }
                />
              </label>
              <label>
                {t("lab.row.unit")}
                <input
                  type="text"
                  value={row.reviewedUnit}
                  placeholder={t("lab.row.placeholder.unit")}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedUnit: event.target.value })
                  }
                />
              </label>
              <label>
                {t("lab.row.range")}
                <input
                  type="text"
                  value={row.reviewedRange}
                  placeholder={t("lab.row.placeholder.range")}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedRange: event.target.value })
                  }
                />
              </label>
              <label>
                {t("lab.row.date")}
                <input
                  type="date"
                  value={row.reviewedCollectionDate}
                  onChange={(event) =>
                    updateRow(row.id, { reviewedCollectionDate: event.target.value })
                  }
                />
              </label>
              <label>
                {t("lab.row.fasting")}
                <select
                  value={row.reviewedFastingStatus}
                  onChange={(event) =>
                    updateRow(row.id, {
                      reviewedFastingStatus: event.target.value as FastingStatus | "",
                    })
                  }
                >
                  <option value="">{t("lab.row.reviewFasting")}</option>
                  <option value="fasting">{t(uiCopyKeys.fasting.fasting)}</option>
                  <option value="not_fasting">{t(uiCopyKeys.fasting.not_fasting)}</option>
                  <option value="not_stated">{t(uiCopyKeys.fasting.not_stated)}</option>
                </select>
              </label>
              {row.source?.printedFlag ? (
                <p>{t("lab.row.flag", { flag: row.source.printedFlag })}</p>
              ) : null}
              {row.source?.method ? (
                <p>{t("lab.row.method", { method: row.source.method })}</p>
              ) : null}
              <button
                type="button"
                aria-label={t("lab.row.remove", { number: index + 1 })}
                onClick={() => setRows((current) => current.filter(({ id }) => id !== row.id))}
              >
                {t("lab.row.remove", { number: index + 1 })}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => setRows((current) => [...current, emptyRow(current.length)])}
          >
            {t("lab.add")}
          </button>
          <button type="submit" disabled={!canConfirm}>
            {t("lab.confirm")}
          </button>
        </form>
      ) : null}

      <button type="button" onClick={cancelImport}>
        {t("lab.cancel")}
      </button>
    </section>
  );
}
