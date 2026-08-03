import { evidenceSources } from "../data/evidence";
import { questionBank } from "../data/questions";
import { riskRules } from "../data/rules";
import { RISK_RULESET_VERSION } from "./release-policy";
import type {
  AnswerMap,
  AnswerValue,
  EmergencyKind,
  EvidenceSource,
  ProfileContext,
  Question,
  ReleasePolicy,
  RiskCondition,
  RiskLeaf,
  RiskRule,
  RiskUrgency,
} from "./types";

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

const urgencyOrder: Readonly<Record<RiskUrgency, number>> = {
  urgent: 0,
  "prompt-review": 1,
  "long-term": 2,
  support: 3,
};

const evidenceTiers = new Set([
  "validated-estimate",
  "authoritative-safety",
  "guideline-action",
  "evidence-limited-association",
]);
const riskUrgencies = new Set(Object.keys(urgencyOrder));
const riskSignals = new Set(["urgent", "high-signal", "worth-attention", "low-signal"]);
const riskGroups = new Set([
  "immediate-red-flags",
  "cardiovascular",
  "metabolic",
  "sleep",
  "respiratory",
  "liver",
  "kidney",
  "mental-wellbeing",
  "dependency",
  "medication-substance-review",
  "preventive-follow-up",
  "skin-hair",
  "reproductive-health",
  "musculoskeletal",
]);
const minorPregnancySupportIds = new Set([
  "minor-pregnancy-support",
  "sexual-safety-support",
]);

function hasAnswer(answers: AnswerMap, questionId: string): boolean {
  return Object.prototype.hasOwnProperty.call(answers, questionId);
}

function isContradictoryMulti(value: ReadonlyArray<string>): boolean {
  return value.includes("none") && value.length > 1;
}

function isValidAnswer(question: Question, value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;

  if (question.answerType === "boolean") return typeof value === "boolean";

  if (question.answerType === "number" || question.answerType === "scale") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (question.answerType === "text") return false;

  const allowed = new Set(question.options?.map((option) => option.value) ?? []);
  if (question.answerType === "single") {
    return typeof value === "string" && value !== "unsure" && allowed.has(value);
  }

  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && allowed.has(item)) &&
    new Set(value).size === value.length &&
    !isContradictoryMulti(value)
  );
}

function validStructuredAnswer(
  answers: AnswerMap,
  questionId: string,
): AnswerValue | undefined {
  if (!hasAnswer(answers, questionId)) return undefined;
  const question = questionsById.get(questionId);
  const value = answers[questionId];
  return question && isValidAnswer(question, value) ? value : undefined;
}

function matchesCondition(condition: RiskCondition, answers: AnswerMap): boolean {
  if ("all" in condition) {
    return condition.all.length > 0 && condition.all.every((part) => matchesCondition(part, answers));
  }

  if ("any" in condition) {
    return condition.any.length > 0 && condition.any.some((part) => matchesCondition(part, answers));
  }

  const answer = validStructuredAnswer(answers, condition.questionId);
  if (answer === undefined) return false;

  if (condition.operator === "equals") return answer === condition.value;

  if (condition.operator === "includes") {
    return Array.isArray(answer) && answer.includes(condition.value);
  }

  if (typeof answer !== "number" || !Number.isFinite(answer)) return false;
  if (condition.validMin !== undefined && answer < condition.validMin) return false;
  if (condition.validMax !== undefined && answer > condition.validMax) return false;

  return condition.operator === "less-than"
    ? answer < condition.value
    : answer >= condition.value;
}

function normalizedCountry(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

function isApplicable(rule: RiskRule, profile: ProfileContext): boolean {
  const { applicability } = rule;
  if (applicability.minAge !== undefined && profile.age < applicability.minAge) {
    return false;
  }
  if (applicability.maxAge !== undefined && profile.age > applicability.maxAge) {
    return false;
  }
  if (applicability.countries === "all") return true;

  const country = normalizedCountry(profile.countryCode);
  return applicability.countries.some(
    (candidate) => normalizedCountry(candidate) === country,
  );
}

function validatePolicy(policy: ReleasePolicy, profile: ProfileContext): void {
  if (policy.audience !== "regulated") return;
  if (!policy.jurisdiction?.trim()) {
    throw new Error("A regulated release policy requires an explicit jurisdiction.");
  }
  if (!policy.enabledModelVersion?.trim()) {
    throw new Error("A regulated release policy requires an enabled model version.");
  }
  if (
    normalizedCountry(policy.jurisdiction) !==
    normalizedCountry(profile.countryCode)
  ) {
    throw new Error(
      "The regulated policy jurisdiction must match the confirmed profile country.",
    );
  }
  if (policy.enabledModelVersion !== RISK_RULESET_VERSION) {
    throw new Error(
      `Unsupported risk ruleset or model version: ${policy.enabledModelVersion}.`,
    );
  }
}

function policyAllows(rule: RiskRule, policy: ReleasePolicy): boolean {
  if (rule.urgency === "urgent") return policy.allowUrgentSignals;
  if (rule.evidenceTier === "validated-estimate") {
    return policy.allowValidatedProbabilities;
  }
  if (rule.urgency === "prompt-review") {
    return policy.allowQualitativeRules && policy.allowPromptReviewSignals;
  }
  return policy.allowQualitativeRules;
}

function emergencyNumber(countryCode: string): string | undefined {
  switch (normalizedCountry(countryCode)) {
    case "US":
      return "911";
    case "GB":
      return "999";
    case "CH":
      return "144";
    default:
      return undefined;
  }
}

function supportsOperationalAction(
  sources: ReadonlyArray<EvidenceSource>,
  countryCode: string,
): boolean {
  const country = normalizedCountry(countryCode);
  return sources.some((source) =>
    source.operationalCountries?.some(
      (candidate) => normalizedCountry(candidate) === country,
    ),
  );
}

function emergencyCopy(
  kind: EmergencyKind,
  countryCode: string,
  sources: ReadonlyArray<EvidenceSource>,
): string {
  const country = normalizedCountry(countryCode);
  const number = supportsOperationalAction(sources, country)
    ? emergencyNumber(country)
    : undefined;
  const call = number
    ? `Call ${number} now for emergency care.`
    : "Contact your local emergency service now.";

  if (kind === "self-harm") {
    const crisis =
      country === "US"
        ? " You can also call or text 988 for crisis support."
        : "";
    return `${call}${crisis} Stay with a trusted person if possible while help is arranged.`;
  }

  if (kind === "pregnancy-safety") {
    const severeAction = number
      ? `call ${number} now`
      : "contact your local emergency service now";
    return `Get urgent pregnancy or safeguarding help now from a qualified health professional or a trusted adult who can help you reach care. If there is a severe symptom, immediate physical danger, or you cannot stay safe, ${severeAction}.`;
  }

  if (
    kind === "overdose-poisoning" &&
    country === "CH" &&
    sources.some((source) => source.id === "foph-ufi-emergency")
  ) {
    return `${call} Poison information is available on 145. Keep the product or package nearby if it is safe to do so.`;
  }

  if (kind === "overdose-poisoning") {
    return `${call} Keep the product or package nearby if it is safe to do so.`;
  }

  if (kind === "severe-bleeding") {
    return `${call} If no object is embedded, apply firm direct pressure with a clean cloth or dressing. Do not remove an embedded object.`;
  }

  return call;
}

function numericConditionsFor(
  condition: RiskCondition,
  questionId: string,
): ReadonlyArray<
  Extract<RiskCondition, { operator: "less-than" | "greater-than-or-equal" }>
> {
  if ("all" in condition) {
    return condition.all.flatMap((part) => numericConditionsFor(part, questionId));
  }
  if ("any" in condition) {
    return condition.any.flatMap((part) => numericConditionsFor(part, questionId));
  }
  return condition.questionId === questionId &&
    (condition.operator === "less-than" || condition.operator === "greater-than-or-equal")
    ? [condition]
    : [];
}

function isValidRuleInput(
  rule: RiskRule,
  answers: AnswerMap,
  questionId: string,
): boolean {
  const answer = validStructuredAnswer(answers, questionId);
  if (answer === undefined) return false;
  if (typeof answer !== "number") return true;

  const numericConditions = [rule.condition, ...rule.factors.map((item) => item.condition)]
    .flatMap((condition) => numericConditionsFor(condition, questionId));
  return numericConditions.every(
    (condition) =>
      (condition.validMin === undefined || answer >= condition.validMin) &&
      (condition.validMax === undefined || answer <= condition.validMax),
  );
}

function missingInputs(rule: RiskRule, answers: AnswerMap): string[] {
  return rule.inputs.filter((questionId) => !isValidRuleInput(rule, answers, questionId));
}

function materializeLeaf(
  rule: RiskRule,
  answers: AnswerMap,
  profile: ProfileContext,
  sources: ReadonlyArray<EvidenceSource>,
): RiskLeaf {
  const factors = rule.factors
    .filter((candidate) => matchesCondition(candidate.condition, answers))
    .map((candidate) => candidate.label);
  const leaf: RiskLeaf = {
    id: rule.id,
    ruleId: rule.id,
    rulesetVersion: RISK_RULESET_VERSION,
    group: rule.group,
    title: rule.title,
    copy: rule.emergencyKind
      ? emergencyCopy(rule.emergencyKind, profile.countryCode, sources)
      : rule.copy,
    evidenceTier: rule.evidenceTier,
    urgency: rule.urgency,
    signal: rule.signal,
    factors,
    missingInputs: missingInputs(rule, answers),
    sources,
    applicability: rule.applicability,
  };

  assertEvidenceContract(leaf);
  return leaf;
}

function sourceApplies(
  source: EvidenceSource,
  profile: ProfileContext,
): boolean {
  const { applicability } = source;
  if (applicability.minAge !== undefined && profile.age < applicability.minAge) {
    return false;
  }
  if (applicability.maxAge !== undefined && profile.age > applicability.maxAge) {
    return false;
  }
  if (applicability.countries === "all") return true;
  const country = normalizedCountry(profile.countryCode);
  return applicability.countries.some(
    (candidate) => normalizedCountry(candidate) === country,
  );
}

function resolveApplicableSources(
  rule: RiskRule,
  answers: AnswerMap,
  profile: ProfileContext,
): EvidenceSource[] {
  const sourceIds = [
    ...rule.sourceIds,
    ...(rule.conditionalSources ?? [])
      .filter((reference) => matchesCondition(reference.condition, answers))
      .map((reference) => reference.sourceId),
  ];
  return [...new Set(sourceIds)]
    .map((sourceId) => {
      const source = evidenceSources[sourceId as keyof typeof evidenceSources];
      if (!source) {
        throw new Error(
          `Risk rule ${rule.id} references unknown source ${sourceId}.`,
        );
      }
      return source;
    })
    .filter((source) => sourceApplies(source, profile));
}

function deduplicateLeaves(
  leaves: ReadonlyArray<{ leaf: RiskLeaf; dedupeKey?: string }>,
): RiskLeaf[] {
  const selected = new Map<string, number>();
  const result: RiskLeaf[] = [];

  for (const candidate of [...leaves].sort(
    (left, right) =>
      urgencyOrder[left.leaf.urgency] - urgencyOrder[right.leaf.urgency],
  )) {
    if (!candidate.dedupeKey) {
      result.push(candidate.leaf);
      continue;
    }
    const signature = JSON.stringify([
      candidate.dedupeKey,
      candidate.leaf.title,
      candidate.leaf.copy,
      candidate.leaf.group,
      candidate.leaf.evidenceTier,
      candidate.leaf.urgency,
      candidate.leaf.signal,
      candidate.leaf.applicability,
    ]);
    const existingIndex = selected.get(signature);

    if (existingIndex !== undefined) {
      const winner = result[existingIndex];
      const merged: RiskLeaf = {
        ...winner,
        factors: [...new Set([...winner.factors, ...candidate.leaf.factors])],
        missingInputs: [
          ...new Set([...winner.missingInputs, ...candidate.leaf.missingInputs]),
        ],
        sources: [
          ...new Map(
            [...winner.sources, ...candidate.leaf.sources].map((source) => [
              source.id,
              source,
            ]),
          ).values(),
        ],
      };
      assertEvidenceContract(merged);
      result[existingIndex] = merged;
      continue;
    }

    selected.set(signature, result.length);
    result.push(candidate.leaf);
  }

  return result;
}

export function assertEvidenceContract(leaf: RiskLeaf): void {
  if (!leaf || typeof leaf !== "object") {
    throw new Error("A risk leaf must be an object.");
  }
  if (typeof leaf.id !== "string" || leaf.id.trim().length === 0) {
    throw new Error("A risk leaf requires an id.");
  }
  if (typeof leaf.ruleId !== "string" || leaf.ruleId.trim().length === 0) {
    throw new Error("A risk leaf requires a rule id.");
  }
  if (leaf.rulesetVersion !== RISK_RULESET_VERSION) {
    throw new Error("A risk leaf requires the supported ruleset version.");
  }
  if (typeof leaf.title !== "string" || leaf.title.trim().length === 0) {
    throw new Error("A risk leaf requires a title.");
  }
  if (typeof leaf.copy !== "string" || leaf.copy.trim().length === 0) {
    throw new Error("A risk leaf requires explanatory copy.");
  }
  if (!riskGroups.has(leaf.group)) {
    throw new Error("A risk leaf requires a supported rule group.");
  }
  if (!evidenceTiers.has(leaf.evidenceTier)) {
    throw new Error("A risk leaf requires an evidence tier.");
  }
  if (!riskUrgencies.has(leaf.urgency)) {
    throw new Error("A risk leaf requires an urgency.");
  }
  if (!riskSignals.has(leaf.signal)) {
    throw new Error("A risk leaf requires a signal level.");
  }
  if (/\byou\s+(?:have|will\s+develop)\b/i.test(leaf.copy)) {
    throw new Error("Risk copy must not make a diagnostic claim.");
  }
  if (/\d+(?:\.\d+)?\s*%|\bpercent(?:age)?\b/i.test(leaf.copy)) {
    throw new Error("Risk copy must not include a non-validated percentage.");
  }
  if (
    leaf.probability !== undefined &&
    (leaf.evidenceTier !== "validated-estimate" ||
      !Number.isFinite(leaf.probability) ||
      leaf.probability < 0 ||
      leaf.probability > 1)
  ) {
    throw new Error("Probability is permitted only for a validated estimate.");
  }
  if (!Array.isArray(leaf.factors) || leaf.factors.length === 0) {
    throw new Error("A risk leaf requires at least one explicit factor.");
  }
  if (!leaf.factors.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new Error("Risk factors must be non-empty strings.");
  }
  if (!Array.isArray(leaf.missingInputs)) {
    throw new Error("A risk leaf requires a missing-input list.");
  }
  if (
    !leaf.missingInputs.every(
      (questionId) => typeof questionId === "string" && questionId.trim().length > 0,
    )
  ) {
    throw new Error("Missing inputs must be named question ids.");
  }
  const countries = leaf.applicability?.countries;
  if (
    !leaf.applicability ||
    (countries !== "all" &&
      (!Array.isArray(countries) ||
        countries.length === 0 ||
        !countries.every(
          (country) => typeof country === "string" && country.trim().length > 0,
        ))) ||
    (leaf.applicability.minAge !== undefined &&
      (!Number.isFinite(leaf.applicability.minAge) || leaf.applicability.minAge < 0)) ||
    (leaf.applicability.maxAge !== undefined &&
      (!Number.isFinite(leaf.applicability.maxAge) || leaf.applicability.maxAge < 0)) ||
    (leaf.applicability.minAge !== undefined &&
      leaf.applicability.maxAge !== undefined &&
      leaf.applicability.minAge > leaf.applicability.maxAge)
  ) {
    throw new Error("A risk leaf requires age and country applicability.");
  }
  if (!Array.isArray(leaf.sources) || leaf.sources.length === 0) {
    throw new Error("A risk leaf requires at least one evidence source.");
  }
  for (const source of leaf.sources) {
    if (
      !source ||
      typeof source.id !== "string" ||
      source.id.trim().length === 0 ||
      typeof source.title !== "string" ||
      source.title.trim().length === 0 ||
      typeof source.publisher !== "string" ||
      source.publisher.trim().length === 0 ||
      typeof source.url !== "string" ||
      !source.url.startsWith("https://") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)
    ) {
      throw new Error("Every evidence source requires identity, URL, and review date.");
    }
    const validOrigin =
      source.jurisdictions === "all" ||
      (Array.isArray(source.jurisdictions) &&
        source.jurisdictions.length > 0 &&
        new Set(source.jurisdictions).size === source.jurisdictions.length &&
        source.jurisdictions.every((country) => /^[A-Z]{2}$/.test(country)));
    const sourceCountries = source.applicability?.countries;
    const validContentCountries =
      sourceCountries === "all" ||
      (Array.isArray(sourceCountries) &&
        sourceCountries.length > 0 &&
        new Set(sourceCountries).size === sourceCountries.length &&
        sourceCountries.every((country) => /^(?:[A-Z]{2}|OTHER)$/.test(country)));
    const validSourceAges =
      source.applicability !== undefined &&
      (source.applicability.minAge === undefined ||
        (Number.isInteger(source.applicability.minAge) &&
          source.applicability.minAge >= 0)) &&
      (source.applicability.maxAge === undefined ||
        (Number.isInteger(source.applicability.maxAge) &&
          source.applicability.maxAge >= 0)) &&
      (source.applicability.minAge === undefined ||
        source.applicability.maxAge === undefined ||
        source.applicability.minAge <= source.applicability.maxAge);
    const validOperationalCountries =
      source.operationalCountries === undefined ||
      (Array.isArray(source.operationalCountries) &&
        source.operationalCountries.length > 0 &&
        new Set(source.operationalCountries).size ===
          source.operationalCountries.length &&
        source.operationalCountries.every((country) => /^[A-Z]{2}$/.test(country)));
    if (
      !validOrigin ||
      !validContentCountries ||
      !validSourceAges ||
      !validOperationalCountries
    ) {
      throw new Error(
        "Every evidence source requires valid source jurisdiction, applicability, population, and operational scope metadata.",
      );
    }
  }
}

export function sortRisksForDisplay(leaves: ReadonlyArray<RiskLeaf>): RiskLeaf[] {
  return [...leaves].sort(
    (left, right) =>
      urgencyOrder[left.urgency] - urgencyOrder[right.urgency] ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

export function evaluateRisks(
  answers: AnswerMap,
  profile: ProfileContext,
  policy: ReleasePolicy,
): RiskLeaf[] {
  validatePolicy(policy, profile);

  const candidates = riskRules
    .filter((rule) => policyAllows(rule, policy))
    .filter((rule) => isApplicable(rule, profile))
    .filter((rule) => matchesCondition(rule.condition, answers))
    .map((rule) => {
      const sources = resolveApplicableSources(rule, answers, profile);
      if (sources.length === 0) {
        throw new Error(
          `Risk rule ${rule.id} has no applicable evidence for the confirmed profile.`,
        );
      }
      return { rule, sources };
    })
    .map(({ rule, sources }) => ({
      leaf: materializeLeaf(rule, answers, profile, sources),
      dedupeKey: rule.dedupeKey,
    }));

  let leaves = deduplicateLeaves(candidates);
  if (profile.age < 18) {
    leaves = leaves.filter((leaf) => leaf.urgency === "urgent" || leaf.urgency === "support");
    if (validStructuredAnswer(answers, "pregnancy_relevant") === true) {
      leaves = leaves.filter(
        (leaf) =>
          leaf.urgency === "urgent" || minorPregnancySupportIds.has(leaf.id),
      );
    }
  }

  return sortRisksForDisplay(leaves);
}
