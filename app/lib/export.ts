import { questionBank } from "../data/questions";
import { buildExpressAssessment, EXPRESS_INDEX_REFERENCE } from "./express-assessment";
import type { PresentedPurityScoreResult } from "../i18n/presentation";
import type { ConfirmedLabValue } from "./labs";
import { pathologyOrientation } from "./pathology-orientation";
import type { ActionItem, PurityScoreResult } from "./scoring";
import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  PathologyRangeBound,
  PathologyScoreResult,
  PathologySynthesis,
  Question,
  RiskLeaf,
} from "./types";

export const RESULT_REPORT_VERSION = "health-risk-explorer-report-v4" as const;

export type ResultReport = {
  readonly subjectAgeYears: number | null;
  readonly assessmentDepth: AnalysisDepth;
  readonly score: PurityScoreResult | PresentedPurityScoreResult;
  readonly riskLeaves: ReadonlyArray<RiskLeaf>;
  readonly actions: ReadonlyArray<ActionItem>;
  readonly confirmedLabs: ReadonlyArray<ConfirmedLabValue>;
  readonly answers: AnswerMap;
  readonly pathologyRisk?: PathologySynthesis | null;
};

export type ExportOptions = {
  readonly includeRawAnswers?: boolean;
};

const questionsById = new Map(questionBank.map((question) => [question.id, question]));
const privateMetadataId =
  /(?:birth(?:_|-)?date|date(?:_|-)?of(?:_|-)?birth|exact(?:_|-)?location|street|address|postal|postcode|zip|latitude|longitude|filename|file(?:_|-)?name|upload|source(?:_|-)?metadata|raw(?:_|-)?file)/i;

function validStructuredAnswer(
  question: Question,
  value: AnswerValue | undefined,
): value is Exclude<AnswerValue, string | null> | string {
  if (value === undefined || value === null || question.answerType === "text") {
    return false;
  }
  if (question.answerType === "boolean") return typeof value === "boolean";
  if (question.answerType === "number" || question.answerType === "scale") {
    return typeof value === "number" && Number.isFinite(value);
  }

  const allowed = new Set(question.options?.map((option) => option.value) ?? []);
  if (question.answerType === "single") {
    return typeof value === "string" && allowed.has(value);
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => allowed.has(item)) &&
    new Set(value).size === value.length &&
    !(value.includes("none") && value.length > 1)
  );
}

function structuredAnswers(answers: AnswerMap): Record<string, AnswerValue> {
  return Object.fromEntries(
    Object.entries(answers)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([questionId, value]) => {
        if (privateMetadataId.test(questionId)) return [];
        const question = questionsById.get(questionId);
        return question && validStructuredAnswer(question, value)
          ? [[questionId, value] as const]
          : [];
      }),
  );
}

function interpretedLeaf(leaf: RiskLeaf) {
  return {
    id: leaf.id,
    ruleId: leaf.ruleId,
    rulesetVersion: leaf.rulesetVersion,
    group: leaf.group,
    title: leaf.title,
    copy: leaf.copy,
    evidenceTier: leaf.evidenceTier,
    urgency: leaf.urgency,
    signal: leaf.signal,
    factors: leaf.factors,
    missingInputs: leaf.missingInputs,
    sources: leaf.sources.map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      reviewedAt: source.reviewedAt,
    })),
  };
}

function reviewedLab(value: ConfirmedLabValue) {
  return {
    reviewed: value.reviewed,
    normalized: value.normalized,
  };
}

function interpretedBound(bound: PathologyRangeBound) {
  return {
    category: bound.category,
    level: bound.level,
    ...(bound.points !== undefined ? { points: bound.points } : {}),
    ...(bound.riskPercent !== undefined ? { riskPercent: bound.riskPercent } : {}),
  };
}

function interpretedScore(score: PathologyScoreResult) {
  const base = {
    instrument: score.instrument,
    status: score.status,
    // Input values are raw answers: only their identifiers cross the export boundary.
    inputs: score.inputs.map(({ id, derived }) => (derived ? { id, derived } : { id })),
    sourceIds: score.sourceIds,
  };
  const orientation = pathologyOrientation(score);
  const guidance = orientation ? { orientation } : {};
  if (score.status === "complete") {
    return {
      ...base,
      category: score.category,
      level: score.level,
      ...(score.points !== undefined ? { points: score.points } : {}),
      ...(score.maxPoints !== undefined ? { maxPoints: score.maxPoints } : {}),
      ...(score.riskPercent !== undefined
        ? { riskPercent: score.riskPercent, riskHorizonYears: score.riskHorizonYears }
        : {}),
      modifiers: score.modifiers,
      ...(score.gain ? { gain: { habits: score.gain.habits, ...interpretedBound(score.gain) } } : {}),
      ...guidance,
    };
  }
  if (score.status === "incomplete") {
    const range = score.range;
    return {
      ...base,
      missingInputs: score.missingInputs,
      ...(range
        ? {
            range: {
              low: interpretedBound(range.low),
              high: interpretedBound(range.high),
              ...(range.maxPoints !== undefined ? { maxPoints: range.maxPoints } : {}),
              ...(range.riskHorizonYears !== undefined ? { riskHorizonYears: range.riskHorizonYears } : {}),
            },
          }
        : {}),
      ...guidance,
    };
  }
  return { ...base, reason: score.reason };
}

function interpretedPathologyRisk(synthesis: PathologySynthesis) {
  return {
    rulesetVersion: synthesis.rulesetVersion,
    interpretation: "published-screening-instruments-not-a-diagnosis",
    scores: synthesis.scores.map(interpretedScore),
    labClassifications: synthesis.labClassifications,
    dementiaFactors: synthesis.dementiaFactors,
    dementiaFamilyHistory: synthesis.dementiaFamilyHistory,
    dementiaSourceIds: synthesis.dementiaSourceIds,
  };
}

function interpretedAction(action: ActionItem) {
  return {
    id: action.id,
    kind: action.kind,
    ...(action.categoryId ? { categoryId: action.categoryId } : {}),
    title: action.title,
    reason: action.reason,
    nextStep: action.nextStep,
    sources: action.sources.map((source) => ({
      title: source.title,
      publisher: source.publisher,
      url: source.url,
    })),
  };
}

export function createRedactedExport(
  report: ResultReport,
  options: ExportOptions = {},
): Blob {
  const expressAssessment = report.assessmentDepth === "express"
    ? buildExpressAssessment(report.answers, { ageYears: report.subjectAgeYears })
    : null;
  const rawAnswersAllowed =
    options.includeRawAnswers === true &&
    typeof report.subjectAgeYears === "number" &&
    Number.isFinite(report.subjectAgeYears) &&
    Number.isInteger(report.subjectAgeYears) &&
    report.subjectAgeYears >= 18;
  const payload = {
    schemaVersion: RESULT_REPORT_VERSION,
    assessmentDepth: report.assessmentDepth,
    score: report.score,
    riskLeaves: report.riskLeaves.map(interpretedLeaf),
    actions: report.actions.map(interpretedAction),
    confirmedLabs: report.confirmedLabs.map(reviewedLab),
    ...(report.pathologyRisk && report.pathologyRisk.scores.length > 0
      ? { pathologyRisk: interpretedPathologyRisk(report.pathologyRisk) }
      : {}),
    ...(expressAssessment && expressAssessment.kind !== "not-available"
      ? {
          expressAssessment: {
            ...expressAssessment,
            interpretation: "heuristic-form-and-habits-index-not-a-health-diagnosis",
            reference: EXPRESS_INDEX_REFERENCE,
            referencePopulation: null,
            sources: [
              "https://www.cdc.gov/sleep/about/index.html",
              "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
            ],
          },
        }
      : {}),
    ...(rawAnswersAllowed
      ? { rawAnswers: structuredAnswers(report.answers) }
      : {}),
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}
