import { expect, test } from "vitest";

import { createRedactedExport } from "./export";
import { calculatePurityScore } from "./scoring";
import type { ResultReport } from "./export";
import type { RiskLeaf } from "./types";

const source = {
  id: "who-example",
  title: "Official guidance",
  publisher: "World Health Organization",
  url: "https://www.who.int/example",
  reviewedAt: "2026-08-03",
  jurisdictions: "all" as const,
  applicability: { countries: "all" as const },
};

const leaf: RiskLeaf = {
  id: "review-example",
  ruleId: "review-example",
  rulesetVersion: "risk-rules-v1",
  group: "preventive-follow-up",
  title: "A review may be useful",
  copy: "Consider discussing the self-reported factor with a qualified professional.",
  evidenceTier: "guideline-action",
  urgency: "prompt-review",
  signal: "worth-attention",
  factors: ["A structured self-reported factor"],
  missingInputs: ["another_structured_answer"],
  sources: [source],
  applicability: { countries: "all" },
};

const report: ResultReport = {
  assessmentDepth: "deep",
  score: calculatePurityScore(
    {
      current_tobacco_nicotine: false,
      alcohol_frequency: "never",
    },
    { ageYears: 35, assessmentDepth: "deep" },
  ),
  riskLeaves: [leaf],
  actions: [],
  confirmedLabs: [
    {
      source: {
        marker: "hba1c",
        value: 5.7,
        unit: "%",
        rawLine: "SECRET RAW LAB LINE from private-report.pdf",
        rawTestName: "HbA1c from private-report.pdf",
      },
      reviewed: {
        marker: "hba1c",
        valueText: "5.7",
        value: 5.7,
        unit: "%",
        referenceRange: "4.0–5.6",
        collectionDate: "2026-07-30",
        fastingStatus: "not_stated",
      },
      normalized: {
        value: 38.801,
        unit: "mmol/mol",
        displayValue: "39",
      },
    },
  ],
  answers: {
    current_tobacco_nicotine: false,
    sex_assigned_at_birth: "female",
    diagnosed_conditions_core: ["none"],
    gender_identity_optional: "SECRET FREE TEXT",
    med_detail_names: "SECRET MEDICINE NAME",
    lab_value_glucose: "SECRET PRINTED LAB STRING",
    birth_date: "1990-01-02",
    exact_location: "SECRET STREET ADDRESS",
    uploaded_file_name: "private-report.pdf",
  },
};

async function readJson(blob: Blob) {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
  return JSON.parse(text) as Record<string, unknown>;
}

test("default JSON contains interpreted output and confirmed reviewed lab context only", async () => {
  const blob = createRedactedExport(report);
  const json = await readJson(blob);
  const serialized = JSON.stringify(json);

  expect(blob.type).toBe("application/json");
  expect(json).toMatchObject({
    schemaVersion: "health-risk-explorer-report-v1",
    assessmentDepth: "deep",
    score: {
      kind: "insufficient-coverage",
      coverage: 35,
    },
    riskLeaves: [
      {
        title: "A review may be useful",
        evidenceTier: "guideline-action",
      },
    ],
    confirmedLabs: [
      {
        reviewed: { marker: "hba1c", valueText: "5.7" },
        normalized: { displayValue: "39" },
      },
    ],
  });
  expect(json).not.toHaveProperty("rawAnswers");
  expect((json.confirmedLabs as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
    "source",
  );
  expect(serialized).not.toMatch(
    /SECRET|private-report\.pdf|1990-01-02|STREET ADDRESS|rawLine|rawTestName/i,
  );
});

test("explicit raw opt-in includes only valid structured answers and still removes private metadata", async () => {
  const json = await readJson(
    createRedactedExport(report, { includeRawAnswers: true }),
  );
  const serialized = JSON.stringify(json);

  expect(json.rawAnswers).toEqual({
    current_tobacco_nicotine: false,
    diagnosed_conditions_core: ["none"],
    sex_assigned_at_birth: "female",
  });
  expect(serialized).not.toMatch(
    /SECRET|private-report\.pdf|1990-01-02|STREET ADDRESS|rawLine|rawTestName/i,
  );
});

test("default JSON exports a curated action without its internal ranking sentinel", async () => {
  const json = await readJson(
    createRedactedExport({
      ...report,
      actions: [
        {
          id: "access-medication-safety",
          kind: "access-support",
          categoryId: "medication-safety",
          title: "Start with practical access and safety support",
          reason: "No current access was reported.",
          nextStep: "Choose a qualified local support route if you want one.",
          source: {
            title: "Medication Without Harm",
            publisher: "World Health Organization",
            url: "https://www.who.int/initiatives/medication-without-harm",
          },
          opportunity: Number.POSITIVE_INFINITY,
        },
      ],
    }),
  );

  expect(json.actions).toEqual([
    {
      id: "access-medication-safety",
      kind: "access-support",
      categoryId: "medication-safety",
      title: "Start with practical access and safety support",
      reason: "No current access was reported.",
      nextStep: "Choose a qualified local support route if you want one.",
      source: {
        title: "Medication Without Harm",
        publisher: "World Health Organization",
        url: "https://www.who.int/initiatives/medication-without-harm",
      },
    },
  ]);
});
